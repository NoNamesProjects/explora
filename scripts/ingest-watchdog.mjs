#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────────
// scripts/ingest-watchdog.mjs — post-ingest sanity watchdog for Explora
//
// PURPOSE
//   Runs AFTER the nightly flatfile ingest (scripts/ingest-once.ts, driven
//   by scripts/nightly-ingest.sh) and verifies the DB still looks healthy:
//     1. Per-table row counts vs the previous run's snapshot
//        (scripts/.watchdog-last.json) — flags any table at ZERO rows, and
//        any drop > 30% (mirrors the ingest's own DROP_GUARD_RATIO).
//        Exception: `excursions` may legitimately be empty — the upstream
//        flatfile currently ships zero excursions (see logs: "Excursions:0"),
//        so it is only checked by the drop rule, not the zero rule.
//     2. Date-range sanity on available journeys — max(sailing_date) must
//        be in the future, min(sailing_date) must not be stale (> 90 days
//        past), and max(last_seen_at) must be fresh (< 36 h) so we know the
//        ingest actually touched rows.
//     3. (with --log) the last "ingest end … exit N" marker in the ingest
//        log — a non-zero exit fails the watchdog and the log tail is
//        included in the report/email.
//
// USAGE
//   node scripts/ingest-watchdog.mjs                       # checks + snapshot;
//                                                          # emails on FAILURE only
//   node scripts/ingest-watchdog.mjs --dry                 # print only: no snapshot
//                                                          # write, no email
//   node scripts/ingest-watchdog.mjs --log logs/nightly-ingest.log
//   node scripts/ingest-watchdog.mjs --help
//
//   Flags:
//     --log <path>   ingest log to inspect for the last exit code + tail
//     --dry          fully read-only: print results, do NOT write the
//                    snapshot file and do NOT send any email
//     --help         print usage, exit 0
//
//   Exit codes: 0 = all checks passed · 1 = one or more checks FAILED
//               2 = bad usage / missing env / DB unreachable
//
// WHAT IT TOUCHES
//   READ : Postgres tables ships, ports, suite_categories, journeys,
//          journey_days, fares, excursions (SELECT count/min/max only)
//   READ : .env.local then .env at the project root (same loader as
//          scripts/ingest-once.ts), the --log file, the snapshot file
//   WRITE: scripts/.watchdog-last.json — refreshed on every non --dry run
//          (so a >30% drop alerts once; the ZERO-rows check is absolute and
//          keeps firing every night until fixed)
//   SEND : one Resend email — ONLY on check failure and ONLY without --dry.
//          Raw fetch to api.resend.com mirroring lib/email.ts (that helper
//          is TypeScript and can't be imported from plain-node .mjs).
//
// REQUIREMENTS (env var NAMES only — values live in .env.local / the host)
//   DATABASE_URL            Neon or local Postgres URL          (required)
//   RESEND_API_KEY          Resend key (optional — without it the failure
//                           email is skipped with a console note, exactly
//                           like lib/email.ts behaves)
//   WATCHDOG_NOTIFY_EMAIL   failure recipient (optional — falls back to
//                           BOOKING_NOTIFY_EMAIL, then RESEND_FROM)
//   RESEND_FROM             sender (optional; same default as lib/email.ts)
// ──────────────────────────────────────────────────────────────────────────

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { neon } from '@neondatabase/serverless';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SNAPSHOT_PATH = join(__dirname, '.watchdog-last.json');

// Lightweight .env loader — same regex/order as scripts/ingest-once.ts, but
// resolved from the project root so launchd/cron cwd quirks can't break it.
for (const name of ['.env.local', '.env']) {
  const p = join(ROOT, name);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?(.*?)"?\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// ── flags ──
const USAGE = 'usage: node scripts/ingest-watchdog.mjs [--log <path>] [--dry] [--help]';
let dry = false;
let logPath = null;
{
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dry') dry = true;
    else if (a === '--log') {
      logPath = args[++i];
      if (!logPath) { console.error(`--log needs a path\n${USAGE}`); process.exit(2); }
      logPath = resolve(logPath);
    } else if (a.startsWith('--log=')) logPath = resolve(a.slice('--log='.length));
    else if (a === '--help' || a === '-h') { console.log(USAGE); process.exit(0); }
    else { console.error(`unknown flag: ${a}\n${USAGE}`); process.exit(2); }
  }
}

// ── DB client — mirrors lib/db/client.ts (Neon HTTP vs porsager by host).
//    That file is TypeScript, so the pattern is replicated here for plain node.
let client = null;
let isNeon = false;
function db() {
  if (client) return client;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set (.env.local / .env / shell).');
  try { isNeon = /\.neon\.tech$/i.test(new URL(url).host); } catch { isNeon = false; }
  client = isNeon ? neon(url) : postgres(url, { max: 2, idle_timeout: 5, onnotice: () => {} });
  return client;
}
async function rawQuery(text) {
  const sql = db();
  return isNeon ? sql.query(text) : sql.unsafe(text);
}
async function closeDb() {
  if (client && !isNeon) await client.end({ timeout: 5 }).catch(() => {});
}

