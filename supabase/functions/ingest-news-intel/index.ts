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
  {
    key: 'bbc',
    name: 'BBC World',
    urls: ['https://feeds.bbci.co.uk/news/world/rss.xml', 'https://feeds.bbci.co.uk/news/rss.xml'],
    group: 'global',
  },
  {
    key: 'aljazeera',
    name: 'Al Jazeera',
    urls: ['https://www.aljazeera.com/xml/rss/all.xml'],
    group: 'global',
  },
  {
    key: 'reuters',
    name: 'Reuters',
    urls: [
      'https://feeds.reuters.com/reuters/topNews',
      'https://feeds.reuters.com/reuters/worldNews',
      'https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best',
    ],
    group: 'global',
  },
  {
    key: 'ap',
    name: 'AP World',
    urls: [
      'https://rsshub.app/apnews/topics/world-news',
      'https://feeds.apnews.com/apnews/worldnews',
    ],
    group: 'global',
  },
  {
    key: 'guardian',
    name: 'Guardian',
    urls: ['https://www.theguardian.com/world/rss', 'https://www.theguardian.com/international/rss'],
    group: 'global',
  },
  {
    key: 'reliefweb',
    name: 'ReliefWeb',
    urls: ['https://reliefweb.int/updates/rss.xml', 'https://reliefweb.int/disasters/rss.xml'],
    group: 'global',
  },
  {
    key: 'thehindu',
    name: 'The Hindu',
    urls: [
      'https://www.thehindu.com/news/national/feeder/default.rss',
      'https://www.thehindu.com/feeder/default.rss',
    ],
    group: 'india',
  },
  {
    key: 'ndtv',
    name: 'NDTV',
    urls: [
      'https://feeds.feedburner.com/ndtvnews-latest',
      'https://www.ndtv.com/rss/feeds/news',
    ],
    group: 'india',
  },
  {
    key: 'ie',
    name: 'Indian Express',
    urls: ['https://indianexpress.com/feed/', 'https://indianexpress.com/section/india/feed/'],
    group: 'india',
  },
  {
    key: 'ht',
    name: 'Hindustan Times',
    urls: [
      'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml',
      'https://www.hindustantimes.com/feeds/rss/latest/rssfeed.xml',
    ],
    group: 'india',
  },
  {
    key: 'bs',
    name: 'Business Standard',
    urls: [
      'https://www.business-standard.com/rss/home_page_top_stories.rss',
      'https://www.business-standard.com/rss/latest.rss',
    ],
    group: 'india',
  },
  {
    key: 'bbcindia',
    name: 'BBC India',
    urls: ['https://feeds.bbci.co.uk/news/world/asia/india/rss.xml'],
    group: 'india',
  },
  {
    key: 'ndma',
    name: 'NDMA/Govt India',
    urls: [
      'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3',
      'https://ndma.gov.in/feed',
    ],
    group: 'india',
  },
];

const GDELT_THEMES: Record<string, string> = {
  BREAKING: 'emergency OR explosion OR attack OR crisis OR breaking news',
  DISASTER: 'earthquake OR flood OR wildfire OR hurricane OR tsunami OR cyclone',
  CONFLICT: 'war OR military OR airstrike OR missile OR troops OR ceasefire',
  HEALTH: 'outbreak OR epidemic OR pandemic OR disease OR WHO OR virus',
  CLIMATE: 'climate change OR emissions OR extreme weather OR drought OR flood',
  CYBER: 'cyberattack OR ransomware OR data breach OR hacking OR APT',
  FINANCE: 'market crash OR recession OR inflation OR sanctions OR IMF',
  INDIA: 'India OR Modi OR Mumbai OR Delhi OR NDRF OR Indian Army',
  GULF: 'Iran OR UAE OR Hormuz OR tanker OR Gulf OR Yemen OR Houthi',
  ENERGY: 'oil price OR Brent crude OR LNG OR OPEC OR energy crisis',
  MARITIME: 'vessel OR tanker OR maritime OR naval OR shipping OR piracy',
};

function parseRSS(xml: string, feedKey: string, feedName: string, group: string) {
  const items: any[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < 30) {
    const c = match[1];
    const titleMatch = /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/s.exec(c);
    const linkMatch = /<link>([\s\S]*?)<\/link>/s.exec(c);
    const descMatch = /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/s.exec(c);
    const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/s.exec(c);

    const title = (titleMatch ? (titleMatch[1] || titleMatch[2]) : '').trim().replace(/<[^>]*>/g, '');
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
    while ((match = entryRegex.exec(xml)) !== null && items.length < 30) {
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
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; DHRUVA/2.0; Intelligence Platform)',
              'Accept': 'application/rss+xml, application/xml, text/xml, */*',
            },
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
          } else {
            console.warn(`[HTTP ${resp.status}] ${feed.name} (${url})`);
          }
        } catch (e) {
          console.warn(`[FAIL] ${feed.name} (${url}): ${e.message}`);
        }
      }

      if (!fetched) {
        feedResults[feed.key] = 0;
        console.warn(`[SKIP] ${feed.name}: all URLs failed`);
      }

      await new Promise(r => setTimeout(r, 250));
    }

    for (const [themeName, query] of Object.entries(GDELT_THEMES)) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 12000);
        const gdeltUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=20&sort=datedesc&format=json&timespan=12h`;
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

      await new Promise(r => setTimeout(r, 600));
    }

    console.log(`Total collected: ${allArticles.length}`);

    let inserted = 0;
    if (allArticles.length > 0) {
      const batch = allArticles.slice(0, 300);
      const { error, count } = await supabase
        .from('news_events')
        .upsert(batch, { onConflict: 'url', ignoreDuplicates: true, count: 'exact' });
      if (error) {
        console.error('Upsert error:', error);
      } else {
        inserted = count ?? batch.length;
        console.log(`Upserted ${inserted} articles`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, totalFetched: allArticles.length, inserted, feeds: feedResults }),
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
