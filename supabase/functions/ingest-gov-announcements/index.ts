import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface GovFeed {
  key: string;
  country: string;
  countryCode: string;
  source: string;
  region: string;
  category: string;
  urls: string[];
}

const GOV_FEEDS: GovFeed[] = [
  { key: 'us-whitehouse', country: 'United States', countryCode: 'US', source: 'White House', region: 'Americas', category: 'Executive', urls: ['https://www.whitehouse.gov/feed/'] },
  { key: 'us-state-dept', country: 'United States', countryCode: 'US', source: 'US State Dept', region: 'Americas', category: 'Diplomatic', urls: ['https://www.state.gov/rss-feeds/press-releases/'] },
  { key: 'us-dod', country: 'United States', countryCode: 'US', source: 'US DoD', region: 'Americas', category: 'Defense', urls: ['https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?max=10&ContentType=1&Site=945'] },
  { key: 'uk-gov', country: 'United Kingdom', countryCode: 'GB', source: 'UK Gov', region: 'Europe', category: 'Government', urls: ['https://www.gov.uk/search/news-and-communications.atom'] },
  { key: 'uk-fcdo', country: 'United Kingdom', countryCode: 'GB', source: 'UK FCDO', region: 'Europe', category: 'Diplomatic', urls: ['https://www.gov.uk/search/news-and-communications.atom?organisations%5B%5D=foreign-commonwealth-development-office'] },
  { key: 'india-pib', country: 'India', countryCode: 'IN', source: 'PIB India', region: 'South Asia', category: 'Government', urls: ['https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3'] },
  { key: 'india-mea', country: 'India', countryCode: 'IN', source: 'India MEA', region: 'South Asia', category: 'Diplomatic', urls: ['https://www.mea.gov.in/pressreleases.rss'] },
  { key: 'india-mod', country: 'India', countryCode: 'IN', source: 'India MoD', region: 'South Asia', category: 'Defense', urls: ['https://pib.gov.in/RssMain.aspx?ModId=23&Lang=1&Regid=3'] },
  { key: 'eu-council', country: 'European Union', countryCode: 'EU', source: 'EU Council', region: 'Europe', category: 'Government', urls: ['https://www.consilium.europa.eu/en/press/press-releases/council-press-releases-rss/'] },
  { key: 'de-bundesreg', country: 'Germany', countryCode: 'DE', source: 'Bundesregierung', region: 'Europe', category: 'Government', urls: ['https://www.bundesregierung.de/breg-en/feed'] },
  { key: 'fr-elysee', country: 'France', countryCode: 'FR', source: 'Elysee', region: 'Europe', category: 'Executive', urls: ['https://www.elysee.fr/en/rss'] },
  { key: 'un-news', country: 'United Nations', countryCode: 'UN', source: 'UN News', region: 'International', category: 'International', urls: ['https://news.un.org/feed/subscribe/en/news/all/rss.xml'] },
  { key: 'nato', country: 'NATO', countryCode: 'NATO', source: 'NATO', region: 'International', category: 'Defense', urls: ['https://www.nato.int/cps/en/natolive/news.xml'] },
  { key: 'au-dfat', country: 'Australia', countryCode: 'AU', source: 'Australia DFAT', region: 'Asia-Pacific', category: 'Diplomatic', urls: ['https://www.dfat.gov.au/news/rss.xml'] },
  { key: 'jp-mofa', country: 'Japan', countryCode: 'JP', source: 'Japan MOFA', region: 'Asia-Pacific', category: 'Diplomatic', urls: ['https://www.mofa.go.jp/rss/mofa.rss'] },
  { key: 'uae-wam', country: 'United Arab Emirates', countryCode: 'AE', source: 'WAM UAE', region: 'Middle East', category: 'Government', urls: ['https://wam.ae/en/rss.xml'] },
  { key: 'sa-spa', country: 'Saudi Arabia', countryCode: 'SA', source: 'SPA Saudi', region: 'Middle East', category: 'Government', urls: ['https://www.spa.gov.sa/rss/all_en.xml'] },
  { key: 'il-idf', country: 'Israel', countryCode: 'IL', source: 'IDF Spokesperson', region: 'Middle East', category: 'Defense', urls: ['https://www.idf.il/en/rss/'] },
  { key: 'ru-kremlin', country: 'Russia', countryCode: 'RU', source: 'Kremlin', region: 'Europe/Asia', category: 'Executive', urls: ['http://kremlin.ru/events/president/news/feed'] },
  { key: 'ru-mid', country: 'Russia', countryCode: 'RU', source: 'Russia MFA', region: 'Europe/Asia', category: 'Diplomatic', urls: ['https://www.mid.ru/en/news/rss/'] },
  { key: 'cn-xinhua', country: 'China', countryCode: 'CN', source: 'Xinhua Global', region: 'Asia-Pacific', category: 'Government', urls: ['http://www.xinhuanet.com/english/rss/worldrss.xml'] },
  { key: 'cn-fmprc', country: 'China', countryCode: 'CN', source: 'China MFA', region: 'Asia-Pacific', category: 'Diplomatic', urls: ['https://www.fmprc.gov.cn/wjbxw_new/rss.xml'] },
  { key: 'pk-mofa', country: 'Pakistan', countryCode: 'PK', source: 'Pakistan MOFA', region: 'South Asia', category: 'Diplomatic', urls: ['https://mofa.gov.pk/feed/'] },
  { key: 'ca-pm', country: 'Canada', countryCode: 'CA', source: "Canada PM's Office", region: 'Americas', category: 'Executive', urls: ['https://pm.gc.ca/en/news/rss.xml'] },
  { key: 'who', country: 'World Health Organization', countryCode: 'INT', source: 'WHO', region: 'International', category: 'Health', urls: ['https://www.who.int/rss-feeds/news-english.xml'] },
  { key: 'iaea', country: 'IAEA', countryCode: 'INT', source: 'IAEA', region: 'International', category: 'Nuclear', urls: ['https://www.iaea.org/feeds/topstories.xml'] },
];

function unescapeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .trim();
}

function parseRSS(xml: string, baseUrl: string): Array<{ title: string; link: string; description: string; pubDate: string }> {
  const items: Array<{ title: string; link: string; description: string; pubDate: string }> = [];
  const origin = new URL(baseUrl).origin;

  const itemRegex = /<item>([\s\S]*?)<\/item>|<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < 20) {
    const c = match[1] || match[2] || '';

    const titleRaw = c.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title[^>]*>([\s\S]*?)<\/title>/s);
    const title = unescapeHtml(((titleRaw?.[1] || titleRaw?.[2]) ?? '').replace(/<[^>]*>/g, '')).slice(0, 300);

    const linkRaw = c.match(/<link[^>]*href="([^"]+)"|<link>([^<]+)<\/link>|<link\s*\/>/s);
    let link = ((linkRaw?.[1] || linkRaw?.[2]) ?? '').trim();
    if (link && !link.startsWith('http')) link = origin + link;

    const descRaw = c.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>|<summary[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/summary>|<summary[^>]*>([\s\S]*?)<\/summary>|<content[^>]*>([\s\S]*?)<\/content>/s);
    const description = ((descRaw?.[1] || descRaw?.[2] || descRaw?.[3] || descRaw?.[4] || descRaw?.[5]) ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 800);

    const dateRaw = c.match(/<pubDate>([\s\S]*?)<\/pubDate>|<updated>([\s\S]*?)<\/updated>|<published>([\s\S]*?)<\/published>/s);
    let pubDate = new Date().toISOString();
    try { if (dateRaw) pubDate = new Date((dateRaw[1] || dateRaw[2] || dateRaw[3]).trim()).toISOString(); } catch { /* keep default */ }

    if (title.length > 4 && link.startsWith('http')) {
      items.push({ title, link, description, pubDate });
    }
  }

  return items;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const allAnnouncements: any[] = [];
    const feedResults: Record<string, number> = {};

    for (const feed of GOV_FEEDS) {
      let fetched = false;
      for (const url of feed.urls) {
        try {
          const ctrl = new AbortController();
          const tid = setTimeout(() => ctrl.abort(), 12000);
          const resp = await fetch(url, {
            signal: ctrl.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 DHRUVA Intelligence Platform/2.0',
              'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
            },
          });
          clearTimeout(tid);

          if (resp.ok) {
            const xml = await resp.text();
            if (xml.length > 200) {
              const items = parseRSS(xml, url);
              if (items.length > 0) {
                for (const item of items) {
                  allAnnouncements.push({
                    feed_key: feed.key,
                    country: feed.country,
                    country_code: feed.countryCode,
                    source: feed.source,
                    region: feed.region,
                    category: feed.category,
                    title: item.title,
                    url: item.link,
                    content: item.description,
                    published_at: item.pubDate,
                  });
                }
                feedResults[feed.key] = items.length;
                console.log(`[OK] ${feed.source}: ${items.length} items`);
                fetched = true;
                break;
              } else {
                console.warn(`[PARSE FAIL] ${feed.source}: xml len=${xml.length}, no items parsed`);
              }
            }
          } else {
            console.warn(`[HTTP ${resp.status}] ${feed.source}: ${url}`);
          }
        } catch (e) {
          console.warn(`[FETCH FAIL] ${feed.source}: ${(e as Error).message}`);
        }
      }

      if (!fetched) feedResults[feed.key] = 0;
      await new Promise(r => setTimeout(r, 200));
    }

    console.log(`Total collected: ${allAnnouncements.length}`);

    let inserted = 0;
    let skipped = 0;

    if (allAnnouncements.length > 0) {
      const BATCH = 50;
      for (let i = 0; i < allAnnouncements.length; i += BATCH) {
        const batch = allAnnouncements.slice(i, i + BATCH);
        const { error, count } = await supabase
          .from('gov_announcements')
          .upsert(batch, { onConflict: 'url', ignoreDuplicates: true })
          .select('id');
        if (error) {
          console.error(`Upsert batch ${i} error:`, JSON.stringify(error));
        } else {
          inserted += batch.length;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, totalFetched: allAnnouncements.length, inserted, skipped, feeds: feedResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fatal:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
