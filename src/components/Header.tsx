import { Activity } from 'lucide-react';

interface HeaderProps {
  totalEvents: number;
  criticalEvents: number;
  onSync: () => void;
  syncing: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}

export function Header({ totalEvents, criticalEvents, onSync, syncing, soundEnabled, onToggleSound, theme, onThemeToggle }: HeaderProps) {
  return (
    <header className="header">
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
      </div>
      <div className="hdr-right">
        <button className="theme-btn" onClick={onThemeToggle}>
          {theme === 'dark' ? '☀️ LIGHT' : '🌙 DARK'}
        </button>
        <button className={`sound-btn ${soundEnabled ? 'on' : ''}`} onClick={onToggleSound}>
          {soundEnabled ? '🔊 SOUND: ON' : '🔇 SOUND: OFF'}
        </button>
        <button onClick={onSync} disabled={syncing} className="sound-btn on">
          <Activity className={syncing ? 'animate-spin' : ''} size={12} style={{ display: 'inline', marginRight: '4px' }} />
          {syncing ? 'SYNCING' : 'SYNC'}
        </button>
        <div className="live">
          <div className="pulse"></div>
          LIVE
        </div>
      </div>
    </header>
  );
}
