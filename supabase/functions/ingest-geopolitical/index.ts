import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const COUNTRY_COORDS: Record<string, [number, number]> = {
  'Ukraine': [49.0, 31.0], 'Russia': [61.5, 105.0], 'Israel': [31.0, 35.2],
  'Palestine': [31.9, 35.2], 'Lebanon': [33.9, 35.5], 'Iran': [32.4, 53.7],
  'Syria': [34.8, 38.9], 'Yemen': [15.5, 48.5], 'Sudan': [15.6, 32.5],
  'Myanmar': [21.9, 95.9], 'Haiti': [18.9, -72.3], 'Ethiopia': [9.1, 40.5],
  'Somalia': [5.2, 46.2], 'Mali': [17.6, -4.0], 'Niger': [17.6, 8.1],
  'Burkina Faso': [12.4, -1.6], 'Pakistan': [30.4, 69.3], 'Afghanistan': [33.9, 67.7],
  'India': [20.6, 78.9], 'China': [35.9, 104.2], 'Taiwan': [23.7, 121.0],
  'North Korea': [40.3, 127.5], 'Venezuela': [6.4, -66.6], 'Colombia': [4.6, -74.1],
  'Mexico': [23.6, -102.6], 'Turkey': [38.9, 35.2], 'Iraq': [33.2, 43.7],
  'Libya': [26.3, 17.2], 'Nigeria': [9.1, 8.7], 'DR Congo': [-4.0, 21.8],
  'Georgia': [42.3, 43.4], 'Armenia': [40.1, 45.0], 'Azerbaijan': [40.1, 47.6],
  'Saudi Arabia': [23.9, 45.1], 'UAE': [23.4, 53.8], 'Egypt': [26.8, 30.8],
  'Tunisia': [33.9, 9.5], 'Algeria': [28.0, 1.7], 'Morocco': [31.8, -7.1],
  'South Africa': [-30.6, 22.9], 'Kenya': [-0.0, 37.9], 'Tanzania': [-6.4, 34.9],
  'Zimbabwe': [-19.0, 29.2], 'Mozambique': [-18.7, 35.5], 'Venezuela': [6.4, -66.6],
  'Cuba': [21.5, -77.8], 'Nicaragua': [12.9, -85.2], 'Bolivia': [-16.3, -63.6],
  'Peru': [-9.2, -75.0], 'Chile': [-35.7, -71.5], 'Brazil': [-14.2, -51.9],
  'Serbia': [44.0, 21.0], 'Kosovo': [42.6, 21.2], 'Bosnia': [44.2, 17.9],
  'Bangladesh': [23.7, 90.4], 'Sri Lanka': [7.9, 80.8], 'Nepal': [28.4, 84.1],
};

const GEOPOLITICAL_RSS: Array<{ key: string; url: string; category: string }> = [
  { key: 'crisisgroup', url: 'https://www.crisisgroup.org/rss.xml', category: 'crisis' },
  { key: 'reliefweb_crisis', url: 'https://reliefweb.int/updates/rss.xml?taxonomy_vocabulary_6_tid=4598', category: 'crisis' },
  { key: 'amnesty', url: 'https://www.amnesty.org/en/feed/', category: 'protest' },
  { key: 'bbc_conflict', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'conflict' },
  { key: 'aljazeera_war', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'conflict' },
  { key: 'guardian_conflict', url: 'https://www.theguardian.com/world/conflict/rss', category: 'conflict' },
  { key: 'rferl', url: 'https://www.rferl.org/api/zgqoumoye', category: 'geopolitical' },
  { key: 'voa_conflict', url: 'https://www.voanews.com/api/zmoqmeniqv', category: 'geopolitical' },
];

