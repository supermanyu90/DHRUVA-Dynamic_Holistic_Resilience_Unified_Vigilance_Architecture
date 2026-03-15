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

function Row({ label, value, color }: { label: string; value: string | number | undefined | null; color?: string }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, fontFamily: 'Share Tech Mono' }}>{label}</span>
      <span style={{ color: color || '#E0E8F0', fontSize: 10, fontFamily: 'Share Tech Mono', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export function VesselDetail({ vessel, onClose }: VesselDetailProps) {
  const typeColor = getTypeColor(vessel.type);
  const speedStatus = vessel.speed > 15 ? 'HIGH SPEED' : vessel.speed > 0.5 ? 'UNDERWAY' : 'MOORED';
  const speedColor = vessel.speed > 15 ? '#FF4500' : vessel.speed > 0.5 ? '#00D4A0' : '#FFB800';

  const compassDir = (deg: number) => {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
  };

  return (
    <div style={{
      background: 'rgba(0,8,16,0.97)',
      border: `1px solid ${typeColor}40`,
      borderTop: `2px solid ${typeColor}`,
      padding: 16,
      fontFamily: 'Share Tech Mono',
      position: 'relative',
    }}>
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 10, right: 10,
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
          cursor: 'pointer', fontSize: 14, lineHeight: 1,
        }}
      >
        ×
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, background: `${typeColor}15`,
          border: `1px solid ${typeColor}50`, borderRadius: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>
          {FLAG_EMOJI[vessel.flag] || '🚢'}
        </div>
        <div>
          <div style={{ fontSize: 14, color: '#fff', fontWeight: 600, letterSpacing: 1 }}>{vessel.name || 'UNKNOWN VESSEL'}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <span style={{ padding: '1px 6px', background: `${typeColor}20`, color: typeColor, fontSize: 8, border: `1px solid ${typeColor}40`, borderRadius: 2 }}>
              {vessel.type?.toUpperCase() || 'UNKNOWN'}
            </span>
            <span style={{ padding: '1px 6px', background: `${speedColor}15`, color: speedColor, fontSize: 8, border: `1px solid ${speedColor}30`, borderRadius: 2 }}>
              {speedStatus}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <div>
          <Row label="MMSI" value={vessel.mmsi} color="rgba(160,200,255,0.7)" />
          <Row label="FLAG" value={vessel.flag || '—'} />
          <Row label="SPEED" value={`${vessel.speed?.toFixed(1) || '0.0'} kn`} color={speedColor} />
          <Row label="COURSE" value={`${vessel.course?.toFixed(0) || '—'}° ${compassDir(vessel.course || 0)}`} />
          <Row label="HEADING" value={`${vessel.heading?.toFixed(0) || vessel.course?.toFixed(0) || '—'}°`} />
        </div>
        <div>
          <Row label="DESTINATION" value={vessel.destination || 'UNKNOWN'} color="#00BFFF" />
          <Row label="LATITUDE" value={vessel.latitude?.toFixed(4) || '—'} />
          <Row label="LONGITUDE" value={vessel.longitude?.toFixed(4) || '—'} />
          <Row label="LAST UPDATE" value={vessel.last_position_time ? new Date(vessel.last_position_time).toLocaleString() : '—'} />
          <Row label="SOURCE" value={(vessel.properties?.source || 'AIS').toUpperCase()} color="rgba(255,255,255,0.3)" />
        </div>
      </div>

      <div style={{ marginTop: 10, padding: '6px 8px', background: 'rgba(0,191,255,0.05)', border: '1px solid rgba(0,191,255,0.12)', borderRadius: 3 }}>
        <div style={{ fontSize: 8, color: 'rgba(0,191,255,0.5)', marginBottom: 3 }}>AIS DATA SOURCE</div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
          Position data via aisstream.io (free tier) or AIS simulation seed.
          Register at <span style={{ color: '#00BFFF' }}>aisstream.io</span> for live global AIS feed.
        </div>
      </div>
    </div>
  );
}
