/**
 * GET /api/ships/:code — single ship by ship_cd.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { db } from '../../lib/db/client';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    return res.end(JSON.stringify({ ok: false, error: 'method-not-allowed' }));
  }

  const url = new URL(req.url ?? '/', 'http://x');
  const parts = url.pathname.split('/').filter(Boolean);
  const code = decodeURIComponent(parts[parts.length - 1] ?? '').toUpperCase();

  if (!code || code.length > 20) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, error: 'invalid-code' }));
  }

  try {
    const sql = db();
    const rows = (await sql`
      SELECT ship_cd, ship_name, imo, decks, capacity, launch_year, hero_image
      FROM ships
      WHERE ship_cd = ${code}
        AND ship_cd NOT IN ('EP05', 'EP06') -- EXPLORA V/VI hidden until launch
      LIMIT 1
    `) as Array<Record<string, unknown>>;

    if (!rows.length) {
      res.statusCode = 404;
      return res.end(JSON.stringify({ ok: false, error: 'not-found' }));
    }

    res.statusCode = 200;
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
    res.end(JSON.stringify({ ok: true, ship: rows[0] }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/ships/:code] failed:', message);
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: 'server-error' }));
  }
}
