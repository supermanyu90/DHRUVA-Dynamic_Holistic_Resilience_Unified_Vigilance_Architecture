import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// VesselAPI.com bounding-box limit is 4 degrees total span (|dLat| + |dLon|).
// Split strategic zones into <=4° tiles.
const WATCH_ZONES = [
  // Arabian Sea / Indian west coast
  { name: "Arabian Sea NW",    latBottom: 20, latTop: 22, lonLeft: 60, lonRight: 62 },
  { name: "Arabian Sea N",     latBottom: 22, latTop: 24, lonLeft: 58, lonRight: 60 },
  { name: "Arabian Sea C",     latBottom: 18, latTop: 20, lonLeft: 62, lonRight: 64 },
  // Persian Gulf
  { name: "Persian Gulf",      latBottom: 24, latTop: 26, lonLeft: 54, lonRight: 56 },
  // Gulf of Aden / Red Sea approach
  { name: "Gulf of Aden",      latBottom: 11, latTop: 13, lonLeft: 46, lonRight: 48 },
  { name: "Red Sea S",         latBottom: 13, latTop: 15, lonLeft: 42, lonRight: 44 },
  // Strait of Hormuz
  { name: "Hormuz",            latBottom: 25, latTop: 27, lonLeft: 56, lonRight: 58 },
  // Bay of Bengal
  { name: "Bay of Bengal N",   latBottom: 18, latTop: 20, lonLeft: 86, lonRight: 88 },
  { name: "Bay of Bengal S",   latBottom: 10, latTop: 12, lonLeft: 82, lonRight: 84 },
  // Strait of Malacca
  { name: "Malacca N",         latBottom: 4,  latTop: 6,  lonLeft: 100, lonRight: 102 },
  { name: "Malacca S",         latBottom: 1,  latTop: 3,  lonLeft: 103, lonRight: 105 },
  // Indian Ocean
  { name: "Indian Ocean C",    latBottom: 0,  latTop: 2,  lonLeft: 72, lonRight: 74 },
];

// Fallback seed data used when no API key or API returns nothing
const SEED_VESSELS = [
  { mmsi: "211456780", name: "NORDIC CROWN",          type: "Tanker",   lat: 51.95,  lon: 4.13,    speed: 8.2,  course: 270, flag: "DE", destination: "ROTTERDAM" },
  { mmsi: "477123456", name: "COSCO SHIPPING ARIES",  type: "Cargo",    lat: 22.28,  lon: 114.18,  speed: 12.1, course: 180, flag: "CN", destination: "SINGAPORE" },
  { mmsi: "235678901", name: "MSC ANNA",               type: "Cargo",    lat: 36.12,  lon: -6.01,   speed: 14.3, course: 200, flag: "GB", destination: "ALGECIRAS" },
  { mmsi: "311234567", name: "OCEAN SPIRIT",           type: "Tanker",   lat: 26.4,   lon: 56.3,    speed: 9.8,  course: 315, flag: "BH", destination: "FUJAIRAH" },
  { mmsi: "538045678", name: "EVER ACE",               type: "Cargo",    lat: 30.2,   lon: 32.6,    speed: 7.5,  course: 350, flag: "MH", destination: "SUEZ" },
  { mmsi: "563234567", name: "KOTA MAWAR",             type: "Cargo",    lat: 1.26,   lon: 103.82,  speed: 11.2, course: 90,  flag: "SG", destination: "TANJUNG PELEPAS" },
  { mmsi: "215678901", name: "MAERSK ELBA",            type: "Cargo",    lat: 12.5,   lon: 43.5,    speed: 6.1,  course: 160, flag: "MT", destination: "DJIBOUTI" },
  { mmsi: "636023456", name: "FRONTLINE ZONDA",        type: "Tanker",   lat: 14.5,   lon: 52.0,    speed: 13.4, course: 200, flag: "LR", destination: "ADEN" },
  { mmsi: "229078901", name: "AEGEAN ARROW",           type: "Tanker",   lat: 37.9,   lon: 23.7,    speed: 5.0,  course: 45,  flag: "GR", destination: "PIRAEUS" },
  { mmsi: "248045678", name: "ADRIATIC SKY",           type: "Cargo",    lat: 45.4,   lon: 12.35,   speed: 7.8,  course: 315, flag: "MT", destination: "VENICE" },
  { mmsi: "319067890", name: "CAYMAN TRADER",          type: "Tanker",   lat: 19.3,   lon: -72.5,   speed: 10.2, course: 270, flag: "KY", destination: "PORT-AU-PRINCE" },
  { mmsi: "416078901", name: "FORMOSA GLORY",          type: "Cargo",    lat: 24.8,   lon: 122.2,   speed: 15.0, course: 0,   flag: "TW", destination: "KAOHSIUNG" },
  { mmsi: "440234567", name: "HMM ALGECIRAS",          type: "Cargo",    lat: 35.1,   lon: 129.1,   speed: 18.5, course: 270, flag: "KR", destination: "BUSAN" },
  { mmsi: "374023456", name: "PACIFIC NAVIGATOR",      type: "Tanker",   lat: -33.9,  lon: 18.4,    speed: 11.0, course: 90,  flag: "PA", destination: "CAPE TOWN" },
  { mmsi: "512078901", name: "SOUTHERN CROSS",         type: "Cargo",    lat: -37.8,  lon: 144.9,   speed: 6.5,  course: 180, flag: "NZ", destination: "MELBOURNE" },
  { mmsi: "710234567", name: "PETROBRAS VEGA",         type: "Tanker",   lat: -22.9,  lon: -43.2,   speed: 8.9,  course: 90,  flag: "BR", destination: "RIO DE JANEIRO" },
  { mmsi: "338078901", name: "USS ARLEIGH BURKE",      type: "Military", lat: 38.0,   lon: 26.0,    speed: 20.0, course: 180, flag: "US", destination: "MEDITERRANEAN" },
  { mmsi: "277023456", name: "VLADIVOSTOK STAR",       type: "Cargo",    lat: 43.1,   lon: 131.9,   speed: 9.2,  course: 90,  flag: "RU", destination: "VLADIVOSTOK" },
  { mmsi: "431234567", name: "TOKYO MARU",             type: "Tanker",   lat: 35.4,   lon: 139.6,   speed: 12.0, course: 135, flag: "JP", destination: "YOKOHAMA" },
  { mmsi: "503078901", name: "RIO TINTO SPIRIT",       type: "Cargo",    lat: -31.9,  lon: 115.8,   speed: 10.5, course: 270, flag: "AU", destination: "FREMANTLE" },
  { mmsi: "338301001", name: "USS JOHN PAUL JONES",    type: "Military", lat: 13.5,   lon: 144.8,   speed: 22.0, course: 45,  flag: "US", destination: "GUAM" },
  { mmsi: "445678901", name: "BUSAN CARRIER",          type: "Cargo",    lat: 33.5,   lon: 129.0,   speed: 14.2, course: 45,  flag: "KR", destination: "BUSAN" },
  { mmsi: "566987001", name: "STRAITS EXPRESS",        type: "Cargo",    lat: 1.1,    lon: 103.5,   speed: 13.2, course: 270, flag: "SG", destination: "PORT KLANG" },
  { mmsi: "477009800", name: "PACIFIC JADE",           type: "Tanker",   lat: 34.2,   lon: 122.8,   speed: 9.5,  course: 180, flag: "CN", destination: "NINGBO" },
  { mmsi: "352001234", name: "PANAMA BREEZE",          type: "Cargo",    lat: 8.9,    lon: -79.6,   speed: 7.3,  course: 315, flag: "PA", destination: "COLON" },
  { mmsi: "232001001", name: "HMS DEFENDER",           type: "Military", lat: 51.5,   lon: -4.0,    speed: 18.0, course: 90,  flag: "GB", destination: "PORTSMOUTH" },
];

