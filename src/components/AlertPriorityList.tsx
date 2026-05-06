import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Zap, Users, MapPin, Clock, RefreshCw, Archive } from 'lucide-react';
import { IntelligenceAPI, UnifiedAlert, computePriorityScore } from '../lib/intelligence-api';
import { supabase } from '../lib/supabase';

type LifecycleState = 'active' | 'updated' | 'expired';

const SEV_COLOR: Record<string, string> = {
  high:     '#EF4444',
  moderate: '#F59E0B',
  low:      '#3B82F6',
};

const LIFECYCLE_META: Record<LifecycleState, { label: string; color: string; icon: React.ReactNode }> = {
  active:  { label: 'ACTIVE',   color: '#00D4A0', icon: null },
  updated: { label: 'UPDATED',  color: '#F59E0B', icon: <RefreshCw size={8} /> },
  expired: { label: 'EXPIRED',  color: '#6A8AAA', icon: <Archive size={8} /> },
};

const SCORE_BG = (score: number, state: LifecycleState) => {
  if (state === 'expired') return 'rgba(106,138,170,0.06)';
  if (score >= 70) return 'rgba(239,68,68,0.10)';
  if (score >= 40) return 'rgba(245,158,11,0.08)';
  return 'rgba(59,130,246,0.08)';
};

