import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface USGSFeature {
  id: string;
  properties: {
    mag: number;
    place: string;
    time: number;
    updated: number;
    depth?: number;
    [key: string]: any;
  };
  geometry: {
    coordinates: [number, number, number];
  };
}

interface USGSResponse {
  features: USGSFeature[];
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

    const usgsUrl = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';

    const response = await fetch(usgsUrl);
    if (!response.ok) {
      throw new Error(`USGS API error: ${response.status}`);
    }

    const data: USGSResponse = await response.json();

    const earthquakes = data.features.map((feature) => ({
      event_id: feature.id,
      magnitude: feature.properties.mag,
      location: feature.properties.place,
      latitude: feature.geometry.coordinates[1],
      longitude: feature.geometry.coordinates[0],
      depth: feature.geometry.coordinates[2],
      event_time: new Date(feature.properties.time).toISOString(),
      updated_at: new Date(feature.properties.updated).toISOString(),
      properties: feature.properties,
    }));

    const { data: inserted, error: dbError } = await supabase
      .from('earthquakes')
      .upsert(earthquakes, { onConflict: 'event_id', ignoreDuplicates: false });

    if (dbError) {
      throw dbError;
    }

    const responseTime = Date.now() - startTime;

    await supabase.from('api_logs').insert({
      endpoint: '/ingest-earthquakes',
      method: req.method,
      status_code: 200,
      response_time_ms: responseTime,
    });

    return new Response(
      JSON.stringify({
        success: true,
        count: earthquakes.length,
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
