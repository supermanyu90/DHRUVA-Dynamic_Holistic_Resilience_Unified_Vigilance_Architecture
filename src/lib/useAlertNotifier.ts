/**
 * useAlertNotifier
 *
 * Subscribes to unified_alerts INSERT events from Supabase Realtime and
 * applies the full notification throttling pipeline:
 *
 *   1. Active-status gate    — alert must not be expired
 *   2. Priority gate         — priority_score (computed client-side via
 *                              computePriorityScore) must meet the threshold
 *                              derived from prefs.min_severity:
 *                                high     → score >= 70
 *                                moderate → score >= 40
 *                                low      → score >= 10
 *   3. Preference filters    — urgency, event_type, location whitelists
 *   4. Region cooldown       — max 1 notification per region per 15 min.
 *                              Pending alerts within the window are buffered
 *                              and flushed as an aggregated notification when
 *                              the cooldown expires, sorted by priority_score
 *                              so the highest-priority alert is representative.
 */

import { useCallback, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { UnifiedAlert, computePriorityScore } from './intelligence-api';
import { NotificationPreferences, matchesPreferences } from './notification-preferences';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  severity: 'high' | 'moderate' | 'low';
  eventType: string;
  regionKey: string;
  priorityScore: number;
  count: number;
  alertIds: string[];
}

const COOLDOWN_MS = 15 * 60 * 1000;

// Minimum priority_score threshold per min_severity pref setting
const PRIORITY_THRESHOLD: Record<string, number> = {
  high: 70,
  moderate: 40,
  low: 10,
};

function regionKey(alert: UnifiedAlert): string {
  const parts = [alert.country, alert.state, alert.district]
    .map(s => (s ?? '').trim().toLowerCase())
    .filter(Boolean);
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

/** Resolve effective priority: prefer DB-computed value, fall back to client formula. */
function effectivePriority(alert: UnifiedAlert): number {
  if (typeof alert.priority_score === 'number' && alert.priority_score > 0) {
    return alert.priority_score;
  }
  return computePriorityScore(alert);
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
  const cooldowns = useRef<Map<string, CooldownEntry>>(new Map());

  const buildNotification = useCallback((alerts: UnifiedAlert[], key: string): AppNotification => {
    // Sort pending by priority descending so the representative is the most critical
    const sorted = [...alerts].sort((a, b) => effectivePriority(b) - effectivePriority(a));
    const rep = sorted[0];
    const score = effectivePriority(rep);
    const count = sorted.length;

    if (count === 1) {
      return {
        id: `notif-${rep.id}`,
        title: `${rep.event_type.replace(/_/g, ' ').toUpperCase()} ALERT`,
        message: rep.location_name || regionLabel(rep),
        severity: rep.severity,
        eventType: rep.event_type,
        regionKey: key,
        priorityScore: score,
        count: 1,
        alertIds: [rep.id],
      };
    }

    return {
      id: `notif-agg-${key}-${Date.now()}`,
      title: `${count} HIGH-RISK ALERTS`,
      message: `Multiple alerts in ${regionLabel(rep)} region`,
      severity: rep.severity,
      eventType: rep.event_type,
      regionKey: key,
      priorityScore: score,
      count,
      alertIds: sorted.map(a => a.id),
    };
  }, []);

  const flushRegion = useCallback((key: string) => {
    const entry = cooldowns.current.get(key);
    if (!entry || entry.pending.length === 0) return;

    const alerts = [...entry.pending];
    entry.pending = [];
    entry.lastNotifiedAt = Date.now();
    entry.timerHandle = null;

    supabase.from('notification_cooldowns').upsert(
      { region_key: key, last_notified_at: new Date().toISOString(), alert_count: alerts.length },
      { onConflict: 'region_key' }
    ).then(() => {});

    const notification = buildNotification(alerts, key);
    onNotify(notification);
    playAlert(notification.priorityScore >= 70 ? 'critical' : 'high');
  }, [onNotify, playAlert, buildNotification]);

  const handleAlert = useCallback((alert: UnifiedAlert) => {
    // 1. Active-status gate
    if (!isActive(alert)) return;

    // 2. Priority gate — use numeric threshold derived from min_severity pref
    const score = effectivePriority(alert);
    const threshold = PRIORITY_THRESHOLD[prefs.min_severity] ?? 70;
    if (score < threshold) return;

    // 3. Preference filters (urgency, event_type, location)
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
      entry.lastNotifiedAt = now;

      supabase.from('notification_cooldowns').upsert(
        { region_key: key, last_notified_at: new Date().toISOString(), alert_count: 1 },
        { onConflict: 'region_key' }
      ).then(() => {});

      const notification = buildNotification([alert], key);
      onNotify(notification);
      playAlert(score >= 70 ? 'critical' : 'high');
    } else {
      entry.pending.push(alert);
      if (!entry.timerHandle) {
        const remaining = Math.max(0, COOLDOWN_MS - sinceLast);
        entry.timerHandle = setTimeout(() => flushRegion(key), remaining);
      }
    }
  }, [prefs, onNotify, playAlert, flushRegion, buildNotification]);

  // Hydrate cooldown state from DB on mount
  useEffect(() => {
    supabase
      .from('notification_cooldowns')
      .select('region_key, last_notified_at')
      .then(({ data }) => {
        if (!data) return;
        for (const row of data) {
          if (!cooldowns.current.has(row.region_key)) {
            cooldowns.current.set(row.region_key, {
              lastNotifiedAt: new Date(row.last_notified_at).getTime(),
              pending: [],
              timerHandle: null,
            });
          }
        }
      });
  }, []);

  // Realtime subscription
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
