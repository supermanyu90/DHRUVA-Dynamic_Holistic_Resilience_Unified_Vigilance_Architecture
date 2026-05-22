import { useState, useEffect, useCallback, useMemo } from 'react';
import { NewsSourceBar } from './news/NewsSourceBar';
import { NewsCard } from './news/NewsCard';

type TimeWindow = '1h' | '6h' | '24h' | '7d' | 'all';

const TIME_WINDOWS: { key: TimeWindow; label: string }[] = [
  { key: '1h',  label: '1HR'  },
  { key: '6h',  label: '6HR'  },
  { key: '24h', label: '24H'  },
  { key: '7d',  label: '7D'   },
  { key: 'all', label: 'ALL'  },
];


export interface NewsArticle {
  id: string;
  source: string;
  title: string;
  url: string;
  content: string;
  published_at: string;
  categories: string[];
  sentiment?: string;
  tone?: number;
  country?: string;
  metadata: Record<string, any>;
}

export type NewsGroup = 'global' | 'india' | 'gdelt';
export type GdeltTheme = 'breaking' | 'disaster' | 'conflict' | 'health' | 'climate' | 'cyber' | 'finance' | 'india' | 'gulf' | 'energy' | 'maritime';

export const SOURCE_CONFIG: Record<string, { label: string; color: string; icon: string; group: 'global' | 'india' }> = {
  bbc:       { label: 'BBC World',        color: '#BB1919', icon: '🎙', group: 'global' },
  aljazeera: { label: 'Al Jazeera',       color: '#E8C84B', icon: '🌍', group: 'global' },
  nytimes:   { label: 'NY Times',         color: '#CCCCCC', icon: '📰', group: 'global' },
  reuters:   { label: 'Reuters',          color: '#FF8000', icon: '📰', group: 'global' },
  ap:        { label: 'AP World',         color: '#CC2200', icon: '📡', group: 'global' },
  guardian:  { label: 'Guardian',         color: '#005689', icon: '🔵', group: 'global' },
  reliefweb: { label: 'ReliefWeb',        color: '#00AACC', icon: '🌐', group: 'global' },
  thehindu:  { label: 'The Hindu',        color: '#C41E3A', icon: '🏛', group: 'india' },
  ndtv:      { label: 'NDTV',             color: '#E50914', icon: '📺', group: 'india' },
  ie:        { label: 'Indian Express',   color: '#0064A8', icon: '📄', group: 'india' },
  ht:        { label: 'Hindustan Times',  color: '#2E86C1', icon: '🗺', group: 'india' },
  bs:        { label: 'Business Std',     color: '#1A5276', icon: '📊', group: 'india' },
  ndma:      { label: 'NDMA/SACHET',      color: '#E67E22', icon: '🚨', group: 'india' },
  bbcindia:  { label: 'BBC India',        color: '#990000', icon: '🇮🇳', group: 'india' },
  GDELT:     { label: 'GDELT',            color: '#9B59B6', icon: '⚡', group: 'global' },
};

const GDELT_THEMES: { key: GdeltTheme; icon: string; label: string; color: string }[] = [
  { key: 'breaking',  icon: '🔴', label: 'BREAKING',  color: '#FF4444' },
  { key: 'disaster',  icon: '🌪', label: 'DISASTER',  color: '#FF6B00' },
  { key: 'conflict',  icon: '⚔',  label: 'CONFLICT',  color: '#FF2255' },
  { key: 'health',    icon: '🏥', label: 'HEALTH',    color: '#00D4A0' },
  { key: 'climate',   icon: '🌡', label: 'CLIMATE',   color: '#00BFFF' },
  { key: 'cyber',     icon: '💻', label: 'CYBER',     color: '#C070FF' },
  { key: 'finance',   icon: '📈', label: 'FINANCE',   color: '#FFD700' },
  { key: 'india',     icon: '🇮🇳', label: 'INDIA',     color: '#FF9900' },
  { key: 'gulf',      icon: '⚓', label: 'GULF/IRAN', color: '#FF6B00' },
  { key: 'energy',    icon: '🛢', label: 'ENERGY',    color: '#FFB800' },
  { key: 'maritime',  icon: '🚢', label: 'MARITIME',  color: '#00BFFF' },
];

