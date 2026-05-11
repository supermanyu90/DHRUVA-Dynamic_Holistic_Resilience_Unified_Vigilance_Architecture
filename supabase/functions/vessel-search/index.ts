import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

interface VesselAPIStatic {
  mmsi: number;
  imo?: number;
  name: string;
  vessel_type?: string;
  country?: string;
  length?: number;
  breadth?: number;
  draft?: number;
  gross_tonnage?: number;
  deadweight_tonnage?: number;
  year_built?: number;
  call_sign?: string;
  owner_name?: string;
}

async function livePositionByMMSI(apiKey: string, mmsi: string): Promise<any | null> {
  try {
    const res = await fetch(
      `https://api.vesselapi.com/v1/vessel/${mmsi}/position?filter.idType=mmsi`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const pos: VesselAPIPosition = data.position || data;
    if (!pos?.mmsi) return null;

    // Also fetch static data for type/flag enrichment
    let stat: VesselAPIStatic | null = null;
    try {
      const sr = await fetch(
        `https://api.vesselapi.com/v1/vessel/${mmsi}?filter.idType=mmsi`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      if (sr.ok) {
        const sd = await sr.json();
        stat = sd.vessel || null;
      }
    } catch { /* enrichment is optional */ }

    return {
      mmsi: String(pos.mmsi),
      name: (stat?.name || pos.vessel_name)?.trim() || `VESSEL-${pos.mmsi}`,
      type: stat?.vessel_type || "Unknown",
      latitude: pos.latitude,
      longitude: pos.longitude,
      speed: pos.sog ?? 0,
      course: pos.cog ?? 0,
      heading: pos.heading ?? pos.cog ?? 0,
      destination: "",
      flag: stat?.country || "",
      last_position_time: pos.timestamp
        ? new Date(pos.timestamp).toISOString()
        : new Date().toISOString(),
      properties: {
        source: "vesselapi-live",
        imo: pos.imo ?? stat?.imo,
        callsign: stat?.call_sign,
        nav_status: pos.nav_status,
        suspected_glitch: pos.suspected_glitch,
        length: stat?.length,
        beam: stat?.breadth,
        draft: stat?.draft,
        gt: stat?.gross_tonnage,
        dwt: stat?.deadweight_tonnage,
        year_built: stat?.year_built,
        owner: stat?.owner_name,
      },
    };
  } catch {
    return null;
  }
}

async function searchByName(apiKey: string, name: string, limit: number): Promise<any[]> {
  try {
    const params = new URLSearchParams({
      "filter.name": name,
      "pagination.limit": String(Math.min(limit, 50)),
    });
    const res = await fetch(
      `https://api.vesselapi.com/v1/search/vessels?${params}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const vessels: VesselAPIStatic[] = data.vessels || [];
    return vessels.map(v => ({
      mmsi: String(v.mmsi),
      name: v.name?.trim() || `VESSEL-${v.mmsi}`,
      type: v.vessel_type || "Unknown",
      latitude: null,
      longitude: null,
      speed: 0,
      course: 0,
      heading: 0,
      destination: "",
      flag: v.country || "",
      last_position_time: null,
      properties: {
        source: "vesselapi-search",
        imo: v.imo,
        callsign: v.call_sign,
        length: v.length,
        beam: v.breadth,
        draft: v.draft,
        gt: v.gross_tonnage,
        dwt: v.deadweight_tonnage,
        year_built: v.year_built,
        owner: v.owner_name,
      },
    }));
  } catch {
    return [];
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

    const apiKey = Deno.env.get("VESSEL_API_KEY") || "";

    // Live MMSI lookup via VesselAPI
    if (mmsi && apiKey) {
      const live = await livePositionByMMSI(apiKey, mmsi);
      if (live) {
        await supabase
          .from("vessels")
          .upsert({ ...live, updated_at: new Date().toISOString() }, { onConflict: "mmsi" });
        return new Response(
          JSON.stringify({ success: true, count: 1, vessels: [live], source: "vesselapi-live" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Live name search via VesselAPI
    if (query && apiKey) {
      const liveResults = await searchByName(apiKey, query, limit);
      if (liveResults.length > 0) {
        return new Response(
          JSON.stringify({ success: true, count: liveResults.length, vessels: liveResults, source: "vesselapi-search" }),
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
      JSON.stringify({ success: true, count: data?.length || 0, vessels: data || [], source: apiKey ? "vesselapi-db" : "db-seed" }),
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