interface VesselAPIPosition {
  mmsi: number;
  imo?: number;
  vessel_name: string;
  latitude: number;
  longitude: number;
  cog?: number;
  sog?: number;
  heading?: number;
  nav_status?: number;
  timestamp: string;
  suspected_glitch?: boolean;
}

interface ZoneResult {
  vessels?: VesselAPIPosition[];
}

function mapVesselAPIRecord(v: VesselAPIPosition) {
  return {
    mmsi: String(v.mmsi),
    name: v.vessel_name?.trim() || `VESSEL-${v.mmsi}`,
    type: "Unknown",
    latitude: v.latitude,
    longitude: v.longitude,
    speed: v.sog ?? 0,
    course: v.cog ?? 0,
    heading: v.heading ?? v.cog ?? 0,
    destination: "",
    flag: "",
    last_position_time: v.timestamp
      ? new Date(v.timestamp).toISOString()
      : new Date().toISOString(),
    properties: {
      source: "vesselapi",
      imo: v.imo,
      nav_status: v.nav_status,
      suspected_glitch: v.suspected_glitch,
    },
    updated_at: new Date().toISOString(),
  };
}

async function fetchZone(
  apiKey: string,
  zone: typeof WATCH_ZONES[0]
): Promise<VesselAPIPosition[]> {
  try {
    const params = new URLSearchParams({
      "filter.latBottom": String(zone.latBottom),
      "filter.latTop": String(zone.latTop),
      "filter.lonLeft": String(zone.lonLeft),
      "filter.lonRight": String(zone.lonRight),
      "pagination.limit": "50",
    });
    const res = await fetch(
      `https://api.vesselapi.com/v1/location/vessels/bounding-box?${params}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!res.ok) return [];
    const data: ZoneResult = await res.json();
    return Array.isArray(data.vessels) ? data.vessels : [];
  } catch {
    return [];
  }
}

async function ingestFromVesselAPI(
  supabase: ReturnType<typeof createClient>,
  apiKey: string
): Promise<{ count: number; zones: number; error?: string }> {
  // Fetch zones in parallel (batched to avoid overwhelming the API)
  const results = await Promise.allSettled(
    WATCH_ZONES.map(z => fetchZone(apiKey, z))
  );

  const seen = new Set<string>();
  const vessels: ReturnType<typeof mapVesselAPIRecord>[] = [];

  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const v of r.value) {
      const key = String(v.mmsi);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      vessels.push(mapVesselAPIRecord(v));
    }
  }

  if (vessels.length === 0) {
    return { count: 0, zones: 0, error: "VesselAPI returned no vessels for monitored zones" };
  }

  let count = 0;
  for (const vessel of vessels) {
    const { error } = await supabase
      .from("vessels")
      .upsert(vessel, { onConflict: "mmsi" });
    if (!error) count++;
  }

  return { count, zones: vessels.length };
}

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

    const apiKey = Deno.env.get("VESSEL_API_KEY") || "";
    let insertCount = 0;
    let source = "seed";
    let apiError: string | undefined;

    if (apiKey) {
      source = "vesselapi";
      const result = await ingestFromVesselAPI(supabase, apiKey);
      insertCount = result.count;
      apiError = result.error;
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
