import { useEffect, useState } from 'react';
import { IntelligenceAPI, Earthquake, Disaster, NewsEvent, Vessel, VolcanoEvent, GeopoliticalEvent } from './lib/intelligence-api';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { RightPanel } from './components/RightPanel';
import { MapView } from './components/MapView';
import { SewaView } from './components/SewaView';
import { CyberView } from './components/CyberView';
import { InfoOpsView } from './components/InfoOpsView';
import { UaeView } from './components/UaeView';
import { VesselView } from './components/VesselView';
import { NewsIntelView } from './components/NewsIntelView';
import { TimelineView } from './components/TimelineView';
import { AlertToast } from './components/AlertToast';
import { Tooltip } from './components/Tooltip';

type ViewType = 'map' | 'timeline' | 'news' | 'sewa' | 'cyber' | 'infoops' | 'uae' | 'vessel';

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
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [timeFilter, setTimeFilter] = useState('24H');
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const [alerts, setAlerts] = useState<Array<{ id: string; title: string; message: string }>>([]);

  useEffect(() => {
    loadData();
    setupRealtimeSubscriptions();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [earthquakesData, disastersData, newsData, vesselsData, volcanoesData, geopoliticalData] = await Promise.all([
        IntelligenceAPI.getEarthquakes(4.0, 50),
        IntelligenceAPI.getDisasters(50),
        IntelligenceAPI.getNews(50),
        IntelligenceAPI.getVessels(50),
        IntelligenceAPI.getVolcanoes(50),
        IntelligenceAPI.getGeopoliticalEvents(50),
      ]);
      setEarthquakes(earthquakesData);
      setDisasters(disastersData);
      setNews(newsData);
      setVessels(vesselsData);
      setVolcanoes(volcanoesData);
      setGeopolitical(geopoliticalData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    IntelligenceAPI.subscribeToEarthquakes((earthquake) => {
      setEarthquakes((prev) => [earthquake, ...prev].slice(0, 50));
    });

    IntelligenceAPI.subscribeToDisasters((disaster) => {
      setDisasters((prev) => [disaster, ...prev].slice(0, 50));
    });

    IntelligenceAPI.subscribeToNews((newsItem) => {
      setNews((prev) => [newsItem, ...prev].slice(0, 50));
    });

    IntelligenceAPI.subscribeToVessels((vessel) => {
      setVessels((prev) => prev.map((v) => v.mmsi === vessel.mmsi ? vessel : v));
    });
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await IntelligenceAPI.triggerDataSync();
      setTimeout(() => {
        loadData();
      }, 3000);
    } catch (error) {
      console.error('Error syncing data:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleEventSelect = (id: string, type: string) => {
    setSelectedEvent(id);
  };

  const handleLayerToggle = (layer: keyof typeof layersEnabled) => {
    setLayersEnabled((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const showTooltip = (x: number, y: number, content: string) => {
    setTooltip({ x, y, content });
  };

  const hideTooltip = () => {
    setTooltip(null);
  };

  const addAlert = (title: string, message: string) => {
    const id = Date.now().toString();
    setAlerts((prev) => [...prev, { id, title, message }]);
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    }, 5000);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  const criticalEvents = earthquakes.filter((e) => e.magnitude >= 6).length + disasters.filter((d) => d.category?.toLowerCase().includes('severe')).length;

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
    <div className="dhruva-app">
      <Header
        totalEvents={earthquakes.length + disasters.length + news.length}
        criticalEvents={criticalEvents}
        onSync={handleSync}
        syncing={syncing}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        theme={theme}
        onThemeToggle={handleThemeToggle}
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
        <div className={`view-tab ${currentView === 'uae' ? 'active' : ''}`} onClick={() => setCurrentView('uae')} style={{ color: currentView === 'uae' ? '' : '#1DA1F299' }}>
          🇦🇪 UAE FEED
        </div>
        <div className={`view-tab ${currentView === 'vessel' ? 'active' : ''}`} onClick={() => setCurrentView('vessel')} style={{ color: currentView === 'vessel' ? '' : '#00BFFF99' }}>
          ⚓ VESSEL INTEL
        </div>
      </div>

      <div className="app-body">
        <Sidebar
          earthquakes={earthquakes}
          disasters={disasters}
          news={news}
          vessels={vessels}
          volcanoes={volcanoes}
          geopolitical={geopolitical}
          selectedEvent={selectedEvent}
          onEventSelect={handleEventSelect}
          mode={mode}
          onModeChange={setMode}
          layersEnabled={layersEnabled}
          onLayerToggle={handleLayerToggle}
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
          {currentView === 'uae' && <UaeView />}
          {currentView === 'vessel' && <VesselView />}
        </div>

        <RightPanel earthquakes={earthquakes.length} disasters={disasters.length} news={news.length} />
      </div>

      <div className="status-bar">
        <div>
          <span className="sdot" style={{ background: '#00D4A0' }}></span>
          DATABASE: CONNECTED
        </div>
        <div>
          <span className="sdot" style={{ background: '#00D4A0' }}></span>
          REALTIME: ACTIVE
        </div>
        <div>
          <span className="sdot" style={{ background: '#FFB800' }}></span>
          MODE: {mode.toUpperCase()}
        </div>
        <div>
          <span className="sdot" style={{ background: '#4D9FFF' }}></span>
          SYNC: {syncing ? 'IN PROGRESS' : 'IDLE'}
        </div>
        <div>
          <span className="sdot" style={{ background: theme === 'dark' ? '#00D4A0' : '#007A5E' }}></span>
          THEME: {theme.toUpperCase()}
        </div>
      </div>

      <AlertToast alerts={alerts} />
      {tooltip && <Tooltip x={tooltip.x} y={tooltip.y} content={tooltip.content} />}
    </div>
  );
}

export default App;
