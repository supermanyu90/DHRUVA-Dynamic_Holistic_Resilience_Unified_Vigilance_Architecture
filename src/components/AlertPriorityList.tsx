import { useEffect, useState } from 'react';
import { AlertTriangle, Zap, Users, MapPin, Clock } from 'lucide-react';
import { IntelligenceAPI, UnifiedAlert, computePriorityScore } from '../lib/intelligence-api';

const SEV_COLOR: Record<string, string> = {
  high:     '#EF4444',
  moderate: '#F59E0B',
  low:      '#3B82F6',
};

const SCORE_BG = (score: number) => {
  if (score >= 70) return 'rgba(239,68,68,0.12)';
  if (score >= 40) return 'rgba(245,158,11,0.10)';
  return 'rgba(59,130,246,0.10)';
};

function ScoreRing({ score }: { score: number }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 70 ? '#EF4444' : score >= 40 ? '#F59E0B' : '#3B82F6';

  return (
    <svg width="36" height="36" viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
      {/* track */}
      <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
      {/* fill */}
      <circle
        cx="18" cy="18" r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeDasharray={`${fill} ${circ - fill}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
      />
      <text
        x="18" y="22"
        textAnchor="middle"
        fontSize="9"
        fontFamily="'Share Tech Mono', monospace"
        fill={color}
      >
        {score}
      </text>
    </svg>
  );
}

function AlertRow({ alert, rank }: { alert: UnifiedAlert; rank: number }) {
  const score = typeof alert.priority_score === 'number' && alert.priority_score > 0
    ? alert.priority_score
    : computePriorityScore(alert);

  const sevColor = SEV_COLOR[alert.severity] ?? '#3B82F6';
  const location = [alert.district, alert.state, alert.country].filter(Boolean).slice(0, 2).join(', ')
    || alert.location_name || '—';

  const ageMs = Date.now() - new Date(alert.effective_time).getTime();
  const ageStr = ageMs < 3_600_000
    ? `${Math.floor(ageMs / 60_000)}m ago`
    : ageMs < 86_400_000
      ? `${Math.floor(ageMs / 3_600_000)}h ago`
      : `${Math.floor(ageMs / 86_400_000)}d ago`;

  return (
    <div
      className="apr-row"
      style={{
        background: SCORE_BG(score),
        borderLeft: `2px solid ${sevColor}`,
      }}
    >
      <div className="apr-rank">{rank}</div>

      <ScoreRing score={score} />

      <div className="apr-body">
        <div className="apr-type">
          <span className="apr-badge" style={{ background: sevColor }}>
            {alert.severity.toUpperCase()}
          </span>
          <span className="apr-event-type">
            {alert.event_type.replace(/_/g, ' ')}
          </span>
          {alert.urgency === 'immediate' && (
            <span className="apr-urgent"><Zap size={9} />IMMEDIATE</span>
          )}
        </div>

        <div className="apr-location">
          <MapPin size={9} />
          <span>{location}</span>
        </div>

        <div className="apr-meta">
          <Clock size={9} />
          <span>{ageStr}</span>
          {alert.population_impact != null && alert.population_impact > 0 && (
            <>
              <Users size={9} style={{ marginLeft: 6 }} />
              <span>{alert.population_impact >= 1_000_000
                ? `${(alert.population_impact / 1_000_000).toFixed(1)}M`
                : alert.population_impact >= 1_000
                  ? `${Math.round(alert.population_impact / 1_000)}K`
                  : alert.population_impact.toString()
              }</span>
            </>
          )}
          <span className="apr-source">{alert.source}</span>
        </div>
      </div>
    </div>
  );
}

export function AlertPriorityList() {
  const [alerts, setAlerts] = useState<UnifiedAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    IntelligenceAPI.getUnifiedAlerts({ limit: 20 })
      .then(data => setAlerts(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Also listen for new inserts and prepend, re-sorting client-side
  useEffect(() => {
    const channel = IntelligenceAPI.subscribeToUnifiedAlerts(incoming => {
      setAlerts(prev => {
        const score = typeof incoming.priority_score === 'number' && incoming.priority_score > 0
          ? incoming.priority_score
          : computePriorityScore(incoming);
        const withScore = { ...incoming, priority_score: score };
        const next = [withScore, ...prev.filter(a => a.id !== incoming.id)];
        return next
          .sort((a, b) => {
            const sa = typeof a.priority_score === 'number' ? a.priority_score : computePriorityScore(a);
            const sb = typeof b.priority_score === 'number' ? b.priority_score : computePriorityScore(b);
            return sb - sa || new Date(b.effective_time).getTime() - new Date(a.effective_time).getTime();
          })
          .slice(0, 20);
      });
    });
    return () => { channel.unsubscribe(); };
  }, []);

  if (loading) {
    return (
      <div className="apr-loading">
        <span className="apr-loading-dot" />
        <span>LOADING PRIORITY FEED…</span>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="apr-empty">
        <AlertTriangle size={14} style={{ opacity: 0.3 }} />
        <span>No active alerts</span>
      </div>
    );
  }

  return (
    <div className="apr-list">
      {alerts.map((a, i) => (
        <AlertRow key={a.id} alert={a} rank={i + 1} />
      ))}
    </div>
  );
}
