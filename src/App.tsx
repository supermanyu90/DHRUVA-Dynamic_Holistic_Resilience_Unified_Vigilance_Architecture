import { useCallback, useEffect, useRef, useState } from 'react';
import { IntelligenceAPI, Earthquake, Disaster, NewsEvent, Vessel, VolcanoEvent, GeopoliticalEvent } from './lib/intelligence-api';
import { withResilience } from './lib/resilience';
import { DataFreshnessContext, DataFreshnessState, formatStaleAge } from './lib/DataFreshnessContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { RightPanel } from './components/RightPanel';
import { MapView } from './components/MapView';
import { SewaView } from './components/SewaView';
import { CyberView } from './components/CyberView';
import { InfoOpsView } from './components/InfoOpsView';
import { GovAnnouncementsView } from './components/GovAnnouncementsView';
import { VesselView } from './components/VesselView';
import { NewsIntelView } from './components/NewsIntelView';
import { TimelineView } from './components/TimelineView';
import { AlertToast } from './components/AlertToast';
import { NotificationPreferencesPanel } from './components/NotificationPreferencesPanel';
import { Tooltip } from './components/Tooltip';
import { useNotificationPreferences } from './lib/useNotificationPreferences';
import { useAlertNotifier } from './lib/useAlertNotifier';
import type { AppNotification } from './lib/useAlertNotifier';
import { LiveEventTicker, TickerEvent } from './components/LiveEventTicker';
import { AboutDhruva } from './components/AboutDhruva';
import { AdminDashboard } from './components/AdminDashboard';

type ViewType = 'map' | 'timeline' | 'news' | 'sewa' | 'cyber' | 'infoops' | 'gov' | 'vessel' | 'admin';

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;

function formatSyncCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function toTickerEvent(
  type: TickerEvent['type'],
  item: Earthquake | Disaster | NewsEvent | VolcanoEvent | GeopoliticalEvent | Vessel
): TickerEvent {
  const now = new Date();
  const timeStr = now.toUTCString().slice(17, 25) + 'Z';

  if (type === 'earthquake') {
    const eq = item as Earthquake;
    return {
      id: eq.id,
      time: timeStr,
      type,
      title: `M${eq.magnitude.toFixed(1)} — ${eq.location}`,
      severity: eq.magnitude >= 7 ? 'critical' : eq.magnitude >= 6 ? 'high' : eq.magnitude >= 5 ? 'medium' : 'low',
    };
  }
  if (type === 'disaster') {
    const d = item as Disaster;
    return { id: d.id, time: timeStr, type, title: d.title, severity: 'high' };
  }
  if (type === 'news') {
    const n = item as NewsEvent;
    return { id: n.id, time: timeStr, type, title: n.title };
  }
  if (type === 'volcano') {
    const v = item as VolcanoEvent;
    return {
      id: v.id,
      time: timeStr,
      type,
      title: `${v.name}${v.country ? ` — ${v.country}` : ''} [${v.status?.toUpperCase()}]`,
      severity: v.status === 'erupting' ? 'critical' : 'high',
    };
  }
  if (type === 'geopolitical') {
    const g = item as GeopoliticalEvent;
    return {
      id: g.id,
      time: timeStr,
      type,
      title: `${g.title}${g.country ? ` — ${g.country}` : ''}`,
      severity: g.severity,
    };
  }
  const vessel = item as Vessel;
  return { id: vessel.id, time: timeStr, type: 'vessel', title: `${vessel.name} [${vessel.type}]` };
}

