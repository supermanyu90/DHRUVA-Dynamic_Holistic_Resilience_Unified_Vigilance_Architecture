import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RSSFeed {
  key: string;
  name: string;
  urls: string[];
  group: 'global' | 'india';
}

const RSS_FEEDS: RSSFeed[] = [
  { key: 'bbc', name: 'BBC World', urls: ['https://feeds.bbci.co.uk/news/world/rss.xml', 'https://feeds.bbci.co.uk/news/rss.xml'], group: 'global' },
  { key: 'aljazeera', name: 'Al Jazeera', urls: ['https://www.aljazeera.com/xml/rss/all.xml'], group: 'global' },
  { key: 'guardian', name: 'Guardian', urls: ['https://www.theguardian.com/world/rss'], group: 'global' },
  { key: 'reliefweb', name: 'ReliefWeb', urls: ['https://reliefweb.int/updates/rss.xml'], group: 'global' },
  { key: 'thehindu', name: 'The Hindu', urls: ['https://www.thehindu.com/news/national/feeder/default.rss'], group: 'india' },
  { key: 'ndtv', name: 'NDTV', urls: ['https://feeds.feedburner.com/ndtvnews-latest'], group: 'india' },
  { key: 'ie', name: 'Indian Express', urls: ['https://indianexpress.com/feed/'], group: 'india' },
  { key: 'ht', name: 'Hindustan Times', urls: ['https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml'], group: 'india' },
  { key: 'bs', name: 'Business Standard', urls: ['https://www.business-standard.com/rss/home_page_top_stories.rss'], group: 'india' },
  { key: 'bbcindia', name: 'BBC India', urls: ['https://feeds.bbci.co.uk/news/world/asia/india/rss.xml'], group: 'india' },
];

const GDELT_THEMES: Record<string, string> = {
  BREAKING: 'emergency OR explosion OR attack OR crisis OR breaking',
  DISASTER: 'earthquake OR flood OR wildfire OR hurricane OR tsunami',
  CONFLICT: 'war OR military OR airstrike OR missile OR troops',
  HEALTH: 'outbreak OR epidemic OR pandemic OR disease OR WHO',
  CLIMATE: 'climate change OR emissions OR extreme weather OR drought',
  CYBER: 'cyberattack OR ransomware OR data breach OR hacking',
  FINANCE: 'market crash OR recession OR inflation OR sanctions',
  INDIA: 'India OR Modi OR Mumbai OR Delhi OR NDRF',
  GULF: 'Iran OR UAE OR Hormuz OR tanker OR Gulf war',
  ENERGY: 'oil price OR Brent OR crude OR LNG OR energy crisis',
  MARITIME: 'vessel OR tanker OR maritime OR naval OR shipping',
};

