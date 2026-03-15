import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EONETGeometry {
  date: string;
  type: string;
  coordinates: [number, number];
}

interface EONETEvent {
  id: string;
  title: string;
  categories: Array<{ id: string; title: string }>;
  geometries: EONETGeometry[];
  closed?: string;
  [key: string]: any;
}

interface EONETResponse {
  events: EONETEvent[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const eonetUrl = 'https://eonet.gsfc.nasa.gov/api/v3/events';

    const response = await fetch(eonetUrl);
    if (!response.ok) {
      throw new Error(`NASA EONET API error: ${response.status}`);
    }

    const data: EONETResponse = await response.json();

    const disasters = data.events.map((event) => {
      const latestGeometry = event.geometries[event.geometries.length - 1];
      return {
        event_id: event.id,
        title: event.title,
        category: event.categories[0]?.title || 'Unknown',
        latitude: latestGeometry?.coordinates[1] || null,
        longitude: latestGeometry?.coordinates[0] || null,
        event_date: latestGeometry?.date || new Date().toISOString(),
        closed: !!event.closed,
        properties: {
          categories: event.categories,
          geometries: event.geometries,
          closed: event.closed,
        },
      };
    });

    const { data: inserted, error: dbError } = await supabase
      .from('disasters')
      .upsert(disasters, { onConflict: 'event_id', ignoreDuplicates: false });

    if (dbError) {
      throw dbError;
    }

    const responseTime = Date.now() - startTime;

    await supabase.from('api_logs').insert({
      endpoint: '/ingest-disasters',
      method: req.method,
      status_code: 200,
      response_time_ms: responseTime,
    });

    return new Response(
      JSON.stringify({
        success: true,
        count: disasters.length,
        responseTime,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        responseTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
