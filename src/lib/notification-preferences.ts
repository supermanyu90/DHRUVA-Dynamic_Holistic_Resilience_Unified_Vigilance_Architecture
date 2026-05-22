export interface NotificationPreferences {
  id?: string;
  session_id: string;
  min_severity: 'low' | 'moderate' | 'high';
  event_types: string[];
  location_filter: string[];
  urgency_filter: string[];
}

const SEVERITY_RANK: Record<string, number> = { low: 1, moderate: 2, high: 3 };

export const DEFAULT_PREFS: Omit<NotificationPreferences, 'session_id'> = {
  min_severity: 'high',
  event_types: [],
  location_filter: [],
  urgency_filter: ['immediate'],
};

function getSessionId(): string {
  try {
    let id = localStorage.getItem('dhruva-session-id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('dhruva-session-id', id);
    }
    return id;
  } catch {
    return 'anonymous';
  }
}

export const SESSION_ID = getSessionId();

const PREFS_KEY = 'dhruva:notification-prefs';

export async function loadPreferences(): Promise<NotificationPreferences> {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_PREFS, session_id: SESSION_ID, ...parsed };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_PREFS, session_id: SESSION_ID };
}

export async function savePreferences(prefs: Omit<NotificationPreferences, 'session_id'>): Promise<void> {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch { /* ignore */ }
}

export function matchesPreferences(
  alert: { severity: string; urgency: string; event_type: string; country: string; state: string; district: string },
  prefs: NotificationPreferences,
): boolean {
  const alertRank = SEVERITY_RANK[alert.severity] ?? 0;
  const minRank   = SEVERITY_RANK[prefs.min_severity] ?? 3;
  if (alertRank < minRank) return false;

  if (prefs.urgency_filter.length > 0 && !prefs.urgency_filter.includes(alert.urgency)) return false;

  if (prefs.event_types.length > 0 && !prefs.event_types.includes(alert.event_type)) return false;

  if (prefs.location_filter.length > 0) {
    const alertLocs = [alert.country, alert.state, alert.district]
      .filter(Boolean)
      .map(l => l.toLowerCase());
    const filterLocs = prefs.location_filter.map(l => l.toLowerCase());
    const matches = filterLocs.some(f => alertLocs.some(a => a.includes(f) || f.includes(a)));
    if (!matches) return false;
  }

  return true;
}