function parseRSS(xml: string, feedKey: string, feedName: string, group: string) {
  const items: any[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < 25) {
    const c = match[1];
    const titleMatch = /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/s.exec(c);
    const linkMatch = /<link>([\s\S]*?)<\/link>/s.exec(c);
    const descMatch = /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/s.exec(c);
    const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/s.exec(c);

    const title = (titleMatch ? (titleMatch[1] || titleMatch[2]) : '').trim();
    const link = (linkMatch ? linkMatch[1] : '').trim();
    const desc = (descMatch ? (descMatch[1] || descMatch[2]) : '').trim().replace(/<[^>]*>/g, '');
    let pubDate: string;
    try {
      pubDate = pubDateMatch ? new Date(pubDateMatch[1].trim()).toISOString() : new Date().toISOString();
    } catch {
      pubDate = new Date().toISOString();
    }

    if (title.length > 5 && link) {
      items.push({
        source: feedKey,
        title: title.slice(0, 300),
        url: link,
        content: desc.slice(0, 1000),
        published_at: pubDate,
        categories: [group.toUpperCase()],
        metadata: { feedName, category: group, group },
      });
    }
  }

  if (items.length === 0) {
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    while ((match = entryRegex.exec(xml)) !== null && items.length < 25) {
      const c = match[1];
      const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/s.exec(c);
      const linkMatch = /href="([^"]+)"/s.exec(c);
      const summaryMatch = /<summary[^>]*>([\s\S]*?)<\/summary>|<content[^>]*>([\s\S]*?)<\/content>/s.exec(c);
      const updatedMatch = /<updated>([\s\S]*?)<\/updated>|<published>([\s\S]*?)<\/published>/s.exec(c);

      const title = (titleMatch ? titleMatch[1] : '').trim().replace(/<[^>]*>/g, '');
      const link = linkMatch ? linkMatch[1] : '';
      const summary = (summaryMatch ? (summaryMatch[1] || summaryMatch[2]) : '').trim().replace(/<[^>]*>/g, '');
      let pubDate: string;
      try {
        pubDate = updatedMatch ? new Date((updatedMatch[1] || updatedMatch[2]).trim()).toISOString() : new Date().toISOString();
      } catch {
        pubDate = new Date().toISOString();
      }

      if (title.length > 5 && link) {
        items.push({
          source: feedKey,
          title: title.slice(0, 300),
          url: link,
          content: summary.slice(0, 1000),
          published_at: pubDate,
          categories: [group.toUpperCase()],
          metadata: { feedName, category: group, group },
        });
      }
    }
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

    const allArticles: any[] = [];
    const feedResults: Record<string, number> = {};

    for (const feed of RSS_FEEDS) {
      let fetched = false;
      for (const url of feed.urls) {
        try {
          const ctrl = new AbortController();
          const tid = setTimeout(() => ctrl.abort(), 12000);
          const resp = await fetch(url, {
            signal: ctrl.signal,
            headers: { 'User-Agent': 'DHRUVA/2.0 Intelligence Platform' },
          });
          clearTimeout(tid);

          if (resp.ok) {
            const xml = await resp.text();
            if (xml.length > 100) {
              const items = parseRSS(xml, feed.key, feed.name, feed.group);
              if (items.length > 0) {
                allArticles.push(...items);
                feedResults[feed.key] = items.length;
                console.log(`[OK] ${feed.name}: ${items.length} articles`);
                fetched = true;
                break;
              }
            }
          }
        } catch (e) {
          console.warn(`[FAIL] ${feed.name} (${url}): ${e.message}`);
        }
      }

      if (!fetched) {
        feedResults[feed.key] = 0;
        console.warn(`[SKIP] ${feed.name}: all URLs failed`);
      }

      await new Promise(r => setTimeout(r, 300));
    }

    for (const [themeName, query] of Object.entries(GDELT_THEMES)) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 10000);
        const gdeltUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=15&sort=datedesc&format=json&timespan=6h`;
        const resp = await fetch(gdeltUrl, { signal: ctrl.signal });
        clearTimeout(tid);

        if (resp.ok) {
          const data = await resp.json();
          const articles = data.articles || [];
          for (const a of articles) {
            let pubDate: string;
            try {
              pubDate = a.seendate ? new Date(a.seendate).toISOString() : new Date().toISOString();
            } catch {
              pubDate = new Date().toISOString();
            }
            const toneVal = a.tone ? parseFloat(String(a.tone).split(',')[0]) : null;
            allArticles.push({
              source: 'GDELT',
              title: (a.title || 'Untitled').slice(0, 300),
              url: a.url || '',
              content: '',
              published_at: pubDate,
              categories: [themeName],
              sentiment: toneVal != null ? (toneVal > 1 ? 'positive' : toneVal < -1 ? 'negative' : 'neutral') : null,
              tone: toneVal,
              metadata: {
                domain: a.domain,
                language: a.language,
                tone: toneVal,
                theme: themeName,
                sourcecountry: a.sourcecountry,
                category: 'gdelt',
                group: 'gdelt',
              },
            });
          }
          feedResults[`GDELT_${themeName}`] = articles.length;
          console.log(`[OK] GDELT ${themeName}: ${articles.length} articles`);
        }
      } catch (e) {
        console.warn(`[FAIL] GDELT ${themeName}: ${e.message}`);
        feedResults[`GDELT_${themeName}`] = 0;
      }

      await new Promise(r => setTimeout(r, 800));
    }

    console.log(`Total collected: ${allArticles.length}`);

    if (allArticles.length > 0) {
      const urls = allArticles.map(a => a.url).filter(Boolean);
      const { data: existing } = await supabase
        .from('news_events')
        .select('url')
        .in('url', urls.slice(0, 500));

      const existingUrls = new Set(existing?.map(e => e.url) || []);
      const newArticles = allArticles.filter(a => a.url && !existingUrls.has(a.url));

      if (newArticles.length > 0) {
        const batch = newArticles.slice(0, 200);
        const { error } = await supabase.from('news_events').insert(batch);
        if (error) {
          console.error('Insert error:', error);
        } else {
          console.log(`Inserted ${batch.length} new articles`);
        }
      } else {
        console.log('No new articles to insert');
      }
    }

    return new Response(
      JSON.stringify({ success: true, totalFetched: allArticles.length, feeds: feedResults }),
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
