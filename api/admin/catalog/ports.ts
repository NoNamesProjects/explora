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
      SELECT port_cd, port_name, country, timezone FROM ports ORDER BY port_name
    `) as Array<Record<string, unknown>>;
    return sendJson(res, 200, { ok: true, items: rows });
  } catch (err) {
    console.error('[admin/catalog/ports]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
