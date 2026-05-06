/**
 * Resilience layer for IntelligenceAPI fetches.
 *
 * withResilience<T>(key, fetcher, options)
 *
 *   1. Calls fetcher(), retrying up to `maxRetries` times with exponential
 *      backoff on failure.
 *   2. On success: persists the result to localStorage under `key` with a
 *      timestamp, and returns { data, stale: false }.
 *   3. On total failure: reads the last known good payload from localStorage
 *      and returns { data: cached, stale: true, staleSince: <ISO> }.
 *      If no cache exists, re-throws the last error so the caller can decide
 *      how to handle a completely cold failure.
 *
 * The cache key is prefixed with "dhruva:cache:" to avoid collisions.
 */

export interface ResilientResult<T> {
  data: T;
  stale: boolean;
  staleSince: string | null;   // ISO timestamp of the cached payload's creation
}

interface CacheEntry<T> {
  data: T;
  cachedAt: string;   // ISO
}

export interface ResilienceOptions {
  maxRetries?: number;          // default 3
  baseDelayMs?: number;         // default 500 ms
  maxDelayMs?: number;          // default 8 000 ms
  ttlMs?: number;               // max cache age to consider valid (default 24 h)
}

const CACHE_PREFIX = 'dhruva:cache:';
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY  = 500;
const DEFAULT_MAX_DELAY   = 8_000;
const DEFAULT_TTL_MS      = 24 * 60 * 60 * 1000; // 24 hours

function cacheKey(key: string): string {
  return CACHE_PREFIX + key;
}

function readCache<T>(key: string, ttlMs: number): CacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(cacheKey(key));
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    // Honour TTL — refuse cache older than ttlMs
    if (Date.now() - new Date(entry.cachedAt).getTime() > ttlMs) return null;
    return entry;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, cachedAt: new Date().toISOString() };
    localStorage.setItem(cacheKey(key), JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — silently skip
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withResilience<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: ResilienceOptions = {},
): Promise<ResilientResult<T>> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelay  = options.baseDelayMs ?? DEFAULT_BASE_DELAY;
  const maxDelay   = options.maxDelayMs  ?? DEFAULT_MAX_DELAY;
  const ttlMs      = options.ttlMs       ?? DEFAULT_TTL_MS;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff with jitter
      const backoff = Math.min(baseDelay * 2 ** (attempt - 1), maxDelay);
      const jitter  = Math.random() * 0.3 * backoff;
      await delay(backoff + jitter);
    }

    try {
      const data = await fetcher();
      writeCache(key, data);
      return { data, stale: false, staleSince: null };
    } catch (err) {
      lastError = err;
    }
  }

  // All retries exhausted — fall back to cache
  const cached = readCache<T>(key, ttlMs);
  if (cached) {
    return { data: cached.data, stale: true, staleSince: cached.cachedAt };
  }

  // No cache at all — propagate the error
  throw lastError;
}

/** Reads cached data synchronously without attempting a fetch. */
export function readCachedData<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
  return readCache<T>(key, ttlMs)?.data ?? null;
}

/** Clears a specific cache entry. */
export function clearCache(key: string): void {
  try { localStorage.removeItem(cacheKey(key)); } catch {}
}
