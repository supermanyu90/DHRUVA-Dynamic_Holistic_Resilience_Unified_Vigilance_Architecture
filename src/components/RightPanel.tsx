import { useMemo } from 'react';
import { Activity, AlertTriangle, FileText, Zap, Waves, Flame, Wind, Droplets, Globe, Radio } from 'lucide-react';
import type { Earthquake, Disaster, NewsEvent, VolcanoEvent, GeopoliticalEvent } from '../lib/intelligence-api';
import { AlertPriorityList } from './AlertPriorityList';
import { FusedAlertsView } from './FusedAlertsView';

interface RightPanelProps {
  earthquakes: Earthquake[];
  disasters: Disaster[];
  news: NewsEvent[];
  volcanoes: VolcanoEvent[];
  geopolitical: GeopoliticalEvent[];
  mobileOpen?: boolean;
}

function MagnitudeBand({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}>
      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--dim)', letterSpacing: '0.5px' }}>{label}</span>
      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '12px', color, minWidth: '18px', textAlign: 'right' }}>{count}</span>
    </div>
  );
}

function MiniBar({ pct, color, label }: { pct: number; color: string; label?: string }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      style={{ height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px' }}
    >
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: '2px', transition: 'width 0.6s ease' }} />
    </div>
  );
}

function MetricCard({
  icon, label, count, color, subtitle, children,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.25)',
      border: `1px solid ${color}22`,
      borderRadius: '3px',
      padding: '9px 10px 8px',
      display: 'flex',
      flexDirection: 'column',
      gap: '5px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color, opacity: 0.8 }}>{icon}</span>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '10px', letterSpacing: '2px', color: 'var(--dim)' }}>{label}</span>
        </div>
        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '22px', color, lineHeight: 1 }}>{count}</span>
      </div>
      <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '7.5px', color: 'var(--dim)', letterSpacing: '0.5px', lineHeight: 1.5 }}>{subtitle}</div>
      {children && <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '5px', marginTop: '1px' }}>{children}</div>}
    </div>
  );
}

