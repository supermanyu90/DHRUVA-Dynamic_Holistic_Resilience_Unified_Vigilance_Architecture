import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// AIS TYPE codes → readable vessel type
// https://www.navcen.uscg.gov/?pageName=AISMessagesA
function aisTypeToString(type: number): string {
  if (type >= 80 && type <= 89) return "Tanker";
  if (type >= 70 && type <= 79) return "Cargo";
  if (type >= 60 && type <= 69) return "Passenger";
  if (type >= 30 && type <= 32) return "Fishing";
  if (type === 33 || type === 34) return "Tug";
  if (type === 35) return "Military";
  if (type >= 40 && type <= 49) return "High Speed Craft";
  if (type >= 50 && type <= 59) return "Special Craft";
  if (type >= 20 && type <= 29) return "Wing In Ground";
  return "Unknown";
}

// MMSI prefix → ISO-2 flag approximation
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

// Strategic maritime zones to monitor around India / Indian Ocean
const WATCH_ZONES = [
  // Broad Indian Ocean sweep (no size limit for AISHub)
  { name: "Arabian Sea",       latmin: 8,   latmax: 28,  lonmin: 55,  lonmax: 78  },
  { name: "Bay of Bengal",     latmin: 5,   latmax: 23,  lonmin: 80,  lonmax: 100 },
  { name: "Persian Gulf",      latmin: 23,  latmax: 30,  lonmin: 48,  lonmax: 60  },
  { name: "Red Sea / Aden",    latmin: 10,  latmax: 22,  lonmin: 38,  lonmax: 52  },
  { name: "Strait of Malacca", latmin: 0,   latmax: 7,   lonmin: 98,  lonmax: 108 },
  { name: "Indian Ocean C",    latmin: -15, latmax: 5,   lonmin: 60,  lonmax: 85  },
];

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
  const beam   = (v.C || 0) + (v.D || 0);
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
    last_position_time: v.TIME ? new Date(v.TIME.replace(" GMT", "Z")).toISOString() : new Date().toISOString(),
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

