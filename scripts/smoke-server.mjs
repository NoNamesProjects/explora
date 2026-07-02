/**
 * Backend smoke test for the cPanel / Passenger (Express) path.
 *
 * Compiles the api handlers, boots `server.js` on a free port, hits every
 * endpoint, prints PASS/FAIL per check, tears the server down, and exits
 * non-zero on any failure. Run this before every cPanel upload:
 *
 *   npm run smoke
 *
 * It exercises the SAME compiled handlers + Express adapter that run on cPanel,
 * so a green run means the production backend is sound. (API-only — it does not
 * require the SPA `dist/` build.)
 */
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = Number(process.env.SMOKE_PORT) || 4517;
const BASE = `http://localhost:${PORT}`;

// 1) Ensure the handlers are compiled (fast — esbuild, ~10ms).
console.log('• Building server handlers (npm run build:server)…');
const build = spawnSync('npm', ['run', 'build:server'], { stdio: 'inherit' });
if (build.status !== 0) { console.error('✗ build:server failed'); process.exit(1); }

// 2) Boot server.js on the smoke port.
console.log(`• Booting server.js on :${PORT}…`);
const srv = spawn('node', ['server.js'], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let stderr = '';
srv.stderr.on('data', (b) => { stderr += b.toString(); });

async function get(path, opts) {
  const ctrl = new AbortController();
  const tm = setTimeout(() => ctrl.abort(), 8000);
  try { return await fetch(`${BASE}${path}`, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(tm); }
}
async function json(path, opts) { return (await get(path, opts)).json(); }

async function waitForUp() {
  for (let i = 0; i < 50; i++) {
    try { const r = await get('/api/health'); if (r.ok) return true; } catch { /* not up yet */ }
    await sleep(200);
  }
  return false;
}

const checks = [
  ['GET  /api/health',              async () => (await json('/api/health')).ok === true],
  ['GET  /api/journeys',            async () => { const d = await json('/api/journeys'); return d.total > 0 && (d.journeys?.length ?? 0) > 0; }],
  ['GET  /api/journeys?page=2',     async () => (await json('/api/journeys?page=2')).page === 2],
  ['GET  /api/journeys/:id',        async () => { const list = await json('/api/journeys'); const id = list.journeys[0].journeyId; const d = await json(`/api/journeys/${id}`); return d.ok === true && Array.isArray(d.fares); }],
  ['GET  /api/ships (visible fleet)', async () => { const s = (await json('/api/ships')).ships ?? []; return s.length === 4 && !s.some((x) => ['EP05', 'EP06'].includes(x.ship_cd)); }],
  ['GET  /api/ships/EP01',          async () => (await json('/api/ships/EP01')).ok === true],
  ['GET  /api/ports',               async () => ((await json('/api/ports')).ports?.length ?? 0) > 0],
  ['POST /api/contact (valid)',     async () => (await json('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Smoke', email: 'smoke@example.com', message: 'smoke' }) })).ok === true],
  ['POST /api/contact (invalid)',   async () => (await get('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'x' }) })).status === 400],
  ['POST /api/newsletter',          async () => (await json('/api/newsletter', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'smoke@example.com', consent: true }) })).ok === true],
  ['GET  /api/booking-request/:ref',async () => (await get('/api/booking-request/EXP-NONE')).status === 404],
  ['POST /api/paypal/create-order', async () => { const r = await get('/api/paypal/create-order', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ref: 'EXP-NONE' }) }); return r.status !== 500; }],
  ['GET  /api/cron (no bearer)→401', async () => (await get('/api/cron/ingest-flatfiles')).status === 401],
  ['GET  /api/missing → 404',       async () => (await get('/api/nope')).status === 404],
  // Admin surface: login is reachable + validates, and every gated endpoint (incl.
  // dynamic segments) is mounted on the Express/cPanel runtime and 401s without a
  // session. requireAuth runs first in every handler, so an unauth GET → 401 even
  // on POST-only routes — a uniform "is it wired + gated?" probe across all 3 runtimes.
  ['POST /api/admin/auth/login (invalid)→400', async () => (await get('/api/admin/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status === 400],
  ...[
    '/api/admin/auth/me',
    '/api/admin/bookings',
    '/api/admin/bookings/1',
    '/api/admin/contacts',
    '/api/admin/ingest/status',
    '/api/admin/ingest/history',
    '/api/admin/ingest/run',
    '/api/admin/catalog/health',
    '/api/admin/catalog/journeys',
    '/api/admin/catalog/fares',
    '/api/admin/catalog/ships',
    '/api/admin/catalog/ports',
    '/api/admin/catalog/pricing/EP01X',
    '/api/admin/analytics/kpis',
    '/api/admin/diagnostics',
    '/api/admin/users',
    '/api/admin/users/1',
    '/api/admin/content',
    '/api/admin/content/publish',
    '/api/admin/media',
    '/api/admin/media/1',
    '/api/admin/subscribers',
    '/api/admin/broadcast',
  ].map((p) => [`GET  ${p} (no auth)→401`, async () => (await get(p)).status === 401]),
];

let failures = 0;
try {
  if (!(await waitForUp())) {
    console.error('✗ server did not become healthy in time');
    console.error(stderr.split('\n').slice(-8).join('\n'));
    failures = 1;
  } else {
    for (const [name, fn] of checks) {
      let ok = false, err = '';
      try { ok = await fn(); } catch (e) { err = e instanceof Error ? e.message : String(e); }
      if (!ok) failures++;
      console.log(`  ${ok ? '✓' : '✗'} ${name}${err ? `  (${err})` : ''}`);
    }
    // Surface any server-side errors logged while serving the checks.
    const errLines = stderr.split('\n').filter((l) => /error|unhandled|TypeError/i.test(l) && !/listening/.test(l));
    if (errLines.length) { failures++; console.log('  ✗ server stderr not clean:\n' + errLines.slice(-5).map((l) => '      ' + l).join('\n')); }
    else console.log('  ✓ server stderr clean');
  }
} finally {
  srv.kill('SIGTERM');
}

console.log(failures === 0
  ? `\n✅ Backend smoke PASSED — ${checks.length} checks green. Ready for cPanel upload.`
  : `\n❌ Backend smoke FAILED — ${failures} issue(s). Do not upload until green.`);
process.exit(failures === 0 ? 0 : 1);
