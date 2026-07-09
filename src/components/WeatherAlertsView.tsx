import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, MapPin, Activity, ExternalLink } from 'lucide-react';
import {
  fetchWeatherAlerts,
  WX_SEV_COLOR as SEV_COLOR,
  WX_SEV_LABEL as SEV_LABEL,
  type WeatherAlert,
  type WxSeverity,
} from '../lib/weather-alerts';

/**
 * WeatherAlertsView
 *
 * Shows free global weather/climate alerts (GDACS) filtered to ONLY Orange and
 * Red severities. Green is dropped server-side by the fetch-weather-alerts edge
 * function, so it never reaches the browser. No API key required.
 */

type Status = 'loading' | 'live' | 'error';

const EVENT_ICON: Record<string, string> = {
  TC: '🌀', FL: '🌊', DR: '☀️', WF: '🔥',
};

function fmtDate(d: string | null): string {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function WeatherAlertsView() {
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [counts, setCounts] = useState<{ red: number; orange: number }>({ red: 0, orange: 0 });
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const [fetchedAt, setFetchedAt] = useState('');
  const [filter, setFilter] = useState<'all' | WxSeverity>('all');

  const load = useCallback(async () => {
    setStatus('loading');
    setMessage('');
    const data = await fetchWeatherAlerts();

    if (data.ok) {
      setAlerts(data.alerts ?? []);
      setCounts(data.counts ?? { red: 0, orange: 0 });
      setFetchedAt(data.fetchedAt ?? new Date().toISOString());
      setStatus('live');
      return;
    }

    setAlerts([]);
    setCounts({ red: 0, orange: 0 });
    setStatus('error');
    setMessage(
      data.message ??
        (data.error === 'timeout'
          ? 'The weather-alert service timed out.'
          : 'Could not reach the weather-alert service.'),
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = alerts.filter((a) => filter === 'all' || a.severity === filter);

  const lastUpdated = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="view active" style={{ padding: '16px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text)' }}>
          WEATHER ALERTS — ORANGE &amp; RED
        </div>
        <div style={{ fontSize: '11px', color: 'var(--dim)', marginTop: '2px' }}>
          GDACS · global cyclone / flood / drought / wildfire alerts · lower severities hidden
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <button onClick={load} disabled={status === 'loading'} style={toolbarBtnStyle}>
          {status === 'loading'
            ? <><Activity size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> FETCHING…</>
            : <><RefreshCw size={12} /> REFRESH</>}
        </button>
        <span style={{ fontSize: '11px', color: 'var(--dim)' }}>
          {status === 'live'
            ? `Last updated: ${lastUpdated} IST`
            : status === 'loading'
              ? 'Loading…'
              : 'Not loaded'}
        </span>
      </div>

      {/* Summary tiles */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        {(['red', 'orange'] as WxSeverity[]).map((sev) => (
          <button
            key={sev}
            onClick={() => setFilter((f) => (f === sev ? 'all' : sev))}
            style={{
              flex: 1,
              textAlign: 'left',
              cursor: 'pointer',
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'var(--panel)',
              border: `1px solid ${SEV_COLOR[sev]}${filter === sev ? 'ff' : '44'}`,
              boxShadow: filter === sev ? `inset 0 0 0 1px ${SEV_COLOR[sev]}` : 'none',
            }}
            aria-pressed={filter === sev}
          >
            <div style={{ fontSize: '26px', fontWeight: 800, color: SEV_COLOR[sev], lineHeight: 1 }}>
              {counts[sev]}
            </div>
            <div style={{ fontSize: '11px', letterSpacing: '1px', color: 'var(--dim)', marginTop: '4px' }}>
              {SEV_LABEL[sev]} · {sev === 'red' ? 'SEVERE' : 'BE PREPARED'}
            </div>
          </button>
        ))}
      </div>

      {/* Body states */}
      {status === 'loading' && (
        <div className="news-loading">
          <div className="spinner" />
          FETCHING WEATHER ALERTS…
        </div>
      )}

      {status === 'error' && (
        <div className="news-loading">
          <div className="news-empty-title">COULD NOT LOAD WEATHER ALERTS</div>
          <div className="news-empty-hint" style={{ maxWidth: 520, textAlign: 'center' }}>{message}</div>
          <button className="news-retry-btn" onClick={load}>RETRY</button>
        </div>
      )}

      {status === 'live' && visible.length === 0 && (
        <div className="news-loading">
          <div className="news-empty-title" style={{ color: 'var(--accent)' }}>
            NO {filter === 'all' ? 'ORANGE OR RED' : SEV_LABEL[filter as WxSeverity]} ALERTS ACTIVE
          </div>
          <div className="news-empty-hint">
            No active {filter === 'all' ? 'Orange/Red' : filter} weather alerts worldwide.
          </div>
        </div>
      )}

      {/* Alert cards */}
      {status === 'live' && visible.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
          {visible.map((a) => {
            const accent = SEV_COLOR[a.severity];
            const dateRange = [fmtDate(a.fromDate), fmtDate(a.toDate)].filter(Boolean).join(' → ');
            return (
              <div
                key={a.id}
                style={{
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  borderLeft: `4px solid ${accent}`,
                  borderRadius: '8px',
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    <span aria-hidden="true">{EVENT_ICON[a.eventType] ?? '⚠'}</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', color: accent, whiteSpace: 'nowrap' }}>
                      {a.eventLabel.toUpperCase()}
                    </span>
                  </div>
                  <span style={{
                    flexShrink: 0,
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    color: '#000',
                    background: accent,
                  }}>
                    {SEV_LABEL[a.severity]}
                  </span>
                </div>

                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginTop: '8px', lineHeight: 1.35 }}>
                  {a.title}
                </div>

                {a.severityText && (
                  <div style={{ fontSize: '11px', color: 'var(--dim)', marginTop: '4px' }}>{a.severityText}</div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {a.country && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--dim)' }}>
                      <MapPin size={11} /> {a.country}
                    </span>
                  )}
                  {dateRange && (
                    <span style={{ fontSize: '10px', color: 'var(--dim)' }}>{dateRange}</span>
                  )}
                  {a.url && (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: accent, marginLeft: 'auto' }}
                    >
                      <ExternalLink size={10} /> GDACS
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const toolbarBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.5px',
  padding: '6px 12px',
  borderRadius: '6px',
  cursor: 'pointer',
  color: 'var(--accent)',
  background: 'transparent',
  border: '1px solid var(--border)',
};
