import { useState, useEffect, useCallback } from 'react';
import { Shield, Activity, RefreshCw } from 'lucide-react';
import { CyberThreat } from '../lib/intelligence-api';

const RSS_PROXY = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rss-proxy`;

type TimeWindow = '1h' | '6h' | '24h' | '7d' | 'all';

const TIME_WINDOWS: { key: TimeWindow; label: string }[] = [
  { key: '1h',  label: '1HR'  },
  { key: '6h',  label: '6HR'  },
  { key: '24h', label: '24H'  },
  { key: '7d',  label: '7D'   },
  { key: 'all', label: 'ALL'  },
];


const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'] as const;

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'critical': return '#FF0040';
    case 'high':     return '#FF6B00';
    case 'medium':   return '#FFB800';
    case 'low':      return '#00D4A0';
    default:         return '#8BAFC8';
  }
}

export function CyberView() {
  const [threats, setThreats] = useState<CyberThreat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('7d');

  const loadThreats = useCallback(async () => {
    try {
      // abuse.ch feeds send no CORS headers, so they are routed through the
      // rss-proxy raw passthrough (both domains are allowlisted there).
      const [feodoRes, urlhausRes, ransomRes] = await Promise.allSettled([
        fetch(`${RSS_PROXY}?raw=${encodeURIComponent('https://feodotracker.abuse.ch/downloads/ipblocklist_aggressive.csv')}`, { signal: AbortSignal.timeout(15_000) }),
        fetch(`${RSS_PROXY}?raw=${encodeURIComponent('https://urlhaus.abuse.ch/downloads/csv_recent/')}`, { signal: AbortSignal.timeout(20_000) }),
        fetch(`${RSS_PROXY}?gdelt=${encodeURIComponent('https://api.gdeltproject.org/api/v2/doc/doc?query=ransomware+OR+cyberattack+OR+malware+OR+%22data+breach%22&mode=ArtList&format=json&maxrecords=30&timespan=10080min&sort=DateDesc')}`, { signal: AbortSignal.timeout(20_000) }),
      ]);

      const newThreats: CyberThreat[] = [];
      let idx = 0;

      if (feodoRes.status === 'fulfilled' && feodoRes.value.ok) {
        const text = await feodoRes.value.text();
        const lines = text.split('\n').filter((l: string) => l && !l.startsWith('#') && l.trim());
        for (const line of lines.slice(0, 40)) {
          const parts = line.split(',');
          if (parts.length >= 2) {
            const ip = parts[0]?.trim();
            const port = parts[1]?.trim() || '?';
            newThreats.push({
              id: `feodo-${idx++}`, threat_id: `feodo-${ip}`,
              title: `C2 Server: ${ip}`,
              description: `Botnet C2 infrastructure — Port ${port}`,
              severity: 'high', threat_type: 'c2_server', is_active: true,
              first_seen: new Date().toISOString(),
              last_seen: new Date().toISOString(),
            });
          }
        }
      }

      if (urlhausRes.status === 'fulfilled' && urlhausRes.value.ok) {
        const text = await urlhausRes.value.text();
        const lines = text.split('\n').filter((l: string) => l && !l.startsWith('#') && !l.startsWith('"id"'));
        for (const line of lines.slice(0, 30)) {
          const parts = line.split('","').map((p: string) => p.replace(/^"|"$/g, ''));
          if (parts.length >= 4) {
            const severity: 'critical' | 'high' | 'medium' | 'low' = parts[5]?.includes('malware_download') ? 'critical' : 'medium';
            newThreats.push({
              id: `urlhaus-${idx++}`, threat_id: `urlhaus-${parts[0] || idx}`,
              title: `Malware Host: ${(parts[2] || 'Unknown URL').slice(0, 60)}`,
              description: `${parts[4] || 'Malware distribution'} — ${parts[5] || ''}`,
              severity, threat_type: 'malware_host', is_active: true,
              first_seen: parts[1] || new Date().toISOString(),
              last_seen: new Date().toISOString(),
            });
          }
        }
      }

      if (ransomRes.status === 'fulfilled' && ransomRes.value.ok) {
        const json = await ransomRes.value.json();
        const articles: any[] = json?.articles ?? [];
        for (const a of articles) {
          const title = (a.title ?? '') as string;
          const lower = title.toLowerCase();
          const severity: 'critical' | 'high' | 'medium' | 'low' = lower.includes('critical') || lower.includes('breach') ? 'critical'
            : lower.includes('ransomware') || lower.includes('attack') ? 'high' : 'medium';
          newThreats.push({
            id: `cyber-news-${idx++}`, threat_id: `cyber-gdelt-${idx}`,
            title: title.slice(0, 120),
            description: `Source: ${a.domain ?? 'unknown'} — ${title}`,
            severity, threat_type: lower.includes('ransomware') ? 'ransomware' : lower.includes('phish') ? 'phishing' : 'apt',
            is_active: true,
            first_seen: a.seendate ? new Date(a.seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z')).toISOString() : new Date().toISOString(),
            last_seen: new Date().toISOString(),
          });
        }
      }

      setThreats(newThreats);
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Load threats failed:', err);
      setThreats([]);
    } finally {
      setLoading(false);
    }
  }, [timeWindow]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    await loadThreats();
    setRefreshing(false);
  }, [loadThreats]);

  useEffect(() => {
    setLoading(true);
    loadThreats();
  }, [loadThreats]);


  const threatLevels = {
    critical: threats.filter(t => t.severity === 'critical').length,
    high: threats.filter(t => t.severity === 'high').length,
    medium: threats.filter(t => t.severity === 'medium').length,
    low: threats.filter(t => t.severity === 'low').length,
  };

  const filteredThreats = threats.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'apt') return t.threat_type?.toLowerCase().includes('apt');
    if (filter === 'ransomware') return t.threat_type?.toLowerCase().includes('ransomware');
    if (filter === 'malware') return t.threat_type?.toLowerCase().includes('malware');
    if (filter === 'vuln') return t.threat_type?.toLowerCase().includes('vulnerabilit');
    return t.threat_type?.toLowerCase().includes(filter.toLowerCase());
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
    <div className="view active cyber-wrap">
      <div className="cyber-header">
        <div className="cyber-title">CYBER WATCH — THREAT INTELLIGENCE</div>
        <div className="cyber-sub">Real-time Cybersecurity Threat Monitoring & Analysis</div>
      </div>

      <div className="cyber-toolbar">
        <button className="cyber-refresh-btn" onClick={handleRefresh} disabled={refreshing}>
          {refreshing
            ? <><Activity size={12} style={{ display: 'inline', marginRight: '4px', animation: 'spin 0.8s linear infinite' }} />FETCHING...</>
            : <><RefreshCw size={12} style={{ display: 'inline', marginRight: '4px' }} />REFRESH</>
          }
        </button>
        <div className="cyber-status">
          {loading ? 'LOADING...' : lastUpdated ? `Last updated: ${lastUpdated}` : 'No data loaded'}
        </div>
      </div>

      <div className="cyber-body">
        <div className="cyber-threat-strip">
          {SEVERITY_ORDER.map(severity => (
            <div key={severity} className={`cyber-threat-tile ${severity}`}>
              <div className={`cyber-threat-n ${severity}`} style={{ color: getSeverityColor(severity) }}>
                {threatLevels[severity]}
              </div>
              <div className="cyber-threat-l">{severity.toUpperCase()}</div>
            </div>
          ))}
        </div>

        <div className="cyber-section-title">
          <Shield size={14} />
          ACTIVE THREATS
        </div>

        <div className="cyber-time-row">
          <span className="cyber-time-label">WINDOW:</span>
          {TIME_WINDOWS.map(w => (
            <button
              key={w.key}
              className={`cyber-time-btn ${timeWindow === w.key ? 'active' : ''}`}
              onClick={() => setTimeWindow(w.key)}
            >
              {w.label}
            </button>
          ))}
          <span className="cyber-time-count">{threats.length} THREATS</span>
        </div>

        <div className="cyber-filter-bar">
          {['all', 'apt', 'ransomware', 'malware', 'vuln'].map(f => (
            <button
              key={f}
              className={`cyber-filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'ALL' : f === 'apt' ? 'APT' : f === 'ransomware' ? 'RANSOMWARE' : f === 'malware' ? 'MALWARE' : 'VULNERABILITIES'}
            </button>
          ))}
        </div>

        <div className="cyber-feed">
          {loading ? (
            <div className="news-loading">
              <div className="spinner" />
              LOADING THREAT INTELLIGENCE...
            </div>
          ) : filteredThreats.length === 0 ? (
            <div className="news-loading">
              <div className="news-empty-title">NO THREATS FOUND</div>
              <div className="news-empty-hint">Click REFRESH to fetch the latest threat intelligence data.</div>
              <button className="news-retry-btn" onClick={handleRefresh}>REFRESH</button>
            </div>
          ) : (
            filteredThreats.map(threat => (
              <div key={threat.id} className={`cyber-card sev-${threat.severity}`}>
                <div className="cyber-card-head">
                  <div className="cyber-card-type">{threat.threat_type?.toUpperCase() || 'UNKNOWN'}</div>
                  <div className="cyber-card-age">{formatAge(threat.first_seen)} ago</div>
                </div>
                <div className="cyber-card-title">{threat.title}</div>
                <div className="cyber-card-desc">{threat.description}</div>
                <div className="cyber-card-footer">
                  <div className={`cyber-sev-badge ${threat.severity}`}>{threat.severity.toUpperCase()}</div>
                  {!threat.is_active && (
                    <div className="cyber-tag" style={{ color: '#8BAFC8' }}>RESOLVED</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
