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
  urls: string[];
  category: string;
}

const GOV_FEEDS: GovFeed[] = [
  // United States
  { key: 'us-whitehouse', country: 'United States', countryCode: 'US', source: 'White House', region: 'Americas', category: 'Executive', urls: ['https://www.whitehouse.gov/feed/'] },
  { key: 'us-state-dept', country: 'United States', countryCode: 'US', source: 'US State Dept', region: 'Americas', category: 'Diplomatic', urls: ['https://www.state.gov/rss-feeds/press-releases/'] },
  { key: 'us-dod', country: 'United States', countryCode: 'US', source: 'US DoD', region: 'Americas', category: 'Defense', urls: ['https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?max=10&ContentType=1&Site=945'] },
  { key: 'us-cdc', country: 'United States', countryCode: 'US', source: 'US CDC', region: 'Americas', category: 'Health', urls: ['https://tools.cdc.gov/api/v2/resources/media/403372.rss'] },

  // United Kingdom
  { key: 'uk-gov', country: 'United Kingdom', countryCode: 'GB', source: 'UK Gov', region: 'Europe', category: 'Government', urls: ['https://www.gov.uk/search/news-and-communications.atom'] },
  { key: 'uk-fcdo', country: 'United Kingdom', countryCode: 'GB', source: 'UK FCDO', region: 'Europe', category: 'Diplomatic', urls: ['https://www.gov.uk/search/news-and-communications.atom?organisations%5B%5D=foreign-commonwealth-development-office'] },

  // India
  { key: 'india-pib', country: 'India', countryCode: 'IN', source: 'PIB India', region: 'South Asia', category: 'Government', urls: ['https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3'] },
  { key: 'india-mea', country: 'India', countryCode: 'IN', source: 'India MEA', region: 'South Asia', category: 'Diplomatic', urls: ['https://www.mea.gov.in/pressreleases.rss'] },
  { key: 'india-mod', country: 'India', countryCode: 'IN', source: 'India MoD', region: 'South Asia', category: 'Defense', urls: ['https://pib.gov.in/RssMain.aspx?ModId=23&Lang=1&Regid=3'] },

  // European Union
  { key: 'eu-commission', country: 'European Union', countryCode: 'EU', source: 'EU Commission', region: 'Europe', category: 'Government', urls: ['https://ec.europa.eu/commission/presscorner/api/documents?documenttype=ip,mex,statement&pagesize=20&page=1&format=rss'] },
  { key: 'eu-council', country: 'European Union', countryCode: 'EU', source: 'EU Council', region: 'Europe', category: 'Government', urls: ['https://www.consilium.europa.eu/en/press/press-releases/council-press-releases-rss/'] },

  // Germany
  { key: 'de-bundesreg', country: 'Germany', countryCode: 'DE', source: 'Bundesregierung', region: 'Europe', category: 'Government', urls: ['https://www.bundesregierung.de/breg-en/feed'] },

  // France
  { key: 'fr-elysee', country: 'France', countryCode: 'FR', source: 'Elysee', region: 'Europe', category: 'Executive', urls: ['https://www.elysee.fr/en/rss'] },

  // United Nations
  { key: 'un-news', country: 'United Nations', countryCode: 'UN', source: 'UN News', region: 'International', category: 'International', urls: ['https://news.un.org/feed/subscribe/en/news/all/rss.xml'] },
  { key: 'un-security', country: 'United Nations', countryCode: 'UN', source: 'UN Security Council', region: 'International', category: 'Security', urls: ['https://www.un.org/securitycouncil/content/feed'] },

  // NATO
  { key: 'nato', country: 'NATO', countryCode: 'NATO', source: 'NATO', region: 'International', category: 'Defense', urls: ['https://www.nato.int/cps/en/natolive/news.xml'] },

  // Australia
  { key: 'au-pm', country: 'Australia', countryCode: 'AU', source: "Australia PM's Office", region: 'Asia-Pacific', category: 'Executive', urls: ['https://www.pm.gov.au/news-media/rss.xml'] },
  { key: 'au-dfat', country: 'Australia', countryCode: 'AU', source: 'Australia DFAT', region: 'Asia-Pacific', category: 'Diplomatic', urls: ['https://www.dfat.gov.au/news/rss.xml'] },

  // Japan
  { key: 'jp-mofa', country: 'Japan', countryCode: 'JP', source: 'Japan MOFA', region: 'Asia-Pacific', category: 'Diplomatic', urls: ['https://www.mofa.go.jp/rss/mofa.rss'] },
  { key: 'jp-cabinet', country: 'Japan', countryCode: 'JP', source: 'Japan Cabinet', region: 'Asia-Pacific', category: 'Government', urls: ['https://www.kantei.go.jp/foreign/tyoko/index_feed.rss'] },

  // South Korea
  { key: 'kr-mofa', country: 'South Korea', countryCode: 'KR', source: 'Korea MOFA', region: 'Asia-Pacific', category: 'Diplomatic', urls: ['https://www.mofa.go.kr/eng/brd/m_5679/rss.do'] },

  // UAE
  { key: 'uae-wam', country: 'United Arab Emirates', countryCode: 'AE', source: 'WAM UAE', region: 'Middle East', category: 'Government', urls: ['https://wam.ae/en/rss.xml'] },
  { key: 'uae-mofa', country: 'United Arab Emirates', countryCode: 'AE', source: 'UAE MoFA', region: 'Middle East', category: 'Diplomatic', urls: ['https://www.mofaic.gov.ae/en/rss'] },

  // Saudi Arabia
  { key: 'sa-spa', country: 'Saudi Arabia', countryCode: 'SA', source: 'SPA Saudi', region: 'Middle East', category: 'Government', urls: ['https://www.spa.gov.sa/rss/all_ar.xml', 'https://www.spa.gov.sa/rss/all_en.xml'] },

  // Israel
  { key: 'il-idf', country: 'Israel', countryCode: 'IL', source: 'IDF Spokesperson', region: 'Middle East', category: 'Defense', urls: ['https://www.idf.il/en/rss/'] },
  { key: 'il-mfa', country: 'Israel', countryCode: 'IL', source: 'Israel MFA', region: 'Middle East', category: 'Diplomatic', urls: ['https://www.gov.il/en/departments/ministry_of_foreign_affairs/govil-landing-page'] },

  // Russia
  { key: 'ru-kremlin', country: 'Russia', countryCode: 'RU', source: 'Kremlin', region: 'Europe/Asia', category: 'Executive', urls: ['http://kremlin.ru/events/president/news/feed'] },
  { key: 'ru-mid', country: 'Russia', countryCode: 'RU', source: 'Russia MFA', region: 'Europe/Asia', category: 'Diplomatic', urls: ['https://www.mid.ru/en/news/rss/'] },

  // China
  { key: 'cn-xinhua', country: 'China', countryCode: 'CN', source: 'Xinhua', region: 'Asia-Pacific', category: 'Government', urls: ['https://feeds.bbci.co.uk/zhongwen/trad/rss.xml'] },
  { key: 'cn-fmprc', country: 'China', countryCode: 'CN', source: 'China MFA', region: 'Asia-Pacific', category: 'Diplomatic', urls: ['https://www.fmprc.gov.cn/wjbxw_new/rss.xml'] },

  // Pakistan
  { key: 'pk-mofa', country: 'Pakistan', countryCode: 'PK', source: 'Pakistan MOFA', region: 'South Asia', category: 'Diplomatic', urls: ['https://mofa.gov.pk/feed/'] },

  // Canada
  { key: 'ca-pm', country: 'Canada', countryCode: 'CA', source: "Canada PM's Office", region: 'Americas', category: 'Executive', urls: ['https://pm.gc.ca/en/news/rss.xml'] },
  { key: 'ca-gac', country: 'Canada', countryCode: 'CA', source: 'Canada GAC', region: 'Americas', category: 'Diplomatic', urls: ['https://www.international.gc.ca/world-monde/rss/news-nouvelles-rss.aspx'] },

  // WHO
  { key: 'who', country: 'World Health Organization', countryCode: 'INT', source: 'WHO', region: 'International', category: 'Health', urls: ['https://www.who.int/rss-feeds/news-english.xml'] },

  // IAEA
  { key: 'iaea', country: 'IAEA', countryCode: 'INT', source: 'IAEA', region: 'International', category: 'Nuclear', urls: ['https://www.iaea.org/feeds/topstories.xml'] },
];

