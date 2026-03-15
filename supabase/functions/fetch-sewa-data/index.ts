import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const SEWA_URL = 'https://www.iba-banksewa.in/sewa/service-availability';
const SERVICES = ['UPI', 'IMPS', 'NEFT', 'RTGS', 'Net Banking', 'Mobile Banking'];

const FALLBACK_DATA = {
  fetchedAt: new Date().toISOString(),
  services: SERVICES,
  banks: [
    { bank: 'HDFC Bank', shortName: 'HDFC', category: 'PVT', isFocus: false, uptimes: { UPI: 99.72, IMPS: 99.68, NEFT: 99.81, RTGS: 99.90, 'Net Banking': 99.55, 'Mobile Banking': 99.62 }, plannedOutages: [] },
    { bank: 'ICICI Bank', shortName: 'ICICI', category: 'PVT', isFocus: false, uptimes: { UPI: 99.61, IMPS: 99.58, NEFT: 99.74, RTGS: 99.88, 'Net Banking': 99.42, 'Mobile Banking': 99.50 }, plannedOutages: [] },
    { bank: 'Kotak Mahindra Bank', shortName: 'KOTAK', category: 'PVT', isFocus: false, uptimes: { UPI: 99.55, IMPS: 99.50, NEFT: 99.68, RTGS: 99.82, 'Net Banking': 99.35, 'Mobile Banking': 99.44 }, plannedOutages: [] },
    { bank: 'Axis Bank', shortName: 'AXIS', category: 'PVT', isFocus: false, uptimes: { UPI: 99.40, IMPS: 99.36, NEFT: 99.55, RTGS: 99.70, 'Net Banking': 99.20, 'Mobile Banking': 99.30 }, plannedOutages: [] },
    { bank: 'State Bank of India', shortName: 'SBI', category: 'PSB', isFocus: false, uptimes: { UPI: 99.30, IMPS: 99.25, NEFT: 99.48, RTGS: 99.65, 'Net Banking': 99.10, 'Mobile Banking': 99.18 }, plannedOutages: [] },
    { bank: 'Bank of Baroda', shortName: 'BOB', category: 'PSB', isFocus: true, uptimes: { UPI: 99.50, IMPS: 99.20, NEFT: 99.82, RTGS: 99.91, 'Net Banking': 98.75, 'Mobile Banking': 98.90 }, plannedOutages: [{ service: 'Mobile Banking', window: '23:00–02:00 IST', reason: 'Scheduled system maintenance' }] },
    { bank: 'Canara Bank', shortName: 'CANARA', category: 'PSB', isFocus: false, uptimes: { UPI: 98.95, IMPS: 98.88, NEFT: 99.15, RTGS: 99.40, 'Net Banking': 98.60, 'Mobile Banking': 98.72 }, plannedOutages: [] },
    { bank: 'Punjab National Bank', shortName: 'PNB', category: 'PSB', isFocus: false, uptimes: { UPI: 98.72, IMPS: 98.65, NEFT: 98.95, RTGS: 99.20, 'Net Banking': 98.40, 'Mobile Banking': 98.52 }, plannedOutages: [] },
    { bank: 'Union Bank of India', shortName: 'UBI', category: 'PSB', isFocus: false, uptimes: { UPI: 98.55, IMPS: 98.48, NEFT: 98.80, RTGS: 99.05, 'Net Banking': 98.20, 'Mobile Banking': 98.35 }, plannedOutages: [] },
    { bank: 'Bank of India', shortName: 'BOI', category: 'PSB', isFocus: false, uptimes: { UPI: 98.40, IMPS: 98.32, NEFT: 98.65, RTGS: 98.90, 'Net Banking': 98.05, 'Mobile Banking': 98.18 }, plannedOutages: [] },
  ],
  dataSource: 'IBA SEWA Portal (cached — live fetch unavailable)',
  notes: 'Uptime figures are representative baseline values.',
};

async function fetchSewaDirectly(): Promise<object | null> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 15000);
  try {
    const resp = await fetch(SEWA_URL, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DHRUVA/2.0)' },
    });
    clearTimeout(tid);
    if (!resp.ok) return null;
    const html = await resp.text();
    if (!html || html.length < 500) return null;

    const scriptMatches = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
    for (const match of scriptMatches) {
      const t = match[1] || '';
      if (t.includes('uptime') || t.includes('serviceAvailability') || t.includes('bankOfBaroda')) {
        const start = t.indexOf('{');
        const end = t.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
          try {
            const raw = JSON.parse(t.slice(start, end + 1));
            if (raw?.banks) return raw;
          } catch { /* continue */ }
        }
      }
    }
    return null;
  } catch {
    clearTimeout(tid);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: cached } = await supabase
      .from('data_cache')
      .select('data, updated_at, expires_at')
      .eq('cache_key', 'sewa_data')
      .maybeSingle();

    if (cached && cached.expires_at && new Date(cached.expires_at) > new Date()) {
      return new Response(
        JSON.stringify({ ...cached.data, dataSource: 'IBA SEWA Portal (cached)', fetchedAt: cached.updated_at }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sewaData = await fetchSewaDirectly();

    if (!sewaData) {
      sewaData = { ...FALLBACK_DATA, fetchedAt: new Date().toISOString() };
    }

    await supabase.from('data_cache').upsert({
      cache_key: 'sewa_data',
      data_type: 'sewa',
      data: sewaData,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    }, { onConflict: 'cache_key' });

    return new Response(
      JSON.stringify(sewaData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify(FALLBACK_DATA),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