// ── checks config ──
const DROP_RATIO = 0.7;        // mirror DROP_GUARD_RATIO in lib/explora-flatfile/ingest.ts
const STALE_MIN_DAYS = 90;     // min(sailing_date) older than this = stale rows surviving
const FRESH_SEEN_HOURS = 36;   // max(last_seen_at) older than this = ingest didn't touch rows
const TABLES = [
  { key: 'ships',              label: 'ships',            countSql: 'SELECT count(*)::int AS n FROM ships' },
  { key: 'ports',              label: 'ports',            countSql: 'SELECT count(*)::int AS n FROM ports' },
  { key: 'suite_categories',   label: 'suite_categories', countSql: 'SELECT count(*)::int AS n FROM suite_categories' },
  { key: 'journeys_available', label: 'journeys (avail)', countSql: 'SELECT count(*)::int AS n FROM journeys WHERE is_available = true' },
  { key: 'journey_days',       label: 'journey_days',     countSql: 'SELECT count(*)::int AS n FROM journey_days' },
  { key: 'fares',              label: 'fares',            countSql: 'SELECT count(*)::int AS n FROM fares' },
  // mayBeEmpty: the upstream flatfile currently delivers zero excursions
  // (ingest logs show "Excursions:0"), so an empty table is the norm here.
  // A wipe from a previously-nonzero baseline still fails via the drop rule.
  { key: 'excursions',         label: 'excursions',       countSql: 'SELECT count(*)::int AS n FROM excursions', mayBeEmpty: true },
];

function esc(s) {
  return String(s ?? '').replace(/[<>&"]/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]
  ));
}

function checkLog(path) {
  // Returns { failure: string|null, notes: string[], tail: string[] }.
  if (!existsSync(path)) {
    return { failure: `log: file not found: ${path}`, notes: [], tail: [] };
  }
  const lines = readFileSync(path, 'utf8').split('\n');
  let lastStart = -1;
  let lastEnd = -1;
  lines.forEach((l, i) => {
    if (l.includes('ingest start')) lastStart = i;
    if (l.includes('ingest end')) lastEnd = i;
  });
  if (lastEnd === -1) {
    return { failure: 'log: no "ingest end … exit N" marker found', notes: [], tail: lines.slice(-25) };
  }
  const tail = lines.slice(Math.max(lastStart, 0, lastEnd - 25), lastEnd + 1).slice(-25);
  const m = /exit\s+(\d+)/.exec(lines[lastEnd]);
  if (!m) return { failure: 'log: could not parse exit code from end marker', notes: [], tail };
  const code = Number.parseInt(m[1], 10);
  if (code !== 0) return { failure: `log: last ingest exited ${code}`, notes: [], tail };
  return { failure: null, notes: [`last ingest exit code 0 (${path})`], tail: [] };
}

// Failure email — raw Resend fetch mirroring lib/email.ts (never throws).
async function sendFailureEmail(failures, reportLines, tail) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.WATCHDOG_NOTIFY_EMAIL || process.env.BOOKING_NOTIFY_EMAIL || process.env.RESEND_FROM;
  const from = process.env.RESEND_FROM || 'Explora Journeys <onboarding@resend.dev>';
  if (!key || !to) {
    console.log('[watchdog] failure email skipped (RESEND_API_KEY / recipient not set)');
    return false;
  }
  const pre = 'background:#f5f7f9;padding:12px;font-size:12px;white-space:pre-wrap;overflow-x:auto';
  const html = `
    <div style="font-family:system-ui,sans-serif;color:#0C2340">
      <h2 style="margin:0 0 4px">Explora ingest watchdog — FAILED</h2>
      <p style="margin:0 0 16px;color:#4F6573">${esc(failures.length)} check(s) failed after the nightly ingest.</p>
      <ul>${failures.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
      <pre style="${pre}">${esc(reportLines.join('\n'))}</pre>
      ${tail.length ? `<p style="color:#4F6573">Ingest log tail:</p><pre style="${pre}">${esc(tail.join('\n'))}</pre>` : ''}
    </div>`;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to,
        subject: `[watchdog] Explora ingest FAILED — ${failures.length} check(s)`,
        html,
      }),
    });
    if (!res.ok) { console.error(`[watchdog] Resend ${res.status}`); return false; }
    console.log(`[watchdog] failure email sent to ${to}`);
    return true;
  } catch (e) {
    console.error('[watchdog] email send failed:', e instanceof Error ? e.message : e);
    return false;
  }
}

