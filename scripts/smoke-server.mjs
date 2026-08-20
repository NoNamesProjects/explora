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

// 1b) Seed the smoke fixtures (idempotent; clearly-namespaced SMOKE* rows) so
//     the booking/PayPal/newsletter/auth checks below run without any secrets.
console.log('• Seeding smoke fixtures (npm run seed:smoke)…');
const seed = spawnSync('npm', ['run', 'seed:smoke'], { stdio: 'inherit' });
if (seed.status !== 0) { console.error('✗ seed:smoke failed'); process.exit(1); }

// 1c) Seed the demo custom package (own tables, ingest-proof) so the
//     custom-package listing / detail / booking checks below have a subject.
console.log('• Seeding custom package fixture (npm run seed:custom-package)…');
const seedPkg = spawnSync('npm', ['run', 'seed:custom-package'], { stdio: 'inherit' });
if (seedPkg.status !== 0) { console.error('✗ seed:custom-package failed'); process.exit(1); }

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

// Fixture constants — must match scripts/seed-smoke.ts SMOKE.
const FX = {
  journeyOk: 'SMOKEJ1', journeyGone: 'SMOKEJ2', suite: 'OT1', fareCode: 'ALLIN',
  bookingRef: 'EXP-SMOKE1', orderId: 'TESTORDER123', confirmToken: 'smoke-confirm-token',
  adminEmail: 'smoke-admin@example.com', adminPassword: 'smoke-Admin-pass-1',
  agentEmail: 'smoke-agent@example.com', agentPassword: 'smoke-Agent-pass-1',
};
const JSON_POST = (body) => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const bookingBody = (journeyId) => ({
  journeyId, suiteCategory: FX.suite, fareCode: FX.fareCode, guestCount: 2, adults: 2,
  guests: [{ firstName: 'Smoke', lastName: 'One', lead: true, type: 'adult' }, { firstName: 'Smoke', lastName: 'Two', type: 'adult' }],
});
async function login(email, password) {
  const r = await get('/api/admin/auth/login', JSON_POST({ email, password }));
  const cookie = (r.headers.get('set-cookie') ?? '').split(';')[0];
  return r.status === 200 && cookie.startsWith('exp_admin=') ? cookie : null;
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
  ['GET  /api/cron (forged x-vercel-cron)→401', async () => (await get('/api/cron/ingest-flatfiles', { headers: { 'x-vercel-cron': '1' } })).status === 401],
  ['GET  /api/missing → 404',       async () => (await get('/api/nope')).status === 404],

  // ── Money safety (no PayPal creds needed — these assert the guards) ──────
  ['POST /api/booking-request (deposit = override price)', async () => {
    const d = await json('/api/booking-request', JSON_POST(bookingBody(FX.journeyOk)));
    // override 1500 × 2 adults = 3000 indicative → 20% deposit = 600
    return d.ok === true && d.indicativeTotal === 3000 && d.depositAmount === 600 && /^EXP-/.test(d.ref);
  }],
  ['POST /api/booking-request (withdrawn journey) → 409', async () =>
    (await get('/api/booking-request', JSON_POST(bookingBody(FX.journeyGone)))).status === 409],

  // ── Server-side party validation (anti-tamper: price derives from the guest list) ──
  ['POST /api/booking-request tamper: guestCount ≠ guest list → 400', async () =>
    (await get('/api/booking-request', JSON_POST({ ...bookingBody(FX.journeyOk), guestCount: 4 }))).status === 400],
  ['POST /api/booking-request tamper: adults claim ≠ guest list → 400', async () =>
    (await get('/api/booking-request', JSON_POST({ ...bookingBody(FX.journeyOk), adults: 1 }))).status === 400],
  ['POST /api/booking-request over capacity (3 in 2-berth OT1) → 400', async () =>
    (await get('/api/booking-request', JSON_POST({
      journeyId: FX.journeyOk, suiteCategory: FX.suite, fareCode: FX.fareCode, guestCount: 3, adults: 3,
      guests: [{ firstName: 'A', lastName: 'One', lead: true, type: 'adult' }, { firstName: 'A', lastName: 'Two', type: 'adult' }, { firstName: 'A', lastName: 'Three', type: 'adult' }],
    }))).status === 400],
  ['POST /api/booking-request no adult (child only) → 400', async () =>
    (await get('/api/booking-request', JSON_POST({
      journeyId: FX.journeyOk, suiteCategory: FX.suite, fareCode: FX.fareCode, guestCount: 1, children: 1,
      guests: [{ firstName: 'K', lastName: 'Kid', type: 'child' }],
    }))).status === 400],
  ['POST /api/booking-request 1 adult + 1 infant → accepted, priced as solo', async () => {
    const d = await json('/api/booking-request', JSON_POST({
      journeyId: FX.journeyOk, suiteCategory: FX.suite, fareCode: FX.fareCode, guestCount: 2, adults: 1, infants: 1,
      guests: [{ firstName: 'Solo', lastName: 'Parent', lead: true, type: 'adult' }, { firstName: 'Baby', lastName: 'One', type: 'infant' }],
    }));
    // OT1/ALLIN has no solo premium in the fixture, so solo == override 1500; infant free; 20% deposit = 300.
    return d.ok === true && d.indicativeTotal === 1500 && d.depositAmount === 300;
  }],
  ['POST /api/paypal/capture-order (wrong orderId) → 409 order-mismatch', async () => {
    const r = await get('/api/paypal/capture-order', JSON_POST({ ref: FX.bookingRef, orderId: 'SOMETHING-ELSE' }));
    return r.status === 409 && (await r.json()).error === 'order-mismatch';
  }],
  ['POST /api/paypal/capture-order (bound orderId, no creds) → 502, never fake-paid', async () => {
    const r = await get('/api/paypal/capture-order', JSON_POST({ ref: FX.bookingRef, orderId: FX.orderId }));
    if (r.status !== 502) return false;
    const b = await json(`/api/booking-request/${FX.bookingRef}`);
    return b.booking?.status === 'pending'; // no fabricated capture marked it paid
  }],

  // ── Newsletter double-opt-in: GET is a non-mutating interstitial ─────────
  ['GET  /api/newsletter/confirm → interstitial form (no mutation)', async () => {
    const r1 = await get(`/api/newsletter/confirm?token=${FX.confirmToken}`);
    const html = await r1.text();
    const r2 = await get(`/api/newsletter/confirm?token=${FX.confirmToken}`); // still valid ⇒ GET didn't consume it
    return r1.status === 200 && html.includes('<form') && r2.status === 200;
  }],
  ['POST /api/newsletter/confirm → confirms (single-use)', async () => {
    const r = await get(`/api/newsletter/confirm?token=${FX.confirmToken}`, { method: 'POST' });
    const again = await get(`/api/newsletter/confirm?token=${FX.confirmToken}`);
    return r.status === 200 && again.status === 404; // token consumed by the POST
  }],

  // ── Admin auth + PII export role gating ───────────────────────────────────
  ['POST /api/admin/auth/login (agent+admin) → session cookies', async () => {
    const agent = await login(FX.agentEmail, FX.agentPassword);
    const admin = await login(FX.adminEmail, FX.adminPassword);
    return Boolean(agent && admin);
  }],
  ['GET  /api/admin/subscribers CSV: agent → 403, admin → 200', async () => {
    const agent = await login(FX.agentEmail, FX.agentPassword);
    const admin = await login(FX.adminEmail, FX.adminPassword);
    if (!agent || !admin) return false;
    const rAgent = await get('/api/admin/subscribers?format=csv', { headers: { cookie: agent } });
    const rAdmin = await get('/api/admin/subscribers?format=csv', { headers: { cookie: admin } });
    const rList = await get('/api/admin/subscribers', { headers: { cookie: agent } });
    return rAgent.status === 403 && rAdmin.status === 200 && rList.status === 200;
  }],
  ['GET  /api/admin/ingest/status (no cookie) → 401', async () =>
    (await get('/api/admin/ingest/status')).status === 401],

  // ── Admin surface wired + gated (every endpoint 401s without a session) ──
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
    '/api/admin/sections',
    '/api/admin/sections/1',
    '/api/admin/sections/reorder',
    '/api/admin/sections/publish',
    '/api/admin/entities',
    '/api/admin/entities/explora-i',
  ].map((p) => [`GET  ${p} (no auth)→401`, async () => (await get(p)).status === 401]),

  // ── Page-builder public read: open, and never leaks drafts to anon ──────────
  ['GET  /api/content/sections?page=home → 200 published list', async () => {
    const b = await json('/api/content/sections?page=home');
    return b.ok === true && Array.isArray(b.items);
  }],
  ['GET  /api/content/sections?draft=1 (no auth) → serves PUBLISHED, not drafts', async () => {
    // draft:false is the security assertion — an anonymous caller asking for
    // drafts must silently fall back to published, never see unpublished work.
    return (await json('/api/content/sections?page=home&draft=1')).draft === false;
  }],
  ['GET  /api/content/sections (no page) → 400', async () => (await get('/api/content/sections')).status === 400],

  // ── Entities: public list is open, hidden records stay hidden ──────────────
  ['GET  /api/content/entities?kind=ship → 200 list', async () => {
    const b = await json('/api/content/entities?kind=ship');
    return b.ok === true && Array.isArray(b.items);
  }],
  ['GET  /api/content/entities hidden ship (no auth) → 404', async () =>
    (await get('/api/content/entities?kind=ship&slug=explora-v')).status === 404],
  ['GET  /api/content/entities unknown slug → 404 (never a silent fallback)', async () =>
    (await get('/api/content/entities?kind=ship&slug=no-such-ship')).status === 404],
  ['GET  /api/content/entities (no kind) → 400', async () =>
    (await get('/api/content/entities')).status === 400],

  // ── Custom packages: own tables, merged into the public paths, bookable ────
  ['CUSTOM: seeded package is listed alongside feed sailings', async () => {
    // Query the package's own departure month so the assertion does not depend
    // on how many feed sailings happen to sort ahead of it.
    const detail = await json('/api/journeys/CUSTOM-demo-ionian-signature');
    const month = String(detail.journey.sailingDate).slice(0, 7);
    const d = await json(`/api/journeys?month=${month}&pageSize=60`);
    const c = (d.journeys ?? []).filter((j) => j.isCustom);
    return c.length >= 1 && c.every((j) => j.journeyId.startsWith('CUSTOM-') && j.heroImage);
  }],
  ['CUSTOM: detail returns custom copy, photos, itinerary + fares', async () => {
    const d = await json('/api/journeys/CUSTOM-demo-ionian-signature');
    return d.ok === true && d.journey.isCustom === true
      && (d.journey.photos?.length ?? 0) > 0 && (d.journey.inclusions?.length ?? 0) > 0
      && d.days.length > 0 && d.fares.length > 0
      && typeof d.fares[0].prices['2A'] === 'number';
  }],
  ['CUSTOM: unknown package id → 404', async () =>
    (await get('/api/journeys/CUSTOM-does-not-exist')).status === 404],
  ['CUSTOM: bookable — 2 adults priced from the custom rate card', async () => {
    const d = await json('/api/booking-request', JSON_POST({
      journeyId: 'CUSTOM-demo-ionian-signature', suiteCategory: 'OT1', fareCode: 'SIGNATURE',
      guestCount: 2, adults: 2,
      guests: [{ firstName: 'C', lastName: 'One', lead: true, type: 'adult' }, { firstName: 'C', lastName: 'Two', type: 'adult' }],
    }));
    // 2 × 3200 per-person = 6400, 20% deposit = 1280
    return d.ok === true && d.indicativeTotal === 6400 && d.depositAmount === 1280;
  }],
  ['CUSTOM: lone adult + infant pays the SOLO fare (5120), not double', async () => {
    const d = await json('/api/booking-request', JSON_POST({
      journeyId: 'CUSTOM-demo-ionian-signature', suiteCategory: 'OT1', fareCode: 'SIGNATURE',
      guestCount: 2, adults: 1, infants: 1,
      guests: [{ firstName: 'P', lastName: 'Parent', lead: true, type: 'adult' }, { firstName: 'B', lastName: 'Baby', type: 'infant' }],
    }));
    return d.ok === true && d.indicativeTotal === 5120;
  }],
  ['CUSTOM: over suite capacity → 400', async () =>
    (await get('/api/booking-request', JSON_POST({
      journeyId: 'CUSTOM-demo-ionian-signature', suiteCategory: 'OT1', fareCode: 'SIGNATURE',
      guestCount: 3, adults: 3,
      guests: [{ firstName: 'A', lastName: '1', lead: true, type: 'adult' }, { firstName: 'A', lastName: '2', type: 'adult' }, { firstName: 'A', lastName: '3', type: 'adult' }],
    }))).status === 400],
  ['CUSTOM: admin endpoints gated (no auth)→401', async () => {
    const a = await get('/api/admin/custom-packages');
    const b = await get('/api/admin/custom-packages/1');
    return a.status === 401 && b.status === 401;
  }],

  // ── CSRF origin gate: mutations with a browser Origin must be same-origin ──
  ['POST /api/admin/broadcast (foreign Origin, valid cookie) → 403 cross-origin', async () => {
    const admin = await login(FX.adminEmail, FX.adminPassword);
    if (!admin) return false;
    const r = await get('/api/admin/broadcast', { method: 'POST', headers: { 'content-type': 'application/json', cookie: admin, origin: 'https://evil.example' }, body: '{}' });
    return r.status === 403 && (await r.json()).error === 'cross-origin';
  }],
  ['POST /api/admin/broadcast (same Origin) → passes the gate (400 invalid body)', async () => {
    const admin = await login(FX.adminEmail, FX.adminPassword);
    if (!admin) return false;
    const r = await get('/api/admin/broadcast', { method: 'POST', headers: { 'content-type': 'application/json', cookie: admin, origin: `http://localhost:${PORT}` }, body: '{}' });
    return r.status === 400;
  }],

  // ── Abuse guards: body-size cap + rate limits (run LAST — they burn windows) ──
  ['POST 300kb text/plain body → 413 (readJson cap, no OOM)', async () => {
    const r = await get('/api/contact', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'x'.repeat(300 * 1024) });
    return r.status === 413;
  }],
  ['POST 300kb JSON body → 413 (express.json cap mapped, not 500)', async () => {
    const r = await get('/api/contact', JSON_POST({ name: 'S', email: 's@example.com', message: 'y'.repeat(300 * 1024) }));
    return r.status === 413;
  }],
  ['POST malformed JSON → 400 (not 500)', async () => {
    const r = await get('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{broken' });
    return r.status === 400;
  }],
  ['GET  /api/health after oversized posts → still healthy', async () => (await json('/api/health')).ok === true],
  ['POST /api/newsletter plus-tag variants share one cooldown → 429 on 4th', async () => {
    // cooldown+a@… / +b / +c / +d all deliver to cooldown@… — the per-email
    // limiter (3/h) must key on the canonical address, not the raw string.
    for (let i = 0; i < 4; i++) {
      const r = await get('/api/newsletter', JSON_POST({ email: `cooldown+${i}@example.com` }));
      if (i < 3 && r.status !== 200) return false;
      if (i === 3) return r.status === 429;
    }
    return false;
  }],
  ['POST /api/contact flood → 429 rate-limited', async () => {
    for (let i = 0; i < 12; i++) {
      const r = await get('/api/contact', JSON_POST({}));
      if (r.status === 429) return r.headers.get('retry-after') != null;
    }
    return false;
  }],
  ['POST /api/newsletter flood → 429 rate-limited', async () => {
    for (let i = 0; i < 12; i++) {
      const r = await get('/api/newsletter', JSON_POST({}));
      if (r.status === 429) return (await r.json()).error === 'rate-limited';
    }
    return false;
  }],
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
