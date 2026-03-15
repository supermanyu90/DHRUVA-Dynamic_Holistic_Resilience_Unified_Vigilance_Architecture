import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const AIS_SHIP_TYPES: Record<number, string> = {
  20: "Wing in Ground", 21: "Wing in Ground", 22: "Wing in Ground",
  30: "Fishing", 31: "Towing", 32: "Towing", 33: "Dredger",
  34: "Diving", 35: "Military", 36: "Sailing", 37: "Pleasure",
  40: "High-Speed", 41: "High-Speed", 42: "High-Speed", 43: "High-Speed", 44: "High-Speed", 45: "High-Speed",
  50: "Pilot", 51: "Search and Rescue", 52: "Tug", 53: "Port Tender", 54: "Anti-pollution",
  55: "Law Enforcement", 58: "Medical Transport", 59: "Noncombatant",
  60: "Passenger", 61: "Passenger", 62: "Passenger", 63: "Passenger", 64: "Passenger",
  65: "Passenger", 66: "Passenger", 67: "Passenger", 68: "Passenger", 69: "Passenger",
  70: "Cargo", 71: "Cargo", 72: "Cargo", 73: "Cargo", 74: "Cargo",
  75: "Cargo", 76: "Cargo", 77: "Cargo", 78: "Cargo", 79: "Cargo",
  80: "Tanker", 81: "Tanker", 82: "Tanker", 83: "Tanker", 84: "Tanker",
  85: "Tanker", 86: "Tanker", 87: "Tanker", 88: "Tanker", 89: "Tanker",
  90: "Other", 91: "Other", 92: "Other", 93: "Other", 94: "Other",
  95: "Other", 96: "Other", 97: "Other", 98: "Other", 99: "Other",
};

async function lookupVesselFinder(
  apiKey: string,
  mmsi?: string,
  imoList?: string
): Promise<any[]> {
  const url = new URL("https://api.vesselfinder.com/vessels");
  url.searchParams.set("userkey", apiKey);
  url.searchParams.set("extradata", "master");
  url.searchParams.set("format", "json");

  if (mmsi) url.searchParams.set("mmsi", mmsi);
  else if (imoList) url.searchParams.set("imo", imoList);
  else return [];

  const res = await fetch(url.toString());
  if (!res.ok) return [];

  const records = await res.json();
  if (!Array.isArray(records)) return [];

  return records.map((record: any) => {
    const ais = record.AIS || {};
    const master = record.MASTERDATA || {};
    return {
      mmsi: String(ais.MMSI || ""),
      name: ais.NAME?.trim() || `VESSEL-${ais.MMSI}`,
      type: AIS_SHIP_TYPES[ais.TYPE ?? 0] || master.TYPE_NAME || "Unknown",
      latitude: ais.LATITUDE,
      longitude: ais.LONGITUDE,
      speed: ais.SPEED ?? 0,
      course: ais.COURSE ?? 0,
      heading: ais.HEADING ?? ais.COURSE ?? 0,
      destination: ais.DESTINATION?.trim() || "",
      flag: master.FLAG || "",
      last_position_time: ais.TIMESTAMP
        ? new Date(ais.TIMESTAMP).toISOString()
        : new Date().toISOString(),
      properties: {
        source: "vesselfinder",
        imo: ais.IMO,
        callsign: ais.CALLSIGN,
        navstat: ais.NAVSTAT,
        draught: ais.DRAUGHT,
        locode: ais.LOCODE,
        eta: ais.ETA_AIS,
        zone: ais.ZONE,
        length: master.LENGTH,
        beam: master.BEAM,
        gt: master.GT,
        dwt: master.DWT,
        year_built: master.YEAR_BUILT,
      },
    };
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q") || "";
    const mmsi = url.searchParams.get("mmsi") || "";
    const type = url.searchParams.get("type") || "";
    const flag = url.searchParams.get("flag") || "";
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const vesselApiKey = Deno.env.get("VESSEL_API_KEY") || "";

    // If MMSI lookup and API key present, try VesselFinder first for live data
    if (mmsi && vesselApiKey) {
      const liveResults = await lookupVesselFinder(vesselApiKey, mmsi);
      if (liveResults.length > 0) {
        // Upsert live result into DB for caching
        for (const v of liveResults) {
          if (v.mmsi) {
            await supabase.from("vessels").upsert(
              { ...v, updated_at: new Date().toISOString() },
              { onConflict: "mmsi" }
            );
          }
        }
        return new Response(
          JSON.stringify({ success: true, count: liveResults.length, vessels: liveResults, source: "vesselfinder-live" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // DB query
    let queryBuilder = supabase
      .from("vessels")
      .select("*")
      .order("last_position_time", { ascending: false })
      .limit(limit);

    if (mmsi) {
      queryBuilder = queryBuilder.eq("mmsi", mmsi);
    } else if (query) {
      queryBuilder = queryBuilder.or(
        `name.ilike.%${query}%,destination.ilike.%${query}%,mmsi.ilike.%${query}%`
      );
    }

    if (type) queryBuilder = queryBuilder.ilike("type", `%${type}%`);
    if (flag) queryBuilder = queryBuilder.ilike("flag", flag);

    const { data, error } = await queryBuilder;
    if (error) throw error;

    const source = vesselApiKey ? "vesselfinder-db" : "db-seed";

    return new Response(
      JSON.stringify({ success: true, count: data?.length || 0, vessels: data || [], source }),
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
