import { X, Shield, Globe, Zap, Database, Eye, Activity, Radio, Layers } from 'lucide-react';

interface AboutDhruvaProps {
  onClose: () => void;
  theme: 'dark' | 'light';
}

const PILLARS = [
  {
    icon: Globe,
    title: 'GEOSPATIAL AWARENESS',
    body: 'Real-time mapping of earthquakes, volcanic eruptions, cyclones, floods, wildfires, and geopolitical disruptions across every continent and ocean basin — rendered on a live SVG world projection.',
  },
  {
    icon: Shield,
    title: 'CYBER THREAT INTELLIGENCE',
    body: 'Continuous ingestion from CISA Known Exploited Vulnerabilities (KEV), NIST National Vulnerability Database (NVD), and Abuse.ch MalwareBazaar — deduplicating and scoring threats against Indian digital infrastructure.',
  },
  {
    icon: Radio,
    title: 'INFLUENCE OPERATION SIGNALS',
    body: 'GDELT Doc API feeds surface disinformation campaigns, coordinated inauthentic behaviour, and narrative manipulation across social platforms and state-affiliated media channels.',
  },
  {
    icon: Eye,
    title: 'NEWS INTELLIGENCE',
    body: 'Multilateral open-source news aggregation covering strategic affairs, border tensions, energy security, economic flashpoints, and diplomatic developments — auto-classified by topic and region.',
  },
  {
    icon: Layers,
    title: 'SEWA BANKING MONITOR',
    body: 'Live status monitoring of India\'s State Bank of India SEWA (Systematic Electronic Workload Architecture) portal and peer public-sector banks — critical for tracking financial infrastructure continuity.',
  },
  {
    icon: Activity,
    title: 'VESSEL TRACKING',
    body: 'Maritime domain awareness across the Arabian Sea, Bay of Bengal, and Indian Ocean Region — monitoring cargo, tanker, and naval vessel movement at strategic chokepoints.',
  },
  {
    icon: Database,
    title: 'PERSISTENT INTELLIGENCE LAYER',
    body: 'Every data stream is archived in a Supabase PostgreSQL backend with Row Level Security. A Deno-based edge function scheduler triggers ingest pipelines every 10 minutes, ensuring data freshness across all modules.',
  },
  {
    icon: Zap,
    title: 'REAL-TIME ARCHITECTURE',
    body: 'Supabase Realtime subscriptions push database changes directly to the frontend over WebSocket — no polling. New events appear on the map and event lists within seconds of ingestion.',
  },
];

const TECH_STACK = [
  { label: 'FRONTEND', value: 'React 18 + TypeScript + Vite' },
  { label: 'STYLING', value: 'Tailwind CSS + Custom CSS Design System' },
  { label: 'BACKEND', value: 'Supabase (PostgreSQL + Realtime + Edge Functions)' },
  { label: 'EDGE RUNTIME', value: 'Deno (Supabase Edge Functions)' },
  { label: 'DATA FEEDS', value: 'USGS, ReliefWeb, CISA KEV, NVD NIST, Abuse.ch, GDELT' },
  { label: 'MAPPING', value: 'Custom SVG World Projection + Three.js 3D Globe' },
  { label: 'SCHEDULING', value: 'pg_cron (Supabase Postgres) + Edge Function Scheduler' },
  { label: 'SECURITY', value: 'Row Level Security (RLS) on all tables, API key isolation via Edge Functions' },
];