async function fetchZone(
  username: string,
  zone: typeof WATCH_ZONES[0]
): Promise<AISHubRecord[]> {
  try {
    const params = new URLSearchParams({
      username,
      format: "1",
      output: "json",
      compress: "0",
      latmin: String(zone.latmin),
      latmax: String(zone.latmax),
      lonmin: String(zone.lonmin),
      lonmax: String(zone.lonmax),
    });
    const res = await fetch(`https://data.aishub.net/ws.php?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    // Response: [{meta}, [vessels...]]
    if (!Array.isArray(data) || data.length < 2) return [];
    const meta = data[0];
    if (meta.ERROR) return [];
    const records = data[1];
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

const SEED_VESSELS = [
  { mmsi: "211456780", name: "NORDIC CROWN",         type: "Tanker",   lat: 51.95,  lon: 4.13,    speed: 8.2,  course: 270, flag: "DE", destination: "ROTTERDAM" },
  { mmsi: "477123456", name: "COSCO SHIPPING ARIES", type: "Cargo",    lat: 22.28,  lon: 114.18,  speed: 12.1, course: 180, flag: "CN", destination: "SINGAPORE" },
  { mmsi: "235678901", name: "MSC ANNA",              type: "Cargo",    lat: 36.12,  lon: -6.01,   speed: 14.3, course: 200, flag: "GB", destination: "ALGECIRAS" },
  { mmsi: "311234567", name: "OCEAN SPIRIT",          type: "Tanker",   lat: 26.4,   lon: 56.3,    speed: 9.8,  course: 315, flag: "BH", destination: "FUJAIRAH" },
  { mmsi: "538045678", name: "EVER ACE",              type: "Cargo",    lat: 30.2,   lon: 32.6,    speed: 7.5,  course: 350, flag: "MH", destination: "SUEZ" },
  { mmsi: "563234567", name: "KOTA MAWAR",            type: "Cargo",    lat: 1.26,   lon: 103.82,  speed: 11.2, course: 90,  flag: "SG", destination: "TANJUNG PELEPAS" },
  { mmsi: "215678901", name: "MAERSK ELBA",           type: "Cargo",    lat: 12.5,   lon: 43.5,    speed: 6.1,  course: 160, flag: "MT", destination: "DJIBOUTI" },
  { mmsi: "636023456", name: "FRONTLINE ZONDA",       type: "Tanker",   lat: 14.5,   lon: 52.0,    speed: 13.4, course: 200, flag: "LR", destination: "ADEN" },
  { mmsi: "229078901", name: "AEGEAN ARROW",          type: "Tanker",   lat: 37.9,   lon: 23.7,    speed: 5.0,  course: 45,  flag: "GR", destination: "PIRAEUS" },
  { mmsi: "338078901", name: "USS ARLEIGH BURKE",     type: "Military", lat: 38.0,   lon: 26.0,    speed: 20.0, course: 180, flag: "US", destination: "MEDITERRANEAN" },
  { mmsi: "431234567", name: "TOKYO MARU",            type: "Tanker",   lat: 35.4,   lon: 139.6,   speed: 12.0, course: 135, flag: "JP", destination: "YOKOHAMA" },
  { mmsi: "440234567", name: "HMM ALGECIRAS",         type: "Cargo",    lat: 35.1,   lon: 129.1,   speed: 18.5, course: 270, flag: "KR", destination: "BUSAN" },
  { mmsi: "338301001", name: "USS JOHN PAUL JONES",   type: "Military", lat: 13.5,   lon: 144.8,   speed: 22.0, course: 45,  flag: "US", destination: "GUAM" },
  { mmsi: "566987001", name: "STRAITS EXPRESS",       type: "Cargo",    lat: 1.1,    lon: 103.5,   speed: 13.2, course: 270, flag: "SG", destination: "PORT KLANG" },
  { mmsi: "477009800", name: "PACIFIC JADE",          type: "Tanker",   lat: 34.2,   lon: 122.8,   speed: 9.5,  course: 180, flag: "CN", destination: "NINGBO" },
  { mmsi: "352001234", name: "PANAMA BREEZE",         type: "Cargo",    lat: 8.9,    lon: -79.6,   speed: 7.3,  course: 315, flag: "PA", destination: "COLON" },
  { mmsi: "232001001", name: "HMS DEFENDER",          type: "Military", lat: 51.5,   lon: -4.0,    speed: 18.0, course: 90,  flag: "GB", destination: "PORTSMOUTH" },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const username = Deno.env.get("VESSEL_API_KEY") || "";
    let insertCount = 0;
    let source = "seed";
    let apiError: string | undefined;

    if (username) {
      source = "aishub";
      // Fetch all zones sequentially to respect 1-req/min rate limit per zone
      // We stagger them with small delays
      const seen = new Set<string>();
      const vessels: ReturnType<typeof mapRecord>[] = [];

      for (const zone of WATCH_ZONES) {
        const records = await fetchZone(username, zone);
        for (const v of records) {
          const key = String(v.MMSI);
          if (!key || key === "0" || seen.has(key)) continue;
          seen.add(key);
          vessels.push(mapRecord(v));
        }
        // Small pause between zones to be a good citizen
        await new Promise(r => setTimeout(r, 200));
      }

      if (vessels.length > 0) {
        for (const vessel of vessels) {
          const { error } = await supabase
            .from("vessels")
            .upsert(vessel, { onConflict: "mmsi" });
          if (!error) insertCount++;
        }
      } else {
        apiError = "AISHub returned no vessels for monitored zones";
      }
    }

    // Fall back to seed if live ingestion yielded nothing
    if (insertCount === 0) {
      source = "seed";
      for (const vessel of SEED_VESSELS) {
        const driftLat = (Math.random() - 0.5) * 0.05;
        const driftLon = (Math.random() - 0.5) * 0.05;
        const courseRad = vessel.course * Math.PI / 180;
        const speedDeg = vessel.speed * 0.000278;
        const record = {
          mmsi: vessel.mmsi,
          name: vessel.name,
          type: vessel.type,
          latitude: vessel.lat + driftLat + Math.sin(courseRad) * speedDeg,
          longitude: vessel.lon + driftLon + Math.cos(courseRad) * speedDeg,
          speed: Math.max(0, vessel.speed + (Math.random() - 0.5) * 0.5),
          course: vessel.course,
          heading: vessel.course,
          destination: vessel.destination,
          flag: vessel.flag,
          last_position_time: new Date().toISOString(),
          properties: { source: "seed" },
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase
          .from("vessels")
          .upsert(record, { onConflict: "mmsi" });
        if (!error) insertCount++;
      }
    }

    const responseTime = Date.now() - startTime;
    await supabase.from("api_logs").insert({
      endpoint: "/ingest-vessels",
      method: "POST",
      status_code: 200,
      response_time_ms: responseTime,
    });

    return new Response(
      JSON.stringify({ success: true, count: insertCount, source, apiError, responseTime }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
