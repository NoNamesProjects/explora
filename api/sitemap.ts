/**
 * GET /sitemap.xml — generated from the live catalog.
 *
 * The site is a client-rendered SPA, so a crawler that only reads the shell has
 * no way to discover the ~600 sailings, the ships or the destination regions.
 * This is the discovery path. It is generated rather than static because the
 * catalog is re-ingested nightly and stale sailing URLs would be soft-404s.
 *
 * Booking-wizard steps and /admin are deliberately absent (see public/robots.txt).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { db } from '../lib/db/client';
import { MIN_LEAD_DAYS } from '../lib/booking';

/** Public origin for absolute URLs; sitemap entries must not be relative. */
function origin(req: IncomingMessage): string {
  const configured = (process.env.PUBLIC_BASE_URL || '').trim();
  if (configured) return configured.replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim() || 'https';
  const host = (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim()
    || (req.headers.host as string | undefined) || 'localhost';
  return `${proto}://${host}`;
}

const STATIC_PATHS: Array<{ path: string; priority: string; changefreq: string }> = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/find-your-journey', priority: '0.9', changefreq: 'daily' },
  { path: '/destinations', priority: '0.8', changefreq: 'weekly' },
  { path: '/ships', priority: '0.8', changefreq: 'weekly' },
  { path: '/experience/suites', priority: '0.6', changefreq: 'monthly' },
  { path: '/experience/dining', priority: '0.6', changefreq: 'monthly' },
  { path: '/experience/wellness', priority: '0.6', changefreq: 'monthly' },
  { path: '/about', priority: '0.5', changefreq: 'monthly' },
  { path: '/contact', priority: '0.5', changefreq: 'monthly' },
  { path: '/faq', priority: '0.4', changefreq: 'monthly' },
];

function xmlEscape(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string));
}

function urlEntry(loc: string, priority: string, changefreq: string, lastmod?: string): string {
  return `  <url><loc>${xmlEscape(loc)}</loc>`
    + (lastmod ? `<lastmod>${lastmod}</lastmod>` : '')
    + `<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    return res.end();
  }

  const base = origin(req);
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = STATIC_PATHS.map((p) => urlEntry(base + p.path, p.priority, p.changefreq, today));

  try {
    const sql = db();

    // Bookable sailings only: the same gate the listing uses, so the sitemap
    // never advertises a URL that would 404.
    const journeys = (await sql`
      SELECT journey_id, sailing_date::text AS sailing_date
      FROM journeys
      WHERE is_available = true
        AND sailing_date >= CURRENT_DATE + ${MIN_LEAD_DAYS}::int
        AND ship_cd NOT IN ('EP05', 'EP06')
      ORDER BY sailing_date ASC
      LIMIT 20000
    `) as Array<{ journey_id: string; sailing_date: string }>;
    for (const j of journeys) lines.push(urlEntry(`${base}/journeys/${encodeURIComponent(j.journey_id)}`, '0.7', 'weekly', today));

    const packages = (await sql`
      SELECT public_id FROM custom_packages
      WHERE visible = true
        AND sailing_date IS NOT NULL
        AND sailing_date >= CURRENT_DATE + ${MIN_LEAD_DAYS}::int
    `) as Array<{ public_id: string }>;
    for (const p of packages) lines.push(urlEntry(`${base}/journeys/${encodeURIComponent(p.public_id)}`, '0.8', 'weekly', today));

    const ships = (await sql`
      SELECT ship_cd FROM ships WHERE ship_cd NOT IN ('EP05', 'EP06') ORDER BY ship_cd
    `) as Array<{ ship_cd: string }>;
    for (const s of ships) lines.push(urlEntry(`${base}/ships/${encodeURIComponent(s.ship_cd)}`, '0.7', 'monthly'));

    const regions = (await sql`
      SELECT DISTINCT region FROM journeys
      WHERE region IS NOT NULL AND is_available = true
    `) as Array<{ region: string }>;
    for (const r of regions) lines.push(urlEntry(`${base}/destinations/${encodeURIComponent(r.region)}`, '0.7', 'weekly'));
  } catch (err) {
    // A DB blip must not produce a broken sitemap: serve the static routes and
    // let the crawler retry rather than emitting a truncated or 500 document.
    console.error('[sitemap] catalog query failed:', err instanceof Error ? err.message : err);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lines.join('\n')}\n</urlset>\n`;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=21600');
  res.end(xml);
}