export function RightPanel({ earthquakes, disasters, news, volcanoes, geopolitical, mobileOpen = false }: RightPanelProps) {
  const m45 = useMemo(() => earthquakes.filter(e => e.magnitude >= 4.5 && e.magnitude < 5.5).length, [earthquakes]);
  const m55 = useMemo(() => earthquakes.filter(e => e.magnitude >= 5.5 && e.magnitude < 6.5).length, [earthquakes]);
  const m65 = useMemo(() => earthquakes.filter(e => e.magnitude >= 6.5).length, [earthquakes]);
  const maxMag = useMemo(() => earthquakes.length > 0 ? Math.max(...earthquakes.map(e => e.magnitude)) : 0, [earthquakes]);

  const { disasterCats, topDisasters, disasterTotal } = useMemo(() => {
    const cats: Record<string, number> = {};
    disasters.forEach(d => {
      const cat = (d.category || 'other').toLowerCase();
      cats[cat] = (cats[cat] || 0) + 1;
    });
    return {
      disasterCats: cats,
      topDisasters: Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 3),
      disasterTotal: disasters.length || 1,
    };
  }, [disasters]);

  const { newsCountries, newsSentiments } = useMemo(() => {
    const countries = new Set(news.map(n => n.country).filter(Boolean)).size;
    const sentiments = { positive: 0, negative: 0, neutral: 0 };
    news.forEach(n => {
      if (n.sentiment === 'positive') sentiments.positive++;
      else if (n.sentiment === 'negative') sentiments.negative++;
      else sentiments.neutral++;
    });
    return { newsCountries: countries, newsSentiments: sentiments };
  }, [news]);

  const { criticalGeo, eruptingVolcanoes, unrestVolcanoes, criticalCount, total, eqPct, disPct, newsPct } = useMemo(() => {
    const cGeo = geopolitical.filter(g => g.severity === 'critical' || g.severity === 'high').length;
    const erupting = volcanoes.filter(v => v.status === 'erupting').length;
    const unrest = volcanoes.filter(v => v.status === 'unrest').length;
    const critical = earthquakes.filter(e => e.magnitude >= 6.5).length +
      disasters.filter(d => d.category?.toLowerCase().includes('severe')).length +
      cGeo + erupting;
    const tot = earthquakes.length + disasters.length + news.length + 1;
    return {
      criticalGeo: cGeo, eruptingVolcanoes: erupting, unrestVolcanoes: unrest, criticalCount: critical,
      total: tot, eqPct: (earthquakes.length / tot) * 100,
      disPct: (disasters.length / tot) * 100, newsPct: (news.length / tot) * 100,
    };
  }, [earthquakes, disasters, news, volcanoes, geopolitical]);

  const disasterCatIcon: Record<string, React.ReactNode> = {
    wildfire: <Flame size={8} />, fire: <Flame size={8} />,
    flood: <Droplets size={8} />, storm: <Wind size={8} />,
    drought: <Waves size={8} />, earthquake: <Activity size={8} />,
  };

  return (
    <div className={`right-panel${mobileOpen ? ' mobile-open' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '0', overflowY: 'auto' }}>

      {/* ── Priority alert feed ── */}
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: '10px',
        letterSpacing: '3px',
        color: '#EF4444',
        padding: '8px 10px 6px',
        borderBottom: '1px solid rgba(239,68,68,0.2)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444', animation: 'statusPulse 1.5s ease-in-out infinite' }} />
        PRIORITY ALERTS
      </div>
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <AlertPriorityList />
      </div>

      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: '10px',
        letterSpacing: '3px',
        color: 'var(--dim)',
        padding: '8px 10px 6px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>INTEL SUMMARY</div>

      {/* ── Fused Intelligence Feed ── */}
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: '10px',
        letterSpacing: '3px',
        color: '#4D9FFF',
        padding: '8px 10px 6px',
        borderBottom: '1px solid rgba(77,159,255,0.18)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#4D9FFF', animation: 'statusPulse 2s ease-in-out infinite' }} />
        FUSED INTELLIGENCE
      </div>
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <FusedAlertsView />
      </div>

      <div style={{ padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: '7px', flex: 1 }}>

        <MetricCard
          icon={<Activity size={11} />}
          label="EARTHQUAKES"
          count={earthquakes.length}
          color="var(--quake)"
          subtitle={`Active seismic events tracked globally${maxMag > 0 ? ` · Max M${maxMag.toFixed(1)}` : ''}`}
        >
          <MagnitudeBand label="M 4.5 – 5.4  MODERATE" count={m45} color="#4D9FFF" />
          <MagnitudeBand label="M 5.5 – 6.4  STRONG" count={m55} color="#FFB800" />
          <MagnitudeBand label="M 6.5+       MAJOR" count={m65} color="#FF4444" />
          <MiniBar pct={(m65 / (earthquakes.length || 1)) * 100} color="#FF4444" />
        </MetricCard>

        <MetricCard
          icon={<AlertTriangle size={11} />}
          label="DISASTERS"
          count={disasters.length}
          color="var(--fire)"
          subtitle={`NASA EONET natural hazard events · ${Object.keys(disasterCats).length} categories`}
        >
          {topDisasters.map(([cat, cnt]) => (
            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '2px 0' }}>
              <span style={{ color: 'var(--fire)', opacity: 0.7 }}>{disasterCatIcon[cat] || <Globe size={8} />}</span>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--dim)', flex: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cat}</span>
              <div style={{ width: '50px', height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(cnt / disasterTotal) * 100}%`, background: 'var(--fire)', borderRadius: '2px' }} />
              </div>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '12px', color: 'var(--fire)', minWidth: '16px', textAlign: 'right' }}>{cnt}</span>
            </div>
          ))}
        </MetricCard>

        <MetricCard
          icon={<FileText size={11} />}
          label="INTEL REPORTS"
          count={news.length}
          color="var(--accent)"
          subtitle={`Open-source intelligence signals · ${newsCountries} countries covered`}
        >
          {news.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF4C4C', display: 'inline-block' }} />
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--dim)' }}>NEGATIVE</span>
                </div>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '12px', color: '#FF4C4C' }}>{newsSentiments.negative}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--dim)', display: 'inline-block' }} />
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--dim)' }}>NEUTRAL</span>
                </div>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '12px', color: 'var(--dim)' }}>{newsSentiments.neutral}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00D4A0', display: 'inline-block' }} />
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--dim)' }}>POSITIVE</span>
                </div>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '12px', color: '#00D4A0' }}>{newsSentiments.positive}</span>
              </div>
              <div style={{ display: 'flex', gap: '2px', height: '3px', borderRadius: '2px', overflow: 'hidden', marginTop: '3px' }}>
                <div style={{ flex: newsSentiments.negative || 0.01, background: '#FF4C4C' }} />
                <div style={{ flex: newsSentiments.neutral || 0.01, background: 'rgba(139,175,200,0.5)' }} />
                <div style={{ flex: newsSentiments.positive || 0.01, background: '#00D4A0' }} />
              </div>
            </>
          )}
        </MetricCard>

        <MetricCard
          icon={<Zap size={11} />}
          label="CRITICAL"
          count={criticalCount}
          color="var(--danger)"
          subtitle="High-urgency events requiring immediate attention"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {earthquakes.filter(e => e.magnitude >= 6.5).length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '7.5px', color: '#FF4444', flex: 1 }}>M6.5+ SEISMIC</span>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '12px', color: '#FF4444' }}>{earthquakes.filter(e => e.magnitude >= 6.5).length}</span>
              </div>
            )}
            {eruptingVolcanoes > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '7.5px', color: '#FF3D6B', flex: 1 }}>ERUPTING VOLCANOES</span>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '12px', color: '#FF3D6B' }}>{eruptingVolcanoes}</span>
              </div>
            )}
            {unrestVolcanoes > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '7.5px', color: '#FF8C00', flex: 1 }}>VOLCANO UNREST</span>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '12px', color: '#FF8C00' }}>{unrestVolcanoes}</span>
              </div>
            )}
            {criticalGeo > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '7.5px', color: '#FF2255', flex: 1 }}>GEOPOLIT HIGH/CRIT</span>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '12px', color: '#FF2255' }}>{criticalGeo}</span>
              </div>
            )}
            {criticalCount === 0 && (
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '7.5px', color: '#00D4A0' }}>NO CRITICAL EVENTS</div>
            )}
          </div>
        </MetricCard>

        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '9px',
          letterSpacing: '2.5px',
          color: 'var(--dim)',
          paddingTop: '2px',
        }}>EVENT DISTRIBUTION</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {[
            { label: 'QUAKE', count: earthquakes.length, pct: eqPct, color: 'var(--quake)', icon: <Activity size={9} /> },
            { label: 'DISASTR', count: disasters.length, pct: disPct, color: 'var(--fire)', icon: <AlertTriangle size={9} /> },
            { label: 'INTEL', count: news.length, pct: newsPct, color: 'var(--accent)', icon: <FileText size={9} /> },
            { label: 'VOLCANO', count: volcanoes.length, pct: (volcanoes.length / total) * 100, color: 'var(--volcano)', icon: <Flame size={9} /> },
            { label: 'GEOPOLIT', count: geopolitical.length, pct: (geopolitical.length / total) * 100, color: 'var(--geo)', icon: <Radio size={9} /> },
          ].map(({ label, count, pct, color, icon }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ color, opacity: 0.7, width: '12px', flexShrink: 0 }}>{icon}</span>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--dim)', width: '48px', letterSpacing: '0.5px' }}>{label}</span>
              <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: '2px', transition: 'width 0.6s ease' }} />
              </div>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '12px', color, width: '24px', textAlign: 'right' }}>{count}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '2px', borderTop: '1px solid var(--border)', paddingTop: '7px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '9px', letterSpacing: '2.5px', color: 'var(--dim)', marginBottom: '2px' }}>DATA SOURCES</div>
          {[
            { label: 'USGS EARTHQUAKE FEED', color: 'var(--quake)' },
            { label: 'NASA EONET HAZARDS', color: 'var(--fire)' },
            { label: 'OPEN-SOURCE RSS INTEL', color: 'var(--accent)' },
            { label: 'SMITHSONIAN GVP', color: 'var(--volcano)' },
          ].map(({ label, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '7px', color: 'var(--dim)', letterSpacing: '0.8px' }}>{label}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
