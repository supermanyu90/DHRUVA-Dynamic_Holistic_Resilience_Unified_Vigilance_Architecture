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
  'Zimbabwe': [-19.0, 29.2], 'Mozambique': [-18.7, 35.5], 'Cuba': [21.5, -77.8],
  'Nicaragua': [12.9, -85.2], 'Bolivia': [-16.3, -63.6], 'Peru': [-9.2, -75.0],
  'Chile': [-35.7, -71.5], 'Brazil': [-14.2, -51.9], 'Serbia': [44.0, 21.0],
  'Kosovo': [42.6, 21.2], 'Bosnia': [44.2, 17.9], 'Bangladesh': [23.7, 90.4],
  'Sri Lanka': [7.9, 80.8], 'Nepal': [28.4, 84.1], 'Philippines': [12.9, 121.8],
  'Indonesia': [-0.8, 113.9], 'Thailand': [15.9, 100.9], 'Cambodia': [12.6, 104.9],
  'Laos': [19.9, 102.5], 'Vietnam': [14.1, 108.3], 'South Sudan': [6.9, 31.3],
  'Chad': [15.5, 18.7], 'Central African Republic': [6.6, 20.9], 'Cameroon': [3.8, 11.5],
  'Ghana': [7.9, -1.0], 'Ivory Coast': [5.4, -5.5], 'Senegal': [14.5, -14.5],
  'Kazakhstan': [48.0, 66.9], 'Uzbekistan': [41.4, 64.6], 'Belarus': [53.7, 27.9],
  'Poland': [51.9, 19.1], 'Hungary': [47.2, 19.5], 'Romania': [45.9, 24.9],
  'Serbia': [44.0, 21.0], 'Moldova': [47.4, 28.4], 'Ecuador': [-1.8, -78.2],
  'Paraguay': [-23.4, -58.4], 'Argentina': [-38.4, -63.6], 'Guatemala': [15.8, -90.2],
  'Honduras': [15.2, -86.2], 'El Salvador': [13.8, -88.9], 'Panama': [8.5, -80.8],
};

