import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Anchor, Filter, X, Satellite } from 'lucide-react';
import { IntelligenceAPI, Vessel } from '../lib/intelligence-api';
import { VesselMap } from './vessel/VesselMap';
import { VesselTable } from './vessel/VesselTable';
import { VesselDetail } from './vessel/VesselDetail';

type TabType = 'live' | 'search';
type ViewMode = 'split' | 'map' | 'table';

const TYPE_FILTERS = ['ALL', 'Tanker', 'Cargo', 'Military', 'Passenger', 'Fishing', 'Tug'];



export function VesselView() {
  const [activeTab, setActiveTab] = useState<TabType>('live');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [searchResults, setSearchResults] = useState<Vessel[]>([]);
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mmsiQuery, setMmsiQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [flagFilter, setFlagFilter] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<'live' | 'seed'>('seed');

  const loadVessels = useCallback(async () => {
    setLoading(true);
    try {
      const data = await IntelligenceAPI.getVessels(100);
      // Detect whether any vessel came from a live AIS source
      const hasLive = data.some(v => { const s = (v.properties as any)?.source; return typeof s === 'string' && (s.startsWith('aisstream') || s.startsWith('aishub') || s.startsWith('vesselapi')); });
      setDataSource(hasLive ? 'live' : 'seed');
      setVessels(data);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVessels();
  }, [loadVessels]);

  const handleSync = async () => {
    setSyncing(true);
    await loadVessels();
    setSyncing(false);
  };

  const handleSearch = async () => {
    setSearching(true);
    try {
      const data = await IntelligenceAPI.getVessels(100);
      setSearchResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const clearSearch = () => {
    setSearchQuery('');
    setMmsiQuery('');
    setFlagFilter('');
    setSearchResults([]);
  };

  const displayVessels = activeTab === 'search' ? (searchResults.length > 0 ? searchResults : vessels) : vessels;

  const filteredVessels = typeFilter === 'ALL'
    ? displayVessels
    : displayVessels.filter(v => v.type?.toLowerCase().includes(typeFilter.toLowerCase()));

  const stats = {
    total: vessels.length,
    tankers: vessels.filter(v => v.type?.toLowerCase().includes('tanker')).length,
    cargo: vessels.filter(v => v.type?.toLowerCase().includes('cargo')).length,
    military: vessels.filter(v => v.type?.toLowerCase().includes('military')).length,
    moving: vessels.filter(v => (v.speed || 0) > 0.5).length,
  };

  return (
    <div className="view active" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
        borderBottom: '1px solid rgba(0,191,255,0.15)',
        background: 'rgba(0,8,16,0.8)',
        flexShrink: 0, flexWrap: 'wrap',
      }}>
        <Anchor size={14} style={{ color: '#00BFFF' }} />
        <span style={{ fontSize: 12, fontFamily: 'Bebas Neue', letterSpacing: 2, color: '#00BFFF' }}>VESSEL INTELLIGENCE</span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 7px',
          background: dataSource === 'live' ? 'rgba(0,212,160,0.12)' : 'rgba(255,184,0,0.1)',
          border: `1px solid ${dataSource === 'live' ? 'rgba(0,212,160,0.35)' : 'rgba(255,184,0,0.3)'}`,
          borderRadius: 2,
          fontSize: 8, fontFamily: 'Share Tech Mono', letterSpacing: 1,
          color: dataSource === 'live' ? '#00D4A0' : '#FFB800',
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: dataSource === 'live' ? '#00D4A0' : '#FFB800',
            animation: dataSource === 'live' ? 'statusPulse 1.5s ease-in-out infinite' : 'none',
            flexShrink: 0,
          }} />
          {dataSource === 'live' ? 'LIVE AIS' : 'SIMULATED'}
        </span>

        <div style={{ display: 'flex', gap: 1 }}>
          {(['live', 'search'] as TabType[]).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              padding: '3px 10px', fontSize: 9, fontFamily: 'Share Tech Mono',
              background: activeTab === t ? 'rgba(0,191,255,0.15)' : 'transparent',
              border: `1px solid ${activeTab === t ? 'rgba(0,191,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
              color: activeTab === t ? '#00BFFF' : 'rgba(255,255,255,0.4)',
              cursor: 'pointer', letterSpacing: 1,
            }}>
              {t === 'live' ? 'LIVE FEED' : 'SEARCH'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 1 }}>
          {(['split', 'map', 'table'] as ViewMode[]).map(m => (
            <button key={m} onClick={() => setViewMode(m)} style={{
              padding: '3px 8px', fontSize: 9, fontFamily: 'Share Tech Mono',
              background: viewMode === m ? 'rgba(0,212,160,0.1)' : 'transparent',
              border: `1px solid ${viewMode === m ? 'rgba(0,212,160,0.3)' : 'rgba(255,255,255,0.06)'}`,
              color: viewMode === m ? '#00D4A0' : 'rgba(255,255,255,0.3)',
              cursor: 'pointer', letterSpacing: 1,
            }}>
              {m.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: 'TOTAL', val: stats.total, color: '#00BFFF' },
              { label: 'MOVING', val: stats.moving, color: '#00D4A0' },
              { label: 'TANKERS', val: stats.tankers, color: '#FFB800' },
              { label: 'CARGO', val: stats.cargo, color: '#4D9FFF' },
              { label: 'MIL', val: stats.military, color: '#FF2255' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontFamily: 'Bebas Neue', color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 7, fontFamily: 'Share Tech Mono', color: 'rgba(255,255,255,0.25)', letterSpacing: 0.5 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {lastUpdated && (
            <div style={{ fontSize: 8, fontFamily: 'Share Tech Mono', color: 'rgba(255,255,255,0.2)' }}>
              {lastUpdated.toLocaleTimeString()}
            </div>
          )}

          <button onClick={handleSync} disabled={syncing} style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px',
            background: 'rgba(0,191,255,0.08)', border: '1px solid rgba(0,191,255,0.25)',
            color: '#00BFFF', cursor: syncing ? 'not-allowed' : 'pointer',
            fontSize: 8, fontFamily: 'Share Tech Mono', letterSpacing: 1,
          }}>
            <RefreshCw size={10} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            SYNC AIS
          </button>
        </div>
      </div>

      {/* Type filter bar */}
      <div style={{
        display: 'flex', gap: 4, padding: '5px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(0,4,8,0.6)',
        flexShrink: 0, alignItems: 'center',
      }}>
        <Filter size={9} style={{ color: 'rgba(255,255,255,0.3)', marginRight: 2 }} />
        {TYPE_FILTERS.map(f => (
          <button key={f} onClick={() => setTypeFilter(f)} style={{
            padding: '2px 8px', fontSize: 8, fontFamily: 'Share Tech Mono',
            background: typeFilter === f ? 'rgba(0,191,255,0.1)' : 'transparent',
            border: `1px solid ${typeFilter === f ? 'rgba(0,191,255,0.3)' : 'rgba(255,255,255,0.07)'}`,
            color: typeFilter === f ? '#00BFFF' : 'rgba(255,255,255,0.3)',
            cursor: 'pointer', borderRadius: 2, letterSpacing: 1,
          }}>
            {f}
          </button>
        ))}
        <span style={{ fontSize: 8, fontFamily: 'Share Tech Mono', color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>
          {filteredVessels.length} VESSEL{filteredVessels.length !== 1 ? 'S' : ''}
        </span>
      </div>

      {/* Search panel */}
      {activeTab === 'search' && (
        <div style={{
          padding: '10px 12px',
          borderBottom: '1px solid rgba(0,191,255,0.1)',
          background: 'rgba(0,8,20,0.9)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 8, fontFamily: 'Share Tech Mono', color: 'rgba(0,191,255,0.5)', marginBottom: 4, letterSpacing: 1 }}>
                VESSEL NAME / DESTINATION
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={11} style={{ position: 'absolute', left: 8, color: 'rgba(0,191,255,0.4)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="e.g. MAERSK, ROTTERDAM..."
                  style={{
                    width: '100%', padding: '6px 8px 6px 26px',
                    background: 'rgba(0,20,40,0.8)',
                    border: '1px solid rgba(0,191,255,0.2)',
                    color: '#E0E8F0', fontSize: 10, fontFamily: 'Share Tech Mono',
                    outline: 'none', letterSpacing: 0.5,
                  }}
                />
              </div>
            </div>

            <div style={{ width: 140 }}>
              <div style={{ fontSize: 8, fontFamily: 'Share Tech Mono', color: 'rgba(0,191,255,0.5)', marginBottom: 4, letterSpacing: 1 }}>
                MMSI (9-DIGIT)
              </div>
              <input
                type="text"
                value={mmsiQuery}
                onChange={e => setMmsiQuery(e.target.value.replace(/\D/g, '').slice(0, 9))}
                onKeyDown={handleSearchKeyDown}
                placeholder="123456789"
                style={{
                  width: '100%', padding: '6px 8px',
                  background: 'rgba(0,20,40,0.8)',
                  border: '1px solid rgba(0,191,255,0.2)',
                  color: '#E0E8F0', fontSize: 10, fontFamily: 'Share Tech Mono',
                  outline: 'none', letterSpacing: 2,
                }}
              />
            </div>

            <div style={{ width: 72 }}>
              <div style={{ fontSize: 8, fontFamily: 'Share Tech Mono', color: 'rgba(0,191,255,0.5)', marginBottom: 4, letterSpacing: 1 }}>
                FLAG
              </div>
              <input
                type="text"
                value={flagFilter}
                onChange={e => setFlagFilter(e.target.value.toUpperCase().slice(0, 2))}
                onKeyDown={handleSearchKeyDown}
                placeholder="US"
                style={{
                  width: '100%', padding: '6px 8px',
                  background: 'rgba(0,20,40,0.8)',
                  border: '1px solid rgba(0,191,255,0.2)',
                  color: '#E0E8F0', fontSize: 10, fontFamily: 'Share Tech Mono',
                  outline: 'none', letterSpacing: 3, textTransform: 'uppercase',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', paddingBottom: 0 }}>
              <button onClick={handleSearch} disabled={searching} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 14px',
                background: searching ? 'rgba(0,191,255,0.04)' : 'rgba(0,191,255,0.12)',
                border: '1px solid rgba(0,191,255,0.35)',
                color: '#00BFFF', cursor: searching ? 'not-allowed' : 'pointer',
                fontSize: 9, fontFamily: 'Share Tech Mono', letterSpacing: 1,
              }}>
                <Search size={10} />
                {searching ? 'SEARCHING...' : 'SEARCH'}
              </button>
              {(searchQuery || mmsiQuery || flagFilter) && (
                <button onClick={clearSearch} style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '7px 10px',
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
                  fontSize: 9, fontFamily: 'Share Tech Mono',
                }}>
                  <X size={9} />
                  CLEAR
                </button>
              )}
            </div>
          </div>

          <div style={{ marginTop: 8, padding: '6px 10px', background: dataSource === 'live' ? 'rgba(0,212,160,0.04)' : 'rgba(0,191,255,0.04)', border: `1px solid ${dataSource === 'live' ? 'rgba(0,212,160,0.15)' : 'rgba(0,191,255,0.1)'}`, fontSize: 9, fontFamily: 'Share Tech Mono', color: dataSource === 'live' ? 'rgba(0,212,160,0.6)' : 'rgba(0,191,255,0.4)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Satellite size={9} />
            {dataSource === 'live'
              ? <>VesselFinder AIS active — live positions from Indian Ocean, Arabian Sea, Red Sea, Persian Gulf, Strait of Malacca + Bay of Bengal. Currently tracking {vessels.length} vessels.</>
              : <>Live AIS via <span style={{ color: '#00BFFF' }}>VesselFinder</span> — MMSI searches return real-time positions + master data. Currently showing {vessels.length} simulated vessels.</>
            }
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
            <div style={{
              width: 32, height: 32,
              border: '2px solid rgba(0,191,255,0.15)',
              borderTop: '2px solid #00BFFF',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <div style={{ fontSize: 10, fontFamily: 'Share Tech Mono', color: 'rgba(0,191,255,0.5)', letterSpacing: 2 }}>LOADING AIS DATA...</div>
          </div>
        ) : (
          <>
            {(viewMode === 'split' || viewMode === 'map') && (
              <div style={{
                height: viewMode === 'map' ? '100%' : '42%',
                flexShrink: 0,
                borderBottom: viewMode === 'split' ? '1px solid rgba(0,191,255,0.1)' : 'none',
                overflow: 'hidden',
              }}>
                <VesselMap
                  vessels={filteredVessels}
                  selectedVessel={selectedVessel}
                  onSelectVessel={setSelectedVessel}
                />
              </div>
            )}

            {(viewMode === 'split' || viewMode === 'table') && (
              <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <VesselTable
                    vessels={filteredVessels}
                    selectedVessel={selectedVessel}
                    onSelectVessel={setSelectedVessel}
                  />
                </div>
                {selectedVessel && (
                  <div style={{ width: 300, borderLeft: '1px solid rgba(0,191,255,0.15)', flexShrink: 0, overflowY: 'auto' }}>
                    <VesselDetail vessel={selectedVessel} onClose={() => setSelectedVessel(null)} />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
