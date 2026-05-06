import { useEffect, useRef, useState } from 'react';
import { GitMerge, MapPin, Users, Clock, Shield, Layers, ChevronDown, ChevronUp, WifiOff } from 'lucide-react';
import { IntelligenceAPI, FusedAlert } from '../lib/intelligence-api';
import { withResilience } from '../lib/resilience';

// ─── Colour maps ──────────────────────────────────────────────────────────────

const SEV_COLOR: Record<string, string> = {
  high:     '#EF4444',
  moderate: '#F59E0B',
  low:      '#3B82F6',
};

const CONF_META: Record<string, { color: string; bg: string; label: string }> = {
  confirmed: { color: '#00D4A0', bg: 'rgba(0,212,160,0.12)',  label: 'CONFIRMED'  },
  high:      { color: '#4D9FFF', bg: 'rgba(77,159,255,0.10)', label: 'HIGH'       },
  medium:    { color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', label: 'MEDIUM'     },
  low:       { color: '#6A8AAA', bg: 'rgba(106,138,170,0.08)',label: 'LOW'        },
};

const LIFECYCLE_COLOR: Record<string, string> = {
  active:  '#00D4A0',
  updated: '#F59E0B',
  expired: '#6A8AAA',
};

// ─── Confidence bar ───────────────────────────────────────────────────────────

function ConfidenceBar({ score, conf }: { score: number; conf: string }) {
  const meta = CONF_META[conf] ?? CONF_META.low;
  return (
    <div className="fa-conf-bar-wrap">
      <div className="fa-conf-bar-track">
        <div
          className="fa-conf-bar-fill"
          style={{ width: `${score}%`, background: meta.color }}
        />
      </div>
      <span className="fa-conf-label" style={{ color: meta.color, background: meta.bg }}>
        {meta.label}
      </span>
      <span className="fa-conf-score" style={{ color: meta.color }}>{score}</span>
    </div>
  );
}

// ─── Source chips ─────────────────────────────────────────────────────────────

function SourceChips({ sources }: { sources: string[] }) {
  return (
    <div className="fa-source-chips">
      {sources.map(s => (
        <span key={s} className="fa-source-chip">{s}</span>
      ))}
    </div>
  );
}

// ─── Individual fused alert card ──────────────────────────────────────────────

function FusedCard({ alert }: { alert: FusedAlert }) {
  const [expanded, setExpanded] = useState(false);

  const sevColor  = SEV_COLOR[alert.combined_severity] ?? '#3B82F6';
  const isExpired = alert.lifecycle_state === 'expired';
  const location  = [alert.district, alert.state, alert.country].filter(Boolean).slice(0, 2).join(', ')
    || alert.location_name || '—';

  const ageMs  = Date.now() - new Date(alert.fused_at).getTime();
  const ageStr = ageMs < 3_600_000
    ? `${Math.floor(ageMs / 60_000)}m ago`
    : ageMs < 86_400_000
      ? `${Math.floor(ageMs / 3_600_000)}h ago`
      : `${Math.floor(ageMs / 86_400_000)}d ago`;

  return (
    <div
      className="fa-card"
      style={{
        borderLeft: `3px solid ${isExpired ? '#2a3a4a' : sevColor}`,
        opacity: isExpired ? 0.55 : 1,
      }}
    >
      {/* Header row */}
      <div className="fa-card-header">
        <div className="fa-card-title-row">
          <span className="fa-sev-badge" style={{ background: sevColor }}>
            {alert.combined_severity.toUpperCase()}
          </span>
          <span className="fa-event-type">
            {alert.event_type.replace(/_/g, ' ')}
          </span>
          {alert.source_count > 1 && (
            <span className="fa-multi-source-badge">
              <GitMerge size={9} />
              {alert.source_count} SOURCES
            </span>
          )}
          <span
            className="fa-lifecycle-dot"
            style={{ background: LIFECYCLE_COLOR[alert.lifecycle_state] ?? '#6A8AAA' }}
            title={alert.lifecycle_state.toUpperCase()}
          />
        </div>

        <ConfidenceBar score={alert.confidence_score} conf={alert.confidence} />

        <div className="fa-card-meta-row">
          <SourceChips sources={alert.sources} />
          <span className="fa-version">v{alert.version}</span>
        </div>
      </div>

      {/* Location + stats */}
      <div className="fa-card-body">
        <div className="fa-card-loc">
          <MapPin size={9} />
          <span>{location}</span>
        </div>

        <div className="fa-card-stats">
          <span className="fa-stat">
            <Clock size={9} />
            {ageStr}
          </span>
          {alert.population_impact != null && alert.population_impact > 0 && (
            <span className="fa-stat">
              <Users size={9} />
              {alert.population_impact >= 1_000_000
                ? `${(alert.population_impact / 1_000_000).toFixed(1)}M`
                : alert.population_impact >= 1_000
                  ? `${Math.round(alert.population_impact / 1_000)}K`
                  : String(alert.population_impact)}
            </span>
          )}
          <span className="fa-stat">
            <Shield size={9} />
            {alert.priority_score}
          </span>
          {alert.member_alert_ids.length > 1 && (
            <span className="fa-stat">
              <Layers size={9} />
              {alert.member_alert_ids.length} alerts
            </span>
          )}
        </div>

        {/* Expandable enriched description */}
        {alert.enriched_description && (
          <>
            <button
              className="fa-expand-btn"
              onClick={() => setExpanded(e => !e)}
            >
              {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              {expanded ? 'HIDE DETAIL' : 'SHOW DETAIL'}
            </button>
            {expanded && (
              <p className="fa-description">{alert.enriched_description}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

type ConfFilter = 'all' | 'confirmed' | 'high' | 'medium' | 'low';

const CONF_TABS: { key: ConfFilter; label: string }[] = [
  { key: 'all',       label: 'ALL'       },
  { key: 'confirmed', label: 'CONFIRMED' },
  { key: 'high',      label: 'HIGH'      },
  { key: 'medium',    label: 'MEDIUM'    },
];

export function FusedAlertsView() {
  const [alerts, setAlerts] = useState<FusedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ConfFilter>('all');
  const [isStale, setIsStale] = useState(false);
  const mapRef = useRef<Map<string, FusedAlert>>(new Map());

  const mergeAndSort = (map: Map<string, FusedAlert>): FusedAlert[] =>
    [...map.values()].sort((a, b) =>
      b.priority_score - a.priority_score ||
      new Date(b.fused_at).getTime() - new Date(a.fused_at).getTime()
    ).slice(0, 30);

  useEffect(() => {
    withResilience('fused-alerts', () => IntelligenceAPI.getFusedAlerts({ limit: 30 }))
      .then(res => {
        for (const a of res.data) mapRef.current.set(a.cluster_id, a);
        setAlerts(mergeAndSort(mapRef.current));
        setIsStale(res.stale);
      })
      .catch(() => { setIsStale(true); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const ch = IntelligenceAPI.subscribeToFusedAlerts(incoming => {
      mapRef.current.set(incoming.cluster_id, incoming);
      setAlerts(mergeAndSort(mapRef.current));
    });
    return () => { ch.unsubscribe(); };
  }, []);

  const visible = filter === 'all'
    ? alerts
    : alerts.filter(a => a.confidence === filter);

  const counts: Record<ConfFilter, number> = {
    all:       alerts.length,
    confirmed: alerts.filter(a => a.confidence === 'confirmed').length,
    high:      alerts.filter(a => a.confidence === 'high').length,
    medium:    alerts.filter(a => a.confidence === 'medium').length,
    low:       alerts.filter(a => a.confidence === 'low').length,
  };

  if (loading) {
    return (
      <div className="fa-loading">
        <span className="fa-loading-dot" />
        FUSING INTELLIGENCE…
      </div>
    );
  }

  return (
    <div className="fa-container">
      {isStale && (
        <div className="panel-stale-notice">
          <WifiOff size={9} />
          <span>DATA MAY BE DELAYED — SHOWING CACHED INTELLIGENCE</span>
        </div>
      )}
      {/* Filter tabs */}
      <div className="fa-filter-row">
        {CONF_TABS.map(t => (
          <button
            key={t.key}
            className={`fa-filter-tab ${filter === t.key ? 'active' : ''}`}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span className="fa-filter-count">{counts[t.key]}</span>
            )}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="fa-empty">
          <GitMerge size={14} style={{ opacity: 0.25 }} />
          <span>No fused alerts</span>
        </div>
      ) : (
        <div className="fa-list">
          {visible.map(a => <FusedCard key={a.cluster_id} alert={a} />)}
        </div>
      )}
    </div>
  );
}