const GEOPOLITICAL_FEEDS: Array<{ key: string; url: string; category: string; priority: number }> = [
  { key: 'reuters_world', url: 'https://feeds.reuters.com/reuters/worldNews', category: 'geopolitical', priority: 1 },
  { key: 'ap_world', url: 'https://feeds.apnews.com/rss/apf-intlnews', category: 'geopolitical', priority: 1 },
  { key: 'aljazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'conflict', priority: 1 },
  { key: 'bbc_world', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'geopolitical', priority: 1 },
  { key: 'france24_world', url: 'https://www.france24.com/en/rss', category: 'geopolitical', priority: 2 },
  { key: 'dw_world', url: 'https://rss.dw.com/rdf/rss-en-world', category: 'geopolitical', priority: 2 },
  { key: 'dw_mideast', url: 'https://rss.dw.com/rdf/rss-en-middle-east', category: 'conflict', priority: 2 },
  { key: 'dw_africa', url: 'https://rss.dw.com/rdf/rss-en-africa', category: 'crisis', priority: 2 },
  { key: 'rfi_en', url: 'https://www.rfi.fr/en/rss', category: 'geopolitical', priority: 2 },
  { key: 'the_hindu_world', url: 'https://www.thehindu.com/news/international/?service=rss', category: 'geopolitical', priority: 2 },
  { key: 'crisisgroup', url: 'https://www.crisisgroup.org/rss.xml', category: 'crisis', priority: 2 },
  { key: 'reliefweb', url: 'https://reliefweb.int/updates/rss.xml?taxonomy_vocabulary_6_tid=4598', category: 'crisis', priority: 3 },
  { key: 'voa_news', url: 'https://www.voanews.com/api/zmoqmeniqv', category: 'geopolitical', priority: 3 },
  { key: 'rferl', url: 'https://www.rferl.org/api/zgqoumoye', category: 'geopolitical', priority: 3 },
  { key: 'guardian_world', url: 'https://www.theguardian.com/world/conflict/rss', category: 'conflict', priority: 3 },
  { key: 'amnesty', url: 'https://www.amnesty.org/en/feed/', category: 'protest', priority: 3 },
  { key: 'dawn_pakistan', url: 'https://www.dawn.com/feeds/world-news', category: 'geopolitical', priority: 3 },
  { key: 'middle_east_eye', url: 'https://www.middleeasteye.net/rss', category: 'conflict', priority: 2 },
  { key: 'africa_report', url: 'https://www.theafricareport.com/feed/', category: 'geopolitical', priority: 3 },
  { key: 'npr_world', url: 'https://feeds.npr.org/1004/rss.xml', category: 'geopolitical', priority: 2 },
];

const CONFLICT_PATTERNS = [
  { pattern: /\b(war|warfare|airstrike|air strike|missile|shelling|artillery|troops|military offensive|invasion|combat|frontline|ceasefire|killed|casualties|dead|wounded|bombing|siege|offensive|counteroffensive|airspace|warplane|drone strike)\b/i, category: 'conflict' as const, severity: 'critical' as const },
  { pattern: /\b(coup|junta|martial law|military takeover|government overthrown|regime change|putsch)\b/i, category: 'coup' as const, severity: 'critical' as const },
  { pattern: /\b(genocide|ethnic cleansing|war crimes|mass atrocity|civilian massacre|targeted killing)\b/i, category: 'conflict' as const, severity: 'critical' as const },
  { pattern: /\b(nuclear|chemical weapon|biological weapon|WMD|ICBM|ballistic missile|hypersonic)\b/i, category: 'conflict' as const, severity: 'critical' as const },
  { pattern: /\b(curfew|lockdown order|movement restrictions|night curfew|martial law)\b/i, category: 'curfew' as const, severity: 'high' as const },
  { pattern: /\b(sanctions|embargo|asset freeze|trade war|export ban|import ban|secondary sanctions)\b/i, category: 'sanctions' as const, severity: 'high' as const },
  { pattern: /\b(humanitarian crisis|state of emergency|government collapse|political crisis|mass displacement|famine|refugee|IDPs)\b/i, category: 'crisis' as const, severity: 'high' as const },
  { pattern: /\b(protest|riot|unrest|uprising|crackdown|demonstration|clashes|marching|civil disobedience|strike|rebellion)\b/i, category: 'protest' as const, severity: 'medium' as const },
  { pattern: /\b(diplomatic crisis|expelled|recalled ambassador|territorial dispute|border clash|sovereignty|annexation|occupation)\b/i, category: 'geopolitical' as const, severity: 'high' as const },
  { pattern: /\b(election|referendum|vote|election fraud|poll|ballot|rigged|contested results)\b/i, category: 'geopolitical' as const, severity: 'medium' as const },
  { pattern: /\b(assassination|killed|shot|leader|president|prime minister|minister|attack on)\b/i, category: 'conflict' as const, severity: 'critical' as const },
  { pattern: /\b(hostage|kidnapping|abduction|ransom|prisoner|detained|arrested|political prisoner)\b/i, category: 'crisis' as const, severity: 'high' as const },
  { pattern: /\b(naval|fleet|warship|submarine|aircraft carrier|blockade|strait|maritime|sea lane)\b/i, category: 'conflict' as const, severity: 'high' as const },
  { pattern: /\b(peace talks|negotiations|ceasefire deal|agreement|truce|armistice|settlement)\b/i, category: 'geopolitical' as const, severity: 'medium' as const },
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

const COUNTRY_PATTERNS: [RegExp, string][] = [
  [/\b(Ukraine|Ukrainian|Kyiv|Kharkiv|Zelensky)\b/i, 'Ukraine'],
  [/\b(Russia|Russian|Kremlin|Moscow|Putin|Lavrov)\b/i, 'Russia'],
  [/\b(Israel|Israeli|Netanyahu|IDF|Tel Aviv|Jerusalem)\b/i, 'Israel'],
  [/\b(Gaza|Palestinian|Palestine|Hamas|West Bank|Rafah)\b/i, 'Palestine'],
  [/\b(Lebanon|Lebanese|Hezbollah|Beirut)\b/i, 'Lebanon'],
  [/\b(Iran|Iranian|Tehran|IRGC|Khamenei|Raisi)\b/i, 'Iran'],
  [/\b(Syria|Syrian|Damascus|Assad)\b/i, 'Syria'],
  [/\b(Yemen|Yemeni|Houthi|Sanaa|Aden)\b/i, 'Yemen'],
  [/\b(Sudan|Sudanese|RSF|Khartoum|Darfur|SAF)\b/i, 'Sudan'],
  [/\b(Myanmar|Burmese|junta|Yangon|Tatmadaw)\b/i, 'Myanmar'],
  [/\b(Ethiopia|Ethiopian|Tigray|Amhara|Addis Ababa)\b/i, 'Ethiopia'],
  [/\b(Somalia|Somali|al-Shabaab|Mogadishu|AMISOM)\b/i, 'Somalia'],
  [/\b(Afghanistan|Afghan|Taliban|Kabul)\b/i, 'Afghanistan'],
  [/\b(Pakistan|Pakistani|Islamabad|Lahore|Karachi)\b/i, 'Pakistan'],
  [/\b(Kashmir|Line of Control|LoC|Jammu)\b/i, 'India'],
  [/\b(North Korea|DPRK|Kim Jong|Pyongyang)\b/i, 'North Korea'],
  [/\b(Taiwan|Taiwanese|Taipei|PLA strait)\b/i, 'Taiwan'],
  [/\b(Haiti|Haitian|Port.au.Prince|gang)\b/i, 'Haiti'],
  [/\b(Mali|Malian|Bamako|MINUSMA)\b/i, 'Mali'],
  [/\b(Niger|Nigerien|Niamey|ECOWAS)\b/i, 'Niger'],
  [/\b(Venezuela|Venezuelan|Maduro|Caracas)\b/i, 'Venezuela'],
  [/\b(Colombia|Colombian|FARC|ELN|Bogota)\b/i, 'Colombia'],
  [/\b(Iraq|Iraqi|Baghdad|Erbil|ISIS|ISIL)\b/i, 'Iraq'],
  [/\b(Libya|Libyan|Tripoli|Benghazi|GNA)\b/i, 'Libya'],
  [/\b(Nigeria|Nigerian|Abuja|Boko Haram|Lagos)\b/i, 'Nigeria'],
  [/\b(Congo|DRC|Kinshasa|M23|FDLR|Goma)\b/i, 'DR Congo'],
  [/\b(Armenia|Armenian|Nagorno|Yerevan)\b/i, 'Armenia'],
  [/\b(Azerbaijan|Azerbaijani|Baku|Karabakh)\b/i, 'Azerbaijan'],
  [/\b(Kosovo|Serbian|Serbia|Belgrade|Pristina)\b/i, 'Serbia'],
  [/\b(Turkey|Turkish|Erdogan|Ankara|Kurds|PKK)\b/i, 'Turkey'],
  [/\b(Saudi Arabia|Saudi|Riyadh|MBS|Crown Prince)\b/i, 'Saudi Arabia'],
  [/\b(Egypt|Egyptian|Sisi|Cairo)\b/i, 'Egypt'],
  [/\b(China|Chinese|Beijing|Xi Jinping|PLA|CCP)\b/i, 'China'],
  [/\b(India|Indian|Modi|Delhi|BJP|New Delhi)\b/i, 'India'],
  [/\b(Bangladesh|Bangladeshi|Dhaka)\b/i, 'Bangladesh'],
  [/\b(Philippines|Filipino|Manila|Marcos)\b/i, 'Philippines'],
  [/\b(Indonesia|Indonesian|Jakarta)\b/i, 'Indonesia'],
  [/\b(Belarus|Belarusian|Lukashenko|Minsk)\b/i, 'Belarus'],
  [/\b(Poland|Polish|Warsaw)\b/i, 'Poland'],
  [/\b(Hungary|Hungarian|Orban|Budapest)\b/i, 'Hungary'],
  [/\b(Georgia|Georgian|Tbilisi)\b/i, 'Georgia'],
  [/\b(Burkina Faso|Ouagadougou|AES)\b/i, 'Burkina Faso'],
  [/\b(South Sudan|Juba|SPLM)\b/i, 'South Sudan'],
  [/\b(Chad|Chadian|Ndjamena)\b/i, 'Chad'],
  [/\b(Central African Republic|CAR|Bangui|Wagner)\b/i, 'Central African Republic'],
  [/\b(Morocco|Moroccan|Rabat|Western Sahara)\b/i, 'Morocco'],
  [/\b(Algeria|Algerian|Algiers)\b/i, 'Algeria'],
  [/\b(Tunisia|Tunisian|Tunis)\b/i, 'Tunisia'],
  [/\b(Mexico|Mexican|Cartel|CJNG|Sinaloa|Ciudad Juarez)\b/i, 'Mexico'],
  [/\b(Ecuador|Ecuadorian|Quito)\b/i, 'Ecuador'],
  [/\b(Peru|Peruvian|Lima)\b/i, 'Peru'],
  [/\b(Sri Lanka|Colombo)\b/i, 'Sri Lanka'],
  [/\b(Thailand|Thai|Bangkok)\b/i, 'Thailand'],
  [/\b(Vietnam|Vietnamese|Hanoi|Ho Chi Minh)\b/i, 'Vietnam'],
  [/\b(Cambodia|Cambodian|Phnom Penh|Hun Sen)\b/i, 'Cambodia'],
  [/\b(Kenya|Kenyan|Nairobi)\b/i, 'Kenya'],
  [/\b(Zimbabwe|Zimbabwean|Harare|Mnangagwa)\b/i, 'Zimbabwe'],
  [/\b(South Africa|South African|Pretoria|Ramaphosa|ANC)\b/i, 'South Africa'],
];

function extractCountry(title: string, description: string): string | null {
  const text = title + ' ' + description;
  for (const [re, country] of COUNTRY_PATTERNS) {
    if (re.test(text)) return country;
  }
  return null;
}

function parseRSSFeed(xml: string, feedKey: string, defaultCategory: string): any[] {
  const items: any[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < 25) {
    const c = match[1];
    const titleRaw = /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/s.exec(c);
    const linkRaw = /<link[^>]*>([\s\S]*?)<\/link>|<link[^>]*href="([^"]*)"[^>]*\/>/s.exec(c);
    const descRaw = /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/s.exec(c);
    const pubDateRaw = /<pubDate>([\s\S]*?)<\/pubDate>|<dc:date>([\s\S]*?)<\/dc:date>|<updated>([\s\S]*?)<\/updated>/s.exec(c);

    const title = (titleRaw ? (titleRaw[1] || titleRaw[2]) : '').trim().replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    const link = (linkRaw ? (linkRaw[1] || linkRaw[2]) : '').trim();
    const desc = (descRaw ? (descRaw[1] || descRaw[2]) : '').trim().replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

    if (title.length < 10 || !link) continue;

    const classification = classifyArticle(title, desc);
    if (!classification) continue;

    let pubDate: string;
    try {
      const rawDate = pubDateRaw ? (pubDateRaw[1] || pubDateRaw[2] || pubDateRaw[3] || '').trim() : '';
      pubDate = rawDate ? new Date(rawDate).toISOString() : new Date().toISOString();
    } catch {
      pubDate = new Date().toISOString();
    }

    const country = extractCountry(title, desc);
    const coords = country ? COUNTRY_COORDS[country] : null;
    const slug = link.replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);

    items.push({
      event_id: `rss_${feedKey}_${slug}`,
      title: title.slice(0, 300),
      category: classification.category,
      country,
      latitude: coords ? coords[0] : null,
      longitude: coords ? coords[1] : null,
      description: desc.slice(0, 600) || null,
      severity: classification.severity,
      is_active: true,
      started_at: pubDate,
      source: feedKey,
      properties: { url: link, feedKey, defaultCategory },
    });
  }

  return items;
}

