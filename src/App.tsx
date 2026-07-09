import { useCallback, useEffect, useRef, useState } from 'react';
import { IntelligenceAPI, Earthquake, Disaster, NewsEvent, VolcanoEvent, GeopoliticalEvent } from './lib/intelligence-api';
import { withResilience } from './lib/resilience';
import { fetchWeatherAlerts, type WeatherAlert } from './lib/weather-alerts';
import { DataFreshnessContext, DataFreshnessState, formatStaleAge } from './lib/DataFreshnessContext';
import {
  AUTO_SYNC_INTERVAL_MS,
  INDIA_NEIGHBOURS, INDIA_EXTENDED, IOR_REGEX, HIGH_RISK_GEO_CATS, SEVERITY_WEIGHTS,
} from './lib/constants';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { RightPanel } from './components/RightPanel';
import { MapView } from './components/MapView';
import { SewaView } from './components/SewaView';
import { CyberView } from './components/CyberView';
import { InfoOpsView } from './components/InfoOpsView';
import { GovAnnouncementsView } from './components/GovAnnouncementsView';
import { WeatherAlertsView } from './components/WeatherAlertsView';
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

type ViewType = 'map' | 'timeline' | 'news' | 'wx' | 'sewa' | 'cyber' | 'infoops' | 'gov' | 'admin';

function formatSyncCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function toTickerEvent(
  type: TickerEvent['type'],
  item: Earthquake | Disaster | NewsEvent | VolcanoEvent | GeopoliticalEvent
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
    const tickerType = g.category === 'curfew' ? 'curfew' as const : 'geopolitical' as const;
    return {
      id: g.id,
      time: timeStr,
      type: tickerType,
      title: `${g.title}${g.country ? ` — ${g.country}` : ''}`,
      severity: g.severity,
    };
  }
  return { id: '', time: timeStr, type: 'news', title: '' };
}

