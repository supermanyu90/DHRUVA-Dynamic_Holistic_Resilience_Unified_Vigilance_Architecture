import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ALLOWED_DOMAINS = [
  "feeds.bbci.co.uk", "www.bbc.co.uk", "bbc.co.uk",
  "www.aljazeera.com", "aljazeera.com",
  "rss.nytimes.com", "www.nytimes.com",
  "feeds.reuters.com", "www.reuters.com",
  "feeds.feedburner.com",
  "www.theguardian.com", "theguardian.com",
  "reliefweb.int", "api.reliefweb.int",
  "thehindu.com", "www.thehindu.com",
  "ndtv.com", "www.ndtv.com", "feeds.ndtv.com",
  "indianexpress.com", "www.indianexpress.com",
  "hindustantimes.com", "www.hindustantimes.com",
  "www.business-standard.com",
  "feodotracker.abuse.ch", "urlhaus.abuse.ch",
  "ransomware.live", "www.ransomware.live",
  "www.whitehouse.gov", "whitehouse.gov",
  "www.state.gov", "state.gov",
  "www.mod.gov.in", "pib.gov.in",
  "www.mea.gov.in", "mea.gov.in",
  "www.gov.uk",
  "ec.europa.eu",
  "www.nato.int", "nato.int",
  "www.un.org", "news.un.org",
  "www.iaea.org", "iaea.org",
  "api.gdeltproject.org",
  "earthquake.usgs.gov",
  "eonet.gsfc.nasa.gov",
  "www.gdacs.org", "gdacs.org",
];

function isDomainAllowed(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.some(d => parsed.hostname === d || parsed.hostname.endsWith("." + d));
  } catch {
    return false;
  }
}

interface FeedItem {
  title: string;
  url: string;
  published: string;
  description: string;
  source: string;
}

function extractTag(xml: string, tag: string): string {
  const patterns = [
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i"),
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"),
  ];
  for (const p of patterns) {
    const m = xml.match(p);
    if (m) return m[1].trim();
  }
  return "";
}

function extractLink(itemXml: string): string {
  const atomLink = itemXml.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i);
  if (atomLink) return atomLink[1];
  return extractTag(itemXml, "link");
}

function parseRSS(xml: string, sourceName: string): FeedItem[] {
  const items: FeedItem[] = [];
  const isAtom = xml.includes("<feed") && xml.includes("xmlns=\"http://www.w3.org/2005/Atom\"");

  const entryPattern = isAtom
    ? /<entry[\s>]([\s\S]*?)<\/entry>/gi
    : /<item[\s>]([\s\S]*?)<\/item>/gi;

  let match: RegExpExecArray | null;
  while ((match = entryPattern.exec(xml)) !== null && items.length < 25) {
    const block = match[1];
    const title = extractTag(block, "title");
    const link = extractLink(block);
    const pubDate = extractTag(block, "pubDate") || extractTag(block, "published") || extractTag(block, "updated") || extractTag(block, "dc:date");
    const desc = extractTag(block, "description") || extractTag(block, "summary") || extractTag(block, "content");

    if (title && link) {
      items.push({
        title: title.replace(/<[^>]*>/g, "").trim(),
        url: link,
        published: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        description: desc.replace(/<[^>]*>/g, "").trim().slice(0, 500),
        source: sourceName,
      });
    }
  }
  return items;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const feedUrls = url.searchParams.get("urls");
    const singleUrl = url.searchParams.get("url");
    const sourceName = url.searchParams.get("source") || "unknown";

    if (singleUrl) {
      if (!isDomainAllowed(singleUrl)) {
        return new Response(JSON.stringify({ error: "Domain not allowed" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch(singleUrl, {
        headers: { "User-Agent": "DhruvaIntelBot/1.0" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        return new Response(JSON.stringify({ items: [], error: `Upstream ${res.status}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const xml = await res.text();
      const items = parseRSS(xml, sourceName);
      return new Response(JSON.stringify({ items }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (feedUrls) {
      const feeds: { url: string; source: string }[] = JSON.parse(feedUrls);
      const results = await Promise.allSettled(
        feeds.map(async (f) => {
          if (!isDomainAllowed(f.url)) return [];
          const res = await fetch(f.url, {
            headers: { "User-Agent": "DhruvaIntelBot/1.0" },
            signal: AbortSignal.timeout(10_000),
          });
          if (!res.ok) return [];
          const xml = await res.text();
          return parseRSS(xml, f.source);
        })
      );

      const allItems: FeedItem[] = [];
      for (const r of results) {
        if (r.status === "fulfilled") allItems.push(...r.value);
      }
      allItems.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());

      return new Response(JSON.stringify({ items: allItems }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Provide ?url= or ?urls= parameter" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
