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
      SELECT
        (SELECT count(*) FROM journeys)::int                                      AS journeys_total,
        (SELECT count(*) FROM journeys WHERE is_available)::int                   AS journeys_active,
        (SELECT count(*) FROM journeys WHERE NOT is_available)::int              AS journeys_soft_deleted,
        (SELECT count(*) FROM journeys WHERE consecutive_missing >= 6)::int      AS about_to_purge,
        (SELECT count(*) FROM fares)::int                                         AS fares_total,
        (SELECT count(*) FROM ships)::int                                         AS ships_total,
        (SELECT count(*) FROM ports)::int                                         AS ports_total,
        (SELECT count(*) FROM suite_categories)::int                             AS suites_total,
        (SELECT count(*) FROM excursions)::int                                    AS excursions_total,
        (SELECT max(last_seen_at) FROM journeys)                                  AS journeys_fresh,
        (SELECT max(last_seen_at) FROM fares)                                     AS fares_fresh
    `) as Array<Record<string, number | string | null>>;
    const r = rows[0];

    const runRows = (await sql`
      SELECT run_id, started_at, finished_at, journey_count, fare_count, failed_files, status, notes
      FROM ingest_runs ORDER BY started_at DESC LIMIT 1
    `) as Array<Record<string, unknown>>;
    const lr = runRows[0];

    return sendJson(res, 200, {
      ok: true,
      health: {
        journeysTotal: r.journeys_total, journeysActive: r.journeys_active,
        journeysSoftDeleted: r.journeys_soft_deleted, aboutToPurge: r.about_to_purge,
        faresTotal: r.fares_total, shipsTotal: r.ships_total, portsTotal: r.ports_total,
        suitesTotal: r.suites_total, excursionsTotal: r.excursions_total,
        journeysFresh: r.journeys_fresh, faresFresh: r.fares_fresh,
        lastRun: lr ? {
          runId: lr.run_id, startedAt: lr.started_at, finishedAt: lr.finished_at,
          journeyCount: lr.journey_count, fareCount: lr.fare_count, failedFiles: lr.failed_files,
          status: lr.status, notes: lr.notes,
        } : null,
      },
    });
  } catch (err) {
    console.error('[admin/catalog/health]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
