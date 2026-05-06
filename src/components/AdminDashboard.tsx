import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, CheckCircle, XCircle, Clock, RefreshCw,
  Database, Zap, Copy, TrendingUp, TrendingDown, Minus, Shield,
  Radio, BarChart2, Archive,
} from 'lucide-react';
import {
  IntelligenceAPI,
  PollState, PollLogEntry, IngestionStat, SystemMetric, LifecycleCounts,
} from '../lib/intelligence-api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = Date.now();
  const ms = now - d.getTime();
  if (ms < 60_000)     return `${Math.floor(ms / 1_000)}s ago`;
  if (ms < 3_600_000)  return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function pct(n: number | null): string {
  if (n === null) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

// Sum metric values over a window
function sumMetric(rows: SystemMetric[], name: string, src?: string): number {
  return rows
    .filter(r => r.metric_name === name && (src === undefined || r.source === src))
    .reduce((s, r) => s + Number(r.value), 0);
}

// ─── Tiny spark bar ───────────────────────────────────────────────────────────

function SparkBar({ value, max, color }: { value: number; max: number; color: string }) {
  const w = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ width: `${w}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.4s' }} />
    </div>
  );
}

// ─── Status dot ───────────────────────────────────────────────────────────────

function StatusDot({ ok, pulsing = false }: { ok: boolean | null; pulsing?: boolean }) {
  const color = ok === null ? '#F59E0B' : ok ? '#00D4A0' : '#EF4444';
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: color, flexShrink: 0,
      animation: pulsing ? 'statusPulse 1.5s ease-in-out infinite' : 'none',
    }} />
  );
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

interface StatTileProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'flat';
}

function StatTile({ label, value, sub, color = '#00D4A0', icon, trend }: StatTileProps) {
  return (
    <div className="adm-tile">
      <div className="adm-tile-icon" style={{ color }}>{icon}</div>
      <div className="adm-tile-body">
        <div className="adm-tile-value" style={{ color }}>{value}</div>
        <div className="adm-tile-label">{label}</div>
        {sub && <div className="adm-tile-sub">{sub}</div>}
      </div>
      {trend && (
        <div className="adm-tile-trend">
          {trend === 'up'   && <TrendingUp size={12}  color="#00D4A0" />}
          {trend === 'down' && <TrendingDown size={12} color="#EF4444" />}
          {trend === 'flat' && <Minus size={12}        color="#6A8AAA" />}
        </div>
      )}
    </div>
  );
}

// ─── Source health card ───────────────────────────────────────────────────────

function SourceCard({ state, todayStat }: { state: PollState; todayStat: IngestionStat | undefined }) {
  const isHealthy = state.consecutive_failures === 0;
  const isBackoff  = state.consecutive_failures > 0;
  const color = isHealthy ? '#00D4A0' : isBackoff ? '#EF4444' : '#F59E0B';
  const successRate = todayStat?.success_rate ?? null;

  return (
    <div className="adm-source-card" style={{ borderColor: color }}>
      <div className="adm-source-header">
        <StatusDot ok={isHealthy} pulsing={isHealthy} />
        <span className="adm-source-name" style={{ color }}>{state.source}</span>
        <span className="adm-source-status" style={{
          color, background: isHealthy ? 'rgba(0,212,160,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${color}40`,
        }}>
          {isHealthy ? 'HEALTHY' : `${state.consecutive_failures} FAIL${state.consecutive_failures > 1 ? 'S' : ''}`}
        </span>
      </div>

      <div className="adm-source-rows">
        <div className="adm-source-row">
          <span className="adm-src-lbl">Last fetch</span>
          <span className="adm-src-val">{fmtTime(state.last_fetch_at)}</span>
        </div>
        <div className="adm-source-row">
          <span className="adm-src-lbl">Last success</span>
          <span className="adm-src-val" style={{ color: '#00D4A0' }}>{fmtTime(state.last_success_at)}</span>
        </div>
        <div className="adm-source-row">
          <span className="adm-src-lbl">Next retry</span>
          <span className="adm-src-val">{fmtTime(state.next_retry_at)}</span>
        </div>
        <div className="adm-source-row">
          <span className="adm-src-lbl">Today success</span>
          <span className="adm-src-val" style={{ color: (successRate ?? 1) >= 0.9 ? '#00D4A0' : '#F59E0B' }}>
            {pct(successRate)}
          </span>
        </div>
        <div className="adm-source-row">
          <span className="adm-src-lbl">Today alerts</span>
          <span className="adm-src-val">{todayStat?.total_alerts_written ?? 0}</span>
        </div>
        <div className="adm-source-row">
          <span className="adm-src-lbl">Avg duration</span>
          <span className="adm-src-val">{fmtDuration(todayStat?.avg_duration_ms ?? null)}</span>
        </div>
        <div className="adm-source-row">
          <span className="adm-src-lbl">Lifetime fetches</span>
          <span className="adm-src-val">{(state.total_fetches ?? 0).toLocaleString()}</span>
        </div>
        <div className="adm-source-row">
          <span className="adm-src-lbl">Lifetime changes</span>
          <span className="adm-src-val">{(state.total_changes ?? 0).toLocaleString()}</span>
        </div>
      </div>

      {state.last_error && (
        <div className="adm-source-error">
          <XCircle size={9} />
          <span>{state.last_error.slice(0, 120)}</span>
        </div>
      )}

      {/* Today success rate bar */}
      <div className="adm-source-bar-row">
        <span className="adm-src-lbl">Success rate</span>
        <SparkBar
          value={Math.round((successRate ?? 0) * (todayStat?.total_fetches ?? 0))}
          max={todayStat?.total_fetches ?? 1}
          color={color}
        />
      </div>
    </div>
  );
}

