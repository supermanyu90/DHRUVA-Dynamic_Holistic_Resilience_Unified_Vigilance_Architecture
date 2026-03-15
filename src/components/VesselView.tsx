import { Anchor } from 'lucide-react';

export function VesselView() {
  return (
    <div className="view active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
      <Anchor size={48} style={{ color: 'var(--dim)', opacity: 0.5 }} />
      <div style={{ color: 'var(--dim)', fontSize: '16px', letterSpacing: '2px', fontFamily: "'Bebas Neue', sans-serif" }}>VESSEL INTELLIGENCE</div>
      <div style={{ color: 'var(--dim)', fontSize: '11px', letterSpacing: '1px', fontFamily: "'Share Tech Mono', monospace", opacity: 0.7 }}>
        Maritime tracking and vessel intelligence coming soon
      </div>
    </div>
  );
}
