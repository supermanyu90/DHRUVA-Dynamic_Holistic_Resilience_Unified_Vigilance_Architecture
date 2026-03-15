interface RightPanelProps {
  earthquakes: number;
  disasters: number;
  news: number;
}

export function RightPanel({ earthquakes, disasters, news }: RightPanelProps) {
  return (
    <div className="right-panel">
      <div className="metric-grid">
        <div className="mc">
          <div className="mc-n" style={{ color: 'var(--quake)' }}>
            {earthquakes}
          </div>
          <div className="mc-l">EARTHQUAKES</div>
        </div>
        <div className="mc">
          <div className="mc-n" style={{ color: 'var(--fire)' }}>
            {disasters}
          </div>
          <div className="mc-l">DISASTERS</div>
        </div>
        <div className="mc">
          <div className="mc-n" style={{ color: 'var(--accent)' }}>
            {news}
          </div>
          <div className="mc-l">INTEL REPORTS</div>
        </div>
        <div className="mc">
          <div className="mc-n" style={{ color: 'var(--danger)' }}>
            {Math.floor(Math.random() * 10)}
          </div>
          <div className="mc-l">CRITICAL</div>
        </div>
      </div>

      <div className="sec-lbl">EVENT DISTRIBUTION</div>
      <div className="bar-list">
        <div className="bar-row">
          <div className="bar-ico" style={{ color: 'var(--quake)' }}>
            🌍
          </div>
          <div className="bar-lbl">QUAKE</div>
          <div className="bar-wrap">
            <div
              className="bar-fill"
              style={{
                width: `${Math.min((earthquakes / (earthquakes + disasters + news)) * 100, 100)}%`,
                background: 'var(--quake)',
              }}
            ></div>
          </div>
          <div className="bar-ct" style={{ color: 'var(--quake)' }}>
            {earthquakes}
          </div>
        </div>
        <div className="bar-row">
          <div className="bar-ico" style={{ color: 'var(--fire)' }}>
            ⚠️
          </div>
          <div className="bar-lbl">DISASTR</div>
          <div className="bar-wrap">
            <div
              className="bar-fill"
              style={{
                width: `${Math.min((disasters / (earthquakes + disasters + news)) * 100, 100)}%`,
                background: 'var(--fire)',
              }}
            ></div>
          </div>
          <div className="bar-ct" style={{ color: 'var(--fire)' }}>
            {disasters}
          </div>
        </div>
        <div className="bar-row">
          <div className="bar-ico" style={{ color: 'var(--accent)' }}>
            📰
          </div>
          <div className="bar-lbl">INTEL</div>
          <div className="bar-wrap">
            <div
              className="bar-fill"
              style={{
                width: `${Math.min((news / (earthquakes + disasters + news)) * 100, 100)}%`,
                background: 'var(--accent)',
              }}
            ></div>
          </div>
          <div className="bar-ct" style={{ color: 'var(--accent)' }}>
            {news}
          </div>
        </div>
      </div>
    </div>
  );
}
