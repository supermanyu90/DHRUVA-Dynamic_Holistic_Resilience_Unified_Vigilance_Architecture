import { useState, useEffect, useCallback } from 'react';
import { Shield, Activity, RefreshCw, Share2 } from 'lucide-react';
import { CyberThreat } from '../lib/intelligence-api';
import { ShareMenu } from './ShareMenu';
import type { SharePayload } from '../lib/share';

const RSS_PROXY = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rss-proxy`;

/** Compose a shareable payload for a cyber threat (no per-threat link → app URL). */
function buildCyberShare(t: CyberThreat): SharePayload {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://dhruva.app';
  const sev = (t.severity || 'low').toUpperCase();
  const type = (t.threat_type || 'threat').replace(/_/g, ' ');
  const text = `⚠️ DHRUVA CYBER THREAT [${sev}]: ${t.title} · ${type} — live intelligence & vigilance`;
  return { title: `DHRUVA CYBER: ${t.title}`, text, url: appUrl };
}

type TimeWindow = '1h' | '6h' | '24h' | '7d' | 'all';

const TIME_WINDOWS: { key: TimeWindow; label: string }[] = [
  { key: '1h',  label: '1HR'  },
  { key: '6h',  label: '6HR'  },
  { key: '24h', label: '24H'  },
  { key: '7d',  label: '7D'   },
  { key: 'all', label: 'ALL'  },
];


const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'] as const;

// Botnet families whose live C2s warrant a critical rating.
const HIGH_IMPACT_MALWARE = /dridex|emotet|qakbot|qbot|icedid|trickbot|pikabot|bumblebee|gozi|bazar|conti|lockbit|blackcat|cobalt.?strike/i;

/** Extract quoted fields from a CSV row (abuse.ch feeds quote every field). */
function parseQuotedCsv(line: string): string[] {
  const m = line.match(/"([^"]*)"/g);
  if (m) return m.map((s) => s.slice(1, -1));
  return line.split(',').map((s) => s.trim());
}

function isIPv4(s: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(s);
}

function hostFromUrl(url: string): string {
  try { return new URL(url).host; } catch { /* fall through */ }
  const m = url.match(/^https?:\/\/([^/?#]+)/i);
  return m ? m[1] : url.slice(0, 40);
}

/** "2021-01-17 07:30:05" (UTC) → ISO. Returns now() on anything unparseable. */
function parseSpaceDate(s?: string): string {
  if (s) {
    const d = new Date(s.trim().replace(' ', 'T') + 'Z');
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

/**
 * Read only the first `wantedDataLines` non-comment lines of a (potentially
 * multi-MB) response, then cancel — so URLhaus's newest-first dump costs a few
 * KB instead of downloading and parsing the whole file.
 */
async function readLeadingLines(res: Response, wantedDataLines: number): Promise<string[]> {
  const reader = res.body?.getReader();
  if (!reader) return (await res.text()).split('\n');
  const decoder = new TextDecoder();
  const out: string[] = [];
  let buf = '';
  let data = 0;
  try {
    while (data < wantedDataLines) {
      const { done, value } = await reader.read();
      if (value) buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf('\n')) >= 0 && data < wantedDataLines) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        out.push(line);
        if (line && !line.startsWith('#')) data++;
      }
      if (done) break;
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  return out;
}

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
  const [shareId, setShareId] = useState<string | null>(null);

  const loadThreats = useCallback(async () => {
    try {
      // abuse.ch feeds send no CORS headers, so they are routed through the
      // rss-proxy raw passthrough (both domains are allowlisted there).
      const [feodoRes, urlhausRes, ransomRes] = await Promise.allSettled([
        // Recommended blocklist (small, current C2s) — not the 600 KB aggressive list.
        fetch(`${RSS_PROXY}?raw=${encodeURIComponent('https://feodotracker.abuse.ch/downloads/ipblocklist.csv')}`, { signal: AbortSignal.timeout(20_000) }),
        fetch(`${RSS_PROXY}?raw=${encodeURIComponent('https://urlhaus.abuse.ch/downloads/csv_online/')}`, { signal: AbortSignal.timeout(30_000) }),
        fetch(`${RSS_PROXY}?gdelt=${encodeURIComponent('https://api.gdeltproject.org/api/v2/doc/doc?query=ransomware+OR+cyberattack+OR+malware+OR+%22data+breach%22&mode=ArtList&format=json&maxrecords=30&timespan=10080min&sort=DateDesc')}`, { signal: AbortSignal.timeout(20_000) }),
      ]);

      const newThreats: CyberThreat[] = [];
      let idx = 0;

      // ── abuse.ch Feodo Tracker: live botnet command-and-control servers ──
      // Columns: first_seen_utc, dst_ip, dst_port, c2_status, last_online, malware
      if (feodoRes.status === 'fulfilled' && feodoRes.value.ok) try {
        const text = await feodoRes.value.text();
        const feodo: CyberThreat[] = [];
        for (const line of text.split('\n')) {
          if (!line || line.startsWith('#')) continue;
          const f = parseQuotedCsv(line);
          const [firstSeen, ip, port, status, , malware] = f;
          if (!isIPv4(ip || '')) continue; // skips the header row and any stray line
          const online = (status || '').toLowerCase() === 'online';
          const fam = (malware || '').trim();
          const critical = HIGH_IMPACT_MALWARE.test(fam);
          const severity: CyberThreat['severity'] = critical ? (online ? 'critical' : 'high') : online ? 'high' : 'medium';
          feodo.push({
            id: `feodo-${idx++}`, threat_id: `feodo-${ip}`,
            category: 'Botnet C2',
            title: fam
              ? `${fam} botnet controller ${online ? 'is live' : 'detected'}`
              : `Botnet command server ${online ? 'online' : 'seen'}`,
            description: online
              ? `A ${fam || 'botnet'} command-and-control server is active and directing infected machines. Any device on your network reaching it is very likely compromised.`
              : `A ${fam || 'botnet'} command-and-control server has been flagged malicious. It is offline right now but may return.`,
            indicator: `${ip}:${port || '—'}`,
            malwareFamily: fam || undefined,
            source: 'abuse.ch · Feodo Tracker',
            action: `Block ${ip} at the firewall and hunt for internal hosts beaconing to it.`,
            severity, threat_type: 'c2_server', is_active: online,
            first_seen: parseSpaceDate(firstSeen),
            last_seen: new Date().toISOString(),
          });
        }
        // The aggressive list is huge and mostly historical — surface live &
        // most-recent controllers first, then cap.
        feodo.sort((a, b) => (Number(b.is_active) - Number(a.is_active)) || b.first_seen.localeCompare(a.first_seen));
        newThreats.push(...feodo.slice(0, 30));
      } catch { /* one bad feed shouldn't sink the others */ }

      // ── abuse.ch URLhaus: URLs actively serving malware (currently online) ──
      // Columns: id, dateadded, url, url_status, last_online, threat, tags, link, reporter
      if (urlhausRes.status === 'fulfilled' && urlhausRes.value.ok) try {
        // Dump is multi-MB and newest-first — stream just the leading rows.
        const lines = await readLeadingLines(urlhausRes.value, 30);
        for (const line of lines) {
          if (!line || line.startsWith('#')) continue;
          const f = parseQuotedCsv(line);
          const [, dateadded, url, urlStatus, , threat] = f;
          if (!/^https?:\/\//i.test(url || '')) continue; // skips header/invalid
          const host = hostFromUrl(url);
          const online = (urlStatus || '').toLowerCase() === 'online';
          const payload = threat === 'malware_download' ? 'a malware payload' : (threat || 'malware').replace(/_/g, ' ');
          // Live malware hosts are serious (high); critical is reserved for active
          // high-impact botnet C2s and confirmed data breaches.
          const severity: CyberThreat['severity'] = online ? 'high' : 'medium';
          newThreats.push({
            id: `urlhaus-${idx++}`, threat_id: `urlhaus-${host}-${idx}`,
            category: 'Malware Host',
            title: `Malware served from ${host}`,
            description: `A ${online ? 'live' : 'recently-seen'} link on ${host} is distributing ${payload}. Opening or fetching it can infect a device on contact.`,
            indicator: url.length > 84 ? url.slice(0, 84) + '…' : url,
            source: 'abuse.ch · URLhaus',
            action: `Block ${host} and this URL; scan any device that reached it.`,
            severity, threat_type: 'malware_host', is_active: online,
            first_seen: parseSpaceDate(dateadded),
            last_seen: new Date().toISOString(),
          });
        }
      } catch { /* one bad feed shouldn't sink the others */ }

      // ── GDELT: open-source cyber news (breaches, ransomware, attacks) ──
      if (ransomRes.status === 'fulfilled' && ransomRes.value.ok) try {
        const json = await ransomRes.value.json();
        const articles: any[] = json?.articles ?? [];
        for (const a of articles) {
          const title = ((a.title ?? '') as string).trim();
          if (!title) continue;
          const lower = title.toLowerCase();
          const isBreach = /breach|leak|stolen|exposed|data.?theft/.test(lower);
          const isRansom = /ransomware|ransom\b/.test(lower);
          const isPhish = /phish/.test(lower);
          const severity: CyberThreat['severity'] = isBreach ? 'critical'
            : isRansom || /attack|hacked|exploit|zero.?day/.test(lower) ? 'high' : 'medium';
          const category = isBreach ? 'Data Breach' : isRansom ? 'Ransomware' : isPhish ? 'Phishing' : 'Cyber Incident';
          newThreats.push({
            id: `cyber-news-${idx++}`, threat_id: `cyber-gdelt-${idx}`,
            category,
            title: title.length > 130 ? title.slice(0, 130) + '…' : title,
            description: `Open-source cyber report picked up from ${a.domain ?? 'the news wire'}.`,
            source: a.domain ?? 'GDELT news',
            severity,
            threat_type: isRansom ? 'ransomware' : isPhish ? 'phishing' : isBreach ? 'breach' : 'apt',
            is_active: true,
            first_seen: a.seendate ? new Date(a.seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z')).toISOString() : new Date().toISOString(),
            last_seen: new Date().toISOString(),
          });
        }
      } catch { /* one bad feed shouldn't sink the others */ }

      // Most urgent first: severity, then live before inactive, then freshest.
      const sevRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      newThreats.sort((a, b) =>
        (sevRank[a.severity] - sevRank[b.severity]) ||
        (Number(b.is_active) - Number(a.is_active)) ||
        b.first_seen.localeCompare(a.first_seen)
      );
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
              <div key={threat.id} className={`cyber-card sev-${threat.severity}`} style={{ position: 'relative' }}>
                <div className="cyber-card-head">
                  <div className="cyber-card-head-l">
                    <div
                      className="cyber-card-type"
                      style={{ color: getSeverityColor(threat.severity), borderColor: `${getSeverityColor(threat.severity)}55` }}
                    >
                      {(threat.category || threat.threat_type || 'THREAT').toUpperCase()}
                    </div>
                    {threat.source && <div className="cyber-card-source">{threat.source}</div>}
                  </div>
                  <div className="cyber-card-age">{formatAge(threat.first_seen)} ago</div>
                </div>
                <div className="cyber-card-title">{threat.title}</div>
                <div className="cyber-card-desc">{threat.description}</div>
                {threat.indicator && (
                  <div className="cyber-ioc">
                    <span className="cyber-ioc-lbl">IOC</span>
                    <code>{threat.indicator}</code>
                  </div>
                )}
                {threat.action && (
                  <div className="cyber-action">
                    <span aria-hidden="true">▸</span> {threat.action}
                  </div>
                )}
                <div className="cyber-card-footer">
                  <div className={`cyber-sev-badge ${threat.severity}`}>{threat.severity.toUpperCase()}</div>
                  {threat.malwareFamily && (
                    <div className="cyber-malware-chip">{threat.malwareFamily}</div>
                  )}
                  {!threat.is_active && (
                    <div className="cyber-tag" style={{ color: '#8BAFC8' }}>INACTIVE</div>
                  )}
                  <button
                    onClick={() => setShareId(id => (id === threat.id ? null : threat.id))}
                    aria-label="Share this alert"
                    aria-haspopup="menu"
                    aria-expanded={shareId === threat.id}
                    style={{
                      marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px',
                      fontFamily: "'Share Tech Mono', monospace", fontSize: '9px', letterSpacing: '0.5px',
                      cursor: 'pointer', color: shareId === threat.id ? 'var(--accent)' : 'var(--dim)',
                      background: shareId === threat.id ? 'rgba(0,212,160,0.12)' : 'transparent',
                      border: `1px solid ${shareId === threat.id ? 'rgba(0,212,160,0.4)' : 'rgba(255,255,255,0.12)'}`,
                      borderRadius: '3px', padding: '3px 7px',
                    }}
                  >
                    <Share2 size={10} /> SHARE
                  </button>
                </div>
                {shareId === threat.id && (
                  <ShareMenu
                    payload={buildCyberShare(threat)}
                    anchorStyle={{ top: 'auto', bottom: '10px', right: '10px' }}
                    onClose={() => setShareId(null)}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
