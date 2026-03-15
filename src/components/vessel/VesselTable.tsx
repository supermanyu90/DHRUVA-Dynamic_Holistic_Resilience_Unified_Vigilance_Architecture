import { Vessel } from '../../lib/intelligence-api';

interface VesselTableProps {
  vessels: Vessel[];
  selectedVessel: Vessel | null;
  onSelectVessel: (vessel: Vessel) => void;
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

function formatTime(ts: string): string {
  if (!ts) return '—';
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60000) return 'JUST NOW';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m AGO`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h AGO`;
  return d.toLocaleDateString();
}

export function VesselTable({ vessels, selectedVessel, onSelectVessel }: VesselTableProps) {
  return (
    <div style={{ height: '100%', overflowY: 'auto', fontFamily: 'Share Tech Mono' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
        <thead>
          <tr style={{ background: 'rgba(0,212,160,0.06)', position: 'sticky', top: 0, zIndex: 1 }}>
            {['FLAG', 'VESSEL NAME', 'MMSI', 'TYPE', 'SPD (kn)', 'HDG', 'DESTINATION', 'POSITION', 'UPDATED'].map(h => (
              <th key={h} style={{
                padding: '5px 8px', textAlign: 'left',
                color: 'rgba(0,212,160,0.6)', fontWeight: 400,
                borderBottom: '1px solid rgba(0,212,160,0.12)',
                whiteSpace: 'nowrap', fontSize: 9,
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vessels.map((v) => {
            const isSelected = selectedVessel?.id === v.id;
            const typeColor = getTypeColor(v.type);
            return (
              <tr
                key={v.id}
                onClick={() => onSelectVessel(v)}
                style={{
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(0,191,255,0.08)' : 'transparent',
                  borderLeft: isSelected ? '2px solid #00BFFF' : '2px solid transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                }}
                onMouseLeave={e => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <td style={{ padding: '4px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 13 }}>{FLAG_EMOJI[v.flag] || '🏳️'}</span>
                </td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: isSelected ? '#00BFFF' : '#E0E8F0', fontWeight: isSelected ? 600 : 400 }}>
                  {v.name || '—'}
                </td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'rgba(160,200,255,0.6)', fontSize: 9 }}>
                  {v.mmsi}
                </td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{
                    padding: '1px 5px', borderRadius: 2,
                    background: `${typeColor}18`, color: typeColor,
                    fontSize: 8, border: `1px solid ${typeColor}40`,
                  }}>
                    {v.type || 'UNKNOWN'}
                  </span>
                </td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: v.speed > 15 ? '#FF4500' : v.speed > 0 ? '#00D4A0' : 'rgba(255,255,255,0.3)' }}>
                  {v.speed?.toFixed(1) || '0.0'}
                </td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }}>
                  {v.course?.toFixed(0) || '—'}°
                </td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {v.destination || '—'}
                </td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'rgba(160,200,255,0.5)', fontSize: 9 }}>
                  {v.latitude?.toFixed(2) || '—'}, {v.longitude?.toFixed(2) || '—'}
                </td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)', fontSize: 9 }}>
                  {formatTime(v.last_position_time)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {vessels.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 11, fontFamily: 'Share Tech Mono' }}>
          NO VESSELS FOUND
        </div>
      )}
    </div>
  );
}
