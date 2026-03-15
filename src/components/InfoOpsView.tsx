import { useState } from 'react';
import { Brain, Activity, TrendingUp } from 'lucide-react';

interface InfoOperation {
  id: string;
  type: 'bot' | 'propaganda' | 'disinfo' | 'influence' | 'narrative';
  title: string;
  description: string;
  status: 'active' | 'monitoring' | 'attributed' | 'historical';
  platforms: string[];
  metrics: {
    reach: string;
    engagement: string;
    accounts: string;
  };
  tags: string[];
}

export function InfoOpsView() {
  const [filter, setFilter] = useState<string>('all');

  const signals = {
    campaigns: 12,
    narratives: 34,
    bots: 156,
    attribution: 8,
  };

  const operations: InfoOperation[] = [
    {
      id: '1',
      type: 'bot',
      title: 'Coordinated Bot Network - India Elections',
      description: 'Automated accounts spreading divisive content ahead of state elections',
      status: 'active',
      platforms: ['x', 'fb', 'wa'],
      metrics: {
        reach: '2.3M',
        engagement: '450K',
        accounts: '1,247',
      },
      tags: ['India', 'Elections', 'Polarization'],
    },
    {
      id: '2',
      type: 'propaganda',
      title: 'State-Sponsored Media Campaign',
      description: 'Pro-regime narratives amplified across multiple platforms',
      status: 'monitoring',
      platforms: ['rt', 'tg', 'yt'],
      metrics: {
        reach: '5.1M',
        engagement: '890K',
        accounts: '234',
      },
      tags: ['Russia', 'Ukraine', 'Disinformation'],
    },
    {
      id: '3',
      type: 'disinfo',
      title: 'COVID-19 Vaccine Misinformation',
      description: 'False claims about vaccine safety targeting healthcare workers',
      status: 'attributed',
      platforms: ['fb', 'wa', 'tg'],
      metrics: {
        reach: '1.8M',
        engagement: '320K',
        accounts: '89',
      },
      tags: ['Health', 'Vaccines', 'Misinformation'],
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: 'rgba(255,68,0,.12)', color: '#FF6644', border: 'rgba(255,68,0,.25)' };
      case 'monitoring':
        return { bg: 'rgba(255,184,0,.1)', color: '#FFB800', border: 'rgba(255,184,0,.2)' };
      case 'attributed':
        return { bg: 'rgba(200,100,255,.1)', color: '#CC66FF', border: 'rgba(200,100,255,.2)' };
      default:
        return { bg: 'rgba(160,160,160,.08)', color: '#AAAAAA', border: 'rgba(160,160,160,.15)' };
    }
  };

  const getPlatformStyle = (platform: string) => {
    const styles: Record<string, any> = {
      x: { border: '#888', color: '#CCC', bg: 'rgba(128,128,128,.06)' },
      fb: { border: '#3B5998', color: '#8899DD', bg: 'rgba(59,89,152,.06)' },
      tg: { border: '#0088CC', color: '#55AADD', bg: 'rgba(0,136,204,.06)' },
      yt: { border: '#FF0000', color: '#FF8888', bg: 'rgba(255,0,0,.06)' },
      wa: { border: '#25D366', color: '#55EE88', bg: 'rgba(37,211,102,.06)' },
      rt: { border: '#FF8800', color: '#FFAA44', bg: 'rgba(255,136,0,.06)' },
    };
    return styles[platform] || styles.x;
  };

  return (
    <div className="view active infoops-wrap">
      <div className="infoops-header">
        <div className="infoops-title">INFO OPS — INFLUENCE INTELLIGENCE</div>
        <div className="infoops-sub">Influence Operations & Narrative Warfare Monitoring</div>
      </div>

      <div className="infoops-toolbar">
        <button className="infoops-refresh-btn">
          <Activity size={12} style={{ display: 'inline', marginRight: '4px' }} />
          REFRESH
        </button>
        <div className="infoops-status">Last analysis: 15 minutes ago</div>
      </div>

      <div className="infoops-body">
        <div className="infoops-signal-strip">
          {Object.entries(signals).map(([key, count]) => (
            <div key={key} className="infoops-signal-tile">
              <div className="infoops-signal-n" style={{ color: '#CC66FF' }}>
                {count}
              </div>
              <div className="infoops-signal-l">{key.toUpperCase()}</div>
            </div>
          ))}
        </div>

        <div className="infoops-section-title">
          <Brain size={14} />
          ACTIVE OPERATIONS
        </div>

        <div className="infoops-filter-bar">
          <button className={`infoops-filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            ALL
          </button>
          <button className={`infoops-filter-btn ${filter === 'bot' ? 'active' : ''}`} onClick={() => setFilter('bot')}>
            BOT NETWORKS
          </button>
          <button className={`infoops-filter-btn ${filter === 'propaganda' ? 'active' : ''}`} onClick={() => setFilter('propaganda')}>
            PROPAGANDA
          </button>
          <button className={`infoops-filter-btn ${filter === 'disinfo' ? 'active' : ''}`} onClick={() => setFilter('disinfo')}>
            DISINFO
          </button>
        </div>

        <div className="infoops-feed">
          {operations.map((op) => {
            const statusStyle = getStatusColor(op.status);
            return (
              <div key={op.id} className={`infoops-card type-${op.type}`}>
                <div className="infoops-card-head">
                  <div className="infoops-card-type">{op.type.toUpperCase()}</div>
                  <div
                    className="infoops-card-status"
                    style={{
                      background: statusStyle.bg,
                      color: statusStyle.color,
                      border: `1px solid ${statusStyle.border}`,
                    }}
                  >
                    {op.status.toUpperCase()}
                  </div>
                </div>
                <div className="infoops-card-title">{op.title}</div>
                <div className="infoops-card-desc">{op.description}</div>
                <div className="infoops-card-metrics">
                  <div className="infoops-metric">
                    <div className="infoops-metric-n">{op.metrics.reach}</div>
                    <div className="infoops-metric-l">REACH</div>
                  </div>
                  <div className="infoops-metric">
                    <div className="infoops-metric-n">{op.metrics.engagement}</div>
                    <div className="infoops-metric-l">ENGAGEMENT</div>
                  </div>
                  <div className="infoops-metric">
                    <div className="infoops-metric-n">{op.metrics.accounts}</div>
                    <div className="infoops-metric-l">ACCOUNTS</div>
                  </div>
                </div>
                <div className="infoops-card-footer">
                  <div className="infoops-platform-row">
                    {op.platforms.map((p, i) => {
                      const style = getPlatformStyle(p);
                      return (
                        <div
                          key={i}
                          className={`platform-pill ${p}`}
                          style={{
                            borderColor: style.border,
                            color: style.color,
                            background: style.bg,
                          }}
                        >
                          {p.toUpperCase()}
                        </div>
                      );
                    })}
                  </div>
                  {op.tags.map((tag, i) => (
                    <div key={i} className="infoops-tag">
                      {tag}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
