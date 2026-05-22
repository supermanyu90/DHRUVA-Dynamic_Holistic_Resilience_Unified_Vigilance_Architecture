import { useState, useEffect, useCallback, useMemo } from 'react';
import { ExternalLink, RefreshCw, Globe, Search, X, Radio, Filter, Clock } from 'lucide-react';

type TimeWindow = '1h' | '6h' | '24h' | '7d' | 'all';

const TIME_WINDOWS: { key: TimeWindow; label: string }[] = [
  { key: '1h',  label: '1HR'  },
  { key: '6h',  label: '6HR'  },
  { key: '24h', label: '24H'  },
  { key: '7d',  label: '7D'   },
  { key: 'all', label: 'ALL'  },
];


interface GovAnnouncement {
  id: string;
  feed_key: string;
  country: string;
  country_code: string;
  source: string;
  region: string;
  category: string;
  title: string;
  url: string;
  content: string;
  published_at: string;
  created_at: string;
}

const REGION_COLORS: Record<string, string> = {
  'Americas': '#4D9FFF',
  'Europe': '#00D4A0',
  'South Asia': '#FF9900',
  'Asia-Pacific': '#00BFFF',
  'Middle East': '#FF6B00',
  'International': '#FFD700',
  'Europe/Asia': '#C070FF',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Executive': '#FF2255',
  'Diplomatic': '#4D9FFF',
  'Defense': '#FF6B00',
  'Government': '#00D4A0',
  'Health': '#39FF88',
  'Security': '#FF4444',
  'Nuclear': '#FFD700',
  'International': '#FFD700',
};

const ALL_REGIONS = ['All Regions', 'Americas', 'Europe', 'South Asia', 'Asia-Pacific', 'Middle East', 'International', 'Europe/Asia'];
const ALL_CATEGORIES = ['All', 'Executive', 'Diplomatic', 'Defense', 'Government', 'Health', 'Security', 'Nuclear', 'International'];

