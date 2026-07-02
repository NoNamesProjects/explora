import type { IncomingMessage, ServerResponse } from 'node:http';
import { db } from '../../../lib/db/client';
import { sendJson } from '../../../lib/http';
import { requireAuth } from '../../../lib/admin-auth';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'agent');
  if (!user) return;
  if (req.method !== 'GET') { res.statusCode = 405; res.setHeader('Allow', 'GET'); return res.end(); }
  const sql = db();
  try {
    const rows = (await sql`
      SELECT s.ship_cd, s.ship_name, s.imo, s.decks, s.capacity, s.launch_year,
             (SELECT count(*) FROM journeys j WHERE j.ship_cd = s.ship_cd AND j.is_available)::int AS active_journeys
      FROM ships s ORDER BY s.ship_name
    `) as Array<Record<string, unknown>>;
    return sendJson(res, 200, { ok: true, items: rows });
  } catch (err) {
    console.error('[admin/catalog/ships]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
