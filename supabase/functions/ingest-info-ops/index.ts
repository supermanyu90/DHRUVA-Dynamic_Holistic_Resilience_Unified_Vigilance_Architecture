import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface InfoOpRecord {
  campaign_id: string;
  title: string;
  description: string;
  platform: string;
  origin_country: string;
  is_active: boolean;
  first_detected: string;
}

async function fetchGDELTInfluence(): Promise<InfoOpRecord[]> {
  const queries = [
    { query: 'influence operation disinformation campaign social media coordinated', country: 'Unknown' },
    { query: 'propaganda bot network coordinated inauthentic behavior', country: 'Unknown' },
    { query: 'India disinformation election influence operation narrative', country: 'India' },
    { query: 'China Russia information warfare cyber propaganda', country: 'Unknown' },
  ];

  const results: InfoOpRecord[] = [];
  const now = new Date().toISOString();

  for (const { query, country } of queries) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 12000);
    try {
      const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=15&sort=datedesc&format=json&timespan=48h`;
      const resp = await fetch(url, { signal: ctrl.signal });
      clearTimeout(tid);
      if (!resp.ok) continue;
      const data = await resp.json();
      const articles = data.articles || [];
      for (const a of articles) {
        const campaignId = `gdelt-infoops-${(a.url || a.title || Math.random().toString()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 40)}`;
        results.push({
          campaign_id: campaignId,
          title: (a.title || 'Untitled').slice(0, 200),
          description: `Source: ${a.domain || 'Unknown'}. Lang: ${a.language || 'Unknown'}. ${a.url || ''}`.slice(0, 500),
          platform: 'web',
          origin_country: country,
          is_active: true,
          first_detected: now,
        });
      }
    } catch {
      clearTimeout(tid);
    }
    await new Promise(r => setTimeout(r, 400));
  }

  return results;
}

async function fetchOpenSanctionsInfluence(): Promise<InfoOpRecord[]> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 10000);
  try {
    const url = 'https://api.gdeltproject.org/api/v2/doc/doc?query=information+operation+disinformation+propaganda+state+sponsored&mode=artlist&maxrecords=20&sort=datedesc&format=json&timespan=72h';
    const resp = await fetch(url, { signal: ctrl.signal });
    clearTimeout(tid);
    if (!resp.ok) return [];
    const data = await resp.json();
    const articles = data.articles || [];
    const now = new Date().toISOString();
    return articles.map((a: any) => ({
      campaign_id: `gdelt-state-${(a.url || a.title || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 40)}`,
      title: (a.title || 'Untitled').slice(0, 200),
      description: `State-sponsored activity detected. Source: ${a.domain || 'Unknown'}. ${a.url || ''}`.slice(0, 500),
      platform: 'web,x',
      origin_country: 'Unknown',
      is_active: true,
      first_detected: now,
    }));
  } catch {
    clearTimeout(tid);
    return [];
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const [gdeltOps, stateOps] = await Promise.allSettled([
      fetchGDELTInfluence(),
      fetchOpenSanctionsInfluence(),
    ]);

    const allOps: InfoOpRecord[] = [
      ...(gdeltOps.status === 'fulfilled' ? gdeltOps.value : []),
      ...(stateOps.status === 'fulfilled' ? stateOps.value : []),
    ];

    const seen = new Set<string>();
    const deduped = allOps.filter(o => {
      if (seen.has(o.campaign_id)) return false;
      seen.add(o.campaign_id);
      return true;
    });

    console.log(`Total info ops collected: ${deduped.length}`);

    let inserted = 0;
    if (deduped.length > 0) {
      const { error, count } = await supabase
        .from('info_ops')
        .upsert(deduped.slice(0, 80), {
          onConflict: 'campaign_id',
          ignoreDuplicates: false,
          count: 'exact',
        });
      if (error) {
        console.error('Upsert error:', error);
      } else {
        inserted = count ?? deduped.length;
        console.log(`Upserted ${inserted} info ops`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, totalFetched: deduped.length, inserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