function AnnouncementCard({ item, searchQuery }: { item: GovAnnouncement; searchQuery: string }) {
  const regionColor = REGION_COLORS[item.region] || '#4D9FFF';
  const categoryColor = CATEGORY_COLORS[item.category] || '#00D4A0';
  const age = Math.round((Date.now() - new Date(item.published_at).getTime()) / 60000);
  const ageLabel = age < 60 ? `${age}m ago` : age < 1440 ? `${Math.floor(age / 60)}h ago` : `${Math.floor(age / 1440)}d ago`;

  function highlight(text: string) {
    if (!searchQuery || !text) return text;
    const parts = text.split(new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((p, i) =>
      p.toLowerCase() === searchQuery.toLowerCase()
        ? <mark key={i} style={{ background: 'rgba(0,212,160,0.25)', color: 'var(--accent)', borderRadius: '2px', padding: '0 2px' }}>{p}</mark>
        : p
    );
  }

  return (
    <div style={{
      background: 'rgba(4,12,24,0.92)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderLeft: `3px solid ${categoryColor}`,
      borderRadius: '3px',
      padding: '10px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      transition: 'border-color 0.15s, background 0.15s',
      cursor: 'pointer',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLDivElement).style.borderColor = categoryColor;
      (e.currentTarget as HTMLDivElement).style.background = 'rgba(4,12,24,0.98)';
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)';
      (e.currentTarget as HTMLDivElement).style.background = 'rgba(4,12,24,0.92)';
    }}
    onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flex: 1 }}>
          <span style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: '9px', letterSpacing: '1.5px',
            background: `${categoryColor}18`, border: `1px solid ${categoryColor}44`,
            color: categoryColor, borderRadius: '2px', padding: '2px 6px',
          }}>
            {item.category}
          </span>
          <span style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: '9px', letterSpacing: '1.5px',
            background: `${regionColor}18`, border: `1px solid ${regionColor}44`,
            color: regionColor, borderRadius: '2px', padding: '2px 6px',
          }}>
            {item.region}
          </span>
          <span style={{
            fontFamily: "'Share Tech Mono', monospace", fontSize: '8px',
            color: 'var(--accent)', opacity: 0.8,
          }}>
            {item.source}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--dim)' }}>{ageLabel}</span>
          <ExternalLink size={9} style={{ color: 'var(--dim)' }} />
        </div>
      </div>

      <div style={{
        fontFamily: "'Rajdhani', sans-serif", fontWeight: 600,
        fontSize: '12px', color: 'var(--text)', lineHeight: 1.4,
      }}>
        {highlight(item.title)}
      </div>

      {item.content && item.content.length > 10 && (
        <div style={{
          fontFamily: "'Rajdhani', sans-serif", fontSize: '10px',
          color: 'rgba(232,240,248,0.55)', lineHeight: 1.5,
        }}>
          {highlight(item.content.slice(0, 180))}
          {item.content.length > 180 ? '…' : ''}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{
          fontFamily: "'Share Tech Mono', monospace", fontSize: '8px',
          color: 'var(--dim)', background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '2px', padding: '2px 5px',
        }}>
          {item.country}
        </span>
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--dim)', opacity: 0.6 }}>
          {new Date(item.published_at).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

export function GovAnnouncementsView() {
  const [announcements, setAnnouncements] = useState<GovAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('All Regions');
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('7d');

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const RSS_PROXY = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rss-proxy`;
      const GOV_FEEDS = [
        { url: 'https://www.whitehouse.gov/feed/', source: 'whitehouse', country: 'United States', country_code: 'US', region: 'Americas', category: 'Executive' },
        { url: 'https://www.state.gov/rss-feed/press-releases/feed/', source: 'state_dept', country: 'United States', country_code: 'US', region: 'Americas', category: 'Diplomatic' },
        { url: 'https://www.gov.uk/government/organisations/foreign-commonwealth-development-office.atom', source: 'fcdo', country: 'United Kingdom', country_code: 'GB', region: 'Europe', category: 'Diplomatic' },
        { url: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3', source: 'pib', country: 'India', country_code: 'IN', region: 'South Asia', category: 'Government' },
        { url: 'https://mea.gov.in/RSS/rss_pressrelease_eng.xml', source: 'mea', country: 'India', country_code: 'IN', region: 'South Asia', category: 'Diplomatic' },
        { url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml', source: 'un', country: 'International', country_code: 'UN', region: 'International', category: 'International' },
        { url: 'https://www.nato.int/cps/en/natolive/news.xml', source: 'nato', country: 'NATO', country_code: 'NATO', region: 'Europe', category: 'Defense' },
        { url: 'https://www.iaea.org/feeds/press-releases', source: 'iaea', country: 'International', country_code: 'UN', region: 'International', category: 'Nuclear' },
      ];

      const feedsForProxy = GOV_FEEDS.map(f => ({ url: f.url, source: f.source }));
      const params = new URLSearchParams({ urls: JSON.stringify(feedsForProxy) });
      const res = await fetch(`${RSS_PROXY}?${params}`, { signal: AbortSignal.timeout(25_000) });

      if (!res.ok) throw new Error(`Proxy ${res.status}`);
      const json = await res.json();
      const items: any[] = json?.items ?? [];

      const mapped: GovAnnouncement[] = items.map((item: any, i: number) => {
        const feedMeta = GOV_FEEDS.find(f => f.source === item.source) || GOV_FEEDS[0];
        return {
          id: `gov-${i}-${Date.now()}`,
          feed_key: item.source ?? 'unknown',
          country: feedMeta.country,
          country_code: feedMeta.country_code,
          source: feedMeta.source,
          region: feedMeta.region,
          category: feedMeta.category,
          title: item.title ?? '',
          url: item.url ?? '',
          content: item.description ?? '',
          published_at: item.published ?? new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
      });

      setAnnouncements(mapped);
    } catch (err) {
      console.error('Load announcements failed:', err);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, [timeWindow]);

  useEffect(() => { loadAnnouncements(); }, [loadAnnouncements]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAnnouncements();
    setRefreshing(false);
  }, [loadAnnouncements]);

  const allCountries = useMemo(() => {
    const countries = new Set(announcements.map(a => a.country));
    return ['All', ...Array.from(countries).sort()];
  }, [announcements]);

  const filtered = useMemo(() => {
    return announcements.filter(item => {
      if (selectedRegion !== 'All Regions' && item.region !== selectedRegion) return false;
      if (selectedCountry !== 'All' && item.country !== selectedCountry) return false;
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const hay = `${item.title} ${item.content || ''} ${item.country} ${item.source}`.toLowerCase();
        if (!q.split(/\s+/).every(w => hay.includes(w))) return false;
      }
      return true;
    });
  }, [announcements, selectedRegion, selectedCountry, selectedCategory, searchQuery]);

  const countryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    filtered.forEach(a => { stats[a.country] = (stats[a.country] || 0) + 1; });
    return stats;
  }, [filtered]);

  const regionStats = useMemo(() => {
    const stats: Record<string, number> = {};
    announcements.forEach(a => { stats[a.region] = (stats[a.region] || 0) + 1; });
    return stats;
  }, [announcements]);

  const topCountries = useMemo(() => {
    return Object.entries(countryStats).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [countryStats]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg)', overflow: 'hidden', fontFamily: "'Rajdhani', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px 8px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Radio size={14} style={{ color: 'var(--accent)' }} />
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '16px', letterSpacing: '3px', color: 'var(--accent)' }}>
              GLOBAL GOV ANNOUNCEMENTS
            </div>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '9px', color: 'var(--dim)', letterSpacing: '1px' }}>
              OFFICIAL GOVERNMENT & INTERNATIONAL ORGANIZATION FEEDS
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            fontFamily: "'Share Tech Mono', monospace", fontSize: '9px',
            color: 'var(--accent)', background: 'rgba(0,212,160,0.1)',
            border: '1px solid rgba(0,212,160,0.3)', borderRadius: '3px', padding: '4px 8px',
          }}>
            {filtered.length} ITEMS
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: 'rgba(0,212,160,0.1)', border: '1px solid rgba(0,212,160,0.35)',
              borderRadius: '3px', padding: '5px 10px', color: 'var(--accent)',
              fontFamily: "'Bebas Neue', sans-serif", fontSize: '11px', letterSpacing: '1.5px',
              cursor: refreshing ? 'not-allowed' : 'pointer', opacity: refreshing ? 0.6 : 1,
            }}
          >
            <RefreshCw size={10} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? 'FETCHING...' : 'REFRESH'}
          </button>
        </div>
      </div>

      {/* Region tabs */}
      <div style={{
        display: 'flex', gap: '4px', padding: '8px 16px 6px',
        borderBottom: '1px solid var(--border)', overflowX: 'auto', flexShrink: 0,
      }}>
        {ALL_REGIONS.map(region => {
          const color = REGION_COLORS[region] || 'var(--accent)';
          const count = region === 'All Regions' ? announcements.length : (regionStats[region] || 0);
          const active = selectedRegion === region;
          return (
            <button
              key={region}
              onClick={() => { setSelectedRegion(region); setSelectedCountry('All'); }}
              style={{
                fontFamily: "'Bebas Neue', sans-serif", fontSize: '10px', letterSpacing: '1.5px',
                padding: '4px 9px', borderRadius: '3px', cursor: 'pointer', flexShrink: 0,
                background: active ? `${color}22` : 'transparent',
                border: `1px solid ${active ? color : 'rgba(255,255,255,0.1)'}`,
                color: active ? color : 'var(--dim)',
                transition: 'all 0.15s',
              }}
            >
              {region}{count > 0 ? ` (${count})` : ''}
            </button>
          );
        })}
      </div>

      {/* Time window filter row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 16px',
        borderBottom: '1px solid var(--border)', flexShrink: 0, overflowX: 'auto',
      }}>
        <Clock size={10} style={{ color: 'var(--dim)', flexShrink: 0 }} />
        <span style={{
          fontFamily: "'Bebas Neue', sans-serif", fontSize: '9px', letterSpacing: '1.5px',
          color: 'var(--dim)', flexShrink: 0,
        }}>WINDOW:</span>
        {TIME_WINDOWS.map(w => {
          const active = timeWindow === w.key;
          return (
            <button key={w.key} onClick={() => setTimeWindow(w.key)} style={{
              fontFamily: "'Bebas Neue', sans-serif", fontSize: '10px', letterSpacing: '1.5px',
              padding: '3px 10px', borderRadius: '3px', cursor: 'pointer', flexShrink: 0,
              background: active ? 'rgba(0,212,160,0.18)' : 'transparent',
              border: `1px solid ${active ? 'rgba(0,212,160,0.6)' : 'rgba(255,255,255,0.1)'}`,
              color: active ? 'var(--accent)' : 'var(--dim)',
              transition: 'all 0.12s',
            }}>
              {w.label}
            </button>
          );
        })}
        <span style={{
          fontFamily: "'Share Tech Mono', monospace", fontSize: '9px',
          color: 'var(--accent)', marginLeft: '4px', flexShrink: 0,
        }}>
          {announcements.length} ITEMS IN WINDOW
        </span>
      </div>

      {/* Category + Country + Search row */}
      <div style={{
        display: 'flex', gap: '8px', padding: '7px 16px',
        borderBottom: '1px solid var(--border)', flexShrink: 0, alignItems: 'center', flexWrap: 'wrap',
      }}>
        {/* Category filter */}
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '9px', letterSpacing: '1.5px', color: 'var(--dim)', marginRight: '2px' }}>
            <Filter size={9} style={{ display: 'inline', marginRight: '3px' }} />CAT:
          </span>
          {ALL_CATEGORIES.map(cat => {
            const color = CATEGORY_COLORS[cat] || 'var(--accent)';
            const active = selectedCategory === cat;
            return (
              <button key={cat} onClick={() => setSelectedCategory(cat)} style={{
                fontFamily: "'Bebas Neue', sans-serif", fontSize: '9px', letterSpacing: '1px',
                padding: '3px 7px', borderRadius: '2px', cursor: 'pointer',
                background: active ? `${color}22` : 'transparent',
                border: `1px solid ${active ? color : 'rgba(255,255,255,0.08)'}`,
                color: active ? color : 'var(--dim)',
                transition: 'all 0.12s',
              }}>
                {cat}
              </button>
            );
          })}
        </div>

        {/* Country picker */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowCountryDropdown(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              fontFamily: "'Bebas Neue', sans-serif", fontSize: '9px', letterSpacing: '1px',
              padding: '4px 8px', borderRadius: '2px', cursor: 'pointer',
              background: selectedCountry !== 'All' ? 'rgba(77,159,255,0.15)' : 'transparent',
              border: `1px solid ${selectedCountry !== 'All' ? '#4D9FFF' : 'rgba(255,255,255,0.1)'}`,
              color: selectedCountry !== 'All' ? '#4D9FFF' : 'var(--dim)',
            }}
          >
            <Globe size={9} />
            {selectedCountry === 'All' ? 'ALL COUNTRIES' : selectedCountry.toUpperCase()}
          </button>
          {showCountryDropdown && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, zIndex: 100,
              background: '#040c18', border: '1px solid var(--border)',
              borderRadius: '3px', maxHeight: '200px', overflowY: 'auto',
              minWidth: '200px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}>
              {allCountries.map(c => (
                <div key={c} onClick={() => { setSelectedCountry(c); setShowCountryDropdown(false); }} style={{
                  padding: '6px 10px', cursor: 'pointer',
                  fontFamily: "'Rajdhani', sans-serif", fontSize: '11px',
                  color: selectedCountry === c ? 'var(--accent)' : 'var(--text)',
                  background: selectedCountry === c ? 'rgba(0,212,160,0.1)' : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = selectedCountry === c ? 'rgba(0,212,160,0.1)' : 'transparent'}
                >
                  {c} {countryStats[c] ? `(${countryStats[c]})` : ''}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <div style={{ flex: 1, minWidth: '200px', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={10} style={{ position: 'absolute', left: '8px', color: 'var(--dim)', pointerEvents: 'none' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search announcements, countries, sources..."
            style={{
              width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '3px', padding: '5px 28px 5px 24px',
              color: 'var(--text)', fontFamily: "'Rajdhani', sans-serif", fontSize: '11px',
              outline: 'none',
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{
              position: 'absolute', right: '6px', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--dim)', padding: '2px', lineHeight: 1,
            }}>
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Top countries strip */}
      {topCountries.length > 0 && (
        <div style={{
          display: 'flex', gap: '6px', padding: '5px 16px',
          borderBottom: '1px solid var(--border)', overflowX: 'auto', flexShrink: 0,
        }}>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '8px', letterSpacing: '1px', color: 'var(--dim)', alignSelf: 'center', flexShrink: 0 }}>TOP:</span>
          {topCountries.map(([country, count]) => (
            <button
              key={country}
              onClick={() => setSelectedCountry(selectedCountry === country ? 'All' : country)}
              style={{
                fontFamily: "'Share Tech Mono', monospace", fontSize: '8px',
                padding: '2px 7px', borderRadius: '2px', cursor: 'pointer', flexShrink: 0,
                background: selectedCountry === country ? 'rgba(0,212,160,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${selectedCountry === country ? 'rgba(0,212,160,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: selectedCountry === country ? 'var(--accent)' : 'var(--dim)',
              }}
            >
              {country} · {count}
            </button>
          ))}
        </div>
      )}

      {/* Feed */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--dim)' }}>
            <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '3px', fontSize: '12px' }}>LOADING INTELLIGENCE...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--dim)' }}>
            <Globe size={24} style={{ opacity: 0.4 }} />
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '3px', fontSize: '12px' }}>
              {searchQuery ? 'NO RESULTS FOUND' : 'NO ANNOUNCEMENTS LOADED'}
            </div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '11px', textAlign: 'center', maxWidth: '300px' }}>
              {searchQuery
                ? `No announcements match "${searchQuery}"`
                : 'Click REFRESH to fetch live feeds from official government sources worldwide.'}
            </div>
            <button
              onClick={searchQuery ? () => setSearchQuery('') : handleRefresh}
              style={{
                fontFamily: "'Bebas Neue', sans-serif", fontSize: '11px', letterSpacing: '2px',
                padding: '7px 16px', background: 'rgba(0,212,160,0.1)',
                border: '1px solid rgba(0,212,160,0.35)', borderRadius: '3px',
                color: 'var(--accent)', cursor: 'pointer',
              }}
            >
              {searchQuery ? 'CLEAR SEARCH' : 'FETCH NOW'}
            </button>
          </div>
        ) : (
          filtered.slice(0, 100).map(item => (
            <AnnouncementCard key={item.id} item={item} searchQuery={searchQuery} />
          ))
        )}
      </div>
    </div>
  );
}
