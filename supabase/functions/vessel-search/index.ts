import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    let queryBuilder = supabase
      .from("vessels")
      .select("*")
      .order("last_position_time", { ascending: false })
      .limit(limit);

    if (mmsi) {
      queryBuilder = queryBuilder.eq("mmsi", mmsi);
    } else if (query) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%,destination.ilike.%${query}%,mmsi.ilike.%${query}%`);
    }

    if (type) {
      queryBuilder = queryBuilder.ilike("type", `%${type}%`);
    }

    if (flag) {
      queryBuilder = queryBuilder.ilike("flag", flag);
    }

    const { data, error } = await queryBuilder;

    if (error) throw error;

    const aisApiKey = Deno.env.get("AISSTREAM_API_KEY") || "";

    return new Response(
      JSON.stringify({
        success: true,
        count: data?.length || 0,
        vessels: data || [],
        source: aisApiKey ? "aisstream.io + db" : "db-seed",
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
