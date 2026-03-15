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
  60: "Passenger", 61: "Passenger", 62: "Passenger", 63: "Passenger", 64: "Passenger", 65: "Passenger", 66: "Passenger", 67: "Passenger", 68: "Passenger", 69: "Passenger",
  70: "Cargo", 71: "Cargo", 72: "Cargo", 73: "Cargo", 74: "Cargo", 75: "Cargo", 76: "Cargo", 77: "Cargo", 78: "Cargo", 79: "Cargo",
  80: "Tanker", 81: "Tanker", 82: "Tanker", 83: "Tanker", 84: "Tanker", 85: "Tanker", 86: "Tanker", 87: "Tanker", 88: "Tanker", 89: "Tanker",
  90: "Other", 91: "Other", 92: "Other", 93: "Other", 94: "Other", 95: "Other", 96: "Other", 97: "Other", 98: "Other", 99: "Other",
};

// Fallback seed data used when aisstream.io API key is not configured
const SEED_VESSELS = [
  { mmsi: "211456780", name: "NORDIC CROWN", type: "Tanker", lat: 51.95, lon: 4.13, speed: 8.2, course: 270, flag: "DE", destination: "ROTTERDAM" },
  { mmsi: "477123456", name: "COSCO SHIPPING ARIES", type: "Cargo", lat: 22.28, lon: 114.18, speed: 12.1, course: 180, flag: "CN", destination: "SINGAPORE" },
  { mmsi: "235678901", name: "MSC ANNA", type: "Cargo", lat: 36.12, lon: -6.01, speed: 14.3, course: 200, flag: "GB", destination: "ALGECIRAS" },
  { mmsi: "311234567", name: "OCEAN SPIRIT", type: "Tanker", lat: 26.4, lon: 56.3, speed: 9.8, course: 315, flag: "BH", destination: "FUJAIRAH" },
  { mmsi: "538045678", name: "EVER ACE", type: "Cargo", lat: 30.2, lon: 32.6, speed: 7.5, course: 350, flag: "MH", destination: "SUEZ" },
  { mmsi: "563234567", name: "KOTA MAWAR", type: "Cargo", lat: 1.26, lon: 103.82, speed: 11.2, course: 90, flag: "SG", destination: "TANJUNG PELEPAS" },
  { mmsi: "215678901", name: "MAERSK ELBA", type: "Cargo", lat: 12.5, lon: 43.5, speed: 6.1, course: 160, flag: "MT", destination: "DJIBOUTI" },
  { mmsi: "636023456", name: "FRONTLINE ZONDA", type: "Tanker", lat: 14.5, lon: 52.0, speed: 13.4, course: 200, flag: "LR", destination: "ADEN" },
  { mmsi: "229078901", name: "AEGEAN ARROW", type: "Tanker", lat: 37.9, lon: 23.7, speed: 5.0, course: 45, flag: "GR", destination: "PIRAEUS" },
  { mmsi: "248045678", name: "ADRIATIC SKY", type: "Cargo", lat: 45.4, lon: 12.35, speed: 7.8, course: 315, flag: "MT", destination: "VENICE" },
  { mmsi: "319067890", name: "CAYMAN TRADER", type: "Tanker", lat: 19.3, lon: -72.5, speed: 10.2, course: 270, flag: "KY", destination: "PORT-AU-PRINCE" },
  { mmsi: "416078901", name: "FORMOSA GLORY", type: "Cargo", lat: 24.8, lon: 122.2, speed: 15.0, course: 0, flag: "TW", destination: "KAOHSIUNG" },
  { mmsi: "440234567", name: "HMM ALGECIRAS", type: "Cargo", lat: 35.1, lon: 129.1, speed: 18.5, course: 270, flag: "KR", destination: "BUSAN" },
  { mmsi: "374023456", name: "PACIFIC NAVIGATOR", type: "Tanker", lat: -33.9, lon: 18.4, speed: 11.0, course: 90, flag: "PA", destination: "CAPE TOWN" },
  { mmsi: "512078901", name: "SOUTHERN CROSS", type: "Cargo", lat: -37.8, lon: 144.9, speed: 6.5, course: 180, flag: "NZ", destination: "MELBOURNE" },
  { mmsi: "710234567", name: "PETROBRAS VEGA", type: "Tanker", lat: -22.9, lon: -43.2, speed: 8.9, course: 90, flag: "BR", destination: "RIO DE JANEIRO" },
  { mmsi: "338078901", name: "USS ARLEIGH BURKE", type: "Military", lat: 38.0, lon: 26.0, speed: 20.0, course: 180, flag: "US", destination: "MEDITERRANEAN" },
  { mmsi: "277023456", name: "VLADIVOSTOK STAR", type: "Cargo", lat: 43.1, lon: 131.9, speed: 9.2, course: 90, flag: "RU", destination: "VLADIVOSTOK" },
  { mmsi: "201678901", name: "OSLO BREAKBULK", type: "Cargo", lat: 59.9, lon: 10.7, speed: 7.1, course: 0, flag: "NO", destination: "OSLO" },
  { mmsi: "431234567", name: "TOKYO MARU", type: "Tanker", lat: 35.4, lon: 139.6, speed: 12.0, course: 135, flag: "JP", destination: "YOKOHAMA" },
  { mmsi: "503078901", name: "RIO TINTO SPIRIT", type: "Cargo", lat: -31.9, lon: 115.8, speed: 10.5, course: 270, flag: "AU", destination: "FREMANTLE" },
  { mmsi: "657023456", name: "MOMBASA EXPRESS", type: "Cargo", lat: -4.0, lon: 39.7, speed: 8.3, course: 315, flag: "KE", destination: "MOMBASA" },
  { mmsi: "341678901", name: "GUAYAQUIL GLORY", type: "Tanker", lat: -2.2, lon: -79.9, speed: 9.7, course: 270, flag: "EC", destination: "GUAYAQUIL" },
  { mmsi: "518034567", name: "AUCKLAND PIONEER", type: "Cargo", lat: -36.8, lon: 174.7, speed: 11.8, course: 90, flag: "NZ", destination: "AUCKLAND" },
  { mmsi: "445678901", name: "BUSAN CARRIER", type: "Cargo", lat: 33.5, lon: 129.0, speed: 14.2, course: 45, flag: "KR", destination: "BUSAN" },
  { mmsi: "566987001", name: "STRAITS EXPRESS", type: "Cargo", lat: 1.1, lon: 103.5, speed: 13.2, course: 270, flag: "SG", destination: "PORT KLANG" },
  { mmsi: "477009800", name: "PACIFIC JADE", type: "Tanker", lat: 34.2, lon: 122.8, speed: 9.5, course: 180, flag: "CN", destination: "NINGBO" },
  { mmsi: "305001780", name: "ATLANTIC ARROW", type: "Cargo", lat: 52.1, lon: -1.8, speed: 8.1, course: 270, flag: "AG", destination: "SOUTHAMPTON" },
  { mmsi: "636014000", name: "LIBERIA STAR", type: "Tanker", lat: 5.2, lon: -1.8, speed: 11.0, course: 180, flag: "LR", destination: "TEMA" },
  { mmsi: "352001234", name: "PANAMA BREEZE", type: "Cargo", lat: 8.9, lon: -79.6, speed: 7.3, course: 315, flag: "PA", destination: "COLON" },
  { mmsi: "232001001", name: "HMS DEFENDER", type: "Military", lat: 51.5, lon: -4.0, speed: 18.0, course: 90, flag: "GB", destination: "PORTSMOUTH" },
  { mmsi: "338301001", name: "USS JOHN PAUL JONES", type: "Military", lat: 13.5, lon: 144.8, speed: 22.0, course: 45, flag: "US", destination: "GUAM" },
  { mmsi: "355001234", name: "PACIFIC GLORY", type: "Tanker", lat: -8.5, lon: 115.2, speed: 10.0, course: 90, flag: "PA", destination: "BALI" },
  { mmsi: "209001234", name: "CYPRUS TRADER", type: "Cargo", lat: 35.1, lon: 33.4, speed: 6.5, course: 180, flag: "CY", destination: "LIMASSOL" },
  { mmsi: "376001234", name: "TRINIDAD STAR", type: "Tanker", lat: 10.6, lon: -61.5, speed: 9.0, course: 270, flag: "TT", destination: "PORT OF SPAIN" },
];

