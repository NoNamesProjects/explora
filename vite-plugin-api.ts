/**
 * Dev-only Vite plugin that mounts each api/*.ts handler as middleware on
 * Vite's dev server. Lets `npm run dev` serve both the SPA and the API on
 * port 5173 with no extra process / no proxy / no build step.
 *
 * In production these same files run as Vercel Functions (file-system
 * routing) or as Express routes via server.js — see api/ + server.js.
 *
 * The plugin also loads .env.local then .env into process.env before any
 * handler is invoked, so DB / Okta credentials work in dev too.
 */

import type { Plugin } from 'vite';
import path from 'node:path';
import { existsSync, readFileSync, createReadStream } from 'node:fs';

interface ApiRoute {
  pattern: RegExp;
  file: string;
}

const ROUTES: ApiRoute[] = [
  { pattern: /^\/api\/journeys\/?$/,                  file: 'api/journeys.ts' },
  { pattern: /^\/api\/journeys\/[^/]+\/?$/,           file: 'api/journeys/[id].ts' },
  { pattern: /^\/api\/ships\/?$/,                     file: 'api/ships.ts' },
  { pattern: /^\/api\/ships\/[^/]+\/?$/,              file: 'api/ships/[code].ts' },
  { pattern: /^\/api\/ports\/?$/,                     file: 'api/ports.ts' },
  { pattern: /^\/api\/health\/?$/,                    file: 'api/health.ts' },
  { pattern: /^\/api\/newsletter\/?$/,                file: 'api/newsletter.ts' },
  { pattern: /^\/api\/newsletter\/confirm\/?$/,       file: 'api/newsletter/confirm.ts' },
  { pattern: /^\/api\/newsletter\/unsubscribe\/?$/,   file: 'api/newsletter/unsubscribe.ts' },
  { pattern: /^\/api\/contact\/?$/,                   file: 'api/contact.ts' },
  { pattern: /^\/api\/content\/?$/,                   file: 'api/content.ts' },
  { pattern: /^\/api\/content\/version\/?$/,          file: 'api/content/version.ts' },
  { pattern: /^\/api\/content\/sections\/?$/,         file: 'api/content/sections.ts' },
  { pattern: /^\/api\/content\/entities\/?$/,         file: 'api/content/entities.ts' },
  { pattern: /^\/api\/cron\/ingest-flatfiles\/?$/,    file: 'api/cron/ingest-flatfiles.ts' },
  { pattern: /^\/api\/booking-request\/?$/,           file: 'api/booking-request.ts' },
  { pattern: /^\/api\/booking-request\/[^/]+\/?$/,    file: 'api/booking-request/[ref].ts' },
  { pattern: /^\/api\/paypal\/create-order\/?$/,      file: 'api/paypal/create-order.ts' },
  { pattern: /^\/api\/paypal\/capture-order\/?$/,     file: 'api/paypal/capture-order.ts' },

  // ── Admin / operations dashboard (cookie-session gated inside each handler) ──
  // Static segments MUST precede [param] patterns (ROUTES.find returns first match).
  { pattern: /^\/api\/admin\/auth\/login\/?$/,        file: 'api/admin/auth/login.ts' },
  { pattern: /^\/api\/admin\/auth\/logout\/?$/,       file: 'api/admin/auth/logout.ts' },
  { pattern: /^\/api\/admin\/auth\/me\/?$/,           file: 'api/admin/auth/me.ts' },
  { pattern: /^\/api\/admin\/bookings\/?$/,           file: 'api/admin/bookings.ts' },
  { pattern: /^\/api\/admin\/bookings\/[^/]+\/?$/,    file: 'api/admin/bookings/[id].ts' },
  { pattern: /^\/api\/admin\/contacts\/?$/,           file: 'api/admin/contacts.ts' },
  { pattern: /^\/api\/admin\/ingest\/run\/?$/,        file: 'api/admin/ingest/run.ts' },
  { pattern: /^\/api\/admin\/ingest\/status\/?$/,     file: 'api/admin/ingest/status.ts' },
  { pattern: /^\/api\/admin\/ingest\/history\/?$/,    file: 'api/admin/ingest/history.ts' },
  { pattern: /^\/api\/admin\/catalog\/health\/?$/,    file: 'api/admin/catalog/health.ts' },
  { pattern: /^\/api\/admin\/catalog\/journeys\/?$/,  file: 'api/admin/catalog/journeys.ts' },
  { pattern: /^\/api\/admin\/catalog\/fares\/?$/,     file: 'api/admin/catalog/fares.ts' },
  { pattern: /^\/api\/admin\/catalog\/ships\/?$/,     file: 'api/admin/catalog/ships.ts' },
  { pattern: /^\/api\/admin\/catalog\/ports\/?$/,     file: 'api/admin/catalog/ports.ts' },
  { pattern: /^\/api\/admin\/analytics\/kpis\/?$/,    file: 'api/admin/analytics/kpis.ts' },
  { pattern: /^\/api\/admin\/diagnostics\/?$/,        file: 'api/admin/diagnostics.ts' },
  { pattern: /^\/api\/admin\/users\/?$/,              file: 'api/admin/users.ts' },
  { pattern: /^\/api\/admin\/users\/[^/]+\/?$/,       file: 'api/admin/users/[id].ts' },
  // ── Client CMS: content / media / pricing / subscribers ──
  { pattern: /^\/api\/admin\/content\/publish\/?$/,   file: 'api/admin/content/publish.ts' },
  { pattern: /^\/api\/admin\/content\/?$/,            file: 'api/admin/content.ts' },
  { pattern: /^\/api\/admin\/media\/?$/,              file: 'api/admin/media.ts' },
  { pattern: /^\/api\/admin\/media\/[^/]+\/?$/,       file: 'api/admin/media/[id].ts' },
  { pattern: /^\/api\/admin\/catalog\/pricing\/[^/]+\/?$/, file: 'api/admin/catalog/pricing/[journeyId].ts' },
  { pattern: /^\/api\/admin\/subscribers\/?$/,        file: 'api/admin/subscribers.ts' },
  { pattern: /^\/api\/admin\/broadcast\/?$/,          file: 'api/admin/broadcast.ts' },
  // ── Page-builder (Tier B CMS). reorder/publish are STATIC and must precede
  //    the [id] pattern below — ROUTES.find returns the first match.
  { pattern: /^\/api\/admin\/sections\/reorder\/?$/,  file: 'api/admin/sections/reorder.ts' },
  { pattern: /^\/api\/admin\/sections\/publish\/?$/,  file: 'api/admin/sections/publish.ts' },
  { pattern: /^\/api\/admin\/sections\/?$/,           file: 'api/admin/sections.ts' },
  { pattern: /^\/api\/admin\/sections\/[^/]+\/?$/,    file: 'api/admin/sections/[id].ts' },
  { pattern: /^\/api\/admin\/entities\/?$/,           file: 'api/admin/entities.ts' },
  { pattern: /^\/api\/admin\/entities\/[^/]+\/?$/,    file: 'api/admin/entities/[slug].ts' },
];

