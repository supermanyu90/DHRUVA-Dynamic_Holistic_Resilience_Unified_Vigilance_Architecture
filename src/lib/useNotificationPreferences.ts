import { useCallback, useEffect, useState } from 'react';
import {
  NotificationPreferences,
  DEFAULT_PREFS,
  SESSION_ID,
  loadPreferences,
  savePreferences,
} from './notification-preferences';

export type { NotificationPreferences };

export function useNotificationPreferences() {
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    ...DEFAULT_PREFS,
    session_id: SESSION_ID,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences().then(p => {
      setPrefs(p);
      setLoading(false);
    });
  }, []);

  const update = useCallback(async (patch: Partial<Omit<NotificationPreferences, 'session_id'>>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    await savePreferences({
      min_severity: next.min_severity,
      event_types: next.event_types,
      location_filter: next.location_filter,
      urgency_filter: next.urgency_filter,
    });
  }, [prefs]);

  return { prefs, loading, update };
}
