/**
 * Vercel Cron endpoint — runs the daily flatfile ingest.
 *
 * Trigger paths:
 *   • Vercel Cron: schedule defined in vercel.json → hits this URL with the
 *     `x-vercel-cron` header.
 *   • Manual:   curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/ingest-flatfiles?force=1
 *
 * If INGEST_DRY_RUN=1, no DB writes happen — handy for first-day setup
 * while you verify creds + parsers without polluting the table.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { runIngest, IngestAbort } from '../../lib/explora-flatfile/ingest';
import { ExploraEnvError } from '../../lib/explora-flatfile/env';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');

  const url = new URL(req.url ?? '/', 'http://x');
  const force = url.searchParams.get('force') === '1';
  const isVercelCron = !!req.headers['x-vercel-cron'];
  const auth = (req.headers.authorization ?? '').trim();
  const expected = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : null;

  // Gate: must be either Vercel Cron OR a force-with-bearer call.
  if (!isVercelCron) {
    if (!force || !expected || auth !== expected) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ ok: false, error: 'unauthorized' }));
    }
  }

  const dryRun = process.env.INGEST_DRY_RUN === '1';

  try {
    const result = await runIngest({ dryRun });
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        ok: true,
        ...result,
      }),
    );
  } catch (err) {
    if (err instanceof ExploraEnvError) {
      res.statusCode = 503;
      return res.end(JSON.stringify({ ok: false, error: 'env-missing', message: err.message }));
    }
    if (err instanceof IngestAbort) {
      res.statusCode = 409;
      return res.end(JSON.stringify({ ok: false, error: 'aborted', message: err.message }));
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cron/ingest-flatfiles] failed:', message);
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: 'failed', message }));
  }
}
