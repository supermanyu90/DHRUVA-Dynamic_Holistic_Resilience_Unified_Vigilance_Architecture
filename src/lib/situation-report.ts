/**
 * Situation Report (SITREP) export.
 *
 * Builds a self-contained, print-optimised HTML document from the current live
 * picture and opens it in a new window for the browser's native "Save as PDF".
 * No backend, no dependencies. When a watchlist is active the report leads with
 * a "Watchlist Focus" section covering only the pinned regions / keywords.
 */

import {
  NormalizedEvent, Watchlist, EventKind, Severity,
  isWatchlistEmpty, watchedEvents, SEVERITY_ORDER,
} from './watchlist';
import { isNative, nativeFileShare } from './native';

export interface SitrepInput {
  events: NormalizedEvent[];
  watchlist: Watchlist;
  indiaScore: number;
}

const KIND_ORDER: EventKind[] = ['geopolitical', 'weather', 'earthquake', 'volcano', 'disaster', 'news'];
const KIND_TITLE: Record<EventKind, string> = {
  geopolitical: 'Geopolitical & Security',
  weather: 'Severe Weather (SACHET)',
  earthquake: 'Seismic Activity',
  volcano: 'Volcanic Activity',
  disaster: 'Natural Disasters',
  news: 'Open-Source News',
};
const SEV_COLOR: Record<Severity, string> = {
  critical: '#c81e3a',
  high: '#d97706',
  medium: '#2563eb',
  low: '#4b5563',
};

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  return new Date(t).toUTCString().replace('GMT', 'UTC');
}

function sevBadge(sev: Severity): string {
  return `<span class="badge" style="background:${SEV_COLOR[sev]}1a;color:${SEV_COLOR[sev]};border-color:${SEV_COLOR[sev]}55">${sev.toUpperCase()}</span>`;
}

function eventRow(e: NormalizedEvent): string {
  return `
    <tr>
      <td class="c-sev">${sevBadge(e.severity)}</td>
      <td class="c-title">
        <div class="ev-title">${escapeHtml(e.title)}</div>
        ${e.country ? `<div class="ev-meta">${escapeHtml(e.country)}</div>` : ''}
      </td>
      <td class="c-time">${escapeHtml(fmtTime(e.time))}</td>
    </tr>`;
}

function sortBySeverity(events: NormalizedEvent[]): NormalizedEvent[] {
  return [...events].sort((a, b) => {
    const s = SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity];
    if (s !== 0) return s;
    return (b.time ? Date.parse(b.time) : 0) - (a.time ? Date.parse(a.time) : 0);
  });
}

