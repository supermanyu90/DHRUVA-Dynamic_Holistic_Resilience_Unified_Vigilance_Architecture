import { useRef, useEffect, useState } from 'react';
import type { TimelineEvent } from './types';

const TYPE_COLORS: Record<string, string> = {
  quake: '#4d9fff',
  disaster: '#ff6b00',
  volcano: '#ff3d6b',
  news: '#00bfff',
  geo: '#ff2255',
  vessel: '#00d4a0',
};

interface Bucket {
  start: number;
  end: number;
  counts: Record<string, number>;
  total: number;
}

interface Props {
  events: TimelineEvent[];
  rangeMs: number;
  now: number;
}

export function TimelineChart({ events, rangeMs, now }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<{ bucket: Bucket; x: number; y: number } | null>(null);

  const BUCKET_COUNT = 48;

  const buildBuckets = (): Bucket[] => {
    const start = now - rangeMs;
    const bucketMs = rangeMs / BUCKET_COUNT;
    const buckets: Bucket[] = Array.from({ length: BUCKET_COUNT }, (_, i) => ({
      start: start + i * bucketMs,
      end: start + (i + 1) * bucketMs,
      counts: {},
      total: 0,
    }));

    for (const ev of events) {
      const ts = new Date(ev.timestamp).getTime();
      if (ts < start || ts > now) continue;
      const idx = Math.min(Math.floor((ts - start) / bucketMs), BUCKET_COUNT - 1);
      buckets[idx].counts[ev.type] = (buckets[idx].counts[ev.type] || 0) + 1;
      buckets[idx].total++;
    }

    return buckets;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const W = container.clientWidth;
    const H = container.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const PAD_L = 48;
    const PAD_R = 16;
    const PAD_T = 16;
    const PAD_B = 40;
    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;

    ctx.clearRect(0, 0, W, H);

    const buckets = buildBuckets();
    const maxTotal = Math.max(...buckets.map((b) => b.total), 1);

    const gridLines = 4;
    ctx.strokeStyle = 'rgba(0, 212, 160, 0.08)';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(139,175,200,0.4)';
    ctx.font = '10px "Share Tech Mono", monospace';
    ctx.textAlign = 'right';

    for (let i = 0; i <= gridLines; i++) {
      const y = PAD_T + chartH - (i / gridLines) * chartH;
      ctx.beginPath();
      ctx.moveTo(PAD_L, y);
      ctx.lineTo(PAD_L + chartW, y);
      ctx.stroke();
      const val = Math.round((i / gridLines) * maxTotal);
      ctx.fillText(String(val), PAD_L - 6, y + 3);
    }

    const barW = chartW / BUCKET_COUNT - 1;

    buckets.forEach((bucket, i) => {
      const x = PAD_L + i * (chartW / BUCKET_COUNT);
      let stackY = PAD_T + chartH;

      const types = Object.keys(bucket.counts);
      for (const type of types) {
        const count = bucket.counts[type];
        const barH = (count / maxTotal) * chartH;
        const color = TYPE_COLORS[type] || '#8bafc8';
        ctx.fillStyle = color + 'cc';
        ctx.fillRect(x + 0.5, stackY - barH, barW, barH);
        stackY -= barH;
      }
    });

    const timeLabels = 6;
    ctx.fillStyle = 'rgba(139,175,200,0.6)';
    ctx.font = '9px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';

    for (let i = 0; i <= timeLabels; i++) {
      const ts = now - rangeMs + (i / timeLabels) * rangeMs;
      const x = PAD_L + (i / timeLabels) * chartW;
      const d = new Date(ts);
      let label = '';
      if (rangeMs <= 24 * 3600 * 1000) {
        label = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      } else {
        label = `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
      }
      ctx.fillText(label, x, PAD_T + chartH + 18);
    }

    ctx.strokeStyle = 'rgba(0, 212, 160, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD_L, PAD_T);
    ctx.lineTo(PAD_L, PAD_T + chartH);
    ctx.lineTo(PAD_L + chartW, PAD_T + chartH);
    ctx.stroke();
  }, [events, rangeMs, now]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const PAD_L = 48;
    const PAD_R = 16;
    const W = rect.width;
    const chartW = W - PAD_L - PAD_R;
    const relX = x - PAD_L;
    if (relX < 0 || relX > chartW) {
      setHovered(null);
      return;
    }
    const idx = Math.min(Math.floor((relX / chartW) * BUCKET_COUNT), BUCKET_COUNT - 1);
    const allBuckets = buildBuckets();
    setHovered({ bucket: allBuckets[idx], x: e.clientX, y: e.clientY });
  };

  const buckets = buildBuckets();

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
      />
      {hovered && hovered.bucket.total > 0 && (
        <div
          style={{
            position: 'fixed',
            left: hovered.x + 12,
            top: hovered.y - 10,
            background: 'rgba(4,10,20,0.97)',
            border: '1px solid rgba(0,212,160,0.3)',
            padding: '8px 12px',
            fontSize: 11,
            fontFamily: '"Share Tech Mono", monospace',
            color: '#e8f0f8',
            pointerEvents: 'none',
            zIndex: 1000,
            minWidth: 140,
          }}
        >
          <div style={{ color: '#00d4a0', marginBottom: 4 }}>
            {new Date(hovered.bucket.start).toLocaleString()}
          </div>
          <div style={{ color: '#8bafc8', marginBottom: 6 }}>EVENTS: {hovered.bucket.total}</div>
          {Object.entries(hovered.bucket.counts).map(([type, count]) => (
            <div key={type} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_COLORS[type] || '#8bafc8', display: 'inline-block' }} />
              <span style={{ color: TYPE_COLORS[type] || '#8bafc8', textTransform: 'uppercase', fontSize: 10 }}>{type}</span>
              <span style={{ marginLeft: 'auto' }}>{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
