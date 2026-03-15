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

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch from Smithsonian GVP weekly activity report RSS
    const rssUrl = "https://volcano.si.edu/news/WeeklyVolcanoRSS.xml";
    const response = await fetch(rssUrl, {
      headers: { "User-Agent": "DHRUVA-Intelligence/1.0" },
    });

    let insertCount = 0;

    if (response.ok) {
      const xml = await response.text();
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

      for (const item of items.slice(0, 30)) {
        const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
          item.match(/<title>(.*?)<\/title>/);
        const descMatch = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ||
          item.match(/<description>([\s\S]*?)<\/description>/);
        const linkMatch = item.match(/<link>(.*?)<\/link>/);
        const guidMatch = item.match(/<guid[^>]*>(.*?)<\/guid>/);

        if (!titleMatch) continue;

        const title = titleMatch[1].trim();
        const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
        const volId = guidMatch ? `gvp-${guidMatch[1].replace(/[^a-z0-9]/gi, "-").toLowerCase()}` : `gvp-${Date.now()}`;

        const latMatch = desc.match(/(\d{1,2}\.\d+)[°\s]*[Nn]/);
        const lonMatch = desc.match(/(\d{1,3}\.\d+)[°\s]*[EeWw]/);

        const volcanicRecord = {
          volcano_id: volId,
          name: title.split(":")[0].trim(),
          country: null as string | null,
          latitude: latMatch ? parseFloat(latMatch[1]) : null,
          longitude: lonMatch ? parseFloat(lonMatch[1]) : null,
          status: desc.toLowerCase().includes("eruption") || desc.toLowerCase().includes("lava") ? "erupting" : "unrest",
          alert_level: null as string | null,
          activity_description: desc.substring(0, 500),
          last_eruption: new Date().toISOString().substring(0, 7),
          source: "smithsonian-gvp",
          properties: { url: linkMatch ? linkMatch[1] : "", raw: desc.substring(0, 200) },
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("volcanoes")
          .upsert(volcanicRecord, { onConflict: "volcano_id" });

        if (!error) insertCount++;
      }
    }

    const responseTime = Date.now() - startTime;

    await supabase.from("api_logs").insert({
      endpoint: "/ingest-volcanoes",
      method: "POST",
      status_code: 200,
      response_time_ms: responseTime,
    });

    return new Response(
      JSON.stringify({ success: true, count: insertCount, responseTime }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const responseTime = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage, responseTime }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
