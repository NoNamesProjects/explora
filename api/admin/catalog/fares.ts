import type { IncomingMessage, ServerResponse } from 'node:http';
import { db } from '../../../lib/db/client';
import { sendJson } from '../../../lib/http';
import { requireAuth } from '../../../lib/admin-auth';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'agent');
  if (!user) return;
  if (req.method !== 'GET') { res.statusCode = 405; res.setHeader('Allow', 'GET'); return res.end(); }
  const journeyId = new URL(req.url ?? '', 'http://x').searchParams.get('journeyId');
  if (!journeyId) return sendJson(res, 400, { ok: false, error: 'journeyId-required' });
  const sql = db();
  try {
    const rows = (await sql`
      SELECT fare_code, fare_desc, price_type, suite_category, currency, prices,
             fare_start_date, fare_end_date, option_expires, now_available, last_seen_at
      FROM fares WHERE journey_id = ${journeyId}
      ORDER BY suite_category NULLS LAST, fare_code
    `) as Array<Record<string, unknown>>;
    const items = rows.map((r) => ({
      fareCode: r.fare_code, fareDesc: r.fare_desc, priceType: r.price_type,
      suiteCategory: r.suite_category, currency: r.currency,
      prices: typeof r.prices === 'string' ? JSON.parse(r.prices) : r.prices,
      nowAvailable: r.now_available,
    }));
    return sendJson(res, 200, { ok: true, items });
  } catch (err) {
    console.error('[admin/catalog/fares]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
