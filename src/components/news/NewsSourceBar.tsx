import { SOURCE_CONFIG, type NewsGroup } from '../NewsIntelView';

interface NewsSourceBarProps {
  sourceStats: Record<string, number>;
  newsGroup: NewsGroup;
}

export function NewsSourceBar({ sourceStats, newsGroup }: NewsSourceBarProps) {
  const groupSources = Object.entries(SOURCE_CONFIG).filter(([key, cfg]) => {
    if (newsGroup === 'gdelt') return key === 'GDELT';
    return cfg.group === newsGroup;
  });

  return (
    <div className="news-status-bar">
      {groupSources.map(([key, cfg]) => {
        const count = sourceStats[key] ?? null;
        const ok = count != null && count > 0;
        const dotColor = ok ? cfg.color : '#FF4444';
        const labelColor = ok ? cfg.color : '#FF6666';
        const label = ok ? String(count) : '✗';

        return (
          <div
            key={key}
            className="ns-item"
            title={`${cfg.label}: ${ok ? count + ' articles' : 'no data — feed may not have been fetched yet'}`}
          >
            <div className="ns-dot" style={{ background: dotColor }} />
            {cfg.label}: <span style={{ color: labelColor }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
