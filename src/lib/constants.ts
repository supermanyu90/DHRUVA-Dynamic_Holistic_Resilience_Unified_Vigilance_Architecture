/** Shared application constants. Keep implementation details here, not in render paths. */

export const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;
export const API_TIMEOUT_MS = 12_000;
export const TICKER_MAX_EVENTS = 40;
export const EVENT_WINDOW_HOURS = 72;
export const EARTHQUAKE_CRITICAL_MAG = 6.5;
export const EARTHQUAKE_HIGH_MAG = 6.0;
export const EARTHQUAKE_MEDIUM_MAG = 5.0;

export const INDIA_NEIGHBOURS = new Set([
  'India', 'Pakistan', 'China', 'Bangladesh', 'Sri Lanka',
  'Nepal', 'Myanmar', 'Bhutan', 'Maldives',
]);

export const INDIA_EXTENDED = new Set([
  'Afghanistan', 'Iran', 'UAE', 'Saudi Arabia', 'Oman', 'Yemen', 'Russia',
]);

export const IOR_REGEX = /\b(IOR|Arabian Sea|Bay of Bengal|Indian Ocean|Malacca|Hormuz|Strait of Hormuz|Line of Control|LoC|Kashmir|Ladakh|Aksai Chin|Arunachal|Andaman|Lakshadweep|CPEC|Belt and Road)\b/i;

export const HIGH_RISK_GEO_CATS = new Set(['conflict', 'coup', 'sanctions', 'crisis']);

export const SEVERITY_WEIGHTS: Record<string, number> = {
  critical: 20, high: 10, medium: 4, low: 1,
};
