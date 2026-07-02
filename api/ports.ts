/**
 * GET /api/ports — all ports, cached aggressively.
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
      SELECT port_cd, port_name, country, lat, lon, timezone
      FROM ports
      ORDER BY port_name ASC
    `) as Array<Record<string, unknown>>;

    res.statusCode = 200;
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400');
    res.end(JSON.stringify({ ok: true, ports: rows }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/ports] failed:', message);
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: 'server-error' }));
  }
}
