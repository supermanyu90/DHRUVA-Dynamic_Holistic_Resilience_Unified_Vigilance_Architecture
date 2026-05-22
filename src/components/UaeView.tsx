import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { IntelligenceAPI } from '../lib/intelligence-api';

function fmtAge(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function categorize(tweet: any): string {
  const text = ((tweet.content || '') + ' ' + (tweet.hashtags || []).join(' ')).toLowerCase();
  if (/defense|military|uae armed|security|weapon|forces/.test(text)) return 'Security';
  if (/finance|market|business|adnoc|economy|investment|trade|oil|gdp/.test(text)) return 'Economy';
  if (/diplomacy|minister|president|government|policy|cabinet|foreign|political/.test(text)) return 'Politics';
  return 'Society';
}

const COLUMNS = [
  { name: 'Security', role: 'Defense & Intelligence', color: '#FF6B00' },
  { name: 'Economy', role: 'Business & Finance', color: '#FFB800' },
  { name: 'Politics', role: 'Government & Diplomacy', color: '#4D9FFF' },
  { name: 'Society', role: 'Culture & Events', color: '#00D4A0' },
];

export function UaeView() {
  const [tweets, setTweets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadTweets() {
    setLoading(true);
    try {
      const data = await IntelligenceAPI.getUAETwitter(100);
      setTweets(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTweets();
  }, []);

  const stats = {
    tweets: tweets.length,
    accounts: new Set(tweets.map(t => t.author)).size,
    engagement: tweets.reduce((s, t) => s + (t.engagement_score || 0), 0),
    sentiment: Math.round(tweets.filter(t => t.sentiment === 'positive').length / Math.max(tweets.length, 1) * 100),
  };

  const columns = COLUMNS.map(col => ({
    ...col,
    tweets: tweets.filter(t => categorize(t) === col.name),
  }));

  return (
    <div className="view active uae-wrap">
      <div className="uae-header">
        <div>
          <div className="uae-title">🇦🇪 UAE LIVE TWITTER FEED</div>
          <div className="uae-sub">Real-time Social Intelligence from United Arab Emirates</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="uae-status-pill">{loading ? 'UPDATING...' : 'STREAM ACTIVE'}</div>
          <button className="uae-refresh-btn" disabled={loading} onClick={loadTweets}>
            <Activity size={12} style={{ display: 'inline', marginRight: '4px' }} />
            REFRESH
          </button>
        </div>
      </div>

      <div className="uae-stats-strip">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className="uae-stat-tile">
            <div className="uae-stat-n">{typeof value === 'number' ? value.toLocaleString() : value}</div>
            <div className="uae-stat-l">{key.toUpperCase()}</div>
          </div>
        ))}
      </div>

      <div className="uae-toolbar">
        <button className="uae-filter-btn active">ALL SOURCES</button>
        <button className="uae-filter-btn">VERIFIED</button>
        <button className="uae-filter-btn">GOVERNMENT</button>
        <button className="uae-filter-btn">NEWS MEDIA</button>
        <div className="uae-src-sep"></div>
        <button className="uae-filter-btn">ARABIC</button>
        <button className="uae-filter-btn">ENGLISH</button>
      </div>

      <div className="uae-columns">
        {columns.map((col, i) => (
          <div key={i} className="uae-col">
            <div className="uae-col-hdr">
              <div className="uae-col-dot" style={{ background: col.color }}></div>
              <div>
                <div className="uae-col-name" style={{ color: col.color }}>
                  {col.name.toUpperCase()}
                </div>
                <div className="uae-col-role">{col.role}</div>
              </div>
              <div className="uae-col-badge live">LIVE</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {col.tweets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--dim)', fontSize: '11px' }}>Monitoring stream...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {col.tweets.map((tweet) => (
                    <div
                      key={tweet.id}
                      style={{
                        background: 'var(--card-bg, rgba(4,12,24,.9))',
                        border: '1px solid var(--border)',
                        borderRadius: '3px',
                        padding: '8px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: '10px', color: col.color, fontWeight: 600, marginBottom: '4px' }}>{tweet.author}</div>
                      <div style={{ fontSize: '11px', lineHeight: 1.4, color: 'var(--text)', marginBottom: '4px' }}>{tweet.content}</div>
                      <div style={{ fontSize: '9px', color: 'var(--dim)' }}>{tweet.posted_at ? fmtAge(tweet.posted_at) : '—'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
