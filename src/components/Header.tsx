import { useState } from 'react';
import { Activity, Menu, BarChart2, X } from 'lucide-react';

interface HeaderProps {
  totalEvents: number;
  criticalEvents: number;
  indiaScore: number;
  indiaBreakdown: {
    critical: any[];
    high: any[];
    countries: string[];
    topEvents: any[];
  };
  onSync: () => void;
  syncing: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
  onToggleSidebar: () => void;
  onToggleRightPanel: () => void;
  mobileSidebarOpen: boolean;
  mobileRightPanelOpen: boolean;
}

export function Header({
  totalEvents,
  criticalEvents,
  indiaScore,
  indiaBreakdown,
  onSync,
  syncing,
  soundEnabled,
  onToggleSound,
  theme,
  onThemeToggle,
  onToggleSidebar,
  onToggleRightPanel,
  mobileSidebarOpen,
  mobileRightPanelOpen,
}: HeaderProps) {
  const [showPosture, setShowPosture] = useState(false);
  return (
    <header className="header">
      <button
        className={`mobile-panel-btn ${mobileSidebarOpen ? 'active' : ''}`}
        onClick={onToggleSidebar}
        aria-label="Toggle event feed"
      >
        {mobileSidebarOpen ? <X size={16} /> : <Menu size={16} />}
        <span className="mobile-panel-btn-label">FEED</span>
      </button>

      <div className="logo-container">
        <div className="logo">DHRUVA™</div>
        <div className="logo-sub">Dynamic Holistic Resilience & Unified Vigilance Architecture</div>
      </div>

      <div className="hdr-stats">
        <div className="hs">
          <div className="hs-v" style={{ color: 'var(--quake)' }}>
            {totalEvents}
          </div>
          <div className="hs-l">EVENTS</div>
        </div>
        <div className="hs">
          <div className="hs-v" style={{ color: 'var(--danger)' }}>
            {criticalEvents}
          </div>
          <div className="hs-l">CRITICAL</div>
        </div>
        <div className="hs" style={{ position: 'relative', cursor: 'pointer' }}
          onClick={() => setShowPosture(v => !v)}
          title="India threat posture — click for breakdown">
          <div className="hs-v" style={{
            color: indiaScore >= 60 ? '#FF2255' : indiaScore >= 30 ? '#FFB800' : '#00D4A0',
          }}>
            {indiaScore}
          </div>
          <div className="hs-l" style={{ color: indiaScore >= 60 ? '#FF2255' : indiaScore >= 30 ? '#FFB800' : 'var(--dim)' }}>
            IN POSTURE
          </div>
          {showPosture && (
            <div onClick={e => e.stopPropagation()} style={{
              position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
              marginTop: '8px', zIndex: 200, minWidth: '280px',
              background: 'rgba(4,10,20,0.98)', border: '1px solid rgba(255,34,85,0.3)',
              borderRadius: '4px', padding: '12px 14px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
              fontFamily: "'Share Tech Mono', monospace",
            }}>
              <div style={{ letterSpacing: '2px', color: '#FF2255', marginBottom: '10px', fontFamily: "'Bebas Neue', sans-serif", fontSize: '11px' }}>
                INDIA THREAT POSTURE — {indiaScore}/100
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <div style={{ flex: 1, background: 'rgba(255,34,85,0.08)', border: '1px solid rgba(255,34,85,0.2)', borderRadius: '3px', padding: '6px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', color: '#FF2255', fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1 }}>{indiaBreakdown.critical.length}</div>
                  <div style={{ fontSize: '8px', color: 'var(--dim)', letterSpacing: '1px' }}>CRITICAL</div>
                </div>
                <div style={{ flex: 1, background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.2)', borderRadius: '3px', padding: '6px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', color: '#FFB800', fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1 }}>{indiaBreakdown.high.length}</div>
                  <div style={{ fontSize: '8px', color: 'var(--dim)', letterSpacing: '1px' }}>HIGH</div>
                </div>
                <div style={{ flex: 1, background: 'rgba(0,212,160,0.08)', border: '1px solid rgba(0,212,160,0.2)', borderRadius: '3px', padding: '6px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', color: '#00D4A0', fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1 }}>{indiaBreakdown.countries.length}</div>
                  <div style={{ fontSize: '8px', color: 'var(--dim)', letterSpacing: '1px' }}>COUNTRIES</div>
                </div>
              </div>

              {indiaBreakdown.countries.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '8px', color: 'var(--dim)', letterSpacing: '1px', marginBottom: '4px' }}>ACTIVE THEATRES</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {indiaBreakdown.countries.map(c => (
                      <span key={c} style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '2px', color: 'var(--text)' }}>{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {indiaBreakdown.topEvents.length > 0 ? (
                <div>
                  <div style={{ fontSize: '8px', color: 'var(--dim)', letterSpacing: '1px', marginBottom: '6px' }}>TOP SIGNALS</div>
                  {indiaBreakdown.topEvents.map((e, i) => (
                    <div key={e.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '5px', paddingBottom: '5px', borderBottom: i < indiaBreakdown.topEvents.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <span style={{ fontSize: '8px', padding: '2px 5px', borderRadius: '2px', flexShrink: 0, marginTop: '1px',
                        background: e.severity === 'critical' ? 'rgba(255,34,85,0.15)' : e.severity === 'high' ? 'rgba(255,184,0,0.12)' : 'rgba(77,159,255,0.1)',
                        color: e.severity === 'critical' ? '#FF2255' : e.severity === 'high' ? '#FFB800' : '#4D9FFF',
                        border: `1px solid ${e.severity === 'critical' ? 'rgba(255,34,85,0.3)' : e.severity === 'high' ? 'rgba(255,184,0,0.25)' : 'rgba(77,159,255,0.2)'}`,
                      }}>
                        {(e.severity || 'LOW').toUpperCase()}
                      </span>
                      <span style={{ fontSize: '9px', color: 'rgba(232,240,248,0.8)', lineHeight: 1.4 }}>
                        {e.title?.slice(0, 60)}{(e.title?.length || 0) > 60 ? '…' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '9px', color: 'var(--dim)', textAlign: 'center', padding: '8px 0' }}>
                  No active India-region signals
                </div>
              )}

              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '8px', color: 'var(--dim)', lineHeight: 1.5 }}>
                Score based on active geopolitical events in India's strategic neighbourhood + IOR
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="hdr-right">
        <button className="theme-btn" onClick={onThemeToggle}>
          {theme === 'dark' ? '☀️ LIGHT' : '🌙 DARK'}
        </button>
        <button className={`sound-btn ${soundEnabled ? 'on' : ''}`} onClick={onToggleSound}>
          {soundEnabled ? '🔊 ON' : '🔇 OFF'}
        </button>
        <button onClick={onSync} disabled={syncing} className="sound-btn on">
          <Activity className={syncing ? 'animate-spin' : ''} size={12} style={{ display: 'inline', marginRight: '4px' }} />
          {syncing ? 'SYNC...' : 'SYNC'}
        </button>
        <div className="live">
          <div className="pulse"></div>
          LIVE
        </div>
      </div>

      <button
        className={`mobile-panel-btn ${mobileRightPanelOpen ? 'active' : ''}`}
        onClick={onToggleRightPanel}
        aria-label="Toggle intel summary"
      >
        {mobileRightPanelOpen ? <X size={16} /> : <BarChart2 size={16} />}
        <span className="mobile-panel-btn-label">INTEL</span>
      </button>
    </header>
  );
}
