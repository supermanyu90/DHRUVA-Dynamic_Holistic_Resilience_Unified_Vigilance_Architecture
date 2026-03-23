import { Activity, Menu, BarChart2, X } from 'lucide-react';

interface HeaderProps {
  totalEvents: number;
  criticalEvents: number;
  indiaScore: number;
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
        <div className="hs" title="India threat posture — weighted score based on active geopolitical events in India's strategic neighbourhood">
          <div className="hs-v" style={{ color: indiaScore >= 67 ? '#FF2255' : indiaScore >= 34 ? '#FFB800' : '#00D4A0' }}>
            {indiaScore}
          </div>
          <div className="hs-l">IN POSTURE</div>
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
