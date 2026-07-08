import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw, MapPin, Activity } from 'lucide-react';
import {
  fetchImdWarnings,
  IMD_SEV_COLOR as SEV_COLOR,
  IMD_SEV_LABEL as SEV_LABEL,
  type ImdWarning as DistrictWarning,
  type ImdSeverity as Severity,
} from '../lib/imd';

/**
 * ImdWarningsView
 *
 * Shows India Meteorological Department (IMD) district weather warnings —
 * filtered to ONLY Orange and Red severities. Green/Yellow are dropped
 * server-side by the fetch-imd-warnings edge function, so they never reach
 * the browser.
 *
 * Data flow: browser -> Supabase edge fn `fetch-imd-warnings` -> api.imd.gov.in
 * (the IMD API has no CORS and requires secret credentials, so it must be
 * proxied server-side).
 */

type Status = 'loading' | 'live' | 'error' | 'not_configured';

export function ImdWarningsView() {
  const [warnings, setWarnings] = useState<DistrictWarning[]>([]);
  const [counts, setCounts] = useState<{ red: number; orange: number }>({ red: 0, orange: 0 });
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const [fetchedAt, setFetchedAt] = useState('');
  const [filter, setFilter] = useState<'all' | Severity>('all');

  const load = useCallback(async () => {
    setStatus('loading');
    setMessage('');
    const data = await fetchImdWarnings();

    if (data.ok) {
      setWarnings(data.warnings ?? []);
      setCounts(data.counts ?? { red: 0, orange: 0 });
      setFetchedAt(data.fetchedAt ?? new Date().toISOString());
      setStatus('live');
      return;
    }

    // Non-OK: surface a helpful reason.
    setWarnings([]);
    setCounts({ red: 0, orange: 0 });
    if (data.error === 'not_configured') {
      setStatus('not_configured');
      setMessage(data.message ?? 'IMD credentials are not configured.');
    } else {
      setStatus('error');
      setMessage(
        data.message ??
          (data.error === 'auth_failed'
            ? 'IMD rejected the credentials. The token may have expired.'
            : 'Could not reach the IMD warning service.'),
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = warnings.filter((w) => filter === 'all' || w.worstSeverity === filter);

  const lastUpdated = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="view active" style={{ padding: '16px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text)' }}>
          IMD WEATHER WARNINGS — ORANGE &amp; RED
        </div>
        <div style={{ fontSize: '11px', color: 'var(--dim)', marginTop: '2px' }}>
          India Meteorological Department · district-level severe-weather alerts (5-day) · lower severities hidden
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <button
          onClick={load}
          disabled={status === 'loading'}
          style={toolbarBtnStyle}
        >
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
        {(['red', 'orange'] as Severity[]).map((sev) => (
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
          FETCHING IMD WARNINGS…
        </div>
      )}

      {status === 'not_configured' && (
        <div className="news-loading">
          <div className="news-empty-title">IMD API NOT CONFIGURED</div>
          <div className="news-empty-hint" style={{ maxWidth: 520, textAlign: 'center', lineHeight: 1.5 }}>
            {message}
            <br />
            Set the <code>IMD_API_KEY</code> and <code>IMD_JWT_TOKEN</code> Supabase secrets
            (<code>supabase secrets set …</code>) and redeploy the <code>fetch-imd-warnings</code> function.
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="news-loading">
          <div className="news-empty-title">COULD NOT LOAD IMD WARNINGS</div>
          <div className="news-empty-hint" style={{ maxWidth: 520, textAlign: 'center' }}>{message}</div>
          <button className="news-retry-btn" onClick={load}>RETRY</button>
        </div>
      )}

      {status === 'live' && visible.length === 0 && (
        <div className="news-loading">
          <div className="news-empty-title" style={{ color: 'var(--accent)' }}>
            NO {filter === 'all' ? 'ORANGE OR RED' : SEV_LABEL[filter as Severity]} WARNINGS ACTIVE
          </div>
          <div className="news-empty-hint">
            No districts currently under an {filter === 'all' ? 'Orange/Red' : filter} IMD warning.
          </div>
        </div>
      )}

      {/* Warning cards */}
      {status === 'live' && visible.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
          {visible.map((w) => {
            const accent = SEV_COLOR[w.worstSeverity];
            return (
              <div
                key={`${w.objId ?? w.district}-${w.district}`}
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
                    <MapPin size={13} style={{ color: accent, flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {w.district || 'Unknown district'}
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
                    {SEV_LABEL[w.worstSeverity]}
                  </span>
                </div>

                {/* Per-day orange/red warnings */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '10px' }}>
                  {w.days.map((d) => (
                    <span
                      key={d.day}
                      title={`Day ${d.day}: ${d.label}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '10px',
                        padding: '3px 6px',
                        borderRadius: '4px',
                        color: SEV_COLOR[d.severity],
                        border: `1px solid ${SEV_COLOR[d.severity]}55`,
                        background: `${SEV_COLOR[d.severity]}14`,
                      }}
                    >
                      <AlertTriangle size={9} />
                      <strong>D{d.day}</strong> {d.label}
                    </span>
                  ))}
                </div>

                {w.date && (
                  <div style={{ fontSize: '10px', color: 'var(--dim)', marginTop: '10px' }}>
                    Issued {w.date}{w.utc ? ` · ${w.utc} UTC` : ''}
                  </div>
                )}
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
