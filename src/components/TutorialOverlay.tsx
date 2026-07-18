import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Radar, Globe2, Crosshair, Layers, ListTree, Activity, LayoutGrid,
  Star, FileText, Share2, Bell, ZoomIn, RefreshCw, ShieldCheck, X,
  ChevronLeft, ChevronRight, type LucideIcon,
} from 'lucide-react';

interface Step {
  icon: LucideIcon;
  tag: string;
  title: string;
  body: ReactNode;
}

/** Tracks the app's mobile breakpoint so gesture copy matches the device. */
function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return mobile;
}

const hi = (t: string) => <b className="tut-hi">{t}</b>;

function buildSteps(isMobile: boolean): Step[] {
  const rotate = isMobile
    ? 'Rotate the globe with one finger; pinch with two to zoom.'
    : 'Drag to rotate the globe; scroll to zoom.';
  const tapClick = isMobile ? 'Tap' : 'Click';
  const feedOpen = isMobile
    ? <>Tap {hi('FEED')} (top-left) to slide open the live feed.</>
    : <>The left column is the live event feed.</>;
  const intelOpen = isMobile
    ? <>Tap {hi('INTEL')} (top-right) to open the intel panel.</>
    : <>The right column is the intel panel.</>;

  const steps: Step[] = [
    {
      icon: Radar, tag: 'Welcome', title: 'Welcome to DHRUVA',
      body: <>DHRUVA is a live global disaster &amp; threat-intelligence command console. It fuses real-time
        feeds — earthquakes, disasters, volcanoes, weather, cyber threats, geopolitics and government
        advisories — into one operational picture. This tour covers everything you can do; reopen it anytime
        from the {hi('?')} button in the header.</>,
    },
    {
      icon: Globe2, tag: 'The world view', title: 'Map & 3D globe',
      body: <>The centre is your live world view. Toggle between the flat {hi('2D MAP')} and the cinematic
        {' '}{hi('3D GLOBE')} from the top-right of the map. {rotate} Red {hi('threat arcs')} stream from the
        New Delhi command hub to the most severe live events.</>,
    },
    {
      icon: Crosshair, tag: 'Events', title: `${tapClick} a marker to open it`,
      body: <>Every marker is a live event. {hi(`${tapClick} one`)} to open its dossier — magnitude, location,
        source, timing and a link to the original report. On the globe, markers glow by severity.</>,
    },
    {
      icon: Layers, tag: 'Filter the map', title: 'Layers & legend',
      body: <>Use the layer chips to control what's plotted — Quakes, Disasters, Volcanoes, Geo-Pol, Curfews,
        Weather, Cables, Military, Nuclear, Chokepoints and Day/Night. The {hi('Map Legend')} shows each
        type's colour and its live count.</>,
    },
    {
      icon: ListTree, tag: 'Live feed', title: 'The event feed',
      body: <>{feedOpen} Newest events stream in at the top. {tapClick} any event to open its dossier, or use
        its {hi('Share')} button to send it out.</>,
    },
    {
      icon: Activity, tag: 'Situational picture', title: 'Priority & intel panel',
      body: <>{intelOpen} It carries {hi('Priority Alerts')}, the {hi('India posture score')}, fused
        intelligence and live event distributions — your at-a-glance read on what needs attention.</>,
    },
    {
      icon: LayoutGrid, tag: 'Focused views', title: 'The intelligence tabs',
      body: <>Along the top sit focused views: {hi('Timeline')} (chronology), {hi('News Intel')},
        {' '}{hi('Weather Alerts')} (SACHET/NDMA), {hi('Bank SEWA')}, {hi('Cyber Watch')} (live threats),
        {' '}{hi('Info Ops')}, {hi('Gov Feed')} (official advisories) and {hi('Source Health')}.
        {isMobile ? ' Swipe the tab bar to reach them all.' : ''}</>,
    },
    {
      icon: Star, tag: 'Make it yours', title: 'Build a watchlist',
      body: <>Tap {hi('WATCH')} to pin regions and keywords you care about. Matching events are prioritised
        and badged, so your priorities rise to the top of the picture.</>,
    },
    {
      icon: FileText, tag: 'Report out', title: 'One-click SITREP',
      body: <>Generate a {hi('SITREP')} — a printable / PDF situation report of the current picture, focused
        on your watchlist. You'll find it in the status bar{isMobile ? ' (scroll it if needed)' : ''}.</>,
    },
    {
      icon: Share2, tag: 'Broadcast', title: 'Share any alert',
      body: <>Send any alert to X, WhatsApp, Telegram, LinkedIn, Facebook or email — or straight to your
        device's native share sheet. Look for the {hi('Share')} button on cards and dossiers.</>,
    },
    {
      icon: Bell, tag: 'Stay ahead', title: 'Alerts & notifications',
      body: <>The {hi('ALERTS')} bell surfaces critical events the moment they land. Open it to tune which
        categories and severities notify you.</>,
    },
  ];

  if (isMobile) {
    steps.push({
      icon: ZoomIn, tag: 'Readability', title: 'Content zoom',
      body: <>On a phone, use the {hi('− / +')} zoom control (bottom-right of the feed views) to scale the
        content up or down for comfortable reading. Your setting is remembered.</>,
    });
  }

  steps.push(
    {
      icon: RefreshCw, tag: 'Housekeeping', title: 'Sync, theme & sound',
      body: <>Data auto-syncs continuously — the {hi('LIVE')} dot and {hi('SYNC')} countdown show status, or
        hit {hi('SYNC')} to refresh now. Toggle {hi('theme')} and {hi('sound')} alerts from the header.</>,
    },
    {
      icon: ShieldCheck, tag: "You're set", title: "You're ready to operate",
      body: <>That's the full tour. Reopen it anytime with the {hi('?')} button in the header. Stay
        vigilant — DHRUVA is watching the world so you don't have to.</>,
    },
  );

  return steps;
}