function App() {
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [news, setNews] = useState<NewsEvent[]>([]);
  const [volcanoes, setVolcanoes] = useState<VolcanoEvent[]>([]);
  const [geopolitical, setGeopolitical] = useState<GeopoliticalEvent[]>([]);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('map');
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [pendingDrawer, setPendingDrawer] = useState<{ id: string; type: string } | null>(null);
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
    volcanoes: true,
    geopolitical: true,
    curfews: true,
    wx: true,
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
      eventType: 'system', regionKey: 'global', priorityScore: 0, count: 1, alertIds: [],
    };
    setLegacyAlerts(prev => [...prev, n]);
    setTimeout(() => setLegacyAlerts(prev => prev.filter(a => a.id !== id)), 7000);
  }, []);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const playAlert = useCallback((type: 'critical' | 'high' | 'info') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
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
      const settled = await Promise.allSettled([
        withResilience('earthquakes', () => IntelligenceAPI.getEarthquakes(4.0, 50), { maxRetries: 1, baseDelayMs: 300 }),
        withResilience('disasters',   () => IntelligenceAPI.getDisasters(50),         { maxRetries: 1, baseDelayMs: 300 }),
        withResilience('news',        () => IntelligenceAPI.getNews(50),              { maxRetries: 1, baseDelayMs: 300 }),
        withResilience('volcanoes',   () => IntelligenceAPI.getVolcanoes(50),         { maxRetries: 1, baseDelayMs: 300 }),
        withResilience('geopolitical',() => IntelligenceAPI.getGeopoliticalEvents(50),{ maxRetries: 1, baseDelayMs: 300 }),
      ]);

      const [eqR, disR, newsR, volR, geoR] = settled;

      if (eqR.status   === 'fulfilled') setEarthquakes(eqR.value.data);
      if (disR.status  === 'fulfilled') setDisasters(disR.value.data);
      if (newsR.status === 'fulfilled') setNews(newsR.value.data);
      if (volR.status  === 'fulfilled') setVolcanoes(volR.value.data);
      if (geoR.status  === 'fulfilled') setGeopolitical(geoR.value.data);

      // Orange/Red weather alerts (GDACS) — fetched independently so a failure
      // never blocks the core sources or the map.
      fetchWeatherAlerts().then((wx) => {
        if (wx.ok) setWeatherAlerts(wx.alerts ?? []);
      });

      // Seed ticker with initial data from all sources
      const tickerSeed: TickerEvent[] = [];
      if (eqR.status === 'fulfilled') eqR.value.data.slice(0, 5).forEach((eq: Earthquake) => tickerSeed.push(toTickerEvent('earthquake', eq)));
      if (disR.status === 'fulfilled') disR.value.data.slice(0, 4).forEach((d: Disaster) => tickerSeed.push(toTickerEvent('disaster', d)));
      if (newsR.status === 'fulfilled') newsR.value.data.slice(0, 8).forEach((n: NewsEvent) => tickerSeed.push(toTickerEvent('news', n)));
      if (geoR.status === 'fulfilled') geoR.value.data.slice(0, 10).forEach((g: GeopoliticalEvent) => tickerSeed.push(toTickerEvent('geopolitical', g)));
      if (volR.status === 'fulfilled') volR.value.data.slice(0, 3).forEach((v: VolcanoEvent) => tickerSeed.push(toTickerEvent('volcano', v)));
      if (tickerSeed.length > 0) setTickerEvents(prev => prev.length === 0 ? tickerSeed : prev);

      const fulfilled = settled.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<{ data: any; stale: boolean; staleSince: string | null }>[];
      const staleResults = fulfilled.filter(r => r.value.stale && r.value.staleSince);
      const isStale = staleResults.length > 0;

      const oldestStale = isStale
        ? staleResults.reduce((oldest, r) =>
            !oldest || new Date(r.value.staleSince!).getTime() < new Date(oldest).getTime()
              ? r.value.staleSince!
              : oldest
          , null as string | null)
        : null;

      setDataFreshness({
        isStale,
        staleSince: oldestStale,
        staleAge: formatStaleAge(oldestStale),
      });
    } catch (error) {
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

  const indiaThreatEvents = geopolitical.filter(g => {
    const isNeighbour = INDIA_NEIGHBOURS.has(g.country || '');
    const isExtended = INDIA_EXTENDED.has(g.country || '');
    const isIOR = IOR_REGEX.test((g.title || '') + ' ' + (g.description || ''));
    return isNeighbour || isExtended || isIOR;
  });

  const indiaScore = Math.min(100, indiaThreatEvents.reduce((sum, g) => {
    const severityWeight = SEVERITY_WEIGHTS[g.severity] ?? 1;
    const categoryBonus = HIGH_RISK_GEO_CATS.has(g.category) ? 1.5 : 1;
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
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <div className="portrait-overlay" aria-hidden="true">
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

      <div className="view-tabs" role="tablist" aria-label="Application views">
        <div role="tab" aria-selected={currentView === 'map'} tabIndex={currentView === 'map' ? 0 : -1} className={`view-tab ${currentView === 'map' ? 'active' : ''}`} onClick={() => setCurrentView('map')} onKeyDown={e => e.key === 'Enter' && setCurrentView('map')}>
          MAP
        </div>
        <div role="tab" aria-selected={currentView === 'timeline'} tabIndex={currentView === 'timeline' ? 0 : -1} className={`view-tab ${currentView === 'timeline' ? 'active' : ''}`} onClick={() => setCurrentView('timeline')} onKeyDown={e => e.key === 'Enter' && setCurrentView('timeline')}>
          TIMELINE
        </div>
        <div role="tab" aria-selected={currentView === 'news'} tabIndex={currentView === 'news' ? 0 : -1} className={`view-tab ${currentView === 'news' ? 'active' : ''}`} onClick={() => setCurrentView('news')} onKeyDown={e => e.key === 'Enter' && setCurrentView('news')}>
          NEWS INTEL
        </div>
        <div role="tab" aria-selected={currentView === 'wx'} tabIndex={currentView === 'wx' ? 0 : -1} className={`view-tab ${currentView === 'wx' ? 'active' : ''}`} onClick={() => setCurrentView('wx')} style={{ color: currentView === 'wx' ? '' : '#FFA50099' }} onKeyDown={e => e.key === 'Enter' && setCurrentView('wx')}>
          WEATHER ALERTS
        </div>
        <div role="tab" aria-selected={currentView === 'sewa'} tabIndex={currentView === 'sewa' ? 0 : -1} className={`view-tab ${currentView === 'sewa' ? 'active' : ''}`} onClick={() => setCurrentView('sewa')} onKeyDown={e => e.key === 'Enter' && setCurrentView('sewa')}>
          BANK SEWA
        </div>
        <div role="tab" aria-selected={currentView === 'cyber'} tabIndex={currentView === 'cyber' ? 0 : -1} className={`view-tab ${currentView === 'cyber' ? 'active' : ''}`} onClick={() => setCurrentView('cyber')} style={{ color: currentView === 'cyber' ? '' : '#00BFFF99' }} onKeyDown={e => e.key === 'Enter' && setCurrentView('cyber')}>
          CYBER WATCH
        </div>
        <div role="tab" aria-selected={currentView === 'infoops'} tabIndex={currentView === 'infoops' ? 0 : -1} className={`view-tab ${currentView === 'infoops' ? 'active' : ''}`} onClick={() => setCurrentView('infoops')} style={{ color: currentView === 'infoops' ? '' : '#CC66FF99' }} onKeyDown={e => e.key === 'Enter' && setCurrentView('infoops')}>
          INFO OPS
        </div>
        <div role="tab" aria-selected={currentView === 'gov'} tabIndex={currentView === 'gov' ? 0 : -1} className={`view-tab ${currentView === 'gov' ? 'active' : ''}`} onClick={() => setCurrentView('gov')} style={{ color: currentView === 'gov' ? '' : '#4D9FFF99' }} onKeyDown={e => e.key === 'Enter' && setCurrentView('gov')}>
          GOV FEED
        </div>
        <div role="tab" aria-selected={currentView === 'admin'} tabIndex={currentView === 'admin' ? 0 : -1} className={`view-tab ${currentView === 'admin' ? 'active' : ''}`} onClick={() => setCurrentView('admin')} style={{ color: currentView === 'admin' ? '' : '#4D9FFF99' }} onKeyDown={e => e.key === 'Enter' && setCurrentView('admin')}>
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
        <button className={`mvt-btn ${currentView === 'wx' ? 'active' : ''}`} onClick={() => setCurrentView('wx')}>
          <span className="mvt-icon">🌩️</span>
          <span className="mvt-label">WX</span>
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

      <div className="app-body" id="main-content" role="main">
        <Sidebar
          earthquakes={earthquakes}
          disasters={disasters}
          news={news}
          volcanoes={volcanoes}
          geopolitical={geopolitical}
          selectedEvent={selectedEvent}
          pendingDrawer={pendingDrawer}
          onPendingDrawerConsumed={() => setPendingDrawer(null)}
          onEventSelect={(id, type) => { handleEventSelect(id, type); setMobileSidebarOpen(false); }}
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
              volcanoes={volcanoes}
              geopolitical={geopolitical}
              weatherAlerts={weatherAlerts}
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
              volcanoes={volcanoes}
              geopolitical={geopolitical}
            />
          )}
          {currentView === 'news' && <NewsIntelView />}
          {currentView === 'wx' && <WeatherAlertsView />}
          {currentView === 'sewa' && <SewaView />}
          {currentView === 'cyber' && <CyberView />}
          {currentView === 'infoops' && <InfoOpsView />}
          {currentView === 'gov' && <GovAnnouncementsView />}
          {currentView === 'admin' && <AdminDashboard />}
        </div>

        <RightPanel
          earthquakes={earthquakes}
          disasters={disasters}
          news={news}
          volcanoes={volcanoes}
          geopolitical={geopolitical}
          mobileOpen={mobileRightPanelOpen}
        />
      </div>

      <div className="status-bar" role="status" aria-label="System status">
        <div>
          <span className="sdot" style={{ background: '#00D4A0' }} aria-hidden="true"></span>
          DATABASE: CONNECTED
        </div>
        <div>
          <span className="sdot" style={{ background: '#00D4A0', animation: 'statusPulse 2s ease-in-out infinite' }} aria-hidden="true"></span>
          REALTIME: ACTIVE
        </div>
        <div>
          <span className="sdot" style={{ background: '#00D4A0', animation: 'statusPulse 2s ease-in-out infinite' }} aria-hidden="true"></span>
          MODE: LIVE
        </div>
        <div>
          <span className="sdot" style={{ background: syncing ? '#FFB800' : '#4D9FFF' }} aria-hidden="true"></span>
          SYNC: {syncing ? 'IN PROGRESS' : `NEXT ${formatSyncCountdown(nextSyncIn)}`}
        </div>
        {lastSyncTime && (
          <div>
            <span className="sdot" style={{ background: '#00D4A0' }} aria-hidden="true"></span>
            LAST SYNC: {new Date(lastSyncTime).toUTCString().slice(17, 25)}Z
          </div>
        )}
        <div>
          <span className="sdot" style={{ background: theme === 'dark' ? '#00D4A0' : '#007A5E' }} aria-hidden="true"></span>
          THEME: {theme.toUpperCase()}
        </div>
        <div>
          <button
            className={`notif-bell-btn ${showNotifPrefs ? 'active' : ''}`}
            onClick={() => setShowNotifPrefs(o => !o)}
            aria-label={`Notification preferences${notifications.length > 0 ? `, ${notifications.length} active` : ''}`}
            aria-expanded={showNotifPrefs}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            ALERTS
            {notifications.length > 0 && (
              <span className="notif-bell-badge" aria-hidden="true">{notifications.length}</span>
            )}
          </button>
        </div>
        <div className="about-link-wrap">
          <button className="about-link-btn" onClick={() => setShowAbout(true)} aria-label="About DHRUVA">
            ABOUT DHRUVA
          </button>
          <span className="about-creator-inline">
            CREATED BY&nbsp;
            <a
              href="https://www.linkedin.com/in/abhimanyu-mathur-70643032"
              target="_blank"
              rel="noopener noreferrer"
              className="about-creator-link"
              aria-label="Abhimanyu Mathur - LinkedIn profile (opens in new tab)"
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