const CONFLICT_PATTERNS = [
  { pattern: /\b(war|warfare|airstrike|air strike|missile|shelling|artillery|troops|military offensive|invasion|combat|frontline|ceasefire|killed|casualties|dead|wounded)\b/i, category: 'conflict' as const, severity: 'critical' as const },
  { pattern: /\b(coup|junta|martial law|military takeover|government overthrown)\b/i, category: 'coup' as const, severity: 'critical' as const },
  { pattern: /\b(curfew|lockdown order|movement restrictions|night curfew)\b/i, category: 'curfew' as const, severity: 'high' as const },
  { pattern: /\b(sanctions|embargo|asset freeze|trade war|export ban|import ban)\b/i, category: 'sanctions' as const, severity: 'high' as const },
  { pattern: /\b(humanitarian crisis|state of emergency|government collapse|political crisis|mass displacement)\b/i, category: 'crisis' as const, severity: 'high' as const },
  { pattern: /\b(protest|riot|unrest|uprising|crackdown|demonstration|clashes|marching)\b/i, category: 'protest' as const, severity: 'medium' as const },
  { pattern: /\b(diplomatic crisis|expelled|recalled ambassador|territorial dispute|border clash|sovereignty)\b/i, category: 'geopolitical' as const, severity: 'high' as const },
];

function classifyArticle(title: string, description: string): { category: typeof CONFLICT_PATTERNS[0]['category']; severity: typeof CONFLICT_PATTERNS[0]['severity'] } | null {
  const text = title + ' ' + description;
  for (const p of CONFLICT_PATTERNS) {
    if (p.pattern.test(text)) {
      return { category: p.category, severity: p.severity };
    }
  }
  return null;
}

function extractCountry(title: string, description: string): string | null {
  const text = title + ' ' + description;
  const patterns: [RegExp, string][] = [
    [/\b(Ukraine|Ukrainian)\b/i, 'Ukraine'], [/\b(Russia|Russian|Kremlin)\b/i, 'Russia'],
    [/\b(Israel|Israeli)\b/i, 'Israel'], [/\b(Gaza|Palestinian|Palestine)\b/i, 'Palestine'],
    [/\b(Lebanon|Lebanese|Hezbollah)\b/i, 'Lebanon'], [/\b(Iran|Iranian)\b/i, 'Iran'],
    [/\b(Syria|Syrian)\b/i, 'Syria'], [/\b(Yemen|Yemeni|Houthi)\b/i, 'Yemen'],
    [/\b(Sudan|Sudanese|RSF)\b/i, 'Sudan'], [/\b(Myanmar|Burmese|junta)\b/i, 'Myanmar'],
    [/\b(Ethiopia|Ethiopian|Tigray)\b/i, 'Ethiopia'], [/\b(Somalia|Somali|al-Shabaab)\b/i, 'Somalia'],
    [/\b(Afghanistan|Afghan|Taliban)\b/i, 'Afghanistan'], [/\b(Pakistan|Pakistani)\b/i, 'Pakistan'],
    [/\b(Kashmir|Line of Control|LoC)\b/i, 'India'], [/\b(North Korea|DPRK|Kim Jong)\b/i, 'North Korea'],
    [/\b(Taiwan|Taiwanese)\b/i, 'Taiwan'], [/\b(Haiti|Haitian)\b/i, 'Haiti'],
    [/\b(Mali|Malian)\b/i, 'Mali'], [/\b(Niger|Nigerien)\b/i, 'Niger'],
    [/\b(Venezuela|Venezuelan|Maduro)\b/i, 'Venezuela'], [/\b(Colombia|Colombian|FARC)\b/i, 'Colombia'],
    [/\b(Iraq|Iraqi)\b/i, 'Iraq'], [/\b(Libya|Libyan)\b/i, 'Libya'],
    [/\b(Nigeria|Nigerian)\b/i, 'Nigeria'], [/\b(Congo|DRC|Kinshasa)\b/i, 'DR Congo'],
    [/\b(Armenia|Armenian|Nagorno)\b/i, 'Armenia'], [/\b(Azerbaijan|Azerbaijani)\b/i, 'Azerbaijan'],
    [/\b(Kosovo|Serbian|Serbia)\b/i, 'Serbia'], [/\b(Turkey|Turkish|Erdogan)\b/i, 'Turkey'],
    [/\b(Saudi Arabia|Saudi|Riyadh)\b/i, 'Saudi Arabia'], [/\b(Egypt|Egyptian|Sisi)\b/i, 'Egypt'],
  ];
  for (const [re, country] of patterns) {
    if (re.test(text)) return country;
  }
  return null;
}

