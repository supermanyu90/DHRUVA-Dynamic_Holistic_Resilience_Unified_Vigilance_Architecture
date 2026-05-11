import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// AIS TYPE → readable label
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

// MMSI MID prefix → ISO-2 flag
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

// Strategic maritime bounding boxes [[lat1, lon1], [lat2, lon2]]
const BOUNDING_BOXES = [
  // Arabian Sea + West Indian coast
  [[8.0, 55.0], [28.0, 78.0]],
  // Bay of Bengal
  [[5.0, 80.0], [23.0, 100.0]],
  // Persian Gulf + Hormuz
  [[23.0, 48.0], [30.0, 60.0]],
  // Red Sea + Gulf of Aden
  [[10.0, 38.0], [22.0, 52.0]],
  // Strait of Malacca + Singapore
  [[0.0, 98.0], [7.0, 108.0]],
  // Central Indian Ocean
  [[-15.0, 60.0], [5.0, 85.0]],
];

// Vessel record accumulator
interface VesselAccum {
  mmsi: string;
  name: string;
  type: number;
  latitude: number;
  longitude: number;
  sog: number;
  cog: number;
  heading: number;
  nav_status: number;
  destination: string;
  callsign: string;
  imo: number;
  draught: number;
  dim_a: number;
  dim_b: number;
  dim_c: number;
  dim_d: number;
  time_utc: string;
  updated: boolean;
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

// Connect to AISStream via WebSocket, collect messages for `durationMs`, resolve with map of vessels
function streamAIS(apiKey: string, durationMs: number): Promise<Map<string, VesselAccum>> {
  return new Promise((resolve) => {
    const vessels = new Map<string, VesselAccum>();
    let ws: WebSocket;
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      try { ws?.close(); } catch { /* ignore */ }
      resolve(vessels);
    };

    const timer = setTimeout(finish, durationMs);

    try {
      ws = new WebSocket("wss://stream.aisstream.io/v0/stream");

      ws.onopen = () => {
        ws.send(JSON.stringify({
          APIKey: apiKey,
          BoundingBoxes: BOUNDING_BOXES,
          FilterMessageTypes: ["PositionReport", "ShipStaticData", "StandardClassBPositionReport", "ExtendedClassBPositionReport"],
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.error) {
            clearTimeout(timer);
            finish();
            return;
          }

          const meta = msg.MetaData || {};
          const mmsi = String(meta.MMSI || "");
          if (!mmsi || mmsi === "0") return;

          if (!vessels.has(mmsi)) {
            vessels.set(mmsi, {
              mmsi,
              name: (meta.ShipName || "").trim(),
              type: 0,
              latitude: meta.latitude ?? 0,
              longitude: meta.longitude ?? 0,
              sog: 0,
              cog: 0,
              heading: 0,
              nav_status: 15,
              destination: "",
              callsign: "",
              imo: 0,
              draught: 0,
              dim_a: 0, dim_b: 0, dim_c: 0, dim_d: 0,
              time_utc: meta.time_utc || new Date().toISOString(),
              updated: false,
            });
          }

          const v = vessels.get(mmsi)!;

          if (msg.MessageType === "PositionReport") {
            const p = msg.Message?.PositionReport || {};
            v.latitude = p.Latitude ?? meta.latitude ?? v.latitude;
            v.longitude = p.Longitude ?? meta.longitude ?? v.longitude;
            v.sog = p.Sog ?? v.sog;
            v.cog = p.Cog ?? v.cog;
            v.heading = (p.TrueHeading !== 511 ? p.TrueHeading : null) ?? v.cog;
            v.nav_status = p.NavigationalStatus ?? v.nav_status;
            v.time_utc = meta.time_utc || v.time_utc;
            v.updated = true;
          } else if (msg.MessageType === "StandardClassBPositionReport" || msg.MessageType === "ExtendedClassBPositionReport") {
            const p = msg.Message?.[msg.MessageType] || {};
            v.latitude = p.Latitude ?? meta.latitude ?? v.latitude;
            v.longitude = p.Longitude ?? meta.longitude ?? v.longitude;
            v.sog = p.Sog ?? v.sog;
            v.cog = p.Cog ?? v.cog;
            v.heading = (p.TrueHeading !== 511 ? p.TrueHeading : null) ?? v.cog;
            v.time_utc = meta.time_utc || v.time_utc;
            v.updated = true;
            if (p.Name) v.name = p.Name.trim();
            if (p.Type) v.type = p.Type;
            if (p.Dimension) {
              v.dim_a = p.Dimension.A || 0;
              v.dim_b = p.Dimension.B || 0;
              v.dim_c = p.Dimension.C || 0;
              v.dim_d = p.Dimension.D || 0;
            }
          } else if (msg.MessageType === "ShipStaticData") {
            const s = msg.Message?.ShipStaticData || {};
            if (s.Name) v.name = s.Name.trim();
            if (s.Type) v.type = s.Type;
            if (s.CallSign) v.callsign = s.CallSign.trim();
            if (s.ImoNumber) v.imo = s.ImoNumber;
            if (s.Destination) v.destination = s.Destination.trim();
            if (s.MaximumStaticDraught) v.draught = s.MaximumStaticDraught;
            if (s.Dimension) {
              v.dim_a = s.Dimension.A || 0;
              v.dim_b = s.Dimension.B || 0;
              v.dim_c = s.Dimension.C || 0;
              v.dim_d = s.Dimension.D || 0;
            }
          }
        } catch { /* ignore malformed messages */ }
      };

      ws.onerror = () => { clearTimeout(timer); finish(); };
      ws.onclose = () => { clearTimeout(timer); finish(); };

    } catch {
      clearTimeout(timer);
      resolve(vessels);
    }
  });
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

    const apiKey = Deno.env.get("AISSTREAM_API_KEY") || Deno.env.get("VESSEL_API_KEY") || "";
    let insertCount = 0;
    let source = "seed";
    let apiError: string | undefined;

    if (apiKey) {
      // Collect messages for 20 seconds — enough to fill the strategic zones
      const vesselMap = await streamAIS(apiKey, 20_000);
      const vessels = Array.from(vesselMap.values()).filter(v => v.updated && v.latitude !== 0 && v.longitude !== 0);

      if (vessels.length > 0) {
        source = "aisstream";
        for (const v of vessels) {
          const length = (v.dim_a + v.dim_b) || undefined;
          const beam   = (v.dim_c + v.dim_d) || undefined;
          const record = {
            mmsi: v.mmsi,
            name: v.name || `VESSEL-${v.mmsi}`,
            type: aisTypeToString(v.type),
            latitude: v.latitude,
            longitude: v.longitude,
            speed: v.sog,
            course: v.cog,
            heading: v.heading || v.cog,
            destination: v.destination,
            flag: mmsiToFlag(v.mmsi),
            last_position_time: v.time_utc
              ? new Date(v.time_utc).toISOString()
              : new Date().toISOString(),
            properties: {
              source: "aisstream",
              imo: v.imo || undefined,
              callsign: v.callsign || undefined,
              nav_status: v.nav_status,
              draught: v.draught || undefined,
              length: length && length > 0 ? length : undefined,
              beam: beam && beam > 0 ? beam : undefined,
              type_code: v.type || undefined,
            },
            updated_at: new Date().toISOString(),
          };
          const { error } = await supabase
            .from("vessels")
            .upsert(record, { onConflict: "mmsi" });
          if (!error) insertCount++;
        }
      } else {
        apiError = "AISStream returned no vessels — check AISSTREAM_API_KEY";
      }
    }

    // Fall back to seed data
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
