import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Activity } from 'lucide-react';

/**
 * AdminDashboard — Live Source Health
 *
 * Monitors the data sources the app actually uses (direct live APIs + the
 * Supabase edge functions), not the orphaned DB ingestion pipeline. Each probe
 * does a lightweight request and reports status, latency, and item count.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const RSS_PROXY = `${SUPABASE_URL}/functions/v1/rss-proxy`;

type Health = 'ok' | 'degraded' | 'down';

interface ProbeOutcome {
  health: Health;
  status: string;      // "200", "429", "timeout"…
  count: number | null;
}

interface Probe {
  name: string;
  category: 'Live API' | 'Edge function';
  detail: string;
  run: (signal: AbortSignal) => Promise<ProbeOutcome>;
}

interface ProbeResult extends ProbeOutcome {
  name: string;
  category: Probe['category'];
  detail: string;
  latencyMs: number;
  checkedAt: number;
}

const HEALTH_COLOR: Record<Health, string> = {
  ok: '#00D4A0',
  degraded: '#FFB800',
  down: '#FF0040',
};

async function edgeJson(path: string, signal: AbortSignal) {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    signal,
  });
  const body = r.ok ? await r.json().catch(() => null) : null;
  return { status: r.status, ok: r.ok, body };
}

const PROBES: Probe[] = [
  {
    name: 'USGS Earthquakes', category: 'Live API', detail: 'earthquake.usgs.gov',
    run: async (s) => {
      const r = await fetch('https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=1&minmagnitude=4', { signal: s });
      const j = r.ok ? await r.json().catch(() => null) : null;
      return { health: r.ok ? 'ok' : 'down', status: String(r.status), count: j?.features?.length ?? null };
    },
  },
  {
    name: 'NASA EONET', category: 'Live API', detail: 'eonet.gsfc.nasa.gov (disasters + volcanoes)',
    run: async (s) => {
      const r = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=1', { signal: s });
      const j = r.ok ? await r.json().catch(() => null) : null;
      return { health: r.ok ? 'ok' : 'down', status: String(r.status), count: j?.events?.length ?? null };
    },
  },
  {
    name: 'ReliefWeb', category: 'Live API', detail: 'api.reliefweb.int (disaster fallback)',
    run: async (s) => {
      // Same endpoint the app uses, so this reflects the real integration.
      const r = await fetch('https://api.reliefweb.int/v1/disasters?appname=dhruva-intel&profile=list&preset=latest&slim=1&limit=1', { signal: s });
      const j = r.ok ? await r.json().catch(() => null) : null;
      return { health: r.ok ? 'ok' : 'down', status: String(r.status), count: Array.isArray(j?.data) ? j.data.length : null };
    },
  },
  {
    name: 'RSS Proxy — feeds', category: 'Edge function', detail: 'rss-proxy · News / Gov RSS',
    run: async (s) => {
      const r = await fetch(`${RSS_PROXY}?url=${encodeURIComponent('https://feeds.bbci.co.uk/news/world/rss.xml')}&source=health`, { signal: s });
      const j = r.ok ? await r.json().catch(() => null) : null;
      const n = j?.items?.length ?? 0;
      return { health: r.ok && n > 0 ? 'ok' : r.ok ? 'degraded' : 'down', status: String(r.status), count: n };
    },
  },
  {
    name: 'GDELT — via proxy', category: 'Edge function', detail: 'rss-proxy · News / Info Ops / Cyber',
    run: async (s) => {
      const r = await fetch(`${RSS_PROXY}?gdelt=${encodeURIComponent('https://api.gdeltproject.org/api/v2/doc/doc?query=conflict&mode=ArtList&format=json&maxrecords=3&timespan=60min&sort=DateDesc')}`, { signal: s });
      const j = r.ok ? await r.json().catch(() => null) : null;
      const n = Array.isArray(j?.articles) ? j.articles.length : null;
      // GDELT rate-limits aggressively — treat a non-200 or empty as degraded, not down.
      return { health: r.ok && n ? 'ok' : 'degraded', status: String(r.status), count: n };
    },
  },
  {
    name: 'abuse.ch — raw proxy', category: 'Edge function', detail: 'rss-proxy · Cyber Watch',
    run: async (s) => {
      const r = await fetch(`${RSS_PROXY}?raw=${encodeURIComponent('https://feodotracker.abuse.ch/downloads/ipblocklist_aggressive.csv')}`, { signal: s });
      const t = r.ok ? await r.text() : '';
      const n = t ? t.split('\n').filter((l) => l && !l.startsWith('#')).length : 0;
      return { health: r.ok && n > 0 ? 'ok' : r.ok ? 'degraded' : 'down', status: String(r.status), count: n };
    },
  },
  {
    name: 'Weather Alerts — SACHET', category: 'Edge function', detail: 'fetch-weather-alerts',
    run: async (s) => {
      const { status, ok, body } = await edgeJson('fetch-weather-alerts', s);
      return { health: body?.ok ? 'ok' : ok ? 'degraded' : 'down', status: String(status), count: body?.total ?? null };
    },
  },
  {
    name: 'Bank SEWA', category: 'Edge function', detail: 'fetch-sewa-data',
    run: async (s) => {
      const { status, ok, body } = await edgeJson('fetch-sewa-data', s);
      const n = body?.banks?.length ?? null;
      return { health: n ? 'ok' : ok ? 'degraded' : 'down', status: String(status), count: n };
    },
  },
];

async function runProbe(p: Probe): Promise<ProbeResult> {
  const start = performance.now();
  try {
    const r = await p.run(AbortSignal.timeout(15_000));
    return { name: p.name, category: p.category, detail: p.detail, ...r, latencyMs: Math.round(performance.now() - start), checkedAt: Date.now() };
  } catch (err) {
    const timedOut = err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return { name: p.name, category: p.category, detail: p.detail, health: 'down', status: timedOut ? 'timeout' : 'error', count: null, latencyMs: Math.round(performance.now() - start), checkedAt: Date.now() };
  }
}

function fmtAge(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

export function AdminDashboard() {
  const [results, setResults] = useState<ProbeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRun, setLastRun] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const settled = await Promise.all(PROBES.map(runProbe));
    setResults(settled);
    setLastRun(Date.now());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 30_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [load]);

  const okN = results.filter((r) => r.health === 'ok').length;
  const degN = results.filter((r) => r.health === 'degraded').length;
  const downN = results.filter((r) => r.health === 'down').length;
  const avgLatency = results.length ? Math.round(results.reduce((a, r) => a + r.latencyMs, 0) / results.length) : 0;

  const tiles: [string, number, string][] = [
    ['HEALTHY', okN, HEALTH_COLOR.ok],
    ['DEGRADED', degN, HEALTH_COLOR.degraded],
    ['DOWN', downN, HEALTH_COLOR.down],
    ['AVG LATENCY', avgLatency, 'var(--dim)'],
  ];

  return (
    <div className="view active" style={{ padding: '16px', overflowY: 'auto' }}>
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text)' }}>
          LIVE SOURCE HEALTH
        </div>
        <div style={{ fontSize: '11px', color: 'var(--dim)', marginTop: '2px' }}>
          Real-time status of the data sources the app fetches · auto-refresh every 30s
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <button
          onClick={load}
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', color: 'var(--accent)', background: 'transparent', border: '1px solid var(--border)' }}
        >
          {loading
            ? <><Activity size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> CHECKING…</>
            : <><RefreshCw size={12} /> RE-CHECK</>}
        </button>
        <span style={{ fontSize: '11px', color: 'var(--dim)' }}>
          {lastRun ? `Last checked ${fmtAge(lastRun)}` : 'Checking…'}
        </span>
      </div>

      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: '16px' }}>
        {tiles.map(([label, val, color]) => (
          <div key={label} style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--panel)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '26px', fontWeight: 800, color, lineHeight: 1 }}>
              {val}{label === 'AVG LATENCY' ? <span style={{ fontSize: '12px', color: 'var(--dim)' }}>ms</span> : ''}
            </div>
            <div style={{ fontSize: '11px', letterSpacing: '1px', color: 'var(--dim)', marginTop: '4px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Source rows */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '10px' }}>
        {results.map((r) => {
          const color = HEALTH_COLOR[r.health];
          return (
            <div key={r.name} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderLeft: `4px solid ${color}`, borderRadius: '8px', padding: '11px 13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}` }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                </div>
                <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px', color }}>{r.health.toUpperCase()}</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--dim)', marginTop: '4px' }}>{r.category} · {r.detail}</div>
              <div style={{ display: 'flex', gap: '14px', marginTop: '9px', fontSize: '10px', color: 'var(--dim)' }}>
                <span>STATUS <strong style={{ color: 'var(--text)' }}>{r.status}</strong></span>
                <span>LATENCY <strong style={{ color: 'var(--text)' }}>{r.latencyMs}ms</strong></span>
                <span>ITEMS <strong style={{ color: 'var(--text)' }}>{r.count ?? '—'}</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {loading && results.length === 0 && (
        <div className="news-loading"><div className="spinner" />CHECKING SOURCES…</div>
      )}
    </div>
  );
}