function parseRSSFeed(xml: string, feedKey: string, defaultCategory: string): any[] {
  const items: any[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < 20) {
    const c = match[1];
    const titleRaw = /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/s.exec(c);
    const linkRaw = /<link>([\s\S]*?)<\/link>/s.exec(c);
    const descRaw = /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/s.exec(c);
    const pubDateRaw = /<pubDate>([\s\S]*?)<\/pubDate>/s.exec(c);

    const title = (titleRaw ? (titleRaw[1] || titleRaw[2]) : '').trim().replace(/<[^>]*>/g, '');
    const link = (linkRaw ? linkRaw[1] : '').trim();
    const desc = (descRaw ? (descRaw[1] || descRaw[2]) : '').trim().replace(/<[^>]*>/g, '');

    if (title.length < 10 || !link) continue;

    const classification = classifyArticle(title, desc);
    if (!classification) continue;

    let pubDate: string;
    try {
      pubDate = pubDateRaw ? new Date(pubDateRaw[1].trim()).toISOString() : new Date().toISOString();
    } catch {
      pubDate = new Date().toISOString();
    }

    const country = extractCountry(title, desc);
    const coords = country ? COUNTRY_COORDS[country] : null;
    const slug = (link).replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);

    items.push({
      event_id: `rss_${feedKey}_${slug}`,
      title: title.slice(0, 300),
      category: classification.category,
      country,
      latitude: coords ? coords[0] : null,
      longitude: coords ? coords[1] : null,
      description: desc.slice(0, 500) || null,
      severity: classification.severity,
      is_active: true,
      started_at: pubDate,
      source: feedKey,
      properties: { url: link, feedKey, defaultCategory },
    });
  }

  return items;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const allEvents: any[] = [];
    const feedResults: Record<string, number> = {};

    for (const feed of GEOPOLITICAL_RSS) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 12000);
        const resp = await fetch(feed.url, {
          signal: ctrl.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; DHRUVA/2.0; Intelligence Platform)',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          },
        });
        clearTimeout(tid);

        if (resp.ok) {
          const xml = await resp.text();
          const items = parseRSSFeed(xml, feed.key, feed.category);
          allEvents.push(...items);
          feedResults[feed.key] = items.length;
          console.log(`[OK] ${feed.key}: ${items.length} geopolitical events`);
        } else {
          feedResults[feed.key] = 0;
          console.warn(`[HTTP ${resp.status}] ${feed.key}`);
        }
      } catch (e) {
        feedResults[feed.key] = 0;
        console.warn(`[FAIL] ${feed.key}: ${e.message}`);
      }

      await new Promise(r => setTimeout(r, 300));
    }

    console.log(`Total geopolitical events from RSS: ${allEvents.length}`);

    let inserted = 0;
    if (allEvents.length > 0) {
      const batch = allEvents.slice(0, 200);
      const { error, count } = await supabase
        .from('geopolitical_events')
        .upsert(batch, { onConflict: 'event_id', ignoreDuplicates: true, count: 'exact' });

      if (error) {
        console.error('Upsert error:', JSON.stringify(error));
      } else {
        inserted = count ?? batch.length;
        console.log(`Upserted ${inserted} geopolitical events`);
      }

      await supabase
        .from('geopolitical_events')
        .update({ is_active: false })
        .lt('started_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
        .eq('is_active', true)
        .not('source', 'eq', 'manual');
    }

    return new Response(
      JSON.stringify({ success: true, totalFetched: allEvents.length, inserted, feeds: feedResults }),
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
