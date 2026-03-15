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

async function fetchDFRLab(): Promise<InfoOpRecord[]> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 15000);
  try {
    const resp = await fetch('https://www.atlanticcouncil.org/wp-json/wp/v2/posts?categories=12345&per_page=20&_fields=id,title,date,excerpt,link', {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'DHRUVA/2.0 Intelligence Platform' },
    });
    clearTimeout(tid);
    if (!resp.ok) return [];
    const posts = await resp.json();
    if (!Array.isArray(posts)) return [];
    return posts.map((p: any) => ({
      campaign_id: `dfr-${p.id}`,
      title: p.title?.rendered?.replace(/<[^>]*>/g, '') || 'Untitled',
      description: p.excerpt?.rendered?.replace(/<[^>]*>/g, '').slice(0, 500) || '',
      platform: 'multiple',
      origin_country: 'Unknown',
      is_active: true,
      first_detected: p.date ? new Date(p.date).toISOString() : new Date().toISOString(),
    }));
  } catch {
    clearTimeout(tid);
    return [];
  }
}

async function fetchMetaTransparency(): Promise<InfoOpRecord[]> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 15000);
  try {
    const resp = await fetch('https://transparency.fb.com/data/threat-indicators/', {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'DHRUVA/2.0 Intelligence Platform' },
    });
    clearTimeout(tid);
    if (!resp.ok) return [];
    return [];
  } catch {
    clearTimeout(tid);
    return [];
  }
}

async function fetchGDELTInfluence(): Promise<InfoOpRecord[]> {
  const queries = [
    { query: 'influence operation disinformation campaign social media', country: 'Unknown' },
    { query: 'propaganda bot network coordinated inauthentic behavior', country: 'Unknown' },
    { query: 'India disinformation election influence operation', country: 'India' },
  ];

  const results: InfoOpRecord[] = [];

  for (const { query, country } of queries) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 12000);
    try {
      const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=10&sort=datedesc&format=json&timespan=24h`;
      const resp = await fetch(url, { signal: ctrl.signal });
      clearTimeout(tid);
      if (!resp.ok) continue;
      const data = await resp.json();
      const articles = data.articles || [];
      for (const a of articles) {
        results.push({
          campaign_id: `gdelt-infoops-${Buffer.from(a.url || a.title || Math.random().toString()).toString('base64').slice(0, 20)}`,
          title: (a.title || 'Untitled').slice(0, 200),
          description: `Source: ${a.domain || 'Unknown'}. Language: ${a.language || 'Unknown'}. ${a.url || ''}`.slice(0, 500),
          platform: 'web',
          origin_country: country,
          is_active: true,
          first_detected: a.seendate ? new Date(a.seendate).toISOString() : new Date().toISOString(),
        });
      }
    } catch {
      clearTimeout(tid);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  return results;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const [gdeltOps] = await Promise.allSettled([
      fetchGDELTInfluence(),
    ]);

    const allOps: InfoOpRecord[] = [
      ...(gdeltOps.status === 'fulfilled' ? gdeltOps.value : []),
    ];

    console.log(`Total info ops collected: ${allOps.length}`);

    let inserted = 0;
    if (allOps.length > 0) {
      const campaignIds = allOps.map(o => o.campaign_id);
      const { data: existing } = await supabase
        .from('info_ops')
        .select('campaign_id')
        .in('campaign_id', campaignIds.slice(0, 500));

      const existingIds = new Set(existing?.map(e => e.campaign_id) || []);
      const newOps = allOps.filter(o => !existingIds.has(o.campaign_id));

      if (newOps.length > 0) {
        const { error } = await supabase.from('info_ops').insert(newOps.slice(0, 50));
        if (error) {
          console.error('Insert error:', error);
        } else {
          inserted = newOps.length;
          console.log(`Inserted ${inserted} new info ops`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, totalFetched: allOps.length, inserted }),
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
