import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { db } from '../../../lib/db/client';
import { sendJson } from '../../../lib/http';
import { requireAuth, logAdminAction } from '../../../lib/admin-auth';
import { runIngest, IngestAbort } from '../../../lib/explora-flatfile/ingest';
import { ExploraEnvError } from '../../../lib/explora-flatfile/env';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'admin');
  if (!user) return;
  if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Allow', 'POST'); return res.end(); }

  const sql = db();
  // Reap zombie rows (crashed process) so a stale 'running' can't block forever.
  await sql`
    UPDATE ingest_runs SET status = 'failed', finished_at = now(),
      notes = coalesce(notes || ' — ', '') || 'stale: no completion after 30 minutes'
    WHERE status = 'running' AND started_at < now() - interval '30 minutes'
  `;

  // Concurrency guard — pre-claim the run row atomically (the partial unique
  // index ingest_runs_one_running_idx allows at most one 'running' row, so two
  // simultaneous POSTs can never both claim). runId is passed to runIngest,
  // which finds the row already present and does NOT re-abort on the conflict.
  const runId = randomUUID();
  const claimed = (await sql`
    INSERT INTO ingest_runs (run_id, status)
    SELECT ${runId}, 'running'
    WHERE NOT EXISTS (SELECT 1 FROM ingest_runs WHERE status = 'running')
    ON CONFLICT DO NOTHING
    RETURNING run_id
  `) as Array<{ run_id: string }>;
  if (!claimed.length) {
    const running = (await sql`
      SELECT run_id FROM ingest_runs WHERE status = 'running' LIMIT 1
    `) as Array<{ run_id: string }>;
    return sendJson(res, 409, { ok: false, error: 'already-running', runId: running[0]?.run_id ?? null });
  }

  logAdminAction(user, req, { action: 'ingest.run', entity: 'ingest' });
  const dryRun = process.env.INGEST_DRY_RUN === '1';

  // Vercel functions are frozen after the response — must await within the budget.
  // Long-lived hosts (cPanel/Passenger, dev) fire-and-poll: runIngest writes the
  // ingest_runs 'running' row at the start, so the status poller has data immediately.
  if (process.env.VERCEL) {
    try {
      const result = await runIngest({ dryRun, runId });
      return sendJson(res, 200, { ok: true, mode: 'sync', ...result });
    } catch (err) {
      if (err instanceof ExploraEnvError) return sendJson(res, 503, { ok: false, error: 'env-missing', message: err.message });
      if (err instanceof IngestAbort) return sendJson(res, 409, { ok: false, error: 'aborted', message: err.message });
      const message = err instanceof Error ? err.message : String(err);
      console.error('[admin/ingest/run]', message);
      return sendJson(res, 500, { ok: false, error: 'failed', message });
    }
  }

  // Fail fast if creds are missing, BEFORE returning 202, so the operator sees it.
  void runIngest({ dryRun, runId }).catch((err) => {
    console.error('[admin/ingest/run] background failed:', err instanceof Error ? err.message : err);
  });
  return sendJson(res, 202, { ok: true, mode: 'async' });
}
