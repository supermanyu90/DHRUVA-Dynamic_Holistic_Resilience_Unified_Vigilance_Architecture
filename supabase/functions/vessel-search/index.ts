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

// Stream AISStream for a single MMSI for up to durationMs, return first match
function streamForMMSI(apiKey: string, mmsi: string, durationMs: number): Promise<any | null> {
  return new Promise((resolve) => {
    let ws: WebSocket;
    let settled = false;

    const finish = (result: any | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws?.close(); } catch { /* ignore */ }
      resolve(result);
    };

    const timer = setTimeout(() => finish(null), durationMs);

    try {
      ws = new WebSocket("wss://stream.aisstream.io/v0/stream");

      ws.onopen = () => {
        ws.send(JSON.stringify({
          APIKey: apiKey,
          BoundingBoxes: [[[-90, -180], [90, 180]]],
          FiltersShipMMSI: [mmsi],
          FilterMessageTypes: ["PositionReport", "ShipStaticData", "StandardClassBPositionReport", "ExtendedClassBPositionReport"],
        }));
      };

      const accum: Record<string, any> = { mmsi };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.error) { finish(null); return; }

          const meta = msg.MetaData || {};
          if (String(meta.MMSI || "") !== mmsi) return;

          if (meta.ShipName) accum.name = (meta.ShipName as string).trim();
          accum.time_utc = meta.time_utc || accum.time_utc;

          if (msg.MessageType === "PositionReport") {
            const p = msg.Message?.PositionReport || {};
            accum.latitude = p.Latitude ?? meta.latitude;
            accum.longitude = p.Longitude ?? meta.longitude;
            accum.sog = p.Sog;
            accum.cog = p.Cog;
            accum.heading = p.TrueHeading !== 511 ? p.TrueHeading : p.Cog;
            accum.nav_status = p.NavigationalStatus;
            accum.hasPosition = true;
          } else if (msg.MessageType === "ShipStaticData") {
            const s = msg.Message?.ShipStaticData || {};
            if (s.Name) accum.name = s.Name.trim();
            accum.type = s.Type;
            accum.callsign = s.CallSign?.trim();
            accum.imo = s.ImoNumber;
            accum.destination = s.Destination?.trim();
            accum.draught = s.MaximumStaticDraught;
            if (s.Dimension) {
              accum.length = (s.Dimension.A || 0) + (s.Dimension.B || 0);
              accum.beam   = (s.Dimension.C || 0) + (s.Dimension.D || 0);
            }
          } else if (msg.MessageType === "StandardClassBPositionReport" || msg.MessageType === "ExtendedClassBPositionReport") {
            const p = msg.Message?.[msg.MessageType] || {};
            accum.latitude = p.Latitude ?? meta.latitude;
            accum.longitude = p.Longitude ?? meta.longitude;
            accum.sog = p.Sog;
            accum.cog = p.Cog;
            accum.heading = p.TrueHeading !== 511 ? p.TrueHeading : p.Cog;
            if (p.Name) accum.name = p.Name.trim();
            if (p.Type) accum.type = p.Type;
            accum.hasPosition = true;
          }

          // Once we have a position, that's enough to return
          if (accum.hasPosition) finish(accum);
        } catch { /* ignore */ }
      };

      ws.onerror = () => finish(null);
      ws.onclose = () => finish(settled ? null : accum.hasPosition ? accum : null);
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
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

    const apiKey = Deno.env.get("AISSTREAM_API_KEY") || Deno.env.get("VESSEL_API_KEY") || "";

    // Live MMSI lookup via AISStream (10s window)
    if (mmsi && apiKey) {
      const raw = await streamForMMSI(apiKey, mmsi, 10_000);
      if (raw?.hasPosition) {
        const vessel = {
          mmsi: String(raw.mmsi),
          name: raw.name || `VESSEL-${raw.mmsi}`,
          type: aisTypeToString(raw.type || 0),
          latitude: raw.latitude,
          longitude: raw.longitude,
          speed: raw.sog ?? 0,
          course: raw.cog ?? 0,
          heading: raw.heading ?? raw.cog ?? 0,
          destination: raw.destination || "",
          flag: mmsiToFlag(String(raw.mmsi)),
          last_position_time: raw.time_utc
            ? new Date(raw.time_utc).toISOString()
            : new Date().toISOString(),
          properties: {
            source: "aisstream",
            imo: raw.imo || undefined,
            callsign: raw.callsign || undefined,
            nav_status: raw.nav_status,
            draught: raw.draught || undefined,
            length: raw.length && raw.length > 0 ? raw.length : undefined,
            beam: raw.beam && raw.beam > 0 ? raw.beam : undefined,
            type_code: raw.type || undefined,
          },
          updated_at: new Date().toISOString(),
        };
        await supabase.from("vessels").upsert(vessel, { onConflict: "mmsi" });
        return new Response(
          JSON.stringify({ success: true, count: 1, vessels: [vessel], source: "aisstream" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fall back to DB query
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
        source: apiKey ? "aisstream-db" : "db-seed",
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
