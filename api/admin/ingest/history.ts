import type { IncomingMessage, ServerResponse } from 'node:http';
import { db } from '../../../lib/db/client';
import { sendJson } from '../../../lib/http';
import { requireAuth } from '../../../lib/admin-auth';
import { mapRun } from './status';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'agent');
  if (!user) return;
  if (req.method !== 'GET') { res.statusCode = 405; res.setHeader('Allow', 'GET'); return res.end(); }
  const limit = Math.min(100, Math.max(1, Number(new URL(req.url ?? '', 'http://x').searchParams.get('limit')) || 25));
  try {
    const sql = db();
    const rows = (await sql`
      SELECT run_id, started_at, finished_at, journey_count, fare_count, failed_files, status, notes
      FROM ingest_runs ORDER BY started_at DESC LIMIT ${limit}
    `) as Parameters<typeof mapRun>[0][];
    return sendJson(res, 200, { ok: true, runs: rows.map(mapRun) });
  } catch (err) {
    console.error('[admin/ingest/history]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