// ─── Poll log table ───────────────────────────────────────────────────────────

function PollLogTable({ entries }: { entries: PollLogEntry[] }) {
  if (!entries.length) return (
    <div className="adm-empty">No log entries yet.</div>
  );

  return (
    <div className="adm-log-wrap">
      <table className="adm-log-table">
        <thead>
          <tr>
            <th>TIME</th>
            <th>SOURCE</th>
            <th>RESULT</th>
            <th>CHANGED</th>
            <th>ALERTS</th>
            <th>DURATION</th>
            <th>ERROR</th>
          </tr>
        </thead>
        <tbody>
          {entries.slice(0, 50).map(e => (
            <tr key={e.id} style={{ opacity: e.success ? 1 : 0.7 }}>
              <td style={{ color: 'var(--dim)' }}>{fmtTime(e.fetched_at)}</td>
              <td>
                <span className="adm-log-src">{e.source}</span>
              </td>
              <td>
                {e.success
                  ? <span className="adm-log-ok"><CheckCircle size={9} />OK</span>
                  : <span className="adm-log-fail"><XCircle size={9} />FAIL</span>}
              </td>
              <td style={{ color: e.changed ? '#00D4A0' : 'rgba(139,175,200,0.3)' }}>
                {e.changed ? 'YES' : 'no'}
              </td>
              <td>{e.alerts_written > 0 ? e.alerts_written : '—'}</td>
              <td style={{ color: 'var(--dim)' }}>{fmtDuration(e.duration_ms)}</td>
              <td className="adm-log-err">{e.error ? e.error.slice(0, 60) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── 24-hour metric chart (simple bar histogram) ──────────────────────────────

function MetricBars({ metrics, name, color, label }: {
  metrics: SystemMetric[]; name: string; color: string; label: string;
}) {
  // Bucket into 24 hourly slots
  const now = Date.now();
  const HOURS = 24;
  const buckets = Array.from({ length: HOURS }, (_, i) => ({
    hour: HOURS - 1 - i,
    count: 0,
  }));

  for (const m of metrics) {
    if (m.metric_name !== name) continue;
    const ageH = (now - new Date(m.recorded_at).getTime()) / 3_600_000;
    const idx = Math.floor(ageH);
    if (idx >= 0 && idx < HOURS) buckets[HOURS - 1 - idx].count += Number(m.value);
  }

  const maxVal = Math.max(...buckets.map(b => b.count), 1);

  return (
    <div className="adm-metric-chart">
      <div className="adm-metric-title">
        <span style={{ color }}>{label}</span>
        <span className="adm-metric-total" style={{ color }}>
          {buckets.reduce((s, b) => s + b.count, 0).toLocaleString()} total (24h)
        </span>
      </div>
      <div className="adm-metric-bars">
        {buckets.map((b, i) => (
          <div key={i} className="adm-metric-bar-col" title={`${b.count} ${HOURS - 1 - b.hour}h ago`}>
            <div
              className="adm-metric-bar"
              style={{
                height: `${Math.round((b.count / maxVal) * 100)}%`,
                background: color,
                opacity: b.count === 0 ? 0.12 : 0.75 + (b.count / maxVal) * 0.25,
              }}
            />
          </div>
        ))}
      </div>
      <div className="adm-metric-axis">
        <span>24h ago</span>
        <span>now</span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminDashboard() {
  const [pollStates, setPollStates]       = useState<PollState[]>([]);
  const [pollLog, setPollLog]             = useState<PollLogEntry[]>([]);
  const [ingestionStats, setIngestionStats] = useState<IngestionStat[]>([]);
  const [metrics, setMetrics]             = useState<SystemMetric[]>([]);
  const [lifecycle, setLifecycle]         = useState<LifecycleCounts>({ active: 0, updated: 0, expired: 0 });
  const [loading, setLoading]             = useState(true);
  const [lastRefresh, setLastRefresh]     = useState<Date>(new Date());
  const [refreshing, setRefreshing]       = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const [states, log, stats, mets, lc] = await Promise.all([
        IntelligenceAPI.getPollState(),
        IntelligenceAPI.getPollLog(100),
        IntelligenceAPI.getIngestionStats(7),
        IntelligenceAPI.getSystemMetrics(['alerts_ingested', 'duplicates_detected', 'notifications_sent'], 24),
        IntelligenceAPI.getAlertLifecycleCounts(),
      ]);
      setPollStates(states);
      setPollLog(log);
      setIngestionStats(stats);
      setMetrics(mets);
      setLifecycle(lc);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('Admin dashboard load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 30_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [load]);

  const handleRefresh = () => { setRefreshing(true); load(); };

  // Derived stats
  const todayStats = ingestionStats.filter(s => {
    const dayMs = Date.now() - new Date(s.day).getTime();
    return dayMs < 86_400_000;
  });
  const todayBySource = (src: string) => todayStats.find(s => s.source === src);

  const totalIngested24h   = sumMetric(metrics, 'alerts_ingested');
  const totalDuplicates24h = sumMetric(metrics, 'duplicates_detected');
  const totalNotifs24h     = sumMetric(metrics, 'notifications_sent');

  const gdacsOk   = pollStates.find(s => s.source === 'GDACS')?.consecutive_failures === 0;
  const sachetOk  = pollStates.find(s => s.source === 'SACHET')?.consecutive_failures === 0;
  const systemOk  = gdacsOk !== false && sachetOk !== false;

  const overallSuccessRate = (() => {
    const total = todayStats.reduce((s, r) => s + (r.total_fetches ?? 0), 0);
    const ok    = todayStats.reduce((s, r) => s + (r.successful_fetches ?? 0), 0);
    return total > 0 ? ok / total : null;
  })();

  if (loading) {
    return (
      <div className="adm-loading">
        <Activity size={16} style={{ animation: 'spin 1s linear infinite' }} />
        LOADING SYSTEM TELEMETRY…
      </div>
    );
  }

  return (
    <div className="adm-root">
      {/* ── Header bar ── */}
      <div className="adm-topbar">
        <div className="adm-topbar-left">
          <Shield size={14} color="#4D9FFF" />
          <span className="adm-topbar-title">SYSTEM MONITOR</span>
          <StatusDot ok={systemOk ?? null} pulsing={systemOk === true} />
          <span className="adm-topbar-status" style={{ color: systemOk ? '#00D4A0' : '#EF4444' }}>
            {systemOk ? 'ALL SYSTEMS OPERATIONAL' : 'INGESTION DEGRADED'}
          </span>
        </div>
        <div className="adm-topbar-right">
          <span className="adm-refresh-time">
            <Clock size={9} /> refreshed {fmtTime(lastRefresh.toISOString())}
          </span>
          <button className={`adm-refresh-btn ${refreshing ? 'spinning' : ''}`} onClick={handleRefresh}>
            <RefreshCw size={11} />
            REFRESH
          </button>
        </div>
      </div>

      <div className="adm-body">

        {/* ── Summary tiles ── */}
        <div className="adm-tiles">
          <StatTile
            label="ALERTS INGESTED (24H)"
            value={totalIngested24h.toLocaleString()}
            color="#00D4A0"
            icon={<Database size={14} />}
          />
          <StatTile
            label="DUPLICATES DETECTED (24H)"
            value={totalDuplicates24h.toLocaleString()}
            sub={totalIngested24h > 0 ? `${((totalDuplicates24h / totalIngested24h) * 100).toFixed(1)}% dup rate` : undefined}
            color="#F59E0B"
            icon={<Copy size={14} />}
          />
          <StatTile
            label="NOTIFICATIONS SENT (24H)"
            value={totalNotifs24h.toLocaleString()}
            color="#4D9FFF"
            icon={<Radio size={14} />}
          />
          <StatTile
            label="TODAY SUCCESS RATE"
            value={pct(overallSuccessRate)}
            color={overallSuccessRate === null || overallSuccessRate >= 0.9 ? '#00D4A0' : '#EF4444'}
            icon={<BarChart2 size={14} />}
          />
          <StatTile
            label="ACTIVE ALERTS"
            value={lifecycle.active.toLocaleString()}
            color="#00D4A0"
            icon={<Zap size={14} />}
          />
          <StatTile
            label="UPDATED ALERTS"
            value={lifecycle.updated.toLocaleString()}
            color="#F59E0B"
            icon={<RefreshCw size={14} />}
          />
          <StatTile
            label="EXPIRED ALERTS"
            value={lifecycle.expired.toLocaleString()}
            color="#6A8AAA"
            icon={<Archive size={14} />}
          />
          <StatTile
            label="TOTAL IN DB"
            value={(lifecycle.active + lifecycle.updated + lifecycle.expired).toLocaleString()}
            color="#8BA8C0"
            icon={<Database size={14} />}
          />
        </div>

        {/* ── Source health cards ── */}
        <div className="adm-section-title">
          <Activity size={11} />
          SOURCE HEALTH
        </div>
        <div className="adm-source-grid">
          {pollStates.map(s => (
            <SourceCard key={s.source} state={s} todayStat={todayBySource(s.source)} />
          ))}
          {pollStates.length === 0 && (
            <div className="adm-empty">No poll state data yet. Trigger an ingestion run first.</div>
          )}
        </div>

        {/* ── 24h metric charts ── */}
        <div className="adm-section-title">
          <TrendingUp size={11} />
          INGESTION METRICS (24H HOURLY)
        </div>
        <div className="adm-charts-row">
          <MetricBars metrics={metrics} name="alerts_ingested"     color="#00D4A0" label="Alerts Ingested" />
          <MetricBars metrics={metrics} name="duplicates_detected" color="#F59E0B" label="Duplicates Detected" />
          <MetricBars metrics={metrics} name="notifications_sent"  color="#4D9FFF" label="Notifications Sent" />
        </div>

        {/* ── 7-day ingestion table ── */}
        <div className="adm-section-title">
          <Database size={11} />
          INGESTION LOG (LAST 100 POLLS)
        </div>
        <PollLogTable entries={pollLog} />

      </div>
    </div>
  );
}