function parseRSS(xml: string): Array<{ title: string; link: string; description: string; pubDate: string }> {
  const items: Array<{ title: string; link: string; description: string; pubDate: string }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>|<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < 20) {
    const c = match[1] || match[2];
    const titleMatch = /<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title[^>]*>([\s\S]*?)<\/title>/s.exec(c);
    const linkMatch = /<link[^>]*>([\s\S]*?)<\/link>|<link[^>]*href="([^"]+)"/s.exec(c);
    const descMatch = /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>|<summary[^>]*>([\s\S]*?)<\/summary>|<content[^>]*>([\s\S]*?)<\/content>/s.exec(c);
    const pubMatch = /<pubDate>([\s\S]*?)<\/pubDate>|<updated>([\s\S]*?)<\/updated>|<published>([\s\S]*?)<\/published>/s.exec(c);

    const title = (titleMatch ? (titleMatch[1] || titleMatch[2]) : '').trim().replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    const link = (linkMatch ? (linkMatch[1] || linkMatch[2]) : '').trim();
    const description = (descMatch ? (descMatch[1] || descMatch[2] || descMatch[3] || descMatch[4]) : '').trim().replace(/<[^>]*>/g, '').slice(0, 800);
    let pubDate = new Date().toISOString();
    try {
      if (pubMatch) {
        pubDate = new Date((pubMatch[1] || pubMatch[2] || pubMatch[3]).trim()).toISOString();
      }
    } catch { /* use default */ }

    if (title.length > 4 && (link.startsWith('http') || link.startsWith('/'))) {
      items.push({ title: title.slice(0, 300), link, description, pubDate });
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
          const tid = setTimeout(() => ctrl.abort(), 10000);
          const resp = await fetch(url, {
            signal: ctrl.signal,
            headers: {
              'User-Agent': 'DHRUVA Intelligence Platform/2.0 (Government News Monitor)',
              'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
            },
          });
          clearTimeout(tid);

          if (resp.ok) {
            const xml = await resp.text();
            if (xml.length > 200) {
              const items = parseRSS(xml);
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
                    url: item.link.startsWith('/') ? `${new URL(url).origin}${item.link}` : item.link,
                    content: item.description,
                    published_at: item.pubDate,
                  });
                }
                feedResults[feed.key] = items.length;
                console.log(`[OK] ${feed.source} (${feed.country}): ${items.length}`);
                fetched = true;
                break;
              }
            }
          }
        } catch (e) {
          console.warn(`[FAIL] ${feed.source}: ${(e as Error).message}`);
        }
      }

      if (!fetched) {
        feedResults[feed.key] = 0;
      }

      await new Promise(r => setTimeout(r, 300));
    }

    if (allAnnouncements.length > 0) {
      const urls = allAnnouncements.map(a => a.url).filter(Boolean);
      const { data: existing } = await supabase
        .from('gov_announcements')
        .select('url')
        .in('url', urls.slice(0, 500));

      const existingUrls = new Set(existing?.map((e: any) => e.url) || []);
      const newItems = allAnnouncements.filter(a => a.url && !existingUrls.has(a.url));

      if (newItems.length > 0) {
        const { error } = await supabase.from('gov_announcements').insert(newItems.slice(0, 300));
        if (error) console.error('Insert error:', error);
        else console.log(`Inserted ${newItems.length} new announcements`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, totalFetched: allAnnouncements.length, feeds: feedResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
