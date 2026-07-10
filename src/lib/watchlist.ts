/**
 * Watchlist
 *
 * A first-class, user-defined focus layer on top of the live intelligence feed.
 * The operator pins REGIONS (countries / theatres) and/or free-text KEYWORDS;
 * any active event whose text or location matches is flagged as "watched",
 * surfaced with a badge in the header, and can be exported as a Situation Report.
 *
 * Storage is localStorage-only (mirrors notification-preferences.ts) so it works
 * offline and needs no backend.
 */

import type { Earthquake, Disaster, NewsEvent, VolcanoEvent, GeopoliticalEvent } from './intelligence-api';
import type { WeatherAlert } from './weather-alerts';

export type EventKind = 'earthquake' | 'disaster' | 'news' | 'volcano' | 'geopolitical' | 'weather';
export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface Watchlist {
  regions: string[];
  keywords: string[];
}

/** A single live event flattened into a common shape for matching + reporting. */
export interface NormalizedEvent {
  id: string;
  kind: EventKind;
  kindLabel: string;
  title: string;
  /** Lower-cased haystack: title + description + location + country + categories. */
  text: string;
  country: string;
  severity: Severity;
  time: string | null;
  url: string | null;
}

/** Result of testing one event against a watchlist. */
export interface WatchMatch {
  matched: boolean;
  regions: string[];
  keywords: string[];
}

export const EMPTY_WATCHLIST: Watchlist = { regions: [], keywords: [] };

const WATCHLIST_KEY = 'dhruva:watchlist';

/** Curated quick-pick regions, weighted toward DHRUVA's India + IOR focus. */
export const PRESET_REGIONS: string[] = [
  'India', 'Pakistan', 'China', 'Bangladesh', 'Sri Lanka', 'Nepal', 'Myanmar',
  'Bhutan', 'Maldives', 'Afghanistan', 'Iran', 'UAE', 'Saudi Arabia', 'Russia',
  'Ukraine', 'Israel', 'Gaza', 'Taiwan', 'United States', 'Indian Ocean',
  'South China Sea', 'Strait of Hormuz',
];

const KIND_LABEL: Record<EventKind, string> = {
  earthquake: 'SEISMIC',
  disaster: 'DISASTER',
  news: 'NEWS',
  volcano: 'VOLCANO',
  geopolitical: 'GEOPOLITICAL',
  weather: 'WEATHER',
};

export const SEVERITY_ORDER: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export function loadWatchlist(): Watchlist {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        regions: Array.isArray(parsed.regions) ? parsed.regions : [],
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      };
    }
  } catch { /* ignore */ }
  return { ...EMPTY_WATCHLIST };
}

export function saveWatchlist(wl: Watchlist): void {
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(wl));
  } catch { /* ignore */ }
}

export function isWatchlistEmpty(wl: Watchlist): boolean {
  return wl.regions.length === 0 && wl.keywords.length === 0;
}

function severityFromMagnitude(mag: number): Severity {
  if (mag >= 6.5) return 'critical';
  if (mag >= 6.0) return 'high';
  if (mag >= 5.0) return 'medium';
  return 'low';
}

function clean(...parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

/** Flatten every live source into one comparable list. Null-safe by construction. */
export function normalizeEvents(data: {
  earthquakes: Earthquake[];
  disasters: Disaster[];
  news: NewsEvent[];
  volcanoes: VolcanoEvent[];
  geopolitical: GeopoliticalEvent[];
  weatherAlerts: WeatherAlert[];
}): NormalizedEvent[] {
  const out: NormalizedEvent[] = [];

  for (const eq of data.earthquakes) {
    out.push({
      id: eq.id,
      kind: 'earthquake',
      kindLabel: KIND_LABEL.earthquake,
      title: `M${eq.magnitude?.toFixed(1) ?? '?'} — ${eq.location}`,
      text: clean(eq.location),
      country: eq.location ?? '',
      severity: severityFromMagnitude(eq.magnitude ?? 0),
      time: eq.event_time ?? null,
      url: null,
    });
  }

  for (const d of data.disasters) {
    const severe = (d.category ?? '').toLowerCase().includes('severe');
    out.push({
      id: d.id,
      kind: 'disaster',
      kindLabel: KIND_LABEL.disaster,
      title: d.title,
      text: clean(d.title, d.category),
      country: '',
      severity: severe ? 'high' : 'medium',
      time: d.event_date ?? null,
      url: null,
    });
  }

  for (const n of data.news) {
    out.push({
      id: n.id,
      kind: 'news',
      kindLabel: KIND_LABEL.news,
      title: n.title,
      text: clean(n.title, n.content, n.country, (n.categories ?? []).join(' ')),
      country: n.country ?? '',
      severity: 'low',
      time: n.published_at ?? null,
      url: n.url ?? null,
    });
  }

  for (const v of data.volcanoes) {
    const severity: Severity = v.status === 'erupting' ? 'critical' : v.status === 'unrest' ? 'high' : 'low';
    out.push({
      id: v.id,
      kind: 'volcano',
      kindLabel: KIND_LABEL.volcano,
      title: `${v.name}${v.country ? ` — ${v.country}` : ''}`,
      text: clean(v.name, v.country, v.activity_description),
      country: v.country ?? '',
      severity,
      time: v.updated_at ?? null,
      url: null,
    });
  }

  for (const g of data.geopolitical) {
    out.push({
      id: g.id,
      kind: 'geopolitical',
      kindLabel: KIND_LABEL.geopolitical,
      title: g.title,
      text: clean(g.title, g.description, g.country, g.category),
      country: g.country ?? '',
      severity: g.severity ?? 'low',
      time: g.started_at ?? g.updated_at ?? null,
      url: null,
    });
  }

  for (const w of data.weatherAlerts) {
    out.push({
      id: w.id,
      kind: 'weather',
      kindLabel: KIND_LABEL.weather,
      title: `${w.eventLabel || w.eventType} — ${w.title}`,
      text: clean(w.title, w.eventType, w.eventLabel, w.country),
      country: w.country ?? '',
      severity: w.severity === 'red' ? 'critical' : 'high',
      time: w.fromDate ?? null,
      url: w.url ?? null,
    });
  }

  return out;
}

/** Test one normalized event against the watchlist (case-insensitive substring). */
export function matchesWatchlist(evt: NormalizedEvent, wl: Watchlist): WatchMatch {
  const haystack = `${evt.text} ${evt.country.toLowerCase()}`;

  const regions = wl.regions.filter(r => {
    const needle = r.trim().toLowerCase();
    return needle.length > 0 && haystack.includes(needle);
  });

  const keywords = wl.keywords.filter(k => {
    const needle = k.trim().toLowerCase();
    return needle.length > 0 && haystack.includes(needle);
  });

  return { matched: regions.length > 0 || keywords.length > 0, regions, keywords };
}

/**
 * Return only the events matching the watchlist, sorted by severity then recency.
 * When the watchlist is empty, returns [] (nothing is "watched" yet).
 */
export function watchedEvents(events: NormalizedEvent[], wl: Watchlist): NormalizedEvent[] {
  if (isWatchlistEmpty(wl)) return [];
  return events
    .filter(e => matchesWatchlist(e, wl).matched)
    .sort((a, b) => {
      const sev = SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity];
      if (sev !== 0) return sev;
      return (b.time ? Date.parse(b.time) : 0) - (a.time ? Date.parse(a.time) : 0);
    });
}
