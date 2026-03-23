import { useState } from 'react';
import { Activity } from 'lucide-react';

interface Tweet {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  category: string;
}

export function UaeView() {
  const [loading, setLoading] = useState(false);

  const stats = {
    tweets: 1247,
    accounts: 89,
    engagement: 45623,
    sentiment: 72,
    topics: 23,
    trending: 8,
  };

  const columns = [
    { name: 'Security', role: 'Defense & Intelligence', color: '#FF6B00', tweets: [] as Tweet[] },
    { name: 'Economy', role: 'Business & Finance', color: '#FFB800', tweets: [] as Tweet[] },
    { name: 'Politics', role: 'Government & Diplomacy', color: '#4D9FFF', tweets: [] as Tweet[] },
    { name: 'Society', role: 'Culture & Events', color: '#00D4A0', tweets: [] as Tweet[] },
  ];

  const sampleTweets: Tweet[] = [
    {
      id: '1',
      author: '@UAEGovNews',
      content: 'UAE strengthens defense cooperation with strategic partners in the region',
      timestamp: '2m',
      category: 'Security',
    },
    {
      id: '2',
      author: '@DubaiFinance',
      content: 'Dubai stock market reaches new highs as foreign investment surges',
      timestamp: '5m',
      category: 'Economy',
    },
    {
      id: '3',
      author: '@UAEDiplomacy',
      content: 'Foreign Minister meets counterparts to discuss regional stability',
      timestamp: '8m',
      category: 'Politics',
    },
    {
      id: '4',
      author: '@DubaiCulture',
      content: 'Expo 2024 preparations in full swing with international participation',
      timestamp: '12m',
      category: 'Society',
    },
  ];

  columns.forEach((col) => {
    col.tweets = sampleTweets.filter((t) => t.category === col.name);
  });

  return (
    <div className="view active uae-wrap">
      <div className="uae-header">
        <div>
          <div className="uae-title">🇦🇪 UAE LIVE TWITTER FEED</div>
          <div className="uae-sub">Real-time Social Intelligence from United Arab Emirates</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="uae-status-pill">{loading ? 'UPDATING...' : 'STREAM ACTIVE'}</div>
          <button className="uae-refresh-btn" disabled={loading} onClick={async () => {
            setLoading(true);
            await new Promise(r => setTimeout(r, 2000));
            setLoading(false);
          }}>
            <Activity size={12} style={{ display: 'inline', marginRight: '4px' }} />
            REFRESH
          </button>
        </div>
      </div>

      <div className="uae-stats-strip">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className="uae-stat-tile">
            <div className="uae-stat-n">{value.toLocaleString()}</div>
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
                      <div style={{ fontSize: '9px', color: 'var(--dim)' }}>{tweet.timestamp} ago</div>
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
