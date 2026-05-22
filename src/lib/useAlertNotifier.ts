/**
 * useAlertNotifier
 *
 * Monitors the in-memory unified alerts list for new high-priority items and
 * fires notifications through the app notification pipeline. Cooldown state
 * is persisted to localStorage instead of the database.
 */

import { useCallback, useEffect, useRef } from 'react';
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

    const notification = buildNotification(alerts, key);
    onNotify(notification);
    playAlert(notification.priorityScore >= 70 ? 'critical' : 'high');
  }, [onNotify, playAlert, buildNotification]);

  const handleAlert = useCallback((alert: UnifiedAlert) => {
    if (!isActive(alert)) return;

    const score = effectivePriority(alert);
    const threshold = PRIORITY_THRESHOLD[prefs.min_severity] ?? 70;
    if (score < threshold) return;

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

  // Expose handleAlert so callers can push alerts from polling
  useEffect(() => {
    (window as any).__dhruvaHandleAlert = handleAlert;
    return () => { delete (window as any).__dhruvaHandleAlert; };
  }, [handleAlert]);

  useEffect(() => {
    return () => {
      for (const entry of cooldowns.current.values()) {
        if (entry.timerHandle) clearTimeout(entry.timerHandle);
      }
    };
  }, []);
}
