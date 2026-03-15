import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
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

function getWindowStart(w: TimeWindow): string | null {
  if (w === 'all') return null;
  const ms = { '1h': 3600000, '6h': 21600000, '24h': 86400000, '7d': 604800000 }[w];
  return new Date(Date.now() - ms).toISOString();
}

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
  }, [timeWindow]);

  useEffect(() => {
    const channel = supabase
      .channel('news-intel-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'news_events' }, () => {
        loadArticles();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [timeWindow]);

  const loadArticles = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('news_events')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(500);
      const since = getWindowStart(timeWindow);
      if (since) query = query.gte('published_at', since);
      const { data, error } = await query;
      if (error) throw error;
      setArticles(data || []);
    } catch (err) {
      console.error('Failed to load news:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-news-intel`;
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      await new Promise(r => setTimeout(r, 3000));
      await loadArticles();
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, [timeWindow]);

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
        if (article.source !== 'GDELT') return false;
        const themeUpper = gdeltTheme.toUpperCase();
        const cats = (article.categories || []).map((c: string) => c.toUpperCase());
        const hasTheme = cats.includes(themeUpper) ||
                         (article.metadata?.theme || '').toUpperCase() === themeUpper;
        if (!hasTheme) return false;
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
              {searchQuery ? 'NO RESULTS FOUND' : 'NO ARTICLES LOADED'}
            </div>
            <div className="news-empty-hint">
              {searchQuery
                ? <>No articles match <span style={{ color: 'var(--accent)' }}>"{searchQuery}"</span> — try a different search.</>
                : <>Click REFRESH to fetch live feeds from global and India RSS sources.</>}
            </div>
            {searchQuery ? (
              <button className="news-retry-btn" onClick={() => setSearchQuery('')}>✕ CLEAR SEARCH</button>
            ) : (
              <button className="news-retry-btn" onClick={handleRefresh}>⟳ RETRY</button>
            )}
          </div>
        ) : (
          <>
            {newsGroup === 'gdelt' && (
              <div className="gdelt-results-meta">
                {filteredArticles.length} ARTICLES · GDELT 2.0 DOC API ·
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