async function fetchFeed(feed: typeof GEOPOLITICAL_FEEDS[0]): Promise<any[]> {
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
    const items = parseRSSFeed(xml, feed.key, feed.category);
    console.log(`[OK] ${feed.key}: ${items.length} geopolitical events`);
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

    const allEvents: any[] = [];
    const feedResults: Record<string, number> = {};

    const priorityOneTwoFeeds = GEOPOLITICAL_FEEDS.filter(f => f.priority <= 2);
    const priorityThreeFeeds = GEOPOLITICAL_FEEDS.filter(f => f.priority === 3);

    const p12Results = await Promise.allSettled(priorityOneTwoFeeds.map(feed => fetchFeed(feed)));
    for (let i = 0; i < priorityOneTwoFeeds.length; i++) {
      const result = p12Results[i];
      const items = result.status === 'fulfilled' ? result.value : [];
      allEvents.push(...items);
      feedResults[priorityOneTwoFeeds[i].key] = items.length;
    }

    for (const feed of priorityThreeFeeds) {
      const items = await fetchFeed(feed);
      allEvents.push(...items);
      feedResults[feed.key] = items.length;
      await new Promise(r => setTimeout(r, 200));
    }

    const seenIds = new Set<string>();
    const deduped = allEvents.filter(e => {
      if (seenIds.has(e.event_id)) return false;
      seenIds.add(e.event_id);
      return true;
    });

    console.log(`Total unique geopolitical events from all feeds: ${deduped.length}`);

    let inserted = 0;
    if (deduped.length > 0) {
      const batch = deduped.slice(0, 250);
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
      JSON.stringify({ success: true, totalFetched: deduped.length, inserted, feeds: feedResults }),
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
