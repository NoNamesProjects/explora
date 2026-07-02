/**
 * GET /api/ships — all ships in fleet order.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { db } from '../lib/db/client';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    return res.end(JSON.stringify({ ok: false, error: 'method-not-allowed' }));
  }

  try {
    const sql = db();
    const rows = (await sql`
      SELECT ship_cd, ship_name, imo, decks, capacity, launch_year, hero_image
      FROM ships
      WHERE ship_cd NOT IN ('EP05', 'EP06') -- EXPLORA V/VI hidden until launch
      ORDER BY ship_cd ASC
    `) as Array<Record<string, unknown>>;

    res.statusCode = 200;
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
    res.end(JSON.stringify({ ok: true, ships: rows }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/ships] failed:', message);
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: 'server-error' }));
  }
}
