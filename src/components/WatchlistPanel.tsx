import { useState } from 'react';
import { Star, X, Plus, Trash2, FileDown } from 'lucide-react';
import { Watchlist, NormalizedEvent, Severity, PRESET_REGIONS } from '../lib/watchlist';

const SEV_COLOR: Record<Severity, string> = {
  critical: '#FF2255',
  high: '#FFB800',
  medium: '#4D9FFF',
  low: '#8794a5',
};

interface Props {
  watchlist: Watchlist;
  /** Live events currently matching the watchlist, pre-sorted by severity. */
  watched: NormalizedEvent[];
  onAddRegion: (r: string) => void;
  onRemoveRegion: (r: string) => void;
  onAddKeyword: (k: string) => void;
  onRemoveKeyword: (k: string) => void;
  onClear: () => void;
  onExport: () => void;
  onClose: () => void;
}

export function WatchlistPanel({
  watchlist, watched,
  onAddRegion, onRemoveRegion, onAddKeyword, onRemoveKeyword, onClear, onExport, onClose,
}: Props) {
  const [regionInput, setRegionInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');

  const isEmpty = watchlist.regions.length === 0 && watchlist.keywords.length === 0;
  const lowerRegions = watchlist.regions.map(r => r.toLowerCase());
  const quickRegions = PRESET_REGIONS.filter(r => !lowerRegions.includes(r.toLowerCase()));

  const submitRegion = () => {
    if (!regionInput.trim()) return;
    onAddRegion(regionInput);
    setRegionInput('');
  };
  const submitKeyword = () => {
    if (!keywordInput.trim()) return;
    onAddKeyword(keywordInput);
    setKeywordInput('');
  };

  return (
    <div className="notif-panel-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="notif-panel">
        {/* Header */}
        <div className="notif-panel-header">
          <div className="notif-panel-title">
            <Star size={16} />
            <span>WATCHLIST</span>
          </div>
          <button className="notif-panel-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="notif-panel-body">
          {/* Regions */}
          <section className="notif-section">
            <div className="notif-section-label">
              Regions
              <span className="notif-section-sub">
                {watchlist.regions.length === 0 ? 'None pinned' : `${watchlist.regions.length} pinned`}
              </span>
            </div>
            <div className="notif-location-input-row">
              <input
                className="notif-location-input"
                placeholder="Country, theatre, or region…"
                value={regionInput}
                onChange={e => setRegionInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitRegion()}
              />
              <button className="notif-add-btn" onClick={submitRegion} disabled={!regionInput.trim()}>
                <Plus size={14} />
                Add
              </button>
            </div>
            {watchlist.regions.length > 0 && (
              <div className="notif-location-tags">
                {watchlist.regions.map(r => (
                  <span key={r} className="notif-location-tag">
                    {r}
                    <button onClick={() => onRemoveRegion(r)} aria-label={`Remove ${r}`}>
                      <Trash2 size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {quickRegions.length > 0 && (
              <>
                <div className="notif-hint" style={{ marginTop: '8px' }}>Quick add</div>
                <div className="notif-chip-row notif-chip-wrap">
                  {quickRegions.map(r => (
                    <button key={r} className="notif-chip" onClick={() => onAddRegion(r)}>
                      + {r}
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Keywords */}
          <section className="notif-section">
            <div className="notif-section-label">
              Keywords
              <span className="notif-section-sub">
                {watchlist.keywords.length === 0 ? 'None' : `${watchlist.keywords.length} tracked`}
              </span>
            </div>
            <div className="notif-location-input-row">
              <input
                className="notif-location-input"
                placeholder="e.g. cyclone, ransomware, port strike…"
                value={keywordInput}
                onChange={e => setKeywordInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitKeyword()}
              />
              <button className="notif-add-btn" onClick={submitKeyword} disabled={!keywordInput.trim()}>
                <Plus size={14} />
                Add
              </button>
            </div>
            {watchlist.keywords.length > 0 && (
              <div className="notif-location-tags">
                {watchlist.keywords.map(k => (
                  <span key={k} className="notif-location-tag">
                    {k}
                    <button onClick={() => onRemoveKeyword(k)} aria-label={`Remove ${k}`}>
                      <Trash2 size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="notif-hint">
              Matches the title, body, category, and location of every live event across all sources.
            </div>
          </section>

          {/* Matches */}
          <section className="notif-section">
            <div className="notif-section-label">
              Matching now
              <span className="notif-section-sub">
                {isEmpty ? '—' : `${watched.length} event(s)`}
              </span>
            </div>
            {isEmpty ? (
              <div className="wl-empty">Pin a region or keyword to start tracking matching events.</div>
            ) : watched.length === 0 ? (
              <div className="wl-empty">No active events match your watchlist right now.</div>
            ) : (
              <div className="wl-matches">
                {watched.slice(0, 12).map(e => (
                  <div key={`${e.kind}-${e.id}`} className="wl-match">
                    <span
                      className="wl-match-badge"
                      style={{ background: `${SEV_COLOR[e.severity]}22`, color: SEV_COLOR[e.severity], borderColor: `${SEV_COLOR[e.severity]}55` }}
                    >
                      {e.severity.toUpperCase()}
                    </span>
                    <div className="wl-match-main">
                      <div className="wl-match-title">{e.title}</div>
                      <div className="wl-match-meta">
                        <span className="wl-match-kind">{e.kindLabel}</span>
                        {e.country ? ` · ${e.country}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
                {watched.length > 12 && (
                  <div className="wl-more">+ {watched.length - 12} more in the full report</div>
                )}
              </div>
            )}
          </section>

          {/* Footer / export */}
          <div className="notif-panel-footer">
            <button className="wl-export-btn" onClick={onExport}>
              <FileDown size={15} />
              EXPORT SITUATION REPORT
            </button>
            <div className="notif-footer-rule" style={{ marginTop: '10px' }}>
              {isEmpty
                ? 'Exports the full operating picture. Pin regions/keywords to add a focused section.'
                : 'Report leads with a Watchlist Focus section, then the full operating picture.'}
            </div>
            {!isEmpty && (
              <button className="notif-clear-btn" onClick={onClear}>
                Clear watchlist
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
