import { useState, useEffect, useCallback } from 'react';
import { Brain, Activity, RefreshCw } from 'lucide-react';
import { InfoOp } from '../lib/intelligence-api';

type TimeWindow = '1h' | '6h' | '24h' | '7d' | 'all';

const TIME_WINDOWS: { key: TimeWindow; label: string }[] = [
  { key: '1h',  label: '1HR'  },
  { key: '6h',  label: '6HR'  },
  { key: '24h', label: '24H'  },
  { key: '7d',  label: '7D'   },
  { key: 'all', label: 'ALL'  },
];


function getStatusColor(status: string) {
  switch (status) {
    case 'active':     return { bg: 'rgba(255,68,0,.12)', color: '#FF6644', border: 'rgba(255,68,0,.25)' };
    case 'monitoring': return { bg: 'rgba(255,184,0,.1)', color: '#FFB800', border: 'rgba(255,184,0,.2)' };
    case 'attributed': return { bg: 'rgba(200,100,255,.1)', color: '#CC66FF', border: 'rgba(200,100,255,.2)' };
    default:           return { bg: 'rgba(160,160,160,.08)', color: '#AAAAAA', border: 'rgba(160,160,160,.15)' };
  }
}

const PLATFORM_STYLES: Record<string, { border: string; color: string; bg: string }> = {
  x:   { border: '#888', color: '#CCC', bg: 'rgba(128,128,128,.06)' },
  fb:  { border: '#3B5998', color: '#8899DD', bg: 'rgba(59,89,152,.06)' },
  tg:  { border: '#0088CC', color: '#55AADD', bg: 'rgba(0,136,204,.06)' },
  yt:  { border: '#FF0000', color: '#FF8888', bg: 'rgba(255,0,0,.06)' },
  wa:  { border: '#25D366', color: '#55EE88', bg: 'rgba(37,211,102,.06)' },
  rt:  { border: '#FF8800', color: '#FFAA44', bg: 'rgba(255,136,0,.06)' },
  ig:  { border: '#C13584', color: '#E1306C', bg: 'rgba(193,53,132,.06)' },
};

function getPlatformStyle(platform: string) {
  return PLATFORM_STYLES[platform.toLowerCase()] || PLATFORM_STYLES.x;
}

export function InfoOpsView() {
  const [operations, setOperations] = useState<InfoOp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('7d');

  const loadOps = useCallback(async () => {
    try {
      setOperations([]);
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } finally {
      setLoading(false);
    }
  }, [timeWindow]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-info-ops`;
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      await new Promise(r => setTimeout(r, 2000));
      await loadOps();
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, [loadOps]);

  useEffect(() => {
    setLoading(true);
    loadOps();
  }, [loadOps]);


  const signals = {
    campaigns: operations.length,
    active: operations.filter(o => o.is_active).length,
    platforms: [...new Set(operations.map(o => o.platform).filter(Boolean))].length,
    countries: [...new Set(operations.map(o => o.origin_country).filter(Boolean))].length,
  };

  const filteredOps = operations.filter(op => {
    if (filter === 'all') return true;
    if (filter === 'active') return op.is_active;
    return op.platform?.toLowerCase().includes(filter.toLowerCase());
  });

  function formatAge(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

  return (
    <div className="view active infoops-wrap">
      <div className="infoops-header">
        <div className="infoops-title">INFO OPS — INFLUENCE INTELLIGENCE</div>
        <div className="infoops-sub">Influence Operations & Narrative Warfare Monitoring</div>
      </div>

      <div className="infoops-toolbar">
        <button className="infoops-refresh-btn" onClick={handleRefresh} disabled={refreshing}>
          {refreshing
            ? <><Activity size={12} style={{ display: 'inline', marginRight: '4px', animation: 'spin 0.8s linear infinite' }} />FETCHING...</>
            : <><RefreshCw size={12} style={{ display: 'inline', marginRight: '4px' }} />REFRESH</>
          }
        </button>
        <div className="infoops-status">
          {loading ? 'LOADING...' : lastUpdated ? `Last analysis: ${lastUpdated}` : 'No data loaded'}
        </div>
      </div>

      <div className="infoops-time-row">
        <span className="infoops-time-label">WINDOW:</span>
        {TIME_WINDOWS.map(w => (
          <button
            key={w.key}
            className={`infoops-time-btn ${timeWindow === w.key ? 'active' : ''}`}
            onClick={() => setTimeWindow(w.key)}
          >
            {w.label}
          </button>
        ))}
        <span className="infoops-time-count">{operations.length} OPS</span>
      </div>

      <div className="infoops-body">
        <div className="infoops-signal-strip">
          {Object.entries(signals).map(([key, count]) => (
            <div key={key} className="infoops-signal-tile">
              <div className="infoops-signal-n" style={{ color: '#CC66FF' }}>{count}</div>
              <div className="infoops-signal-l">{key.toUpperCase()}</div>
            </div>
          ))}
        </div>

        <div className="infoops-section-title">
          <Brain size={14} />
          ACTIVE OPERATIONS
        </div>

        <div className="infoops-filter-bar">
          {['all', 'active', 'bot', 'propaganda', 'disinfo'].map(f => (
            <button
              key={f}
              className={`infoops-filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'ALL' : f === 'active' ? 'ACTIVE' : f === 'bot' ? 'BOT NETWORKS' : f === 'propaganda' ? 'PROPAGANDA' : 'DISINFO'}
            </button>
          ))}
        </div>

        <div className="infoops-feed">
          {loading ? (
            <div className="news-loading">
              <div className="spinner" />
              LOADING INFLUENCE OPERATIONS...
            </div>
          ) : filteredOps.length === 0 ? (
            <div className="news-loading">
              <div className="news-empty-title">NO OPERATIONS FOUND</div>
              <div className="news-empty-hint">Click REFRESH to fetch the latest influence operations data.</div>
              <button className="news-retry-btn" onClick={handleRefresh}>REFRESH</button>
            </div>
          ) : (
            filteredOps.map(op => {
              const statusStyle = getStatusColor(op.is_active ? 'active' : 'historical');
              const platforms = op.platform ? op.platform.split(',').map(p => p.trim()) : [];
              return (
                <div key={op.id} className={`infoops-card type-influence`}>
                  <div className="infoops-card-head">
                    <div className="infoops-card-type">{op.origin_country || 'UNKNOWN'}</div>
                    <div
                      className="infoops-card-status"
                      style={{
                        background: statusStyle.bg,
                        color: statusStyle.color,
                        border: `1px solid ${statusStyle.border}`,
                      }}
                    >
                      {op.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </div>
                  </div>
                  <div className="infoops-card-title">{op.title}</div>
                  <div className="infoops-card-desc">{op.description}</div>
                  <div className="infoops-card-footer">
                    <div className="infoops-platform-row">
                      {platforms.map((p, i) => {
                        const style = getPlatformStyle(p);
                        return (
                          <div
                            key={i}
                            className={`platform-pill ${p.toLowerCase()}`}
                            style={{ borderColor: style.border, color: style.color, background: style.bg }}
                          >
                            {p.toUpperCase()}
                          </div>
                        );
                      })}
                    </div>
                    <div className="infoops-tag">{formatAge(op.first_detected)} ago</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