async function ingestFromAISStream(supabase: ReturnType<typeof createClient>, apiKey: string): Promise<number> {
  return new Promise((resolve) => {
    const WebSocket = (globalThis as any).WebSocket;
    if (!WebSocket) {
      resolve(0);
      return;
    }

    const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
    const vessels: any[] = [];
    let timeout: ReturnType<typeof setTimeout>;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        Apikey: apiKey,
        BoundingBoxes: [
          [[-90, -180], [90, 180]]
        ],
        FilterMessageTypes: ["PositionReport", "ShipStaticData"],
      }));
      timeout = setTimeout(async () => {
        ws.close();
        let count = 0;
        for (const v of vessels.slice(0, 100)) {
          const { error } = await supabase.from("vessels").upsert(v, { onConflict: "mmsi" });
          if (!error) count++;
        }
        resolve(count);
      }, 10000);
    };

    ws.onmessage = (event: any) => {
      try {
        const msg = JSON.parse(event.data);
        const meta = msg.MetaData;
        if (!meta) return;

        const pos = msg.Message?.PositionReport;
        const stat = msg.Message?.ShipStaticData;

        if (pos && meta.MMSI) {
          vessels.push({
            mmsi: String(meta.MMSI),
            name: meta.ShipName?.trim() || `VESSEL-${meta.MMSI}`,
            type: AIS_SHIP_TYPES[stat?.Type ?? 0] || "Unknown",
            latitude: pos.Latitude,
            longitude: pos.Longitude,
            speed: pos.Sog || 0,
            course: pos.Cog || 0,
            heading: pos.TrueHeading || pos.Cog || 0,
            destination: stat?.Destination?.trim() || "",
            flag: "",
            last_position_time: meta.time_utc || new Date().toISOString(),
            properties: { source: "aisstream.io", navstat: pos.NavigationalStatus },
            updated_at: new Date().toISOString(),
          });
        }
      } catch (_) {}
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      resolve(0);
    };
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

    const aisApiKey = Deno.env.get("AISSTREAM_API_KEY") || "";
    let insertCount = 0;
    let source = "seed";

    if (aisApiKey) {
      source = "aisstream.io";
      insertCount = await ingestFromAISStream(supabase, aisApiKey);
    }

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
        const { error } = await supabase.from("vessels").upsert(record, { onConflict: "mmsi" });
        if (!error) insertCount++;
      }
    }

    const responseTime = Date.now() - startTime;
    await supabase.from("api_logs").insert({ endpoint: "/ingest-vessels", method: "POST", status_code: 200, response_time_ms: responseTime });

    return new Response(
      JSON.stringify({ success: true, count: insertCount, source, responseTime }),
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