function ScoreRing({ score, state }: { score: number; state: LifecycleState }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = state === 'expired'
    ? '#4a6070'
    : score >= 70 ? '#EF4444'
    : score >= 40 ? '#F59E0B'
    : '#3B82F6';

  return (
    <svg width="36" height="36" viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
      <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
      <circle
        cx="18" cy="18" r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeDasharray={`${fill} ${circ - fill}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        style={{ opacity: state === 'expired' ? 0.4 : 1 }}
      />
      <text x="18" y="22" textAnchor="middle" fontSize="9"
        fontFamily="'Share Tech Mono', monospace" fill={color}
        style={{ opacity: state === 'expired' ? 0.5 : 1 }}>
        {score}
      </text>
    </svg>
  );
}

function AlertRow({ alert, rank }: { alert: UnifiedAlert; rank: number }) {
  const score = typeof alert.priority_score === 'number' && alert.priority_score > 0
    ? alert.priority_score
    : computePriorityScore(alert);

  const state = (alert.lifecycle_state ?? 'active') as LifecycleState;
  const sevColor = state === 'expired' ? '#4a6070' : (SEV_COLOR[alert.severity] ?? '#3B82F6');
  const lm = LIFECYCLE_META[state];
  const isExpired = state === 'expired';

  const location = [alert.district, alert.state, alert.country]
    .filter(Boolean).slice(0, 2).join(', ') || alert.location_name || '—';

  const ageMs = Date.now() - new Date(alert.effective_time).getTime();
  const ageStr = ageMs < 3_600_000
    ? `${Math.floor(ageMs / 60_000)}m ago`
    : ageMs < 86_400_000
      ? `${Math.floor(ageMs / 3_600_000)}h ago`
      : `${Math.floor(ageMs / 86_400_000)}d ago`;

  const expiryStr = alert.expiry_time
    ? new Date(alert.expiry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div
      className="apr-row"
      style={{
        background: SCORE_BG(score, state),
        borderLeft: `2px solid ${sevColor}`,
        opacity: isExpired ? 0.55 : 1,
      }}
    >
      <div className="apr-rank" style={{ opacity: isExpired ? 0.4 : 1 }}>{rank}</div>

      <ScoreRing score={score} state={state} />

      <div className="apr-body">
        <div className="apr-type">
          <span className="apr-badge" style={{ background: sevColor }}>
            {alert.severity.toUpperCase()}
          </span>
          <span className="apr-event-type" style={{ opacity: isExpired ? 0.65 : 1 }}>
            {alert.event_type.replace(/_/g, ' ')}
          </span>
          {alert.urgency === 'immediate' && !isExpired && (
            <span className="apr-urgent"><Zap size={9} />IMMEDIATE</span>
          )}
          {/* Lifecycle state pill */}
          <span
            className="apr-lifecycle-pill"
            style={{ color: lm.color, borderColor: lm.color }}
          >
            {lm.icon}
            {lm.label}
          </span>
        </div>

        <div className="apr-location">
          <MapPin size={9} />
          <span>{location}</span>
        </div>

        <div className="apr-meta">
          <Clock size={9} />
          <span>{ageStr}</span>
          {isExpired && expiryStr && (
            <span style={{ color: '#EF4444', marginLeft: 4 }}>
              expired {expiryStr}
            </span>
          )}
          {alert.population_impact != null && alert.population_impact > 0 && (
            <>
              <Users size={9} style={{ marginLeft: 6 }} />
              <span>
                {alert.population_impact >= 1_000_000
                  ? `${(alert.population_impact / 1_000_000).toFixed(1)}M`
                  : alert.population_impact >= 1_000
                    ? `${Math.round(alert.population_impact / 1_000)}K`
                    : String(alert.population_impact)}
              </span>
            </>
          )}
          <span className="apr-source">{alert.source}</span>
        </div>
      </div>
    </div>
  );
}

type FilterState = 'all' | 'active' | 'updated' | 'expired';

const FILTER_TABS: { key: FilterState; label: string }[] = [
  { key: 'all',     label: 'ALL'     },
  { key: 'active',  label: 'ACTIVE'  },
  { key: 'updated', label: 'UPDATED' },
  { key: 'expired', label: 'EXPIRED' },
];

function effectiveScore(a: UnifiedAlert): number {
  return typeof a.priority_score === 'number' && a.priority_score > 0
    ? a.priority_score
    : computePriorityScore(a);
}

export function AlertPriorityList() {
  const [alerts, setAlerts] = useState<UnifiedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterState>('active');
  const allAlertsRef = useRef<Map<string, UnifiedAlert>>(new Map());

  const mergeAndSort = (map: Map<string, UnifiedAlert>): UnifiedAlert[] =>
    [...map.values()].sort((a, b) => {
      // Active/updated before expired
      const stateRank = (s: string) => s === 'active' ? 0 : s === 'updated' ? 1 : 2;
      const sd = stateRank(a.lifecycle_state) - stateRank(b.lifecycle_state);
      if (sd !== 0) return sd;
      return effectiveScore(b) - effectiveScore(a) ||
        new Date(b.effective_time).getTime() - new Date(a.effective_time).getTime();
    }).slice(0, 50);

  // Initial load — fetch active+updated; also fetch recently expired for history view
  useEffect(() => {
    Promise.all([
      IntelligenceAPI.getUnifiedAlerts({ limit: 30, lifecycleStates: ['active', 'updated'] }),
      IntelligenceAPI.getUnifiedAlerts({ limit: 20, lifecycleStates: ['expired'] }),
    ]).then(([live, expired]) => {
      const map = new Map<string, UnifiedAlert>();
      for (const a of [...live, ...expired]) map.set(a.id, a);
      allAlertsRef.current = map;
      setAlerts(mergeAndSort(map));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Realtime — INSERT and UPDATE (lifecycle transitions arrive as UPDATE)
  useEffect(() => {
    const channel = supabase
      .channel('apr-unified-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'unified_alerts' },
        (p) => {
          const a = p.new as UnifiedAlert;
          allAlertsRef.current.set(a.id, a);
          setAlerts(mergeAndSort(allAlertsRef.current));
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'unified_alerts' },
        (p) => {
          const a = p.new as UnifiedAlert;
          allAlertsRef.current.set(a.id, a);
          setAlerts(mergeAndSort(allAlertsRef.current));
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const counts: Record<FilterState, number> = {
    all:     alerts.length,
    active:  alerts.filter(a => a.lifecycle_state === 'active').length,
    updated: alerts.filter(a => a.lifecycle_state === 'updated').length,
    expired: alerts.filter(a => a.lifecycle_state === 'expired').length,
  };

  const visible = filter === 'all'
    ? alerts
    : alerts.filter(a => a.lifecycle_state === filter);

  if (loading) {
    return (
      <div className="apr-loading">
        <span className="apr-loading-dot" />
        <span>LOADING PRIORITY FEED…</span>
      </div>
    );
  }

  return (
    <div className="apr-container">
      {/* Filter tabs */}
      <div className="apr-filter-row">
        {FILTER_TABS.map(t => (
          <button
            key={t.key}
            className={`apr-filter-tab ${filter === t.key ? 'active' : ''}`}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span className="apr-filter-count">{counts[t.key]}</span>
            )}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="apr-empty">
          <AlertTriangle size={14} style={{ opacity: 0.3 }} />
          <span>No {filter === 'all' ? '' : filter} alerts</span>
        </div>
      ) : (
        <div className="apr-list">
          {visible.map((a, i) => (
            <AlertRow key={a.id} alert={a} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
