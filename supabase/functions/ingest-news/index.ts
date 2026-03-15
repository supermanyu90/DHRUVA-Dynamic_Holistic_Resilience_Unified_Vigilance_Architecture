import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RSSItem {
  title: string;
  link: string;
  description?: string;
  pubDate: string;
  country?: string;
}

async function parseRSS(xmlText: string): Promise<RSSItem[]> {
  const items: RSSItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const matches = xmlText.matchAll(itemRegex);

  for (const match of matches) {
    const itemXml = match[1];
    const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
    const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '';
    const description = itemXml.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '';
    const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || new Date().toISOString();

    items.push({
      title: title.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim(),
      link: link.trim(),
      description: description.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim(),
      pubDate,
    });
  }

  return items;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const rssFeeds = [
      { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'aljazeera' },
      { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'bbc' },
      { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', source: 'nytimes' },
    ];

    const allNews: any[] = [];

    for (const feed of rssFeeds) {
      try {
        const response = await fetch(feed.url);
        if (!response.ok) continue;

        const xmlText = await response.text();
        const items = await parseRSS(xmlText);

        for (const item of items.slice(0, 20)) {
          allNews.push({
            source: feed.source,
            title: item.title,
            url: item.link,
            content: item.description,
            published_at: new Date(item.pubDate).toISOString(),
            country: null,
            latitude: null,
            longitude: null,
            tone: null,
            goldstein_scale: null,
            categories: [],
            sentiment: null,
            metadata: {},
          });
        }
      } catch (error) {
        console.error(`Error fetching ${feed.source}:`, error);
      }
    }

    if (allNews.length > 0) {
      const { data: inserted, error: dbError } = await supabase
        .from('news_events')
        .insert(allNews);

      if (dbError) {
        console.error('Database error:', dbError);
      }
    }

    const responseTime = Date.now() - startTime;

    await supabase.from('api_logs').insert({
      endpoint: '/ingest-news',
      method: req.method,
      status_code: 200,
      response_time_ms: responseTime,
    });

    return new Response(
      JSON.stringify({
        success: true,
        count: allNews.length,
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
