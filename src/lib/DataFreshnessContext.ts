import { createContext, useContext } from 'react';

export interface DataFreshnessState {
  /** True when any data source is serving cached (stale) data. */
  isStale: boolean;
  /** ISO timestamp of the oldest stale cache entry, or null if data is fresh. */
  staleSince: string | null;
  /** Human-readable age of the stale data, e.g. "12 min ago". Updated every 30 s. */
  staleAge: string | null;
}

export const DataFreshnessContext = createContext<DataFreshnessState>({
  isStale: false,
  staleSince: null,
  staleAge: null,
});

export function useDataFreshness(): DataFreshnessState {
  return useContext(DataFreshnessContext);
}

export function formatStaleAge(staleSince: string | null): string | null {
  if (!staleSince) return null;
  const ms = Date.now() - new Date(staleSince).getTime();
  if (ms < 60_000)       return 'just now';
  if (ms < 3_600_000)    return `${Math.floor(ms / 60_000)} min ago`;
  if (ms < 86_400_000)   return `${Math.floor(ms / 3_600_000)} hr ago`;
  return `${Math.floor(ms / 86_400_000)} day(s) ago`;
}
