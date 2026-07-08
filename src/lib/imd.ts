/**
 * IMD (India Meteorological Department) warnings client.
 *
 * Talks to the `fetch-imd-warnings` edge function, which proxies the IMD
 * districtwarning API, filters to ONLY Orange/Red severities, and geocodes
 * each district against the india_locations centroid table so warnings can be
 * plotted on the map. Shared by ImdWarningsView (the tab) and App (map layer).
 */

const IMD_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-imd-warnings`;

export type ImdSeverity = 'red' | 'orange';

export interface ImdDayWarning {
  day: number;
  severity: ImdSeverity;
  colorHex: string;
  code: string;
  label: string;
}

export interface ImdWarning {
  objId: string | number | null;
  district: string;
  date: string | null;
  utc: string | null;
  worstSeverity: ImdSeverity;
  days: ImdDayWarning[];
  latitude: number | null;
  longitude: number | null;
}

export interface ImdResult {
  ok: boolean;
  /** Machine-readable failure code: not_configured | auth_failed | timeout | upstream_error | fetch_failed */
  error?: string;
  message?: string;
  counts?: { red: number; orange: number; geocoded: number };
  total?: number;
  fetchedAt?: string;
  warnings: ImdWarning[];
}

export const IMD_SEV_COLOR: Record<ImdSeverity, string> = { red: '#FF0000', orange: '#FFA500' };
export const IMD_SEV_LABEL: Record<ImdSeverity, string> = { red: 'RED', orange: 'ORANGE' };

/** Fetch Orange/Red IMD warnings. Never throws — network/parse errors resolve to an error result. */
export async function fetchImdWarnings(timeoutMs = 30_000): Promise<ImdResult> {
  try {
    const resp = await fetch(IMD_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = (await resp.json().catch(() => null)) as ImdResult | null;
    if (data && typeof data.ok === 'boolean') return data;
    return { ok: false, error: 'fetch_failed', message: 'Malformed response from IMD service.', warnings: [] };
  } catch (err) {
    return {
      ok: false,
      error: 'fetch_failed',
      message: err instanceof Error ? err.message : 'Network error contacting IMD service.',
      warnings: [],
    };
  }
}
