import type { IncomingMessage, ServerResponse } from 'node:http';
import { paramQuery } from '../../../lib/db/client';
import { sendJson } from '../../../lib/http';
import { requireAuth } from '../../../lib/admin-auth';

interface Row {
  journey_id: string; ship_cd: string; ship_name: string | null; itin_desc: string | null;
  region: string | null; sailing_port: string | null; termination_port: string | null;
  sailing_date: string; nights: number; is_available: boolean; consecutive_missing: number;
  last_seen_at: string; fare_count: number;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'agent');
  if (!user) return;
  if (req.method !== 'GET') { res.statusCode = 405; res.setHeader('Allow', 'GET'); return res.end(); }

  const q = new URL(req.url ?? '', 'http://x').searchParams;
  const search = q.get('q')?.trim() || null;
  const region = q.get('region') || null;
  const ship = q.get('ship') || null;
  const available = q.get('available'); // 'true' | 'false' | null(all)
  const page = Math.max(1, Number(q.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(q.get('pageSize')) || 25));
  const like = search ? `%${search}%` : null;
  const avail = available === 'true' ? true : available === 'false' ? false : null;

  const where =
    `WHERE ($1::text IS NULL OR j.itin_desc ILIKE $1 OR j.journey_id ILIKE $1 OR j.ship_cd ILIKE $1)
       AND ($2::text IS NULL OR j.region = $2)
       AND ($3::text IS NULL OR j.ship_cd = $3)
       AND ($4::boolean IS NULL OR j.is_available = $4)`;
  const params = [like, region, ship, avail];

  try {
    const offset = (page - 1) * pageSize;
    const rows = (await paramQuery<Row>(
      `SELECT j.journey_id, j.ship_cd, s.ship_name, j.itin_desc, j.region, j.sailing_port, j.termination_port,
              j.sailing_date, j.nights, j.is_available, j.consecutive_missing, j.last_seen_at,
              (SELECT count(*) FROM fares f WHERE f.journey_id = j.journey_id)::int AS fare_count
       FROM journeys j LEFT JOIN ships s ON s.ship_cd = j.ship_cd
       ${where} ORDER BY j.sailing_date ASC LIMIT $5 OFFSET $6`,
      [...params, pageSize, offset],
    ));
    const countRows = (await paramQuery<{ n: number }>(
      `SELECT count(*)::int AS n FROM journeys j ${where}`, params,
    ));
    const items = rows.map((r) => ({
      journeyId: r.journey_id, shipCd: r.ship_cd, shipName: r.ship_name, itinDesc: r.itin_desc,
      region: r.region, sailingPort: r.sailing_port, terminationPort: r.termination_port,
      sailingDate: r.sailing_date, nights: r.nights, isAvailable: r.is_available,
      consecutiveMissing: r.consecutive_missing, lastSeenAt: r.last_seen_at, fareCount: r.fare_count,
    }));
    return sendJson(res, 200, { ok: true, items, total: countRows[0]?.n ?? 0, page, pageSize });
  } catch (err) {
    console.error('[admin/catalog/journeys]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
