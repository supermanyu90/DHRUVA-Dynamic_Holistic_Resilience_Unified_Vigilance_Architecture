import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Representative vessel positions from major shipping lanes (static seed for demo)
// These approximate real-world high-traffic zones
const SEED_VESSELS = [
  { mmsi: "211456780", name: "NORDIC CROWN", type: "Tanker", lat: 51.95, lon: 4.13, speed: 8.2, course: 270, flag: "DE", destination: "ROTTERDAM" },
  { mmsi: "477123456", name: "COSCO SHIPPING", type: "Cargo", lat: 22.28, lon: 114.18, speed: 12.1, course: 180, flag: "CN", destination: "SINGAPORE" },
  { mmsi: "235678901", name: "MSC ANNA", type: "Cargo", lat: 36.12, lon: -6.01, speed: 14.3, course: 200, flag: "GB", destination: "ALGECIRAS" },
  { mmsi: "311234567", name: "OCEAN SPIRIT", type: "Tanker", lat: 26.4, lon: 56.3, speed: 9.8, course: 315, flag: "BH", destination: "FUJAIRAH" },
  { mmsi: "538045678", name: "EVER GIVEN II", type: "Cargo", lat: 30.2, lon: 32.6, speed: 7.5, course: 350, flag: "MH", destination: "SUEZ" },
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
  { mmsi: "277023456", name: "MOSKVA TRADER", type: "Cargo", lat: 43.1, lon: 131.9, speed: 9.2, course: 90, flag: "RU", destination: "VLADIVOSTOK" },
  { mmsi: "201678901", name: "OSLO BREAKBULK", type: "Cargo", lat: 59.9, lon: 10.7, speed: 7.1, course: 0, flag: "NO", destination: "OSLO" },
  { mmsi: "431234567", name: "TOKYO MARU", type: "Tanker", lat: 35.4, lon: 139.6, speed: 12.0, course: 135, flag: "JP", destination: "YOKOHAMA" },
  { mmsi: "503078901", name: "RIO TINTO SPIRIT", type: "Cargo", lat: -31.9, lon: 115.8, speed: 10.5, course: 270, flag: "AU", destination: "FREMANTLE" },
  { mmsi: "657023456", name: "MOMBASA EXPRESS", type: "Cargo", lat: -4.0, lon: 39.7, speed: 8.3, course: 315, flag: "KE", destination: "MOMBASA" },
  { mmsi: "341678901", name: "GUAYAQUIL GLORY", type: "Tanker", lat: -2.2, lon: -79.9, speed: 9.7, course: 270, flag: "EC", destination: "GUAYAQUIL" },
  { mmsi: "518034567", name: "AUCKLAND PIONEER", type: "Cargo", lat: -36.8, lon: 174.7, speed: 11.8, course: 90, flag: "NZ", destination: "AUCKLAND" },
  { mmsi: "445678901", name: "BUSAN CARRIER", type: "Cargo", lat: 33.5, lon: 129.0, speed: 14.2, course: 45, flag: "KR", destination: "BUSAN" },
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

    let insertCount = 0;

    for (const vessel of SEED_VESSELS) {
      // Add small random drift to simulate live movement
      const driftLat = (Math.random() - 0.5) * 0.05;
      const driftLon = (Math.random() - 0.5) * 0.05;

      const record = {
        mmsi: vessel.mmsi,
        name: vessel.name,
        type: vessel.type,
        latitude: vessel.lat + driftLat,
        longitude: vessel.lon + driftLon,
        speed: vessel.speed + (Math.random() - 0.5) * 0.5,
        course: vessel.course,
        heading: vessel.course,
        destination: vessel.destination,
        flag: vessel.flag,
        last_position_time: new Date().toISOString(),
        properties: { source: "ais-simulation" },
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("vessels")
        .upsert(record, { onConflict: "mmsi" });

      if (!error) insertCount++;
    }

    const responseTime = Date.now() - startTime;

    await supabase.from("api_logs").insert({
      endpoint: "/ingest-vessels",
      method: "POST",
      status_code: 200,
      response_time_ms: responseTime,
    });

    return new Response(
      JSON.stringify({ success: true, count: insertCount, responseTime }),
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