export function AboutDhruva({ onClose }: AboutDhruvaProps) {
  return (
    <div className="about-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="about-modal">
        <div className="about-header">
          <div className="about-title-block">
            <div className="about-logo">DHRUVA™</div>
            <div className="about-subtitle">Dynamic Holistic Resilience &amp; Unified Vigilance Architecture</div>
          </div>
          <button className="about-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="about-body">
          <section className="about-section">
            <h2 className="about-section-title">WHAT IS DHRUVA</h2>
            <p className="about-para">
              DHRUVA is a sovereign open-source intelligence (OSINT) fusion platform built to give Indian national
              security analysts, researchers, and decision-makers a single, persistent situational awareness
              interface. Named after the Pole Star — the fixed celestial reference point that navigators have
              relied upon across millennia — DHRUVA is designed to be that unwavering anchor in an information-saturated world.
            </p>
            <p className="about-para">
              It consolidates disaster monitoring, cyber threat intelligence, maritime domain awareness,
              influence operation tracking, financial infrastructure health, and strategic news intelligence
              into one unified dashboard — updated automatically, around the clock.
            </p>
          </section>

          <section className="about-section">
            <h2 className="about-section-title">WHY IT WAS BUILT</h2>
            <p className="about-para">
              India operates in one of the world's most complex threat environments — bordered by hostile
              nuclear-armed states, sitting astride critical maritime trade routes, and increasingly targeted
              by state-sponsored cyber and influence operations. Yet open-source situational awareness tools
              have historically been fragmented, Western-centric, or prohibitively expensive.
            </p>
            <p className="about-para">
              DHRUVA was built to address three specific gaps:
            </p>
            <ol className="about-list">
              <li><strong>Fusion over fragmentation</strong> — Analysts were context-switching between USGS, GDELT, CISA, shipping trackers, and news feeds. DHRUVA brings all feeds into one persistent interface with a unified event timeline.</li>
              <li><strong>India-centric threat weighting</strong> — Generic global dashboards treat a typhoon in the Pacific the same as a cyclone making landfall in Odisha. DHRUVA's filters, regions, and source weighting are tuned to the Indian strategic context.</li>
              <li><strong>Operational security by design</strong> — All external API calls are proxied through server-side Supabase Edge Functions. No API keys are ever exposed to the browser. Every table is protected with Row Level Security.</li>
            </ol>
          </section>

          <section className="about-section">
            <h2 className="about-section-title">INTELLIGENCE PILLARS</h2>
            <div className="about-pillars">
              {PILLARS.map(({ icon: Icon, title, body }) => (
                <div className="about-pillar" key={title}>
                  <div className="about-pillar-icon">
                    <Icon size={18} />
                  </div>
                  <div className="about-pillar-text">
                    <div className="about-pillar-title">{title}</div>
                    <div className="about-pillar-body">{body}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="about-section">
            <h2 className="about-section-title">HOW IT WORKS</h2>
            <p className="about-para">
              DHRUVA runs a fully automated data pipeline. A Supabase pg_cron job triggers an edge function
              scheduler every 10 minutes. That scheduler fans out to individual ingest functions — one per
              data domain — each of which fetches from its respective public APIs, deduplicates against
              existing records, and upserts new intelligence into the PostgreSQL backend.
            </p>
            <p className="about-para">
              The React frontend maintains a Supabase Realtime WebSocket subscription to all core tables.
              When new rows arrive in the database, they propagate to the UI within seconds — no refresh
              required. The status bar at the bottom of the dashboard shows the exact time of the last
              successful sync and a live countdown to the next one.
            </p>
            <p className="about-para">
              A dual dark/light theme system follows the reference design of India's classified OSINT
              tooling aesthetic — high-contrast dark mode for low-light operational environments,
              and a warm slate light mode for daylight analysis sessions. Theme preference persists
              across sessions via localStorage.
            </p>
          </section>

          <section className="about-section">
            <h2 className="about-section-title">TECHNOLOGY STACK</h2>
            <div className="about-tech-grid">
              {TECH_STACK.map(({ label, value }) => (
                <div className="about-tech-row" key={label}>
                  <span className="about-tech-label">{label}</span>
                  <span className="about-tech-value">{value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="about-section">
            <h2 className="about-section-title">DATA SOURCES &amp; ATTRIBUTION</h2>
            <p className="about-para">
              DHRUVA aggregates from the following open, public data sources. No proprietary or
              classified feeds are used. All data is consumed under the respective providers' open
              access terms.
            </p>
            <div className="about-sources">
              {[
                ['USGS Earthquake Hazards Program', 'earthquake.usgs.gov — GeoJSON real-time feed'],
                ['UN OCHA ReliefWeb', 'reliefweb.int — disaster and humanitarian crisis reports'],
                ['CISA KEV Catalog', 'cisa.gov — Known Exploited Vulnerabilities JSON feed'],
                ['NIST NVD', 'nvd.nist.gov — National Vulnerability Database CVE API'],
                ['Abuse.ch MalwareBazaar', 'bazaar.abuse.ch — recent malware sample metadata'],
                ['GDELT Doc API v2', 'gdeltproject.org — global event & document API'],
                ['NewsAPI / RSS Aggregation', 'Multi-source strategic news aggregation'],
                ['Open AIS / MarineTraffic', 'Vessel position and voyage data'],
                ['NOAA / Volcano Observatory', 'Volcanic eruption and alert level data'],
              ].map(([source, desc]) => (
                <div className="about-source-row" key={source}>
                  <span className="about-source-name">{source}</span>
                  <span className="about-source-desc">{desc}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="about-footer">
            <span className="about-version">DHRUVA v1.9</span>
            <span className="about-build">BUILD {new Date().getFullYear()} — OPEN SOURCE INTELLIGENCE PLATFORM</span>
            <span className="about-creator">
              CREATED BY&nbsp;
              <a
                href="https://www.linkedin.com/in/abhimanyu-mathur-70643032"
                target="_blank"
                rel="noopener noreferrer"
                className="about-creator-link"
              >
                ABHIMANYU MATHUR
              </a>
            </span>
            <span className="about-classified">UNCLASSIFIED // OSINT ONLY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