export function generateSituationReportHTML(input: SitrepInput): string {
  const { events, watchlist, indiaScore } = input;
  const now = new Date();
  const generatedAt = now.toUTCString().replace('GMT', 'UTC');
  const reportId = `DHRUVA-SITREP-${now.toISOString().slice(0, 16).replace(/[-:T]/g, '')}Z`;

  const total = events.length;
  const critical = events.filter(e => e.severity === 'critical').length;
  const high = events.filter(e => e.severity === 'high').length;

  const wlActive = !isWatchlistEmpty(watchlist);
  const watched = watchedEvents(events, watchlist);

  const posture = indiaScore >= 60 ? 'ELEVATED' : indiaScore >= 30 ? 'GUARDED' : 'STABLE';
  const postureColor = indiaScore >= 60 ? '#c81e3a' : indiaScore >= 30 ? '#d97706' : '#047857';

  // Executive summary tiles
  const tiles = `
    <div class="tiles">
      <div class="tile"><div class="tile-v">${total}</div><div class="tile-l">Active Events</div></div>
      <div class="tile"><div class="tile-v" style="color:#c81e3a">${critical}</div><div class="tile-l">Critical</div></div>
      <div class="tile"><div class="tile-v" style="color:#d97706">${high}</div><div class="tile-l">High</div></div>
      <div class="tile"><div class="tile-v" style="color:${postureColor}">${indiaScore}</div><div class="tile-l">India Posture — ${posture}</div></div>
      ${wlActive ? `<div class="tile tile-watch"><div class="tile-v">${watched.length}</div><div class="tile-l">On Watchlist</div></div>` : ''}
    </div>`;

  // Watchlist focus section
  let watchSection = '';
  if (wlActive) {
    const chips = [
      ...watchlist.regions.map(r => `<span class="chip chip-region">${escapeHtml(r)}</span>`),
      ...watchlist.keywords.map(k => `<span class="chip chip-kw">"${escapeHtml(k)}"</span>`),
    ].join('');

    const rows = watched.length
      ? sortBySeverity(watched).slice(0, 40).map(e => `
        <tr>
          <td class="c-sev">${sevBadge(e.severity)}</td>
          <td class="c-kind">${e.kindLabel}</td>
          <td class="c-title">
            <div class="ev-title">${escapeHtml(e.title)}</div>
            ${e.country ? `<div class="ev-meta">${escapeHtml(e.country)}</div>` : ''}
          </td>
          <td class="c-time">${escapeHtml(fmtTime(e.time))}</td>
        </tr>`).join('')
      : `<tr><td colspan="4" class="empty">No active events currently match your watchlist.</td></tr>`;

    watchSection = `
      <section class="watch">
        <h2><span class="star">★</span> Watchlist Focus</h2>
        <div class="watch-terms">${chips}</div>
        <table class="ev-table watch-table">
          <thead><tr><th>Severity</th><th>Type</th><th>Event</th><th>Onset (UTC)</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
  }

  // Full picture by category
  const byKind = KIND_ORDER.map(kind => {
    const list = sortBySeverity(events.filter(e => e.kind === kind));
    if (list.length === 0) return '';
    const rows = list.slice(0, 8).map(eventRow).join('');
    const more = list.length > 8 ? `<div class="more">+ ${list.length - 8} more ${KIND_TITLE[kind].toLowerCase()} event(s)</div>` : '';
    return `
      <section class="cat">
        <h3>${KIND_TITLE[kind]} <span class="cat-count">${list.length}</span></h3>
        <table class="ev-table">
          <thead><tr><th>Severity</th><th>Event</th><th>Onset (UTC)</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${more}
      </section>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${reportId}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    color: #111827; background: #ffffff; font-size: 12px; line-height: 1.5;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .sheet { max-width: 900px; margin: 0 auto; padding: 28px 32px 48px; }
  .classbar {
    background: #0b1f3a; color: #e5edf7; text-align: center; letter-spacing: 3px;
    font-size: 10px; font-weight: 700; padding: 6px; text-transform: uppercase;
  }
  header.mast { display: flex; align-items: flex-end; justify-content: space-between;
    border-bottom: 3px solid #0b1f3a; padding-bottom: 14px; margin-bottom: 4px; }
  .brand { font-size: 30px; font-weight: 800; letter-spacing: 2px; color: #0b1f3a; line-height: 1; }
  .brand small { display: block; font-size: 9px; font-weight: 600; letter-spacing: 1.5px;
    color: #6b7280; margin-top: 5px; text-transform: uppercase; }
  .doc-meta { text-align: right; font-size: 10px; color: #4b5563; }
  .doc-meta .doctype { font-size: 15px; font-weight: 800; color: #0b1f3a; letter-spacing: 2px; }
  .doc-meta .rid { font-family: ui-monospace, "SF Mono", Menlo, monospace; margin-top: 4px; }

  h2 { font-size: 15px; color: #0b1f3a; margin: 26px 0 10px; padding-bottom: 6px;
    border-bottom: 1.5px solid #d7dee8; letter-spacing: .5px; }
  h3 { font-size: 12.5px; color: #0b1f3a; margin: 18px 0 7px; text-transform: uppercase;
    letter-spacing: 1px; display: flex; align-items: center; gap: 8px; }
  .cat-count { background: #0b1f3a; color: #fff; border-radius: 10px; font-size: 9px;
    padding: 1px 8px; font-weight: 700; }

  .tiles { display: flex; gap: 10px; margin: 16px 0 4px; flex-wrap: wrap; }
  .tile { flex: 1; min-width: 110px; border: 1px solid #e2e8f0; border-radius: 8px;
    padding: 12px 14px; background: #f8fafc; }
  .tile-watch { border-color: #0b1f3a; background: #eef4fb; }
  .tile-v { font-size: 28px; font-weight: 800; line-height: 1; color: #0b1f3a; }
  .tile-l { font-size: 9px; letter-spacing: 1px; text-transform: uppercase; color: #6b7280; margin-top: 6px; }

  .watch { background: #f6f9fd; border: 1px solid #cddaeb; border-radius: 10px; padding: 8px 16px 16px; margin-top: 22px; }
  .watch h2 { border-bottom-color: #cddaeb; }
  .star { color: #d97706; }
  .watch-terms { display: flex; flex-wrap: wrap; gap: 6px; margin: 2px 0 12px; }
  .chip { font-size: 10px; padding: 2px 9px; border-radius: 12px; border: 1px solid; font-weight: 600; }
  .chip-region { background: #0b1f3a12; color: #0b1f3a; border-color: #0b1f3a44; }
  .chip-kw { background: #d9770612; color: #b45309; border-color: #d9770644; }

  table.ev-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .ev-table th { text-align: left; font-size: 8.5px; text-transform: uppercase; letter-spacing: 1px;
    color: #94a3b8; border-bottom: 1px solid #e2e8f0; padding: 4px 8px; font-weight: 700; }
  .ev-table td { border-bottom: 1px solid #eef2f7; padding: 7px 8px; vertical-align: top; }
  .ev-table tr { break-inside: avoid; }
  .c-sev { width: 74px; }
  .c-kind { width: 92px; font-size: 9px; letter-spacing: .5px; color: #64748b; font-weight: 700; }
  .c-time { width: 150px; font-size: 9.5px; color: #64748b; font-family: ui-monospace, "SF Mono", Menlo, monospace; white-space: nowrap; }
  .ev-title { font-weight: 600; color: #1f2937; }
  .ev-meta { font-size: 9.5px; color: #94a3b8; margin-top: 2px; }
  .badge { display: inline-block; font-size: 8.5px; font-weight: 700; letter-spacing: .5px;
    padding: 2px 7px; border-radius: 4px; border: 1px solid; }
  .more { font-size: 9.5px; color: #94a3b8; padding: 6px 8px 0; font-style: italic; }
  .empty { color: #94a3b8; font-style: italic; text-align: center; padding: 16px 8px; }

  footer { margin-top: 32px; border-top: 1.5px solid #d7dee8; padding-top: 10px;
    font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; }
  footer a { color: #64748b; }
  @media print { .noprint { display: none !important; } }
  .noprint { position: fixed; top: 14px; right: 14px; }
  .noprint button { font-family: inherit; font-size: 12px; font-weight: 700; letter-spacing: 1px;
    background: #0b1f3a; color: #fff; border: 0; border-radius: 6px; padding: 10px 18px; cursor: pointer; }
</style>
</head>
<body>
  <div class="classbar">Unclassified // For Situational Awareness</div>
  <div class="sheet">
    <div class="noprint"><button onclick="window.print()">⬇ Save as PDF</button></div>
    <header class="mast">
      <div>
        <div class="brand">DHRUVA&trade;<small>Dynamic Holistic Resilience &amp; Unified Vigilance Architecture</small></div>
      </div>
      <div class="doc-meta">
        <div class="doctype">SITUATION REPORT</div>
        <div>Generated ${escapeHtml(generatedAt)}</div>
        <div class="rid">${escapeHtml(reportId)}</div>
      </div>
    </header>

    <h2>Executive Summary</h2>
    ${tiles}
    <p style="color:#4b5563;margin:12px 2px 0">
      As of report time, DHRUVA is tracking <strong>${total}</strong> active event(s) across all sources
      (${critical} critical, ${high} high). India strategic posture is <strong style="color:${postureColor}">${posture}</strong>
      (${indiaScore}/100)${wlActive ? `, with <strong>${watched.length}</strong> event(s) matching the active watchlist` : ''}.
    </p>

    ${watchSection}

    <h2>Full Operating Picture</h2>
    ${byKind || '<p class="empty">No active events across any source.</p>'}

    <footer>
      <span>Generated by DHRUVA &middot; Sources: USGS, EONET/GDACS, ReliefWeb, SACHET/NDMA, CISA, GDELT</span>
      <span>${escapeHtml(reportId)}</span>
    </footer>
  </div>
  <script>window.addEventListener('load', function () { setTimeout(function () { try { window.print(); } catch (e) {} }, 350); });</script>
</body>
</html>`;
}

/** Write the SITREP to the device cache and hand it to the native share sheet. */
async function exportSituationReportNative(html: string): Promise<void> {
  try {
    const { Filesystem, Share } = nativeFileShare();
    if (!Filesystem?.writeFile || !Share?.share) return;
    const fileName = `DHRUVA-SITREP-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}Z.html`;
    const res = await Filesystem.writeFile({
      path: fileName,
      data: html,
      directory: 'CACHE', // Directory.Cache
      encoding: 'utf8',   // Encoding.UTF8
    });
    await Share.share({
      title: 'DHRUVA Situation Report',
      text: 'DHRUVA situation report',
      url: res.uri,
      dialogTitle: 'Export Situation Report',
    });
  } catch {
    /* best-effort native export */
  }
}

/** Open the SITREP in a new window and trigger print. Falls back to a download if popups are blocked. */
export function exportSituationReport(input: SitrepInput): void {
  const html = generateSituationReportHTML(input);
  // Packaged app: save the report to the device and open the OS share sheet
  // (save to Files / print / mail) — WebViews can't print or download like a browser.
  if (isNative()) {
    void exportSituationReportNative(html);
    return;
  }
  const win = window.open('', '_blank');
  if (win && win.document) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    return;
  }
  // Popup blocked — fall back to downloading the report file.
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DHRUVA-SITREP-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}Z.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