const RSS_PROXY = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rss-proxy`;

const GLOBAL_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'bbc' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'aljazeera' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', source: 'nytimes' },
  { url: 'https://www.theguardian.com/world/rss', source: 'guardian' },
  { url: 'https://reliefweb.int/updates/rss.xml', source: 'reliefweb' },
];

const INDIA_FEEDS = [
  { url: 'https://www.thehindu.com/news/national/feeder/default.rss', source: 'thehindu' },
  { url: 'https://feeds.ndtv.com/india-news/rss', source: 'ndtv' },
  { url: 'https://indianexpress.com/section/india/feed/', source: 'ie' },
  { url: 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml', source: 'ht' },
  { url: 'https://feeds.bbci.co.uk/news/world/asia/india/rss.xml', source: 'bbcindia' },
];

async function fetchViaRssProxy(feeds: { url: string; source: string }[]): Promise<NewsArticle[]> {
  try {
    const params = new URLSearchParams({ urls: JSON.stringify(feeds) });
    const res = await fetch(`${RSS_PROXY}?${params}`, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return [];
    const json = await res.json();
    const items: any[] = json?.items ?? [];
    return items.map((item: any, i: number) => ({
      id: `rss-${i}-${Date.now()}`,
      source: item.source ?? 'GDELT',
      title: item.title ?? '',
      url: item.url ?? '',
      content: item.description ?? item.title ?? '',
      published_at: item.published ?? new Date().toISOString(),
      categories: [],
      sentiment: undefined,
      tone: undefined,
      country: undefined,
      metadata: {},
    }));
  } catch {
    return [];
  }
}

async function fetchGdeltThemed(timeWindow: string): Promise<NewsArticle[]> {
  const timespan = timeWindow === '1h' ? '60min' : timeWindow === '6h' ? '360min' : timeWindow === '24h' ? '1440min' : timeWindow === '7d' ? '10080min' : '20160min';
  try {
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent('sourcelang:english conflict OR crisis OR disaster OR protest OR military OR attack')}&mode=ArtList&format=json&maxrecords=75&timespan=${timespan}&sort=DateDesc`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return [];
    const json = await res.json();
    const items: any[] = json?.articles ?? [];
    return items.map((a: any, i: number) => ({
      id: `gdelt-${i}-${Date.now()}`,
      source: 'GDELT',
      title: a.title ?? '',
      url: a.url ?? '',
      content: a.title ?? '',
      published_at: a.seendate ? new Date(a.seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z')).toISOString() : new Date().toISOString(),
      categories: [],
      sentiment: undefined,
      tone: a.tone ? parseFloat(String(a.tone).split(',')[0]) : undefined,
      country: a.sourcecountry ?? undefined,
      metadata: { domain: a.domain ?? '' },
    }));
  } catch {
    return [];
  }
}

