import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function aisTypeToString(type: number): string {
  if (type >= 80 && type <= 89) return "Tanker";
  if (type >= 70 && type <= 79) return "Cargo";
  if (type >= 60 && type <= 69) return "Passenger";
  if (type >= 30 && type <= 32) return "Fishing";
  if (type === 33 || type === 34) return "Tug";
  if (type === 35) return "Military";
  if (type >= 40 && type <= 49) return "High Speed Craft";
  if (type >= 50 && type <= 59) return "Special Craft";
  return "Unknown";
}

function mmsiToFlag(mmsi: string): string {
  const mid = mmsi.substring(0, 3);
  const map: Record<string, string> = {
    "211": "DE", "219": "DK", "224": "ES", "225": "ES", "227": "FR",
    "229": "MT", "230": "FI", "232": "GB", "233": "GB", "235": "GB",
    "244": "NL", "245": "NL", "246": "NL", "247": "IT", "248": "MT",
    "257": "NO", "265": "SE", "269": "CH", "271": "TR", "273": "RU",
    "276": "EE", "277": "LV", "278": "LT", "311": "BS", "316": "CA",
    "338": "US", "339": "US", "366": "US", "367": "US", "369": "US",
    "374": "PA", "378": "TC", "412": "CN", "413": "CN", "414": "CN",
    "416": "TW", "431": "JP", "432": "JP", "440": "KR", "441": "KR",
    "445": "KR", "477": "CN", "503": "AU", "512": "NZ", "525": "ID",
    "533": "MY", "538": "MH", "548": "PH", "563": "SG", "566": "SG",
    "574": "VN", "578": "VN", "710": "BR", "725": "CL", "730": "CO",
  };
  return map[mid] || "";
}

interface AISHubRecord {
  MMSI: number;
  TIME: string;
  LONGITUDE: number;
  LATITUDE: number;
  COG: number;
  SOG: number;
  HEADING: number;
  NAVSTAT: number;
  IMO: number;
  NAME: string;
  CALLSIGN: string;
  TYPE: number;
  A: number;
  B: number;
  C: number;
  D: number;
  DRAUGHT: number;
  DEST: string;
  ETA: string;
}

function mapRecord(v: AISHubRecord) {
  const mmsiStr = String(v.MMSI);
  const length = (v.A || 0) + (v.B || 0);
  const beam = (v.C || 0) + (v.D || 0);
  return {
    mmsi: mmsiStr,
    name: (v.NAME || "").trim() || `VESSEL-${v.MMSI}`,
    type: aisTypeToString(v.TYPE || 0),
    latitude: v.LATITUDE,
    longitude: v.LONGITUDE,
    speed: v.SOG === 102.4 ? 0 : (v.SOG ?? 0),
    course: v.COG === 360 ? 0 : (v.COG ?? 0),
    heading: v.HEADING === 511 ? (v.COG === 360 ? 0 : (v.COG ?? 0)) : (v.HEADING ?? 0),
    destination: (v.DEST || "").trim(),
    flag: mmsiToFlag(mmsiStr),
    last_position_time: v.TIME
      ? new Date(v.TIME.replace(" GMT", "Z")).toISOString()
      : new Date().toISOString(),
    properties: {
      source: "aishub",
      imo: v.IMO && v.IMO > 0 ? v.IMO : undefined,
      callsign: (v.CALLSIGN || "").trim() || undefined,
      nav_status: v.NAVSTAT,
      draught: v.DRAUGHT ? v.DRAUGHT : undefined,
      length: length > 0 ? length : undefined,
      beam: beam > 0 ? beam : undefined,
      eta: (v.ETA || "").trim() || undefined,
      type_code: v.TYPE,
    },
    updated_at: new Date().toISOString(),
  };
}

async function fetchByMMSI(username: string, mmsi: string): Promise<AISHubRecord | null> {
  try {
    const params = new URLSearchParams({
      username,
      format: "1",
      output: "json",
      compress: "0",
      mmsi,
    });
    const res = await fetch(`https://data.aishub.net/ws.php?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length < 2) return null;
    if (data[0].ERROR) return null;
    const records: AISHubRecord[] = data[1];
    return Array.isArray(records) && records.length > 0 ? records[0] : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q") || "";
    const mmsi  = url.searchParams.get("mmsi") || "";
    const type  = url.searchParams.get("type") || "";
    const flag  = url.searchParams.get("flag") || "";
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const username = Deno.env.get("VESSEL_API_KEY") || "";

    // Live MMSI lookup via AISHub
    if (mmsi && username) {
      const raw = await fetchByMMSI(username, mmsi);
      if (raw) {
        const vessel = mapRecord(raw);
        await supabase
          .from("vessels")
          .upsert({ ...vessel }, { onConflict: "mmsi" });
        return new Response(
          JSON.stringify({ success: true, count: 1, vessels: [vessel], source: "aishub" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fall back to DB query (name search, type/flag filters)
    let qb = supabase
      .from("vessels")
      .select("*")
      .order("last_position_time", { ascending: false })
      .limit(limit);

    if (mmsi) {
      qb = qb.eq("mmsi", mmsi);
    } else if (query) {
      qb = qb.or(`name.ilike.%${query}%,destination.ilike.%${query}%,mmsi.ilike.%${query}%`);
    }

    if (type) qb = qb.ilike("type", `%${type}%`);
    if (flag) qb = qb.ilike("flag", flag);

    const { data, error } = await qb;
    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        count: data?.length || 0,
        vessels: data || [],
        source: username ? "aishub-db" : "db-seed",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage, vessels: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
