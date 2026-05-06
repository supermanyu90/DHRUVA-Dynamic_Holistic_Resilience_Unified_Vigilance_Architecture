import { useState } from 'react';
import { Bell, X, Plus, Trash2, ChevronDown } from 'lucide-react';
import type { NotificationPreferences } from '../lib/useNotificationPreferences';

const ALL_EVENT_TYPES = [
  'cyclone', 'flood', 'earthquake', 'volcano', 'wildfire', 'drought',
  'landslide', 'heatwave', 'cold_wave', 'tsunami', 'lightning',
];

const ALL_URGENCIES = ['immediate', 'expected', 'future', 'unknown'];

const SEVERITY_OPTIONS: Array<{ value: NotificationPreferences['min_severity']; label: string; color: string }> = [
  { value: 'low',      label: 'Low & above',      color: '#3B82F6' },
  { value: 'moderate', label: 'Moderate & above',  color: '#F59E0B' },
  { value: 'high',     label: 'High only',         color: '#EF4444' },
];

interface Props {
  prefs: NotificationPreferences;
  onUpdate: (patch: Partial<Omit<NotificationPreferences, 'session_id'>>) => Promise<void>;
  onClose: () => void;
}

export function NotificationPreferencesPanel({ prefs, onUpdate, onClose }: Props) {
  const [locationInput, setLocationInput] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (patch: Partial<Omit<NotificationPreferences, 'session_id'>>) => {
    setSaving(true);
    try { await onUpdate(patch); } finally { setSaving(false); }
  };

  const toggleEventType = (et: string) => {
    const next = prefs.event_types.includes(et)
      ? prefs.event_types.filter(x => x !== et)
      : [...prefs.event_types, et];
    save({ event_types: next });
  };

  const toggleUrgency = (u: string) => {
    const next = prefs.urgency_filter.includes(u)
      ? prefs.urgency_filter.filter(x => x !== u)
      : [...prefs.urgency_filter, u];
    save({ urgency_filter: next });
  };

  const addLocation = () => {
    const val = locationInput.trim().toLowerCase();
    if (!val || prefs.location_filter.includes(val)) return;
    save({ location_filter: [...prefs.location_filter, val] });
    setLocationInput('');
  };

  const removeLocation = (loc: string) => {
    save({ location_filter: prefs.location_filter.filter(l => l !== loc) });
  };

  return (
    <div className="notif-panel-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="notif-panel">
        {/* Header */}
        <div className="notif-panel-header">
          <div className="notif-panel-title">
            <Bell size={16} />
            <span>NOTIFICATION PREFERENCES</span>
          </div>
          <button className="notif-panel-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="notif-panel-body">
          {/* Minimum severity */}
          <section className="notif-section">
            <div className="notif-section-label">Minimum severity</div>
            <div className="notif-severity-row">
              {SEVERITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`notif-severity-btn ${prefs.min_severity === opt.value ? 'active' : ''}`}
                  style={prefs.min_severity === opt.value ? {
                    borderColor: opt.color,
                    color: opt.color,
                    background: `${opt.color}18`,
                  } : {}}
                  onClick={() => save({ min_severity: opt.value })}
                >
                  <span
                    className="notif-severity-dot"
                    style={{ background: opt.color }}
                  />
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Urgency filter */}
          <section className="notif-section">
            <div className="notif-section-label">Urgency levels</div>
            <div className="notif-chip-row">
              {ALL_URGENCIES.map(u => (
                <button
                  key={u}
                  className={`notif-chip ${prefs.urgency_filter.includes(u) ? 'active' : ''}`}
                  onClick={() => toggleUrgency(u)}
                >
                  {u}
                </button>
              ))}
            </div>
            <div className="notif-hint">
              Alerts not on this list are silenced regardless of severity.
            </div>
          </section>

          {/* Event type filter */}
          <section className="notif-section">
            <div className="notif-section-label">
              Event types
              <span className="notif-section-sub">
                {prefs.event_types.length === 0 ? 'All types' : `${prefs.event_types.length} selected`}
              </span>
            </div>
            <div className="notif-chip-row notif-chip-wrap">
              {ALL_EVENT_TYPES.map(et => (
                <button
                  key={et}
                  className={`notif-chip ${prefs.event_types.includes(et) ? 'active' : ''}`}
                  onClick={() => toggleEventType(et)}
                >
                  {et.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
            {prefs.event_types.length > 0 && (
              <button
                className="notif-clear-btn"
                onClick={() => save({ event_types: [] })}
              >
                Clear (receive all types)
              </button>
            )}
          </section>

          {/* Location filter */}
          <section className="notif-section">
            <div className="notif-section-label">
              Location filter
              <span className="notif-section-sub">
                {prefs.location_filter.length === 0 ? 'All regions' : `${prefs.location_filter.length} filter(s)`}
              </span>
            </div>
            <div className="notif-location-input-row">
              <input
                className="notif-location-input"
                placeholder="Country, state, or district…"
                value={locationInput}
                onChange={e => setLocationInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addLocation()}
              />
              <button className="notif-add-btn" onClick={addLocation} disabled={!locationInput.trim()}>
                <Plus size={14} />
                Add
              </button>
            </div>
            {prefs.location_filter.length > 0 && (
              <div className="notif-location-tags">
                {prefs.location_filter.map(loc => (
                  <span key={loc} className="notif-location-tag">
                    {loc}
                    <button onClick={() => removeLocation(loc)} aria-label={`Remove ${loc}`}>
                      <Trash2 size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="notif-hint">
              Notifications are only sent for alerts matching at least one location. Leave empty to receive all.
            </div>
          </section>

          {/* Info footer */}
          <div className="notif-panel-footer">
            <div className="notif-footer-rule">
              Cooldown: 1 notification per region per 15 minutes.
              Multiple simultaneous alerts are aggregated into one summary.
            </div>
            {saving && <div className="notif-saving">Saving…</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