async function fetchGdeltByDomain(domains: string[], sourceKey: string, timeWindow: string): Promise<NewsArticle[]> {
  const timespan = timeWindow === '1h' ? '60min' : timeWindow === '6h' ? '360min' : timeWindow === '24h' ? '1440min' : timeWindow === '7d' ? '10080min' : '20160min';
  const domainQuery = domains.map(d => `domain:${d}`).join(' OR ');
  try {
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(`sourcelang:english ${domainQuery}`)}&mode=ArtList&format=json&maxrecords=15&timespan=${timespan}&sort=DateDesc`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.articles ?? []).map((a: any, i: number) => ({
      id: `${sourceKey}-${i}-${Date.now()}`,
      source: sourceKey,
      title: a.title ?? '',
      url: a.url ?? '',
      content: a.title ?? '',
      published_at: a.seendate ? new Date(a.seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z')).toISOString() : new Date().toISOString(),
      categories: [],
      sentiment: undefined,
      tone: a.tone ? parseFloat(String(a.tone).split(',')[0]) : undefined,
      country: a.sourcecountry ?? undefined,
      metadata: { domain: a.domain ?? '' },
    }));
  } catch {
    return [];
  }
}

async function fetchAllSources(group: NewsGroup, timeWindow: string): Promise<NewsArticle[]> {
  if (group === 'global') {
    const [rssResults, reutersResults, apResults] = await Promise.allSettled([
      fetchViaRssProxy(GLOBAL_FEEDS),
      fetchGdeltByDomain(['reuters.com'], 'reuters', timeWindow),
      fetchGdeltByDomain(['apnews.com'], 'ap', timeWindow),
    ]);
    const articles: NewsArticle[] = [];
    if (rssResults.status === 'fulfilled') articles.push(...rssResults.value);
    if (reutersResults.status === 'fulfilled') articles.push(...reutersResults.value);
    if (apResults.status === 'fulfilled') articles.push(...apResults.value);
    articles.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
    return articles;
  } else if (group === 'india') {
    return fetchViaRssProxy(INDIA_FEEDS);
  } else {
    return fetchGdeltThemed(timeWindow);
  }
}

export function NewsIntelView() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newsGroup, setNewsGroup] = useState<NewsGroup>('global');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [gdeltTheme, setGdeltTheme] = useState<GdeltTheme>('breaking');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('24h');

  useEffect(() => {
    loadArticles();
  }, [timeWindow, newsGroup]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadArticles = async () => {
    setLoading(true);
    try {
      const results = await fetchAllSources(newsGroup, timeWindow);
      setArticles(results);
    } catch (err) {
      console.error('Failed to load news:', err);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadArticles();
    } finally {
      setRefreshing(false);
    }
  }, [timeWindow]);

  const THEME_KEYWORDS: Record<string, string[]> = {
    breaking:  ['breaking','explosion','blast','attack','assassin','urgent','killed','dead','kills','bombs','hostage','coup','overthrow','seized','collapse'],
    disaster:  ['earthquake','flood','wildfire','fire','hurricane','typhoon','cyclone','tsunami','tornado','volcano','eruption','landslide','drought','famine','disaster'],
    conflict:  ['war','warfare','airstrike','air strike','missile','shelling','troops','military','invasion','combat','ceasefire','offensive','frontline','casualties','weapons','nuclear','tank','drone strike','artillery'],
    health:    ['outbreak','epidemic','pandemic','disease','virus','vaccine','WHO','health emergency','infection','pathogen','mpox','cholera','dengue','measles'],
    climate:   ['climate','emissions','carbon','global warming','extreme weather','drought','sea level','COP','renewable','fossil fuel','net zero','glacier','heatwave'],
    cyber:     ['cyberattack','ransomware','hacking','data breach','malware','phishing','cyber','CISA','vulnerability','CVE','exploit','darkweb'],
    finance:   ['recession','inflation','sanctions','market crash','IMF','World Bank','interest rate','central bank','currency','debt crisis','default','stock market','GDP'],
    india:     ['India','Indian','Modi','Mumbai','Delhi','Kolkata','Chennai','Bangalore','Kashmir','LoC','ISRO','BJP','Congress party','Rupee','RBI','Narendra'],
    gulf:      ['Iran','UAE','Hormuz','tanker','Yemen','Houthi','Saudi Arabia','Gulf','Riyadh','Tehran','Red Sea','Bab el-Mandeb','OPEC','Persian Gulf'],
    energy:    ['oil price','LNG','OPEC','energy crisis','natural gas','pipeline','petroleum','crude oil','fuel','power grid','nuclear power','coal','electricity'],
    maritime:  ['vessel','tanker','maritime','naval','piracy','ship','fleet','port','strait','submarine','aircraft carrier','coast guard','sea lane','shipping'],
  };

  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const src = article.source?.toLowerCase();
      const cfg = SOURCE_CONFIG[src] || SOURCE_CONFIG[article.source];

      if (newsGroup === 'global') {
        if (article.source === 'GDELT') return false;
        if (cfg?.group === 'india') return false;
      } else if (newsGroup === 'india') {
        if (article.source === 'GDELT') return false;
        if (!cfg || cfg.group !== 'india') return false;
      } else if (newsGroup === 'gdelt') {
        const keywords = THEME_KEYWORDS[gdeltTheme] || [];
        const hay = ((article.title || '') + ' ' + (article.content || '')).toLowerCase();
        if (!keywords.some(kw => hay.includes(kw))) return false;
      }

      if (selectedSource !== 'all') {
        if (src !== selectedSource && article.source !== selectedSource) return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const hay = `${article.title} ${article.content || ''} ${article.country || ''}`.toLowerCase();
        if (!q.split(/\s+/).every(w => hay.includes(w))) return false;
      }

      return true;
    });
  }, [articles, newsGroup, selectedSource, gdeltTheme, searchQuery]);

  const sourceStats = useMemo(() => {
    const stats: Record<string, number> = {};
    articles.forEach(a => {
      const key = a.source;
      stats[key] = (stats[key] || 0) + 1;
    });
    return stats;
  }, [articles]);

  const currentGroupSources = useMemo(() => {
    return Object.entries(SOURCE_CONFIG)
      .filter(([, cfg]) => {
        if (newsGroup === 'global') return cfg.group === 'global';
        if (newsGroup === 'india') return cfg.group === 'india';
        return false;
      })
      .map(([key]) => key);
  }, [newsGroup]);

  const handleGroupChange = (group: NewsGroup) => {
    setNewsGroup(group);
    setSelectedSource('all');
    setSearchQuery('');
  };

  return (
    <div className="news-intel-view">
      {/* Row 1: Region group selector */}
      <div className="news-group-row">
        <span className="news-region-label">SOURCE:</span>
        <button
          className={`news-group-btn ${newsGroup === 'global' ? 'active' : ''}`}
          onClick={() => handleGroupChange('global')}
        >
          🌍 GLOBAL RSS
        </button>
        <button
          className={`news-group-btn ${newsGroup === 'india' ? 'active-india' : ''}`}
          onClick={() => handleGroupChange('india')}
        >
          <span className="india-dot" />INDIA RSS
        </button>
        <button
          className={`news-group-btn gdelt ${newsGroup === 'gdelt' ? 'active' : ''}`}
          onClick={() => handleGroupChange('gdelt')}
        >
          ⚡ GDELT INTEL
        </button>
        <button
          className="news-refresh-btn"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? '↻ FETCHING...' : '⟳ REFRESH'}
        </button>
      </div>

      {/* GDELT theme selector */}
      {newsGroup === 'gdelt' && (
        <div className="gdelt-header">
          <span className="gdelt-header-label">THEME:</span>
          {GDELT_THEMES.map(t => (
            <button
              key={t.key}
              className={`gdelt-theme-btn ${gdeltTheme === t.key ? 'active' : ''}`}
              onClick={() => setGdeltTheme(t.key)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Source filter buttons (RSS only) */}
      {newsGroup !== 'gdelt' && (
        <div className="news-toolbar">
          <span className="news-toolbar-label">SOURCE:</span>
          <button
            className={`news-topic-btn ${selectedSource === 'all' ? (newsGroup === 'india' ? 'india-active' : 'active') : ''}`}
            onClick={() => setSelectedSource('all')}
          >
            ALL
          </button>
          {currentGroupSources.map(key => {
            const cfg = SOURCE_CONFIG[key];
            const count = sourceStats[key] || 0;
            return (
              <button
                key={key}
                className={`news-topic-btn ${selectedSource === key ? (newsGroup === 'india' ? 'india-active' : 'active') : ''}`}
                onClick={() => setSelectedSource(key)}
              >
                {cfg.label.toUpperCase()}{count > 0 ? ` (${count})` : ''}
              </button>
            );
          })}
        </div>
      )}

      {/* Source status bar */}
      <NewsSourceBar
        sourceStats={sourceStats}
        newsGroup={newsGroup}
      />

      {/* Time window filter */}
      <div className="news-time-row">
        <span className="news-region-label">WINDOW:</span>
        {TIME_WINDOWS.map(w => (
          <button
            key={w.key}
            className={`news-time-btn ${timeWindow === w.key ? 'active' : ''}`}
            onClick={() => setTimeWindow(w.key)}
          >
            {w.label}
          </button>
        ))}
        <span className="news-time-count">
          {articles.length} ARTICLE{articles.length !== 1 ? 'S' : ''} IN WINDOW
        </span>
      </div>

      {/* Search bar */}
      <div className="news-search-row">
        <div className="news-search-wrap">
          <span className="news-search-icon">⌕</span>
          <input
            className="news-search-input"
            type="text"
            placeholder="Search headlines, summaries, regions…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="news-search-clear" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
        <div className="news-search-count">
          {searchQuery
            ? `${filteredArticles.length} RESULT${filteredArticles.length !== 1 ? 'S' : ''} FOR "${searchQuery.toUpperCase()}"`
            : `${filteredArticles.length} ARTICLES`}
        </div>
      </div>

      {/* News grid */}
      <div className="news-grid">
        {loading ? (
          <div className="news-loading">
            <div className="spinner" />
            LOADING INTELLIGENCE...
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="news-loading">
            <div className="news-empty-title">
              {searchQuery ? 'NO RESULTS FOUND' : 'NO ARTICLES IN WINDOW'}
            </div>
            <div className="news-empty-hint">
              {searchQuery
                ? <>No articles match <span style={{ color: 'var(--accent)' }}>"{searchQuery}"</span> — try a different search.</>
                : <>No articles in the selected time window. Try expanding to <strong>7D</strong> or <strong>ALL</strong>, or click REFRESH to fetch the latest feeds.</>}
            </div>
            {searchQuery ? (
              <button className="news-retry-btn" onClick={() => setSearchQuery('')}>✕ CLEAR SEARCH</button>
            ) : (
              <>
                <button className="news-retry-btn" onClick={() => setTimeWindow('all')} style={{ marginBottom: '6px' }}>SHOW ALL ARTICLES</button>
                <button className="news-retry-btn" onClick={handleRefresh}>⟳ FETCH LATEST</button>
              </>
            )}
          </div>
        ) : (
          <>
            {newsGroup === 'gdelt' && (
              <div className="gdelt-results-meta">
                {filteredArticles.length} ARTICLES · KEYWORD INTEL ·
                {' '}{GDELT_THEMES.find(t => t.key === gdeltTheme)?.icon} {gdeltTheme.toUpperCase()} ·
                {' '}{new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })} IST
              </div>
            )}
            {filteredArticles.slice(0, 80).map((article, i) => (
              <NewsCard
                key={article.id}
                article={article}
                index={i}
                searchQuery={searchQuery}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
