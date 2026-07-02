// Long-running Node entrypoint for cPanel Passenger / any classic Node host.
// Mounts every Vercel-style handler in api/ as an Express route and serves
// the Vite static build out of dist/.
//
// On Vercel we use the file-system routing in api/ directly; this file is
// unused there. On cPanel "Setup Node.js App", set Application Startup File
// = server.js and Application Mode = Production.
//
// Pattern lifted from Pame_Costa/server.js.

import express from 'express';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { adapt } from './lib/vercel-adapter.mjs';

// Lazy-load handlers so a partial scaffold (e.g. missing api/journeys.ts)
// doesn't crash boot — each handler is mounted only if its file exists.
async function maybe(path) {
  const abs = new URL(path, import.meta.url);
  if (!existsSync(abs)) return null;
  const mod = await import(path);
  return mod.default;
}

// Best-effort .env load. cPanel's Environment Variables panel is the
// recommended source on production; .env is only for local testing.
try {
  const { readFileSync } = await import('node:fs');
  for (const candidate of ['./.env.local', './.env']) {
    const url = new URL(candidate, import.meta.url);
    if (!existsSync(url)) continue;
    const txt = readFileSync(url, 'utf8');
    for (const line of txt.split('\n')) {
      const m = /^([A-Z_][A-Z0-9_]*)\s*=\s*"?(.*?)"?$/.exec(line.trim());
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
} catch { /* host-provided env */ }

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, 'dist');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

// ── Public API ─────────────────────────────────────────────────────────────
const journeys = await maybe('./api/journeys.js');
const journeyById = await maybe('./api/journeys/[id].js');
const ports = await maybe('./api/ports.js');
const ships = await maybe('./api/ships.js');
const shipByCode = await maybe('./api/ships/[code].js');
const newsletter = await maybe('./api/newsletter.js');
const contact = await maybe('./api/contact.js');
const health = await maybe('./api/health.js');
const bookingRequest = await maybe('./api/booking-request.js');
const bookingRequestByRef = await maybe('./api/booking-request/[ref].js');
const paypalCreate = await maybe('./api/paypal/create-order.js');
const paypalCapture = await maybe('./api/paypal/capture-order.js');

if (journeys) app.all('/api/journeys', adapt(journeys));
if (journeyById) app.all('/api/journeys/:id', adapt(journeyById));
if (ports) app.all('/api/ports', adapt(ports));
if (ships) app.all('/api/ships', adapt(ships));
if (shipByCode) app.all('/api/ships/:code', adapt(shipByCode));
if (newsletter) app.all('/api/newsletter', adapt(newsletter));
if (contact) app.all('/api/contact', adapt(contact));
if (health) app.all('/api/health', adapt(health));
if (bookingRequest) app.all('/api/booking-request', adapt(bookingRequest));
if (bookingRequestByRef) app.all('/api/booking-request/:ref', adapt(bookingRequestByRef));
if (paypalCreate) app.all('/api/paypal/create-order', adapt(paypalCreate));
if (paypalCapture) app.all('/api/paypal/capture-order', adapt(paypalCapture));

// ── Client CMS: public content bundle + newsletter confirm/unsubscribe ──
const content = await maybe('./api/content.js');
const contentVersion = await maybe('./api/content/version.js');
const nlConfirm = await maybe('./api/newsletter/confirm.js');
const nlUnsub = await maybe('./api/newsletter/unsubscribe.js');
if (content) app.all('/api/content', adapt(content));
if (contentVersion) app.all('/api/content/version', adapt(contentVersion));
if (nlConfirm) app.all('/api/newsletter/confirm', adapt(nlConfirm));
if (nlUnsub) app.all('/api/newsletter/unsubscribe', adapt(nlUnsub));

// ── Cron endpoints (bearer-protected) ──────────────────────────────────────
const ingestFlatfiles = await maybe('./api/cron/ingest-flatfiles.js');
if (ingestFlatfiles) app.all('/api/cron/ingest-flatfiles', adapt(ingestFlatfiles));

// ── Admin / operations dashboard (cookie-session gated inside each handler) ──
// Static routes mounted before their :id siblings.
const ad = (p) => maybe('./api/admin/' + p);
const adLogin = await ad('auth/login.js');         if (adLogin) app.all('/api/admin/auth/login', adapt(adLogin));
const adLogout = await ad('auth/logout.js');       if (adLogout) app.all('/api/admin/auth/logout', adapt(adLogout));
const adMe = await ad('auth/me.js');               if (adMe) app.all('/api/admin/auth/me', adapt(adMe));
const adBookings = await ad('bookings.js');        if (adBookings) app.all('/api/admin/bookings', adapt(adBookings));
const adBookingId = await ad('bookings/[id].js');  if (adBookingId) app.all('/api/admin/bookings/:id', adapt(adBookingId));
const adContacts = await ad('contacts.js');        if (adContacts) app.all('/api/admin/contacts', adapt(adContacts));
const adIngestRun = await ad('ingest/run.js');     if (adIngestRun) app.all('/api/admin/ingest/run', adapt(adIngestRun));
const adIngestStat = await ad('ingest/status.js'); if (adIngestStat) app.all('/api/admin/ingest/status', adapt(adIngestStat));
const adIngestHist = await ad('ingest/history.js');if (adIngestHist) app.all('/api/admin/ingest/history', adapt(adIngestHist));
const adCatHealth = await ad('catalog/health.js'); if (adCatHealth) app.all('/api/admin/catalog/health', adapt(adCatHealth));
const adCatJourneys = await ad('catalog/journeys.js'); if (adCatJourneys) app.all('/api/admin/catalog/journeys', adapt(adCatJourneys));
const adCatFares = await ad('catalog/fares.js');   if (adCatFares) app.all('/api/admin/catalog/fares', adapt(adCatFares));
const adCatShips = await ad('catalog/ships.js');   if (adCatShips) app.all('/api/admin/catalog/ships', adapt(adCatShips));
const adCatPorts = await ad('catalog/ports.js');   if (adCatPorts) app.all('/api/admin/catalog/ports', adapt(adCatPorts));
const adKpis = await ad('analytics/kpis.js');      if (adKpis) app.all('/api/admin/analytics/kpis', adapt(adKpis));
const adDiag = await ad('diagnostics.js');         if (adDiag) app.all('/api/admin/diagnostics', adapt(adDiag));
const adUsers = await ad('users.js');              if (adUsers) app.all('/api/admin/users', adapt(adUsers));
const adUserId = await ad('users/[id].js');        if (adUserId) app.all('/api/admin/users/:id', adapt(adUserId));
// ── Client CMS admin: content / media / pricing / subscribers ──
const adContent = await ad('content.js');            if (adContent) app.all('/api/admin/content', adapt(adContent));
const adContentPub = await ad('content/publish.js'); if (adContentPub) app.all('/api/admin/content/publish', adapt(adContentPub));
const adMedia = await ad('media.js');                if (adMedia) app.all('/api/admin/media', adapt(adMedia));
const adMediaId = await ad('media/[id].js');         if (adMediaId) app.all('/api/admin/media/:id', adapt(adMediaId));
const adCatPricing = await ad('catalog/pricing/[journeyId].js'); if (adCatPricing) app.all('/api/admin/catalog/pricing/:journeyId', adapt(adCatPricing));
const adSubs = await ad('subscribers.js');           if (adSubs) app.all('/api/admin/subscribers', adapt(adSubs));
const adBroadcast = await ad('broadcast.js');        if (adBroadcast) app.all('/api/admin/broadcast', adapt(adBroadcast));

// ── Client-uploaded media (cPanel disk) ─────────────────────────────────────
// Served from <app-root>/uploads at /uploads. Kept in lockstep with the media
// upload handler (writes to process.cwd()/uploads). Exclude uploads/ from the
// deploy rsync so a redeploy never wipes client images (see DEPLOY-CPANEL.md).
const UPLOADS_DIR = join(__dirname, 'uploads');
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d', fallthrough: true }));

// ── Static + SPA fallback ──────────────────────────────────────────────────
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, { index: false, maxAge: '1h' }));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(join(DIST_DIR, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.status(503).type('text/plain').send(
      'dist/ not built. Run `npm run build` before starting the server.',
    );
  });
}

// ── Last-resort error handler ──────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[server] unhandled', err);
  if (res.headersSent) return;
  res.status(500).json({ ok: false, error: 'server-error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
  // Loud misconfiguration warnings — these fail silently at request time.
  if (!process.env.RESEND_API_KEY) {
    console.warn('[server] ⚠️ RESEND_API_KEY is not set — newsletter confirmations, booking notifications and broadcasts will be SKIPPED (subscribers stay pending forever).');
  }
  if (!process.env.PUBLIC_BASE_URL) {
    console.warn('[server] ⚠️ PUBLIC_BASE_URL is not set — emailed links fall back to request headers and admin cookies may miss the Secure flag.');
  }
});
