import type { IncomingMessage, ServerResponse } from 'node:http';
import { db } from '../../../lib/db/client';
import { sendJson } from '../../../lib/http';
import { requireAuth } from '../../../lib/admin-auth';

interface RunRow {
  run_id: string; started_at: string; finished_at: string | null;
  journey_count: number; fare_count: number; failed_files: number; status: string; notes: string | null;
}
export function mapRun(r: RunRow) {
  return {
    runId: r.run_id, startedAt: r.started_at, finishedAt: r.finished_at,
    journeyCount: r.journey_count, fareCount: r.fare_count, failedFiles: r.failed_files,
    status: r.status, notes: r.notes,
  };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'agent');
  if (!user) return;
  if (req.method !== 'GET') { res.statusCode = 405; res.setHeader('Allow', 'GET'); return res.end(); }
  try {
    const sql = db();
    const rows = (await sql`
      SELECT run_id, started_at, finished_at, journey_count, fare_count, failed_files, status, notes
      FROM ingest_runs ORDER BY started_at DESC LIMIT 1
    `) as RunRow[];
    return sendJson(res, 200, { ok: true, run: rows[0] ? mapRun(rows[0]) : null });
  } catch (err) {
    console.error('[admin/ingest/status]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