async function main() {
  const failures = [];
  const lines = [];
  const hr = (t) => lines.push(`── ${t} ${'─'.repeat(Math.max(3, 56 - t.length))}`);

  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  lines.push(`Explora ingest watchdog · ${stamp} UTC${dry ? ' · DRY RUN' : ''}`);
  lines.push('');

  // 1. Row counts vs snapshot.
  const counts = {};
  for (const t of TABLES) counts[t.key] = (await rawQuery(t.countSql))[0].n;

  let prev = null;
  if (existsSync(SNAPSHOT_PATH)) {
    try { prev = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')); }
    catch { lines.push('  (snapshot unreadable — drop check skipped this run)'); }
  }

  hr('Row counts vs scripts/.watchdog-last.json');
  lines.push(`  ${'table'.padEnd(20)}${'prev'.padStart(9)}${'now'.padStart(9)}${'Δ'.padStart(10)}`);
  for (const t of TABLES) {
    const cur = counts[t.key];
    const prevN = prev?.counts?.[t.key];
    let delta = '—';
    if (Number.isFinite(prevN) && prevN > 0) {
      delta = `${(((cur - prevN) / prevN) * 100).toFixed(1)}%`;
    }
    lines.push(`  ${t.label.padEnd(20)}${String(prevN ?? '—').padStart(9)}${String(cur).padStart(9)}${delta.padStart(10)}`);
    if (cur === 0 && !t.mayBeEmpty) {
      failures.push(`${t.label}: ZERO rows`);
    } else if (Number.isFinite(prevN) && prevN > 0 && cur < prevN * DROP_RATIO) {
      failures.push(`${t.label}: dropped ${prevN} → ${cur} (more than ${Math.round((1 - DROP_RATIO) * 100)}%)`);
    } else if (cur === 0 && t.mayBeEmpty) {
      lines.push(`  (${t.label}: 0 rows is allowed — upstream flatfile currently ships none)`);
    }
  }
  if (!prev) lines.push('  (no snapshot baseline yet — drop check skipped, zero-row check still applies)');
  lines.push('');

  // 2. Date-range sanity on available journeys.
  const [d] = await rawQuery(`
    SELECT
      min(sailing_date)::text AS min_dep,
      max(sailing_date)::text AS max_dep,
      (max(sailing_date) >= current_date)                                  AS has_future,
      (min(sailing_date) >= current_date - ${STALE_MIN_DAYS})              AS min_fresh,
      (max(last_seen_at) >= now() - interval '${FRESH_SEEN_HOURS} hours')  AS seen_fresh,
      to_char(max(last_seen_at), 'YYYY-MM-DD HH24:MI') AS last_seen
    FROM journeys
    WHERE is_available = true
  `);
  hr('Date sanity (available journeys)');
  const yn = (v) => (v === true ? 'yes' : 'NO');
  lines.push(`  ${'departures'.padEnd(20)}${d.min_dep ?? '—'} … ${d.max_dep ?? '—'}`);
  lines.push(`  ${'max in future'.padEnd(20)}${yn(d.has_future)}`);
  lines.push(`  ${'min not stale'.padEnd(20)}${yn(d.min_fresh)} (limit: ${STALE_MIN_DAYS} days past)`);
  lines.push(`  ${'last_seen_at fresh'.padEnd(20)}${yn(d.seen_fresh)} (max: ${d.last_seen ?? '—'}, limit: ${FRESH_SEEN_HOURS}h)`);
  if (d.has_future !== true) failures.push(`date sanity: max departure ${d.max_dep ?? 'NULL'} is not in the future`);
  if (d.min_fresh !== true) failures.push(`date sanity: min departure ${d.min_dep ?? 'NULL'} is more than ${STALE_MIN_DAYS} days past — stale rows surviving`);
  if (d.seen_fresh !== true) failures.push(`date sanity: max(last_seen_at) ${d.last_seen ?? 'NULL'} is older than ${FRESH_SEEN_HOURS}h — the ingest did not touch journeys`);
  lines.push('');

  // 3. Ingest log exit code (only when --log was given).
  let tail = [];
  if (logPath) {
    hr('Ingest log');
    const r = checkLog(logPath);
    tail = r.tail;
    if (r.failure) {
      failures.push(r.failure);
      lines.push(`  ${r.failure}`);
      if (tail.length) for (const l of tail) lines.push(`  | ${l}`);
    } else {
      for (const n of r.notes) lines.push(`  ${n}`);
    }
    lines.push('');
  }

  // Snapshot — refreshed every non --dry run (see header for the tradeoff).
  if (!dry) {
    writeFileSync(SNAPSHOT_PATH, JSON.stringify({ takenAt: new Date().toISOString(), counts }, null, 2) + '\n');
  }

  hr('Result');
  if (failures.length === 0) {
    lines.push(`  PASS — all checks ok${dry ? ' (dry — snapshot NOT updated)' : ' (snapshot updated)'}`);
  } else {
    lines.push(`  FAIL — ${failures.length} check(s):`);
    for (const f of failures) lines.push(`    • ${f}`);
    if (dry) lines.push('  (dry — no email sent, snapshot NOT updated)');
  }

  console.log(lines.join('\n'));

  if (failures.length > 0) {
    if (!dry) await sendFailureEmail(failures, lines, tail);
    process.exitCode = 1;
  }
}

try {
  await main();
} catch (err) {
  console.error(`✗ watchdog could not run: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 2;
} finally {
  await closeDb();
}
