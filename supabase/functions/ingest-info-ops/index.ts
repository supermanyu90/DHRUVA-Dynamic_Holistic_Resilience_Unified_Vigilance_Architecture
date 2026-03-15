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
  target_countries: string[];
  narrative: string;
  actors: string[];
  confidence_level: 'high' | 'medium' | 'low';
  is_active: boolean;
  first_detected: string;
  last_activity: string;
}

const INFOOPS_FEEDS: Array<{ key: string; url: string; priority: number }> = [
  { key: 'reuters_disinfo', url: 'https://feeds.reuters.com/reuters/worldNews', priority: 1 },
  { key: 'ap_disinfo', url: 'https://feeds.apnews.com/rss/apf-intlnews', priority: 1 },
  { key: 'bbc_disinfo', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', priority: 1 },
  { key: 'aljazeera_disinfo', url: 'https://www.aljazeera.com/xml/rss/all.xml', priority: 1 },
  { key: 'dw_disinfo', url: 'https://rss.dw.com/rdf/rss-en-world', priority: 2 },
  { key: 'rferl_disinfo', url: 'https://www.rferl.org/api/zgqoumoye', priority: 2 },
  { key: 'voa_disinfo', url: 'https://www.voanews.com/api/zmoqmeniqv', priority: 2 },
  { key: 'france24_disinfo', url: 'https://www.france24.com/en/rss', priority: 2 },
  { key: 'guardian_disinfo', url: 'https://www.theguardian.com/world/rss', priority: 2 },
  { key: 'npr_disinfo', url: 'https://feeds.npr.org/1004/rss.xml', priority: 3 },
  { key: 'bellingcat', url: 'https://www.bellingcat.com/feed/', priority: 1 },
  { key: 'euvsdisin', url: 'https://euvsdisinfo.eu/feed/', priority: 1 },
];

const INFOOPS_PATTERNS = [
  { re: /\b(disinformation|misinformation|fake news|false narrative|fabricated|debunked|fact.check|misleading)\b/i, narrative: 'Disinformation', confidence: 'high' as const },
  { re: /\b(propaganda|state.sponsored media|state media|coordinated|influence operation|influence campaign)\b/i, narrative: 'State Propaganda', confidence: 'high' as const },
  { re: /\b(bot network|fake account|inauthentic behavior|astroturf|troll farm|sock puppet|social media manipulation)\b/i, narrative: 'Social Media Manipulation', confidence: 'high' as const },
  { re: /\b(information warfare|cognitive warfare|narrative warfare|psychological operation|psyop|PSYOP)\b/i, narrative: 'Information Warfare', confidence: 'high' as const },
  { re: /\b(deepfake|AI.generated|synthetic media|manipulated video|manipulated audio|forged document)\b/i, narrative: 'Synthetic Media / Deepfakes', confidence: 'high' as const },
  { re: /\b(election interference|election meddling|electoral manipulation|vote manipulation|voter suppression)\b/i, narrative: 'Electoral Interference', confidence: 'high' as const },
  { re: /\b(hack.and.leak|hacked documents|stolen emails|data dump|cyber espionage|intelligence leak)\b/i, narrative: 'Hack & Leak Operation', confidence: 'medium' as const },
  { re: /\b(narrative manipulation|perception management|strategic communication|information operation)\b/i, narrative: 'Narrative Manipulation', confidence: 'medium' as const },
  { re: /\b(censorship|internet shutdown|internet blackout|media suppression|press freedom|journalist arrested)\b/i, narrative: 'Media Suppression', confidence: 'medium' as const },
  { re: /\b(cyber attack|cyberattack|hack|hacked|breach|data breach|ransomware|malware|phishing|espionage)\b/i, narrative: 'Cyber-Enabled Information Operation', confidence: 'medium' as const },
];

const ORIGIN_PATTERNS: [RegExp, string][] = [
  [/\b(Russia|Russian|Kremlin|FSB|GRU|SVR|RT|Sputnik|TASS|Moscow)\b/i, 'Russia'],
  [/\b(China|Chinese|CCP|PRC|Beijing|Xinhua|CGTN|PLA|state.media)\b/i, 'China'],
  [/\b(Iran|Iranian|IRGC|Tehran|Press TV|Tasnim|Fars)\b/i, 'Iran'],
  [/\b(North Korea|DPRK|Pyongyang|Lazarus|Kimsuky)\b/i, 'North Korea'],
  [/\b(Pakistan|Pakistani|ISI|Islamabad)\b/i, 'Pakistan'],
  [/\b(India|Indian|BJP|Hindu nationalist|Modi)\b/i, 'India'],
  [/\b(Israel|Israeli|Mossad|Tel Aviv)\b/i, 'Israel'],
  [/\b(Saudi Arabia|Saudi|Riyadh)\b/i, 'Saudi Arabia'],
  [/\b(Turkey|Turkish|Erdogan|Ankara|AKP)\b/i, 'Turkey'],
  [/\b(Venezuela|Venezuelan|Maduro)\b/i, 'Venezuela'],
  [/\b(Cuba|Cuban|Havana)\b/i, 'Cuba'],
  [/\b(United States|US government|CIA|NSA|American)\b/i, 'United States'],
];

const TARGET_PATTERNS: [RegExp, string][] = [
  [/\b(Ukraine|Ukrainian)\b/i, 'Ukraine'],
  [/\b(Europe|European|EU)\b/i, 'Europe'],
  [/\b(United States|American|US)\b/i, 'United States'],
  [/\b(Taiwan|Taiwanese)\b/i, 'Taiwan'],
  [/\b(India|Indian)\b/i, 'India'],
  [/\b(Pakistan|Pakistani)\b/i, 'Pakistan'],
  [/\b(Israel|Israeli)\b/i, 'Israel'],
  [/\b(Gaza|Palestinian|Palestine)\b/i, 'Palestine'],
  [/\b(NATO|Western)\b/i, 'NATO'],
  [/\b(Africa|African)\b/i, 'Africa'],
];

const ACTOR_PATTERNS: [RegExp, string][] = [
  [/\b(GRU|FSB|SVR)\b/i, 'Russian Intelligence'],
  [/\b(PLA SSF|Unit 61398|APT41|APT40)\b/i, 'Chinese Military Intelligence'],
  [/\b(IRGC|Charming Kitten|APT33|APT34)\b/i, 'Iranian IRGC'],
  [/\b(Lazarus Group|Kimsuky|APT38)\b/i, 'North Korean State Actors'],
  [/\b(Wagner|Prigozhin)\b/i, 'Wagner Group'],
  [/\b(Internet Research Agency|IRA|troll farm)\b/i, 'Internet Research Agency'],
  [/\b(Hamas|Hezbollah|Islamic Jihad)\b/i, 'Militant Groups'],
  [/\b(ISIS|ISIL|Daesh)\b/i, 'ISIS'],
  [/\b(Anonymous|hacktivist)\b/i, 'Hacktivist Groups'],
];

const PLATFORM_PATTERNS: [RegExp, string][] = [
  [/\b(Twitter|X\.com|@|tweet|trending)\b/i, 'x'],
  [/\b(Facebook|Meta|FB)\b/i, 'facebook'],
  [/\b(Telegram|channel)\b/i, 'telegram'],
  [/\b(TikTok|ByteDance)\b/i, 'tiktok'],
  [/\b(YouTube|video)\b/i, 'youtube'],
  [/\b(Instagram)\b/i, 'instagram'],
  [/\b(WhatsApp)\b/i, 'whatsapp'],
  [/\b(Reddit)\b/i, 'reddit'],
];

function classifyInfoOp(title: string, desc: string): { narrative: string; confidence: 'high' | 'medium' | 'low' } | null {
  const text = title + ' ' + desc;
  for (const p of INFOOPS_PATTERNS) {
    if (p.re.test(text)) return { narrative: p.narrative, confidence: p.confidence };
  }
  return null;
}

function extractOrigin(text: string): string {
  for (const [re, country] of ORIGIN_PATTERNS) {
    if (re.test(text)) return country;
  }
  return 'Unknown';
}

function extractTargets(text: string): string[] {
  return TARGET_PATTERNS.filter(([re]) => re.test(text)).map(([, c]) => c).slice(0, 3);
}

function extractActors(text: string): string[] {
  return ACTOR_PATTERNS.filter(([re]) => re.test(text)).map(([, a]) => a).slice(0, 3);
}

function extractPlatforms(text: string): string {
  const found = PLATFORM_PATTERNS.filter(([re]) => re.test(text)).map(([, p]) => p);
  return found.length > 0 ? found.join(',') : 'web';
}

function parseRSSForInfoOps(xml: string, feedKey: string): InfoOpRecord[] {
  const items: InfoOpRecord[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < 20) {
    const c = match[1];
    const titleRaw = /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/s.exec(c);
    const linkRaw = /<link[^>]*>([\s\S]*?)<\/link>/s.exec(c);
    const descRaw = /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/s.exec(c);
    const pubDateRaw = /<pubDate>([\s\S]*?)<\/pubDate>|<dc:date>([\s\S]*?)<\/dc:date>/s.exec(c);

    const title = (titleRaw ? (titleRaw[1] || titleRaw[2]) : '').trim().replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const link = (linkRaw ? linkRaw[1] : '').trim();
    const desc = (descRaw ? (descRaw[1] || descRaw[2]) : '').trim().replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

    if (title.length < 10) continue;

    const classification = classifyInfoOp(title, desc);
    if (!classification) continue;

    const text = title + ' ' + desc;
    let pubDate: string;
    try {
      const rawDate = pubDateRaw ? (pubDateRaw[1] || pubDateRaw[2] || '').trim() : '';
      pubDate = rawDate ? new Date(rawDate).toISOString() : new Date().toISOString();
    } catch {
      pubDate = new Date().toISOString();
    }

    const slug = (link || title).replace(/[^a-zA-Z0-9]/g, '').slice(0, 44);
    const campaignId = `${feedKey}-${slug}`;

    items.push({
      campaign_id: campaignId,
      title: title.slice(0, 200),
      description: `Source: ${feedKey}. ${desc}`.slice(0, 500),
      platform: extractPlatforms(text),
      origin_country: extractOrigin(text),
      target_countries: extractTargets(text),
      narrative: classification.narrative,
      actors: extractActors(text),
      confidence_level: classification.confidence,
      is_active: true,
      first_detected: pubDate,
      last_activity: new Date().toISOString(),
    });
  }

  return items;
}

async function fetchFeed(feed: typeof INFOOPS_FEEDS[0]): Promise<InfoOpRecord[]> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 12000);
  try {
    const resp = await fetch(feed.url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DHRUVA/2.0 Intelligence Platform)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Cache-Control': 'no-cache',
      },
    });
    clearTimeout(tid);
    if (!resp.ok) {
      console.warn(`[HTTP ${resp.status}] ${feed.key}`);
      return [];
    }
    const xml = await resp.text();
    const items = parseRSSForInfoOps(xml, feed.key);
    console.log(`[OK] ${feed.key}: ${items.length} info ops items`);
    return items;
  } catch (e) {
    clearTimeout(tid);
    console.warn(`[FAIL] ${feed.key}: ${e.message}`);
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

    const p1Feeds = INFOOPS_FEEDS.filter(f => f.priority === 1);
    const p23Feeds = INFOOPS_FEEDS.filter(f => f.priority > 1);

    const p1Results = await Promise.allSettled(p1Feeds.map(fetchFeed));
    const allOps: InfoOpRecord[] = [];

    for (const r of p1Results) {
      if (r.status === 'fulfilled') allOps.push(...r.value);
    }

    for (const feed of p23Feeds) {
      const items = await fetchFeed(feed);
      allOps.push(...items);
      await new Promise(r => setTimeout(r, 200));
    }

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
        .upsert(deduped.slice(0, 100), {
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
