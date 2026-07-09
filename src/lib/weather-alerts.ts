/**
 * Weather alerts client.
 *
 * Talks to the `fetch-weather-alerts` edge function, which proxies GDACS (a
 * free, no-key global alert feed), filters to ONLY Orange/Red severities, and
 * scopes to weather/climate hazards. GDACS ships coordinates, so alerts plot
 * directly. Shared by WeatherAlertsView (the tab) and App (the map layer).
 */

const WX_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-weather-alerts`;

export type WxSeverity = 'red' | 'orange';

export interface WeatherAlert {
  id: string;
  eventType: string;   // GDACS code: TC | FL | DR | WF
  eventLabel: string;  // e.g. "Tropical Cyclone"
  title: string;
  country: string;
  severity: WxSeverity;
  severityText: string;
  fromDate: string | null;
  toDate: string | null;
  url: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface WxResult {
  ok: boolean;
  /** Machine-readable failure code: timeout | upstream_error | fetch_failed */
  error?: string;
  message?: string;
  source?: string;
  counts?: { red: number; orange: number; geocoded: number };
  total?: number;
  fetchedAt?: string;
  alerts: WeatherAlert[];
}

export const WX_SEV_COLOR: Record<WxSeverity, string> = { red: '#FF0000', orange: '#FFA500' };
export const WX_SEV_LABEL: Record<WxSeverity, string> = { red: 'RED', orange: 'ORANGE' };

/** Fetch Orange/Red weather alerts. Never throws — network/parse errors resolve to an error result. */
export async function fetchWeatherAlerts(timeoutMs = 30_000): Promise<WxResult> {
  try {
    const resp = await fetch(WX_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = (await resp.json().catch(() => null)) as WxResult | null;
    if (data && typeof data.ok === 'boolean') return data;
    return { ok: false, error: 'fetch_failed', message: 'Malformed response from weather-alert service.', alerts: [] };
  } catch (err) {
    return {
      ok: false,
      error: 'fetch_failed',
      message: err instanceof Error ? err.message : 'Network error contacting weather-alert service.',
      alerts: [],
    };
  }
}
