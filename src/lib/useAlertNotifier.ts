/**
 * useAlertNotifier
 *
 * Subscribes to unified_alerts INSERT events from Supabase Realtime and
 * applies the full notification throttling pipeline:
 *
 *   1. Active-status gate  — alert must not be expired
 *   2. Severity gate        — severity must be >= prefs.min_severity
 *   3. Urgency gate         — urgency must be in prefs.urgency_filter
 *   4. Event-type filter    — prefs.event_types whitelist (empty = all)
 *   5. Location filter      — prefs.location_filter whitelist (empty = all)
 *   6. Region cooldown      — max 1 notification per region per 15 min.
 *                             Pending alerts within the window are buffered
 *                             and flushed as an aggregated notification when
 *                             the cooldown expires.
 */

import { useCallback, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { UnifiedAlert } from './intelligence-api';
import { NotificationPreferences, matchesPreferences } from './notification-preferences';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  severity: 'high' | 'moderate' | 'low';
  eventType: string;
  regionKey: string;
  count: number;         // 1 = single alert; >1 = aggregated
  alertIds: string[];
}

const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

function regionKey(alert: UnifiedAlert): string {
  const parts = [
    alert.country || '',
    alert.state   || '',
    alert.district || '',
  ].map(s => s.trim().toLowerCase()).filter(Boolean);
  return parts.join(':') || 'global';
}

function regionLabel(alert: UnifiedAlert): string {
  const parts = [alert.district, alert.state, alert.country].filter(Boolean);
  return parts.slice(0, 2).join(', ') || alert.location_name || 'Unknown region';
}

function isActive(alert: UnifiedAlert): boolean {
  if (!alert.expiry_time) return true;
  return new Date(alert.expiry_time) > new Date();
}

interface CooldownEntry {
  lastNotifiedAt: number;
  pending: UnifiedAlert[];
  timerHandle: ReturnType<typeof setTimeout> | null;
}

export function useAlertNotifier(
  prefs: NotificationPreferences,
  onNotify: (n: AppNotification) => void,
  soundEnabled: boolean,
  playAlert: (type: 'critical' | 'high' | 'info') => void,
) {
  // In-memory cooldown map: regionKey → CooldownEntry
  const cooldowns = useRef<Map<string, CooldownEntry>>(new Map());

  const flushRegion = useCallback((key: string) => {
    const entry = cooldowns.current.get(key);
    if (!entry || entry.pending.length === 0) return;

    const alerts = [...entry.pending];
    entry.pending = [];
    entry.lastNotifiedAt = Date.now();
    entry.timerHandle = null;

    // Persist cooldown to DB (fire-and-forget)
    supabase.from('notification_cooldowns').upsert(
      { region_key: key, last_notified_at: new Date().toISOString(), alert_count: alerts.length },
      { onConflict: 'region_key' }
    ).then(() => {});

    const representative = alerts[0];
    const count = alerts.length;

    const notification: AppNotification = count === 1 ? {
      id: `notif-${representative.id}`,
      title: `${representative.event_type.replace(/_/g, ' ').toUpperCase()} ALERT`,
      message: representative.location_name || regionLabel(representative),
      severity: representative.severity,
      eventType: representative.event_type,
      regionKey: key,
      count: 1,
      alertIds: [representative.id],
    } : {
      id: `notif-agg-${key}-${Date.now()}`,
      title: `${count} HIGH-RISK ALERTS`,
      message: `Multiple alerts in ${regionLabel(representative)} region`,
      severity: 'high',
      eventType: representative.event_type,
      regionKey: key,
      count,
      alertIds: alerts.map(a => a.id),
    };

    onNotify(notification);
    playAlert(representative.severity === 'high' ? 'critical' : 'high');
  }, [onNotify, playAlert]);

  const handleAlert = useCallback((alert: UnifiedAlert) => {
    // 1. Active-status gate
    if (!isActive(alert)) return;

    // 2–5. Preference filters
    if (!matchesPreferences(alert, prefs)) return;

    const key = regionKey(alert);
    const now = Date.now();

    let entry = cooldowns.current.get(key);
    if (!entry) {
      entry = { lastNotifiedAt: 0, pending: [], timerHandle: null };
      cooldowns.current.set(key, entry);
    }

    const sinceLast = now - entry.lastNotifiedAt;

    if (sinceLast >= COOLDOWN_MS && entry.pending.length === 0) {
      // Cooldown expired and nothing pending — notify immediately
      entry.lastNotifiedAt = now;
      entry.pending = [];

      supabase.from('notification_cooldowns').upsert(
        { region_key: key, last_notified_at: new Date().toISOString(), alert_count: 1 },
        { onConflict: 'region_key' }
      ).then(() => {});

      const notification: AppNotification = {
        id: `notif-${alert.id}`,
        title: `${alert.event_type.replace(/_/g, ' ').toUpperCase()} ALERT`,
        message: alert.location_name || regionLabel(alert),
        severity: alert.severity,
        eventType: alert.event_type,
        regionKey: key,
        count: 1,
        alertIds: [alert.id],
      };

      onNotify(notification);
      playAlert(alert.severity === 'high' ? 'critical' : 'high');
    } else {
      // Within cooldown — buffer and schedule a flush
      entry.pending.push(alert);

      if (!entry.timerHandle) {
        const remaining = Math.max(0, COOLDOWN_MS - sinceLast);
        entry.timerHandle = setTimeout(() => flushRegion(key), remaining);
      }
    }
  }, [prefs, onNotify, playAlert, flushRegion]);

  // Hydrate cooldown state from DB on mount so page refreshes respect server-side cooldowns
  useEffect(() => {
    supabase
      .from('notification_cooldowns')
      .select('region_key, last_notified_at')
      .then(({ data }) => {
        if (!data) return;
        for (const row of data) {
          const existing = cooldowns.current.get(row.region_key);
          if (!existing) {
            cooldowns.current.set(row.region_key, {
              lastNotifiedAt: new Date(row.last_notified_at).getTime(),
              pending: [],
              timerHandle: null,
            });
          }
        }
      });
  }, []);

  // Realtime subscription to unified_alerts INSERT
  useEffect(() => {
    const channel = supabase
      .channel('alert-notifier')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'unified_alerts' },
        (payload) => handleAlert(payload.new as UnifiedAlert),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [handleAlert]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      for (const entry of cooldowns.current.values()) {
        if (entry.timerHandle) clearTimeout(entry.timerHandle);
      }
    };
  }, []);
}
