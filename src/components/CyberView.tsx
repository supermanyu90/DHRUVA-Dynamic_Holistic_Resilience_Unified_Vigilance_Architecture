import { useState, useEffect, useCallback } from 'react';
import { Shield, Activity, RefreshCw } from 'lucide-react';
import { CyberThreat } from '../lib/intelligence-api';
import { supabase } from '../lib/supabase';

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
      let query = supabase
        .from('cyber_threats')
        .select('*')
        .order('first_seen', { ascending: false })
        .limit(100);
      const since = getWindowStart(timeWindow);
      if (since) query = query.gte('first_seen', since);
      const { data, error } = await query;
      if (error) throw error;
      setThreats((data as CyberThreat[]) || []);
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Failed to load cyber threats:', err);
    } finally {
      setLoading(false);
    }
  }, [timeWindow]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-cyber-threats`;
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      await new Promise(r => setTimeout(r, 2000));
      await loadThreats();
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, [loadThreats]);

  useEffect(() => {
    setLoading(true);
    loadThreats();
  }, [loadThreats]);

  useEffect(() => {
    const channel = supabase
      .channel('cyber-threats-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cyber_threats' }, () => {
        loadThreats();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
