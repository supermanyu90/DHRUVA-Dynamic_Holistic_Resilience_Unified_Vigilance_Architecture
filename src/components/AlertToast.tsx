import { useEffect, useRef, useState } from 'react';
import { X, AlertTriangle, Layers } from 'lucide-react';
import type { AppNotification } from '../lib/useAlertNotifier';

interface AlertToastProps {
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
}

const SEVERITY_COLORS: Record<string, { bar: string; bg: string; badge: string }> = {
  high:     { bar: '#EF4444', bg: 'rgba(239,68,68,0.08)',  badge: '#EF4444' },
  moderate: { bar: '#F59E0B', bg: 'rgba(245,158,11,0.08)', badge: '#F59E0B' },
  low:      { bar: '#3B82F6', bg: 'rgba(59,130,246,0.08)', badge: '#3B82F6' },
};

function ToastItem({ n, onDismiss }: { n: AppNotification; onDismiss: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => onDismiss(n.id), 280);
  };

  useEffect(() => {
    timerRef.current = setTimeout(dismiss, 7000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const colors = SEVERITY_COLORS[n.severity] ?? SEVERITY_COLORS.low;
  const isAgg  = n.count > 1;

  return (
    <div
      className="alert-toast-item"
      style={{
        background: `linear-gradient(135deg, ${colors.bg}, rgba(10,18,28,0.95))`,
        borderLeft: `3px solid ${colors.bar}`,
        animation: exiting ? 'toastOut 0.28s ease forwards' : 'toastIn 0.3s ease',
      }}
    >
      {/* progress bar */}
      <div className="alert-toast-progress" style={{ background: colors.bar }} />

      <div className="alert-toast-inner">
        <div className="alert-toast-icon" style={{ color: colors.bar }}>
          {isAgg ? <Layers size={16} /> : <AlertTriangle size={16} />}
        </div>

        <div className="alert-toast-body">
          <div className="alert-toast-title">
            <span className="alert-toast-badge" style={{ background: colors.badge }}>
              {n.severity.toUpperCase()}
            </span>
            <span>{n.title}</span>
            {isAgg && (
              <span className="alert-toast-count">{n.count}</span>
            )}
          </div>
          <div className="alert-toast-message">{n.message}</div>
          <div className="alert-toast-meta">
            {n.eventType.replace(/_/g, ' ')}
            {isAgg && ` · ${n.count} alerts`}
          </div>
        </div>

        <button className="alert-toast-close" onClick={dismiss} aria-label="Dismiss">
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

export function AlertToast({ notifications, onDismiss }: AlertToastProps) {
  return (
    <div className="alert-toast-stack" aria-live="polite">
      {notifications.map(n => (
        <ToastItem key={n.id} n={n} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
