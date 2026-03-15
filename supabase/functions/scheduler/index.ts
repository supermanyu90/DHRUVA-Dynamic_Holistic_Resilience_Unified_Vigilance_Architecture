import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

async function callIngestFunction(functionName: string, supabaseUrl: string): Promise<void> {
  const url = `${supabaseUrl}/functions/v1/${functionName}`;
  const response = await fetch(url, { method: 'POST' });
  if (!response.ok) {
    console.error(`Failed to call ${functionName}:`, response.statusText);
  }
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

    const ingestFunctions = [
      'ingest-earthquakes',
      'ingest-disasters',
      'ingest-news',
      'ingest-news-intel',
      'ingest-vessels',
      'ingest-volcanoes',
      'ingest-gov-announcements',
      'ingest-cyber-threats',
      'ingest-info-ops',
    ];

    const results = await Promise.allSettled(
      ingestFunctions.map(fn => callIngestFunction(fn, supabaseUrl))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    await supabase.from('data_cache').upsert({
      cache_key: 'last_sync',
      data_type: 'scheduler',
      data: {
        timestamp: new Date().toISOString(),
        successful,
        failed,
      },
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    }, { onConflict: 'cache_key' });

    const responseTime = Date.now() - startTime;

    await supabase.from('api_logs').insert({
      endpoint: '/scheduler',
      method: req.method,
      status_code: 200,
      response_time_ms: responseTime,
    });

    return new Response(
      JSON.stringify({
        success: true,
        totalFunctions: ingestFunctions.length,
        successful,
        failed,
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