export function apiPlugin(): Plugin {
  return {
    name: 'vite-plugin-api',
    configureServer(server) {
      const projectRoot = server.config.root;

      // Lightweight env loader — same pattern as scripts/probe.ts.
      for (const f of ['.env.local', '.env']) {
        const p = path.join(projectRoot, f);
        if (!existsSync(p)) continue;
        for (const line of readFileSync(p, 'utf8').split('\n')) {
          const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?(.*?)"?\s*$/.exec(line);
          if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
        }
      }

      // Serve client-uploaded media from <root>/uploads (the cPanel-disk store)
      // so thumbnails resolve during `npm run dev`.
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '/').split('?')[0];
        if (!url.startsWith('/uploads/')) return next();
        const rel = decodeURIComponent(url.slice('/uploads/'.length));
        if (!rel || rel.includes('..') || rel.includes('\0')) {
          res.statusCode = 403;
          return res.end();
        }
        const filePath = path.join(projectRoot, 'uploads', rel);
        if (!existsSync(filePath)) {
          res.statusCode = 404;
          return res.end();
        }
        const ext = path.extname(filePath).toLowerCase();
        const mime =
          ext === '.png' ? 'image/png'
          : ext === '.webp' ? 'image/webp'
          : ext === '.gif' ? 'image/gif'
          : 'image/jpeg';
        res.setHeader('Content-Type', mime);
        res.setHeader('Cache-Control', 'no-cache');
        return createReadStream(filePath).pipe(res);
      });

      server.middlewares.use(async (req, res, next) => {
        const reqUrl = req.url ?? '/';
        if (!reqUrl.startsWith('/api/')) return next();

        const pathOnly = reqUrl.split('?')[0];
        const route = ROUTES.find((r) => r.pattern.test(pathOnly));
        if (!route) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ ok: false, error: 'route-not-found', path: pathOnly }));
        }

        try {
          const mod = await server.ssrLoadModule(path.join(projectRoot, route.file));
          const handler = (mod as { default?: unknown }).default;
          if (typeof handler !== 'function') {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ ok: false, error: 'no-default-export', file: route.file }));
          }
          // Hand the raw IncomingMessage/ServerResponse to the handler.
          await (handler as (req: typeof req, res: typeof res) => Promise<void> | void)(req, res);
        } catch (err) {
          // Mirror server.js: client faults carrying a 4xx status (e.g. the
          // 413 BodyTooLargeError from lib/http readJson) keep their status
          // in dev too, so behavior matches production.
          const status = Number((err as { statusCode?: number; status?: number })?.statusCode
            ?? (err as { status?: number })?.status);
          if (!res.headersSent && Number.isInteger(status) && status >= 400 && status < 500) {
            res.statusCode = status;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ ok: false, error: status === 413 ? 'body-too-large' : 'bad-request' }));
          }
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[api ${pathOnly}]`, msg);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'dev-handler-failed', message: msg }));
          }
        }
      });
    },
  };
}
