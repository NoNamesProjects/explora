import type { IncomingMessage, ServerResponse } from 'node:http';
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
  // Courtesy fast-path: report an in-flight run with its runId. The REAL
  // single-flight guard is runIngest's atomic claim (unique partial index on
  // ingest_runs(status)='running'), which also covers the cron + CLI paths.
  const running = (await sql`
    SELECT run_id FROM ingest_runs
    WHERE status = 'running' AND started_at > now() - interval '30 minutes'
    LIMIT 1
  `) as Array<{ run_id: string }>;
  if (running.length) {
    return sendJson(res, 409, { ok: false, error: 'already-running', runId: running[0].run_id });
  }

  logAdminAction(user, req, { action: 'ingest.run', entity: 'ingest' });
  const dryRun = process.env.INGEST_DRY_RUN === '1';

  // Vercel functions are frozen after the response — must await within the budget.
  // Long-lived hosts (cPanel/Passenger, dev) fire-and-poll: runIngest writes the
  // ingest_runs 'running' row at the start, so the status poller has data immediately.
  if (process.env.VERCEL) {
    try {
      const result = await runIngest({ dryRun });
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
  void runIngest({ dryRun }).catch((err) => {
    console.error('[admin/ingest/run] background failed:', err instanceof Error ? err.message : err);
  });
  return sendJson(res, 202, { ok: true, mode: 'async' });
}