export function TutorialOverlay({ onClose }: { onClose: () => void }) {
  const isMobile = useIsMobile();
  const steps = useMemo(() => buildSteps(isMobile), [isMobile]);
  const [i, setI] = useState(0);
  const idx = Math.min(i, steps.length - 1);
  const step = steps[idx];
  const isLast = idx >= steps.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') setI((v) => Math.min(v + 1, steps.length - 1));
      else if (e.key === 'ArrowLeft') setI((v) => Math.max(v - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [steps.length, onClose]);

  const Icon = step.icon;

  return (
    <div className="tut-overlay" role="dialog" aria-modal="true" aria-label="DHRUVA tutorial">
      <div className="tut-card">
        <div className="tut-top">
          <span className="tut-brand">DHRUVA GUIDE</span>
          <div className="tut-progress" role="progressbar" aria-valuenow={idx + 1} aria-valuemin={1} aria-valuemax={steps.length}>
            {steps.map((_, n) => (
              <span key={n} className={`tut-dot ${n === idx ? 'active' : n < idx ? 'done' : ''}`} />
            ))}
          </div>
          <button className="tut-x" onClick={onClose} aria-label="Close tutorial"><X size={16} /></button>
        </div>

        <div className="tut-icon"><Icon size={26} /></div>
        <div className="tut-tag">{step.tag} · Step {idx + 1} of {steps.length}</div>
        <h2 className="tut-title">{step.title}</h2>
        <div className="tut-body">{step.body}</div>

        <div className="tut-nav">
          <button className="tut-btn ghost" onClick={onClose}>Skip tour</button>
          <div className="tut-nav-r">
            <button className="tut-btn" onClick={() => setI((v) => Math.max(v - 1, 0))} disabled={idx === 0}>
              <ChevronLeft size={14} /> Back
            </button>
            <button className="tut-btn primary" autoFocus onClick={() => (isLast ? onClose() : setI((v) => v + 1))}>
              {isLast ? 'Finish' : <>Next <ChevronRight size={14} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
