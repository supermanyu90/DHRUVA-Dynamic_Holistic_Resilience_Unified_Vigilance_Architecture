import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const THREAT_FEEDS = [
  {
    name: 'CISA KEV',
    url: 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
    type: 'vulnerability',
  },
  {
    name: 'AbuseCH MalwareBazaar',
    url: 'https://mb-api.abuse.ch/api/v1/',
    type: 'malware',
    method: 'POST',
    body: 'query=get_recent&selector=time',
  },
];

interface ThreatRecord {
  threat_id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  threat_type: string;
  is_active: boolean;
  first_seen: string;
  last_seen: string;
}

function scoreToCvssSeverity(score: number | null): 'critical' | 'high' | 'medium' | 'low' {
  if (!score) return 'medium';
  if (score >= 9.0) return 'critical';
  if (score >= 7.0) return 'high';
  if (score >= 4.0) return 'medium';
  return 'low';
}

async function fetchCISAKEV(): Promise<ThreatRecord[]> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 15000);
  try {
    const resp = await fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'DHRUVA/2.0 Intelligence Platform' },
    });
    clearTimeout(tid);
    if (!resp.ok) return [];
    const data = await resp.json();
    const vulns = data.vulnerabilities || [];
    return vulns.slice(0, 50).map((v: any) => ({
      threat_id: `cisa-kev-${v.cveID}`,
      title: `${v.cveID}: ${v.vulnerabilityName}`,
      description: v.shortDescription || `${v.product} (${v.vendorProject}) — ${v.requiredAction}`,
      severity: scoreToCvssSeverity(parseFloat(v.cvssScore) || null),
      threat_type: 'Vulnerability',
      source: 'CISA KEV',
      is_active: true,
      first_seen: v.dateAdded ? new Date(v.dateAdded).toISOString() : new Date().toISOString(),
      last_seen: new Date().toISOString(),
    }));
  } catch {
    clearTimeout(tid);
    return [];
  }
}

async function fetchNVDRecent(): Promise<ThreatRecord[]> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 15000);
  try {
    const pubStartDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().replace(/\.\d+Z$/, '.000');
    const pubEndDate = new Date().toISOString().replace(/\.\d+Z$/, '.000');
    const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=${pubStartDate}&pubEndDate=${pubEndDate}&resultsPerPage=20`;
    const resp = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'DHRUVA/2.0 Intelligence Platform' },
    });
    clearTimeout(tid);
    if (!resp.ok) return [];
    const data = await resp.json();
    const vulns = data.vulnerabilities || [];
    return vulns.map((item: any) => {
      const cve = item.cve;
      const desc = cve.descriptions?.find((d: any) => d.lang === 'en')?.value || '';
      const cvssV3 = cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore ||
                     cve.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore || null;
      return {
        threat_id: `nvd-${cve.id}`,
        title: `${cve.id}: ${desc.slice(0, 120)}`,
        description: desc.slice(0, 500),
        severity: scoreToCvssSeverity(cvssV3),
        threat_type: 'Vulnerability',
        source: 'NVD',
        is_active: true,
        first_seen: cve.published ? new Date(cve.published).toISOString() : new Date().toISOString(),
        last_seen: cve.lastModified ? new Date(cve.lastModified).toISOString() : new Date().toISOString(),
      };
    });
  } catch {
    clearTimeout(tid);
    return [];
  }
}

async function fetchAbuseCH(): Promise<ThreatRecord[]> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 15000);
  try {
    const resp = await fetch('https://mb-api.abuse.ch/api/v1/', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'DHRUVA/2.0 Intelligence Platform',
      },
      body: 'query=get_recent&selector=time',
    });
    clearTimeout(tid);
    if (!resp.ok) return [];
    const data = await resp.json();
    if (data.query_status !== 'ok') return [];
    const samples = (data.data || []).slice(0, 20);
    return samples.map((s: any) => ({
      threat_id: `abusech-${s.sha256_hash}`,
      title: `Malware Sample: ${s.file_name || s.sha256_hash.slice(0, 16)}`,
      description: `Malware family: ${s.signature || 'Unknown'}. Tags: ${(s.tags || []).join(', ') || 'None'}. File type: ${s.file_type || 'Unknown'}.`,
      severity: 'high' as const,
      threat_type: 'Malware',
      source: 'AbuseCH MalwareBazaar',
      is_active: true,
      first_seen: s.first_seen ? new Date(s.first_seen).toISOString() : new Date().toISOString(),
      last_seen: s.last_seen ? new Date(s.last_seen).toISOString() : new Date().toISOString(),
    }));
  } catch {
    clearTimeout(tid);
    return [];
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

    const [kevThreats, nvdThreats, malwareThreats] = await Promise.allSettled([
      fetchCISAKEV(),
      fetchNVDRecent(),
      fetchAbuseCH(),
    ]);

    const allThreats: ThreatRecord[] = [
      ...(kevThreats.status === 'fulfilled' ? kevThreats.value : []),
      ...(nvdThreats.status === 'fulfilled' ? nvdThreats.value : []),
      ...(malwareThreats.status === 'fulfilled' ? malwareThreats.value : []),
    ];

    console.log(`Total threats collected: ${allThreats.length}`);

    let inserted = 0;
    if (allThreats.length > 0) {
      const batch = allThreats.slice(0, 100);
      const { error, count } = await supabase
        .from('cyber_threats')
        .upsert(batch, { onConflict: 'threat_id', ignoreDuplicates: false, count: 'exact' });
      if (error) {
        console.error('Upsert error:', error);
      } else {
        inserted = count ?? batch.length;
        console.log(`Upserted ${inserted} threats`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, totalFetched: allThreats.length, inserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
