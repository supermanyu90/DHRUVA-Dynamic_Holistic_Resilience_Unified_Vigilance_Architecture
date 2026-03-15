import { Vessel } from '../../lib/intelligence-api';

interface VesselDetailProps {
  vessel: Vessel;
  onClose: () => void;
}

const FLAG_EMOJI: Record<string, string> = {
  US: '🇺🇸', GB: '🇬🇧', CN: '🇨🇳', JP: '🇯🇵', KR: '🇰🇷', DE: '🇩🇪',
  RU: '🇷🇺', FR: '🇫🇷', NO: '🇳🇴', GR: '🇬🇷', MT: '🇲🇹', LR: '🇱🇷',
  PA: '🇵🇦', MH: '🇲🇭', SG: '🇸🇬', TW: '🇹🇼', AU: '🇦🇺', NZ: '🇳🇿',
  BR: '🇧🇷', IN: '🇮🇳', IT: '🇮🇹', NL: '🇳🇱', BH: '🇧🇭', KY: '🇰🇾',
  CY: '🇨🇾', AG: '🇦🇬', EC: '🇪🇨', TT: '🇹🇹', KE: '🇰🇪',
};

const TYPE_COLOR: Record<string, string> = {
  Tanker: '#FFB800', Cargo: '#00BFFF', Military: '#FF2255',
  Passenger: '#00D4A0', Fishing: '#7CFC00', Tug: '#FF6B00',
};

function getTypeColor(type: string): string {
  for (const [key, color] of Object.entries(TYPE_COLOR)) {
    if (type?.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return '#8899AA';
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: 8, fontFamily: 'Share Tech Mono', color: 'rgba(0,191,255,0.4)',
      letterSpacing: 1.5, marginTop: 10, marginBottom: 4,
      borderBottom: '1px solid rgba(0,191,255,0.1)', paddingBottom: 3,
    }}>
      {children}
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string | number | undefined | null; color?: string }) {
  if (value === undefined || value === null || value === '' || value === 0) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ color: 'rgba(255,255,255,0.32)', fontSize: 9, fontFamily: 'Share Tech Mono' }}>{label}</span>
      <span style={{ color: color || '#E0E8F0', fontSize: 9, fontFamily: 'Share Tech Mono', fontWeight: 500, maxWidth: 140, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

export function VesselDetail({ vessel, onClose }: VesselDetailProps) {
  const typeColor = getTypeColor(vessel.type);
  const speedStatus = vessel.speed > 15 ? 'HIGH SPEED' : vessel.speed > 0.5 ? 'UNDERWAY' : 'MOORED';
  const speedColor = vessel.speed > 15 ? '#FF4500' : vessel.speed > 0.5 ? '#00D4A0' : '#FFB800';
  const props = vessel.properties || {};
  const isLive = props.source === 'vesselfinder' || props.source === 'vesselfinder-live';

  const compassDir = (deg: number) => {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
  };

  return (
    <div style={{
      background: 'rgba(0,8,16,0.97)',
      borderTop: `2px solid ${typeColor}`,
      padding: 14,
      fontFamily: 'Share Tech Mono',
      position: 'relative',
    }}>
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 10, right: 10,
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
          cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px',
        }}
      >
        ×
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 38, height: 38, background: `${typeColor}15`,
          border: `1px solid ${typeColor}40`, borderRadius: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
        }}>
          {FLAG_EMOJI[vessel.flag] || '🚢'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: '#fff', fontWeight: 600, letterSpacing: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {vessel.name || 'UNKNOWN VESSEL'}
          </div>
          <div style={{ display: 'flex', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ padding: '1px 5px', background: `${typeColor}20`, color: typeColor, fontSize: 7, border: `1px solid ${typeColor}35`, borderRadius: 2 }}>
              {vessel.type?.toUpperCase() || 'UNKNOWN'}
            </span>
            <span style={{ padding: '1px 5px', background: `${speedColor}12`, color: speedColor, fontSize: 7, border: `1px solid ${speedColor}25`, borderRadius: 2 }}>
              {speedStatus}
            </span>
            {isLive && (
              <span style={{ padding: '1px 5px', background: 'rgba(0,212,160,0.1)', color: '#00D4A0', fontSize: 7, border: '1px solid rgba(0,212,160,0.25)', borderRadius: 2 }}>
                LIVE
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Identity */}
      <SectionLabel>IDENTITY</SectionLabel>
      <Row label="MMSI" value={vessel.mmsi} color="rgba(160,200,255,0.8)" />
      <Row label="IMO" value={props.imo ? String(props.imo) : undefined} color="rgba(160,200,255,0.6)" />
      <Row label="CALLSIGN" value={props.callsign} color="rgba(160,200,255,0.6)" />
      <Row label="FLAG" value={vessel.flag} />

      {/* Position */}
      <SectionLabel>POSITION</SectionLabel>
      <Row label="LATITUDE" value={vessel.latitude?.toFixed(5)} />
      <Row label="LONGITUDE" value={vessel.longitude?.toFixed(5)} />
      <Row label="SPEED" value={`${vessel.speed?.toFixed(1) ?? '0.0'} kn`} color={speedColor} />
      <Row label="COURSE" value={`${vessel.course?.toFixed(0) ?? '—'}° ${compassDir(vessel.course || 0)}`} />
      <Row label="HEADING" value={`${(vessel.heading ?? vessel.course)?.toFixed(0) ?? '—'}°`} />
      <Row label="DRAUGHT" value={props.draught ? `${props.draught} m` : undefined} />
      <Row label="ZONE" value={props.zone} />
      <Row label="LAST FIX" value={vessel.last_position_time ? new Date(vessel.last_position_time).toLocaleString() : undefined} />

      {/* Voyage */}
      <SectionLabel>VOYAGE</SectionLabel>
      <Row label="DESTINATION" value={vessel.destination || '—'} color="#00BFFF" />
      <Row label="PORT LOCODE" value={props.locode} color="rgba(0,191,255,0.6)" />
      <Row label="ETA (AIS)" value={props.eta} />

      {/* Master data (VesselFinder only) */}
      {(props.length || props.beam || props.gt || props.dwt || props.year_built) && (
        <>
          <SectionLabel>VESSEL SPECS</SectionLabel>
          <Row label="LENGTH" value={props.length ? `${props.length} m` : undefined} />
          <Row label="BEAM" value={props.beam ? `${props.beam} m` : undefined} />
          <Row label="GROSS TONNAGE" value={props.gt ? `${Number(props.gt).toLocaleString()} GT` : undefined} />
          <Row label="DEADWEIGHT" value={props.dwt ? `${Number(props.dwt).toLocaleString()} DWT` : undefined} />
          <Row label="YEAR BUILT" value={props.year_built ? String(props.year_built) : undefined} />
        </>
      )}

      {/* Source badge */}
      <div style={{
        marginTop: 12, padding: '5px 8px',
        background: isLive ? 'rgba(0,212,160,0.05)' : 'rgba(0,191,255,0.04)',
        border: `1px solid ${isLive ? 'rgba(0,212,160,0.15)' : 'rgba(0,191,255,0.1)'}`,
        borderRadius: 2,
      }}>
        <div style={{ fontSize: 7, color: isLive ? 'rgba(0,212,160,0.5)' : 'rgba(0,191,255,0.4)', marginBottom: 2, letterSpacing: 1 }}>
          DATA SOURCE
        </div>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>
          {isLive
            ? 'Live AIS position via VesselFinder API with master data.'
            : 'Simulated position data. Add VESSEL_API_KEY for live VesselFinder AIS.'}
        </div>
      </div>
    </div>
  );
}
