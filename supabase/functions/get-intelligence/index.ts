import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const dataType = url.searchParams.get('type');
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const minMagnitude = parseFloat(url.searchParams.get('minMag') || '0');

    let result;

    switch (dataType) {
      case 'earthquakes': {
        const { data, error } = await supabase
          .from('earthquakes')
          .select('*')
          .gte('magnitude', minMagnitude)
          .order('event_time', { ascending: false })
          .limit(limit);

        if (error) throw error;
        result = data;
        break;
      }

      case 'disasters': {
        const { data, error } = await supabase
          .from('disasters')
          .select('*')
          .eq('closed', false)
          .order('event_date', { ascending: false })
          .limit(limit);

        if (error) throw error;
        result = data;
        break;
      }

      case 'news': {
        const { data, error } = await supabase
          .from('news_events')
          .select('*')
          .order('published_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        result = data;
        break;
      }

      case 'vessels': {
        const { data, error } = await supabase
          .from('vessels')
          .select('*')
          .order('last_position_time', { ascending: false })
          .limit(limit);

        if (error) throw error;
        result = data;
        break;
      }

      case 'cyber-threats': {
        const { data, error } = await supabase
          .from('cyber_threats')
          .select('*')
          .eq('is_active', true)
          .order('first_seen', { ascending: false })
          .limit(limit);

        if (error) throw error;
        result = data;
        break;
      }

      case 'bank-events': {
        const { data, error } = await supabase
          .from('bank_events')
          .select('*')
          .order('event_time', { ascending: false })
          .limit(limit);

        if (error) throw error;
        result = data;
        break;
      }

      case 'info-ops': {
        const { data, error } = await supabase
          .from('info_ops')
          .select('*')
          .eq('is_active', true)
          .order('first_detected', { ascending: false })
          .limit(limit);

        if (error) throw error;
        result = data;
        break;
      }

      case 'uae-twitter': {
        const { data, error } = await supabase
          .from('uae_twitter_feed')
          .select('*')
          .order('posted_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        result = data;
        break;
      }

      case 'all': {
        const [earthquakes, disasters, news, vessels, threats, banks, infoOps, twitter] = await Promise.all([
          supabase.from('earthquakes').select('*').gte('magnitude', 4).order('event_time', { ascending: false }).limit(50),
          supabase.from('disasters').select('*').eq('closed', false).order('event_date', { ascending: false }).limit(50),
          supabase.from('news_events').select('*').order('published_at', { ascending: false }).limit(50),
          supabase.from('vessels').select('*').order('last_position_time', { ascending: false }).limit(50),
          supabase.from('cyber_threats').select('*').eq('is_active', true).order('first_seen', { ascending: false }).limit(50),
          supabase.from('bank_events').select('*').order('event_time', { ascending: false }).limit(50),
          supabase.from('info_ops').select('*').eq('is_active', true).order('first_detected', { ascending: false }).limit(50),
          supabase.from('uae_twitter_feed').select('*').order('posted_at', { ascending: false }).limit(50),
        ]);

        result = {
          earthquakes: earthquakes.data || [],
          disasters: disasters.data || [],
          news: news.data || [],
          vessels: vessels.data || [],
          cyberThreats: threats.data || [],
          bankEvents: banks.data || [],
          infoOps: infoOps.data || [],
          uaeTwitter: twitter.data || [],
        };
        break;
      }

      default:
        throw new Error('Invalid data type. Use: earthquakes, disasters, news, vessels, cyber-threats, bank-events, info-ops, uae-twitter, or all');
    }

    const responseTime = Date.now() - startTime;

    await supabase.from('api_logs').insert({
      endpoint: '/get-intelligence',
      method: req.method,
      status_code: 200,
      response_time_ms: responseTime,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
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
