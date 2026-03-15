import { SOURCE_CONFIG, type NewsArticle } from '../NewsIntelView';

function fmtAge(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function highlight(text: string, query: string): string {
  if (!query || !text) return text || '';
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
}

function urgencyScore(article: NewsArticle): number {
  const title = (article.title || '').toLowerCase();
  const keywords: [string, number][] = [
    ['breaking', 5], ['explosion', 8], ['attack', 6], ['kills', 7],
    ['missile', 7], ['war', 6], ['bomb', 8], ['airstrike', 8],
    ['emergency', 5], ['crisis', 4], ['critical', 4], ['dead', 6],
    ['earthquake', 5], ['tsunami', 8], ['nuclear', 9], ['invasion', 9],
  ];
  let score = 0;
  for (const [kw, val] of keywords) {
    if (title.includes(kw)) score += val;
  }
  return Math.min(score, 25);
}

interface NewsCardProps {
  article: NewsArticle;
  index: number;
  searchQuery: string;
}

export function NewsCard({ article, index, searchQuery }: NewsCardProps) {
  const src = article.source?.toLowerCase();
  const cfg = SOURCE_CONFIG[src] || SOURCE_CONFIG[article.source] || {
    label: article.source,
    color: 'var(--accent)',
    icon: '📰',
    group: 'global' as const,
  };

  const score = urgencyScore(article);
  const isGdelt = article.source === 'GDELT';
  const borderColor = cfg.color + '33';
  const country = article.country ? ` · ${article.country}` : '';
  const domain = article.metadata?.domain;

  const titleHtml = searchQuery
    ? highlight(article.title, searchQuery)
    : article.title;

  const summaryHtml = article.content
    ? searchQuery
      ? highlight(article.content.slice(0, 200), searchQuery)
      : article.content.slice(0, 200)
    : '';

  const toneVal = article.tone;
  const toneClass = toneVal != null
    ? toneVal > 0 ? 'pos' : toneVal < 0 ? 'neg' : 'neu'
    : null;
  const toneLabel = toneVal != null
    ? toneVal > 0 ? 'POSITIVE' : toneVal < 0 ? 'NEGATIVE' : 'NEUTRAL'
    : null;

  return (
    <div
      className={`news-card${searchQuery ? ' search-match' : ''}`}
      style={{
        animationDelay: `${index * 0.025}s`,
        borderColor,
      }}
      role="article"
      tabIndex={0}
      onClick={() => article.url && window.open(article.url, '_blank', 'noopener')}
      onKeyDown={e => { if (e.key === 'Enter' && article.url) window.open(article.url, '_blank', 'noopener'); }}
    >
      <div className="nc-top-row">
        <div className="nc-type" style={{ color: cfg.color }}>
          {cfg.icon} {isGdelt ? `GDELT ${article.metadata?.theme || ''}` : cfg.label}{country}
        </div>
        {score >= 18 && (
          <span className="nc-urgency critical">🚨 CRITICAL</span>
        )}
        {score >= 10 && score < 18 && (
          <span className="nc-urgency incident">⚠ INCIDENT</span>
        )}
        {isGdelt && toneClass && (
          <span className={`gdelt-tone ${toneClass}`}>
            {toneVal != null ? toneVal.toFixed(1) + ' ' : ''}{toneLabel}
          </span>
        )}
      </div>

      <div
        className="nc-head"
        dangerouslySetInnerHTML={{ __html: titleHtml }}
      />

      {summaryHtml && (
        <div
          className="nc-summary"
          dangerouslySetInnerHTML={{ __html: summaryHtml + (article.content && article.content.length > 200 ? '…' : '') }}
        />
      )}

      <div className="nc-footer">
        <div className="nc-source" style={{ color: cfg.color + '99' }}>
          {fmtAge(article.published_at)}
        </div>
        <div className="nc-actions">
          {isGdelt && domain && (
            <a
              href={`https://${domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="nc-source-link"
              style={{
                borderColor: cfg.color + '44',
                color: cfg.color,
                background: cfg.color + '11',
              }}
              onClick={e => e.stopPropagation()}
            >
              🏠 {domain}
            </a>
          )}
          <span className="nc-article-link" style={{ color: cfg.color }}>↗ ARTICLE</span>
        </div>
      </div>
    </div>
  );
}
