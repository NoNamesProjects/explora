/**
 * Cheap content-version probe — max(published_at) as an epoch-ms token. The
 * public ContentProvider polls this on focus/route-change and re-fetches
 * /api/content only when it changes (live publish → no redeploy, no reload).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { db } from '../../lib/db/client';
import { sendJson } from '../../lib/http';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    return res.end();
  }
  try {
    const sql = db();
    const rows = (await sql`
      SELECT coalesce(extract(epoch from max(published_at)) * 1000, 0) AS v
      FROM site_content WHERE published_value IS NOT NULL
    `) as Array<{ v: string | number | null }>;
    res.setHeader('Cache-Control', 'no-cache');
    return sendJson(res, 200, { ok: true, version: Math.floor(Number(rows[0]?.v ?? 0)) });
  } catch {
    return sendJson(res, 200, { ok: true, version: 0 });
  }
}
