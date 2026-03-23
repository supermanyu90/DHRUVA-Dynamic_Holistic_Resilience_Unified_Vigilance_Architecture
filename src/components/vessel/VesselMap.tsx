import { useRef } from 'react';
import { Vessel } from '../../lib/intelligence-api';

interface VesselMapProps {
  vessels: Vessel[];
  selectedVessel: Vessel | null;
  onSelectVessel: (vessel: Vessel) => void;
}

const TYPE_COLORS: Record<string, string> = {
  Tanker: '#FFB800',
  Cargo: '#00BFFF',
  Military: '#FF2255',
  Passenger: '#00D4A0',
  Fishing: '#7CFC00',
  Tug: '#FF6B00',
  Sailing: '#A0C8FF',
  'High-Speed': '#FF69B4',
  'Search and Rescue': '#FF4500',
};

function getTypeColor(type: string): string {
  for (const [key, color] of Object.entries(TYPE_COLORS)) {
    if (type?.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return '#8899AA';
}

function lonToX(lon: number, w: number): number {
  return ((lon + 180) / 360) * w;
}

function latToY(lat: number, h: number): number {
  return ((90 - lat) / 180) * h;
}

export function VesselMap({ vessels, selectedVessel, onSelectVessel }: VesselMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 900;
  const H = 450;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--bg)', overflow: 'hidden' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: '100%' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="vm-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect width={W} height={H} fill="rgba(0,10,20,0.95)" />

        {/* Grid lines */}
        {[-60, -30, 0, 30, 60].map(lat => (
          <line key={`lat-${lat}`}
            x1={0} y1={latToY(lat, H)} x2={W} y2={latToY(lat, H)}
            stroke="rgba(0,212,160,0.06)" strokeWidth="0.5"
          />
        ))}
        {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map(lon => (
          <line key={`lon-${lon}`}
            x1={lonToX(lon, W)} y1={0} x2={lonToX(lon, W)} y2={H}
            stroke="rgba(0,212,160,0.06)" strokeWidth="0.5"
          />
        ))}

        {/* Equator */}
        <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="rgba(0,212,160,0.12)" strokeWidth="0.8" />

        {/* Vessels */}
        {vessels.map((v) => {
          if (!v.latitude || !v.longitude) return null;
          const x = lonToX(v.longitude, W);
          const y = latToY(v.latitude, H);
          const color = getTypeColor(v.type);
          const isSelected = selectedVessel?.id === v.id;
          const courseRad = ((v.course || 0) * Math.PI) / 180;
          const sz = isSelected ? 6 : 3.5;
          const tipX = x + Math.sin(courseRad) * sz * 1.4;
          const tipY = y - Math.cos(courseRad) * sz * 1.4;
          const leftX = x + Math.sin(courseRad - 2.2) * sz * 0.9;
          const leftY = y - Math.cos(courseRad - 2.2) * sz * 0.9;
          const rightX = x + Math.sin(courseRad + 2.2) * sz * 0.9;
          const rightY = y - Math.cos(courseRad + 2.2) * sz * 0.9;

          return (
            <g
              key={v.id}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelectVessel(v)}
            >
              {isSelected && (
                <circle cx={x} cy={y} r={12} fill="none" stroke={color} strokeWidth="0.8" opacity="0.5" strokeDasharray="3,2" />
              )}
              <polygon
                points={`${tipX},${tipY} ${leftX},${leftY} ${x},${y + sz * 0.4} ${rightX},${rightY}`}
                fill={color}
                opacity={isSelected ? 1 : 0.8}
                filter="url(#vm-glow)"
                stroke={isSelected ? '#fff' : 'none'}
                strokeWidth="0.5"
              />
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 8, left: 8,
        display: 'flex', gap: 8, flexWrap: 'wrap',
      }}>
        {[['Tanker', '#FFB800'], ['Cargo', '#00BFFF'], ['Military', '#FF2255'], ['Passenger', '#00D4A0'], ['Other', '#8899AA']].map(([label, color]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 8, fontFamily: 'Share Tech Mono', color: color as string, opacity: 0.8 }}>
            <span style={{ width: 6, height: 6, background: color as string, display: 'inline-block', borderRadius: 1 }} />
            {label}
          </div>
        ))}
      </div>

      <div style={{ position: 'absolute', top: 6, right: 8, fontSize: 8, fontFamily: 'Share Tech Mono', color: 'rgba(0,212,160,0.4)' }}>
        {vessels.length} VESSELS TRACKED
      </div>
    </div>
  );
}