function App() {
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [news, setNews] = useState<NewsEvent[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [volcanoes, setVolcanoes] = useState<VolcanoEvent[]>([]);
  const [geopolitical, setGeopolitical] = useState<GeopoliticalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('map');
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [pendingDrawer, setPendingDrawer] = useState<{ id: string; type: string } | null>(null);
  const [mode, setMode] = useState<'live' | 'archive'>('live');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [layersEnabled, setLayersEnabled] = useState({
    earthquakes: true,
    disasters: true,
    news: true,
    cables: false,
    military: false,
    nuclear: false,
    chokepoints: false,
    daynight: false,
    vessels: false,
    volcanoes: false,
    geopolitical: false,
    curfews: false,
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('dhruva-theme');
      return (saved === 'light' || saved === 'dark') ? saved : 'dark';
    } catch { return 'dark'; }
  });
  const [timeFilter, setTimeFilter] = useState('24H');
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  // legacy alerts state kept for non-unified-alert sources (earthquakes, volcanoes, etc.)
  const [legacyAlerts, setLegacyAlerts] = useState<AppNotification[]>([]);
  const [tickerEvents, setTickerEvents] = useState<TickerEvent[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [nextSyncIn, setNextSyncIn] = useState<number>(AUTO_SYNC_INTERVAL_MS);
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());
  const [showAbout, setShowAbout] = useState(false);
  const [showNotifPrefs, setShowNotifPrefs] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [dataFreshness, setDataFreshness] = useState<DataFreshnessState>({
    isStale: false,
    staleSince: null,
    staleAge: null,
  });
  const stalenessTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { prefs, update: updatePrefs } = useNotificationPreferences();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileRightPanelOpen, setMobileRightPanelOpen] = useState(false);

  const autoSyncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextSyncAtRef = useRef<number>(Date.now() + AUTO_SYNC_INTERVAL_MS);
  const swipeTouchStartX = useRef<number | null>(null);
  const swipeTouchStartY = useRef<number | null>(null);

  const pushTickerEvent = useCallback((evt: TickerEvent) => {
    setTickerEvents((prev) => [evt, ...prev].slice(0, 40));
  }, []);

  const markNewEvent = useCallback((id: string) => {
    setNewEventIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setTimeout(() => {
      setNewEventIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 12000);
  }, []);

  const addAlert = useCallback((title: string, message: string, severity: 'high' | 'moderate' | 'low' = 'high') => {
    const id = `legacy-${Date.now()}`;
    const n: AppNotification = {
      id, title, message, severity,
      eventType: 'system', regionKey: 'global', count: 1, alertIds: [],
    };
    setLegacyAlerts(prev => [...prev, n]);
    setTimeout(() => setLegacyAlerts(prev => prev.filter(a => a.id !== id)), 7000);
  }, []);

  const playAlert = useCallback((type: 'critical' | 'high' | 'info') => {
    if (!soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'critical') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'high') {
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch {}
  }, [soundEnabled]);

  const handleNotification = useCallback((n: AppNotification) => {
    setNotifications(prev => [...prev, n].slice(0, 5));
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setLegacyAlerts(prev => prev.filter(n => n.id !== id));
  }, []);

  // Smart alert notifier (unified_alerts realtime + throttling)
  useAlertNotifier(prefs, handleNotification, soundEnabled, playAlert);

  const allNotifications = [...notifications, ...legacyAlerts];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Each source is fetched independently with resilience so one failing
      // source never blocks the others. Settled results are applied regardless.
      const [eqRes, disRes, newsRes, vesRes, volRes, geoRes] = await Promise.all([
        withResilience('earthquakes', () => IntelligenceAPI.getEarthquakes(4.0, 50)),
        withResilience('disasters',   () => IntelligenceAPI.getDisasters(50)),
        withResilience('news',        () => IntelligenceAPI.getNews(50)),
        withResilience('vessels',     () => IntelligenceAPI.getVessels(50)),
        withResilience('volcanoes',   () => IntelligenceAPI.getVolcanoes(50)),
        withResilience('geopolitical',() => IntelligenceAPI.getGeopoliticalEvents(50)),
      ]);

      setEarthquakes(eqRes.data);
      setDisasters(disRes.data);
      setNews(newsRes.data);
      setVessels(vesRes.data);
      setVolcanoes(volRes.data);
      setGeopolitical(geoRes.data);

      // Determine overall freshness: stale if ANY source served cached data
      const allResults = [eqRes, disRes, newsRes, vesRes, volRes, geoRes];
      const staleResults = allResults.filter(r => r.stale && r.staleSince);
      const isStale = staleResults.length > 0;
      const oldestStale = isStale
        ? staleResults.reduce((oldest, r) =>
            !oldest || new Date(r.staleSince!).getTime() < new Date(oldest).getTime()
              ? r.staleSince!
              : oldest
          , null as string | null)
        : null;

      setDataFreshness({
        isStale,
        staleSince: oldestStale,
        staleAge: formatStaleAge(oldestStale),
      });

      if (!isStale) {
        const syncTime = await IntelligenceAPI.getLastSyncTime().catch(() => null);
        if (syncTime) setLastSyncTime(syncTime);
      }
    } catch (error) {
      // Complete cold failure (no cache at all for any source) — keep
      // whatever is in state (empty arrays on first load) and mark stale
      console.error('Error loading data:', error);
      setDataFreshness({ isStale: true, staleSince: null, staleAge: 'unavailable' });
    } finally {
      setLoading(false);
    }
  }, []);

  const runAutoSync = useCallback(async () => {
    setSyncing(true);
    try {
      await IntelligenceAPI.triggerDataSync();
      nextSyncAtRef.current = Date.now() + AUTO_SYNC_INTERVAL_MS;
      setTimeout(async () => {
        await loadData();
        const syncTime = await IntelligenceAPI.getLastSyncTime();
        if (syncTime) setLastSyncTime(syncTime);
      }, 4000);
    } catch (error) {
      console.error('Auto-sync error:', error);
    } finally {
      setSyncing(false);
    }
  }, [loadData]);

  const setupRealtimeSubscriptions = useCallback(() => {
    IntelligenceAPI.subscribeToEarthquakes((earthquake) => {
      setEarthquakes((prev) => [earthquake, ...prev].slice(0, 50));
      pushTickerEvent(toTickerEvent('earthquake', earthquake));
      markNewEvent(earthquake.id);
      if (earthquake.magnitude >= 6.5) {
        addAlert('SEISMIC ALERT', `M${earthquake.magnitude.toFixed(1)} — ${earthquake.location}`);
        playAlert('critical');
      }
    });

    IntelligenceAPI.subscribeToDisasters((disaster) => {
      setDisasters((prev) => [disaster, ...prev].slice(0, 50));
      pushTickerEvent(toTickerEvent('disaster', disaster));
      markNewEvent(disaster.id);
    });

    IntelligenceAPI.subscribeToNews((newsItem) => {
      setNews((prev) => [newsItem, ...prev].slice(0, 50));
      pushTickerEvent(toTickerEvent('news', newsItem));
      markNewEvent(newsItem.id);
    });

    IntelligenceAPI.subscribeToVessels((vessel) => {
      setVessels((prev) => prev.map((v) => v.mmsi === vessel.mmsi ? vessel : v));
    });

    IntelligenceAPI.subscribeToVolcanoes((volcano) => {
      setVolcanoes((prev) => {
        const exists = prev.find((v) => v.id === volcano.id);
        if (exists) return prev.map((v) => v.id === volcano.id ? volcano : v);
        return [volcano, ...prev].slice(0, 50);
      });
      pushTickerEvent(toTickerEvent('volcano', volcano));
      markNewEvent(volcano.id);
      if (volcano.status === 'erupting') {
        addAlert('VOLCANO ERUPTION', `${volcano.name}${volcano.country ? ` — ${volcano.country}` : ''}`);
        playAlert('critical');
      }
    });

    IntelligenceAPI.subscribeToGeopolitical((event) => {
      setGeopolitical((prev) => {
        const exists = prev.find((g) => g.id === event.id);
        if (exists) return prev.map((g) => g.id === event.id ? event : g);
        return [event, ...prev].slice(0, 50);
      });
      pushTickerEvent(toTickerEvent('geopolitical', event));
      markNewEvent(event.id);
      if (event.severity === 'critical') {
        addAlert('CRITICAL ALERT', `${event.title}${event.country ? ` — ${event.country}` : ''}`);
        playAlert('critical');
      } else if (event.severity === 'high') {
        playAlert('high');
      }
    });

    IntelligenceAPI.subscribeToCyberThreats((threat) => {
      if (threat.severity === 'critical') {
        addAlert('CYBER THREAT', threat.title);
        playAlert('high');
      }
    });
  }, [pushTickerEvent, markNewEvent, addAlert, playAlert]);

  useEffect(() => {
    loadData();
    setupRealtimeSubscriptions();

    autoSyncTimerRef.current = setInterval(() => {
      runAutoSync();
    }, AUTO_SYNC_INTERVAL_MS);

    countdownTimerRef.current = setInterval(() => {
      const remaining = nextSyncAtRef.current - Date.now();
      setNextSyncIn(Math.max(0, remaining));
    }, 1000);

    // Refresh the human-readable stale age every 30 s
    stalenessTimerRef.current = setInterval(() => {
      setDataFreshness(prev => prev.isStale
        ? { ...prev, staleAge: formatStaleAge(prev.staleSince) }
        : prev
      );
    }, 30_000);

    return () => {
      if (autoSyncTimerRef.current) clearInterval(autoSyncTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (stalenessTimerRef.current) clearInterval(stalenessTimerRef.current);
    };
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await IntelligenceAPI.triggerDataSync();
      nextSyncAtRef.current = Date.now() + AUTO_SYNC_INTERVAL_MS;
      setTimeout(async () => {
        await loadData();
        const syncTime = await IntelligenceAPI.getLastSyncTime();
        if (syncTime) setLastSyncTime(syncTime);
      }, 4000);
    } catch (error) {
      console.error('Error syncing data:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleEventSelect = (id: string, type: string) => {
    setSelectedEvent(id);
    setPendingDrawer({ id, type });
  };

  const handleLayerToggle = (layer: keyof typeof layersEnabled) => {
    setLayersEnabled((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme === 'light' ? 'light' : '');
    try { localStorage.setItem('dhruva-theme', newTheme); } catch { /* noop */ }
  };

  const showTooltip = (x: number, y: number, content: string) => {
    setTooltip({ x, y, content });
  };

  const hideTooltip = () => {
    setTooltip(null);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '');
  }, []);

  const handleSwipeTouchStart = (e: React.TouchEvent) => {
    swipeTouchStartX.current = e.touches[0].clientX;
    swipeTouchStartY.current = e.touches[0].clientY;
  };

  const handleSwipeTouchEnd = (e: React.TouchEvent) => {
    if (swipeTouchStartX.current === null || swipeTouchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - swipeTouchStartX.current;
    const dy = e.changedTouches[0].clientY - swipeTouchStartY.current;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (absDx < 40 || absDy > absDx) {
      swipeTouchStartX.current = null;
      swipeTouchStartY.current = null;
      return;
    }
    const startX = swipeTouchStartX.current;
    const screenW = window.innerWidth;
    if (dx > 0 && startX < 40) {
      setMobileSidebarOpen(true);
      setMobileRightPanelOpen(false);
    } else if (dx < 0 && startX > screenW - 40) {
      setMobileRightPanelOpen(true);
      setMobileSidebarOpen(false);
    } else if (dx < 0 && mobileSidebarOpen) {
      setMobileSidebarOpen(false);
    } else if (dx > 0 && mobileRightPanelOpen) {
      setMobileRightPanelOpen(false);
    }
    swipeTouchStartX.current = null;
    swipeTouchStartY.current = null;
  };

  const criticalEvents = earthquakes.filter((e) => e.magnitude >= 6).length +
    disasters.filter((d) => d.category?.toLowerCase().includes('severe')).length;

  const INDIA_NEIGHBOURS = new Set(['India','Pakistan','China','Bangladesh','Sri Lanka','Nepal','Myanmar','Bhutan','Maldives']);
  const INDIA_EXTENDED = new Set(['Afghanistan','Iran','UAE','Saudi Arabia','Oman','Yemen','Russia']);
  const IOR_REGEX = /\b(IOR|Arabian Sea|Bay of Bengal|Indian Ocean|Malacca|Hormuz|Strait of Hormuz|Line of Control|LoC|Kashmir|Ladakh|Aksai Chin|Arunachal|Andaman|Lakshadweep|CPEC|Belt and Road)\b/i;
  const HIGH_RISK_CATS = new Set(['conflict','coup','sanctions','crisis']);

  const indiaThreatEvents = geopolitical.filter(g => {
    const isNeighbour = INDIA_NEIGHBOURS.has(g.country || '');
    const isExtended = INDIA_EXTENDED.has(g.country || '');
    const isIOR = IOR_REGEX.test((g.title || '') + ' ' + (g.description || ''));
    return isNeighbour || isExtended || isIOR;
  });

  const indiaScore = Math.min(100, indiaThreatEvents.reduce((sum, g) => {
    const severityWeight = g.severity === 'critical' ? 20 : g.severity === 'high' ? 10 : g.severity === 'medium' ? 4 : 1;
    const categoryBonus = HIGH_RISK_CATS.has(g.category) ? 1.5 : 1;
    return sum + severityWeight * categoryBonus;
  }, 0));

  const indiaBreakdown = {
    critical: indiaThreatEvents.filter(g => g.severity === 'critical'),
    high: indiaThreatEvents.filter(g => g.severity === 'high'),
    countries: [...new Set(indiaThreatEvents.map(g => g.country).filter(Boolean))].slice(0, 6) as string[],
    topEvents: indiaThreatEvents
      .sort((a, b) => {
        const w: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        return (w[b.severity] || 0) - (w[a.severity] || 0);
      })
      .slice(0, 4),
  };

  if (loading) {
    return (
      <div id="loading">
        <div className="ld-logo">DHRUVA™</div>
        <div className="ld-sub">Dynamic Holistic Resilience & Unified Vigilance Architecture</div>
        <div className="ld-bar">
          <div className="ld-fill" style={{ width: '80%' }}></div>
        </div>
        <div className="ld-msg">INITIALIZING INTELLIGENCE SYSTEMS...</div>
      </div>
    );
  }

  return (
    <DataFreshnessContext.Provider value={dataFreshness}>
    <div className="dhruva-app" onTouchStart={handleSwipeTouchStart} onTouchEnd={handleSwipeTouchEnd}>
      <div className="portrait-overlay">
        <div className="portrait-overlay-inner">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <path d="M12 18h.01" />
          </svg>
          <div className="portrait-overlay-arrow">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3L3 9l6 6" />
              <path d="M3 9h13a5 5 0 0 1 0 10h-1" />
            </svg>
          </div>
          <div className="portrait-overlay-title">ROTATE DEVICE</div>
          <div className="portrait-overlay-sub">Landscape mode recommended for the best experience</div>
        </div>
      </div>
      <Header
        totalEvents={earthquakes.length + disasters.length + news.length}
        criticalEvents={criticalEvents}
        indiaScore={Math.round(indiaScore)}
        indiaBreakdown={indiaBreakdown}
        onSync={handleSync}
        syncing={syncing}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        onToggleSidebar={() => setMobileSidebarOpen(o => !o)}
        onToggleRightPanel={() => setMobileRightPanelOpen(o => !o)}
        mobileSidebarOpen={mobileSidebarOpen}
        mobileRightPanelOpen={mobileRightPanelOpen}
      />

      <div className="view-tabs">
        <div className={`view-tab ${currentView === 'map' ? 'active' : ''}`} onClick={() => setCurrentView('map')}>
          🗺️ MAP
        </div>
        <div className={`view-tab ${currentView === 'timeline' ? 'active' : ''}`} onClick={() => setCurrentView('timeline')}>
          📈 TIMELINE
        </div>
        <div className={`view-tab ${currentView === 'news' ? 'active' : ''}`} onClick={() => setCurrentView('news')}>
          📡 NEWS INTEL
        </div>
        <div className={`view-tab ${currentView === 'sewa' ? 'active' : ''}`} onClick={() => setCurrentView('sewa')}>
          🏦 BANK SEWA
        </div>
        <div className={`view-tab ${currentView === 'cyber' ? 'active' : ''}`} onClick={() => setCurrentView('cyber')} style={{ color: currentView === 'cyber' ? '' : '#00BFFF99' }}>
          💻 CYBER WATCH
        </div>
        <div className={`view-tab ${currentView === 'infoops' ? 'active' : ''}`} onClick={() => setCurrentView('infoops')} style={{ color: currentView === 'infoops' ? '' : '#CC66FF99' }}>
          🧠 INFO OPS
        </div>
        <div className={`view-tab ${currentView === 'gov' ? 'active' : ''}`} onClick={() => setCurrentView('gov')} style={{ color: currentView === 'gov' ? '' : '#4D9FFF99' }}>
          GOV FEED
        </div>
        <div className={`view-tab ${currentView === 'vessel' ? 'active' : ''}`} onClick={() => setCurrentView('vessel')} style={{ color: currentView === 'vessel' ? '' : '#00BFFF99' }}>
          ⚓ VESSEL INTEL
        </div>
        <div className={`view-tab ${currentView === 'admin' ? 'active' : ''}`} onClick={() => setCurrentView('admin')} style={{ color: currentView === 'admin' ? '' : '#4D9FFF99' }}>
          SYS MONITOR
        </div>
      </div>

      <div className="mobile-view-tabs">
        <button className={`mvt-btn ${currentView === 'map' ? 'active' : ''}`} onClick={() => setCurrentView('map')}>
          <span className="mvt-icon">🗺️</span>
          <span className="mvt-label">MAP</span>
        </button>
        <button className={`mvt-btn ${currentView === 'timeline' ? 'active' : ''}`} onClick={() => setCurrentView('timeline')}>
          <span className="mvt-icon">📈</span>
          <span className="mvt-label">TIME</span>
        </button>
        <button className={`mvt-btn ${currentView === 'news' ? 'active' : ''}`} onClick={() => setCurrentView('news')}>
          <span className="mvt-icon">📡</span>
          <span className="mvt-label">NEWS</span>
        </button>
        <button className={`mvt-btn ${currentView === 'sewa' ? 'active' : ''}`} onClick={() => setCurrentView('sewa')}>
          <span className="mvt-icon">🏦</span>
          <span className="mvt-label">SEWA</span>
        </button>
        <button className={`mvt-btn ${currentView === 'cyber' ? 'active' : ''}`} onClick={() => setCurrentView('cyber')}>
          <span className="mvt-icon">💻</span>
          <span className="mvt-label">CYBER</span>
        </button>
        <button className={`mvt-btn ${currentView === 'infoops' ? 'active' : ''}`} onClick={() => setCurrentView('infoops')}>
          <span className="mvt-icon">🧠</span>
          <span className="mvt-label">INFO</span>
        </button>
        <button className={`mvt-btn ${currentView === 'gov' ? 'active' : ''}`} onClick={() => setCurrentView('gov')}>
          <span className="mvt-icon">🏛️</span>
          <span className="mvt-label">GOV</span>
        </button>
        <button className={`mvt-btn ${currentView === 'vessel' ? 'active' : ''}`} onClick={() => setCurrentView('vessel')}>
          <span className="mvt-icon">⚓</span>
          <span className="mvt-label">VESSEL</span>
        </button>
        <button className={`mvt-btn ${currentView === 'admin' ? 'active' : ''}`} onClick={() => setCurrentView('admin')}>
          <span className="mvt-icon">⚙</span>
          <span className="mvt-label">SYS</span>
        </button>
      </div>

      <LiveEventTicker events={tickerEvents} />

      {mobileSidebarOpen && (
        <div className="mobile-overlay" onClick={() => setMobileSidebarOpen(false)} />
      )}
      {mobileRightPanelOpen && (
        <div className="mobile-overlay" onClick={() => setMobileRightPanelOpen(false)} />
      )}

      <div className="app-body">
        <Sidebar
          earthquakes={earthquakes}
          disasters={disasters}
          news={news}
          vessels={vessels}
          volcanoes={volcanoes}
          geopolitical={geopolitical}
          selectedEvent={selectedEvent}
          pendingDrawer={pendingDrawer}
          onPendingDrawerConsumed={() => setPendingDrawer(null)}
          onEventSelect={(id, type) => { handleEventSelect(id, type); setMobileSidebarOpen(false); }}
          mode={mode}
          onModeChange={setMode}
          layersEnabled={layersEnabled}
          onLayerToggle={handleLayerToggle}
          mobileOpen={mobileSidebarOpen}
        />

        <div className="center">
          {currentView === 'map' && (
            <MapView
              earthquakes={earthquakes}
              disasters={disasters}
              news={news}
              vessels={vessels}
              volcanoes={volcanoes}
              geopolitical={geopolitical}
              onEventSelect={handleEventSelect}
              layersEnabled={layersEnabled}
              timeFilter={timeFilter}
              onTimeFilterChange={setTimeFilter}
              showTooltip={showTooltip}
              hideTooltip={hideTooltip}
              newEventIds={newEventIds}
            />
          )}
          {currentView === 'timeline' && (
            <TimelineView
              earthquakes={earthquakes}
              disasters={disasters}
              news={news}
              vessels={vessels}
              volcanoes={volcanoes}
              geopolitical={geopolitical}
            />
          )}
          {currentView === 'news' && <NewsIntelView />}
          {currentView === 'sewa' && <SewaView />}
          {currentView === 'cyber' && <CyberView />}
          {currentView === 'infoops' && <InfoOpsView />}
          {currentView === 'gov' && <GovAnnouncementsView />}
          {currentView === 'vessel' && <VesselView />}
          {currentView === 'admin' && <AdminDashboard />}
        </div>

        <RightPanel
          earthquakes={earthquakes}
          disasters={disasters}
          news={news}
          vessels={vessels}
          volcanoes={volcanoes}
          geopolitical={geopolitical}
          mobileOpen={mobileRightPanelOpen}
        />
      </div>

      <div className="status-bar">
        <div>
          <span className="sdot" style={{ background: '#00D4A0' }}></span>
          DATABASE: CONNECTED
        </div>
        <div>
          <span className="sdot" style={{ background: '#00D4A0', animation: 'statusPulse 2s ease-in-out infinite' }}></span>
          REALTIME: ACTIVE
        </div>
        <div>
          <span className="sdot" style={{ background: '#FFB800' }}></span>
          MODE: {mode.toUpperCase()}
        </div>
        <div>
          <span className="sdot" style={{ background: syncing ? '#FFB800' : '#4D9FFF' }}></span>
          SYNC: {syncing ? 'IN PROGRESS' : `NEXT ${formatSyncCountdown(nextSyncIn)}`}
        </div>
        {lastSyncTime && (
          <div>
            <span className="sdot" style={{ background: '#00D4A0' }}></span>
            LAST SYNC: {new Date(lastSyncTime).toUTCString().slice(17, 25)}Z
          </div>
        )}
        <div>
          <span className="sdot" style={{ background: theme === 'dark' ? '#00D4A0' : '#007A5E' }}></span>
          THEME: {theme.toUpperCase()}
        </div>
        <div>
          <button
            className={`notif-bell-btn ${showNotifPrefs ? 'active' : ''}`}
            onClick={() => setShowNotifPrefs(o => !o)}
            title="Notification preferences"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            ALERTS
            {notifications.length > 0 && (
              <span className="notif-bell-badge">{notifications.length}</span>
            )}
          </button>
        </div>
        <div className="about-link-wrap">
          <button className="about-link-btn" onClick={() => setShowAbout(true)}>
            ABOUT DHRUVA
          </button>
          <span className="about-creator-inline">
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
        </div>
      </div>

      <AlertToast notifications={allNotifications} onDismiss={dismissNotification} />
      {showNotifPrefs && (
        <NotificationPreferencesPanel
          prefs={prefs}
          onUpdate={updatePrefs}
          onClose={() => setShowNotifPrefs(false)}
        />
      )}
      {tooltip && <Tooltip x={tooltip.x} y={tooltip.y} content={tooltip.content} />}
      {showAbout && <AboutDhruva onClose={() => setShowAbout(false)} theme={theme} />}
    </div>
    </DataFreshnessContext.Provider>
  );
}

export default App;
