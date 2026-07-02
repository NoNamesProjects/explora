import type { IncomingMessage, ServerResponse } from 'node:http';
import { paramQuery } from '../../../lib/db/client';
import { sendJson } from '../../../lib/http';
import { requireAuth } from '../../../lib/admin-auth';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'agent');
  if (!user) return;
  if (req.method !== 'GET') { res.statusCode = 405; res.setHeader('Allow', 'GET'); return res.end(); }

  const q = new URL(req.url ?? '', 'http://x').searchParams;
  const granularity = q.get('granularity') === 'week' ? 'week' : 'day';
  const now = new Date();
  const to = q.get('to') ? new Date(q.get('to')!) : new Date(now.getTime() + 86_400_000);
  const from = q.get('from') ? new Date(q.get('from')!) : new Date(now.getTime() - 90 * 86_400_000);
  if (Number.isNaN(to.getTime()) || Number.isNaN(from.getTime())) {
    return sendJson(res, 400, { ok: false, error: 'invalid-date' });
  }
  const win = [from.toISOString(), to.toISOString()];

  try {
    const series = await paramQuery<{ bucket: string; requests: number; converted: number; deposits: number }>(
      `SELECT to_char(date_trunc($1, created_at), 'YYYY-MM-DD') AS bucket,
              count(*)::int AS requests,
              count(*) FILTER (WHERE status IN ('deposit_paid','confirmed'))::int AS converted,
              coalesce(sum(deposit_amount) FILTER (WHERE status IN ('deposit_paid','confirmed')),0)::float AS deposits
       FROM booking_requests WHERE created_at >= $2 AND created_at < $3
       GROUP BY 1 ORDER BY 1`,
      [granularity, ...win],
    );
    const byStatus = await paramQuery<{ status: string; n: number; deposits: number }>(
      `SELECT status, count(*)::int AS n, coalesce(sum(deposit_amount),0)::float AS deposits
       FROM booking_requests WHERE created_at >= $1 AND created_at < $2 GROUP BY status`,
      win,
    );
    const topJourneys = await paramQuery<{ journey_id: string | null; itin_desc: string | null; region: string | null; n: number; deposits: number }>(
      `SELECT b.journey_id, j.itin_desc, j.region, count(*)::int AS n, coalesce(sum(b.deposit_amount),0)::float AS deposits
       FROM booking_requests b LEFT JOIN journeys j ON j.journey_id = b.journey_id
       WHERE b.created_at >= $1 AND b.created_at < $2
       GROUP BY b.journey_id, j.itin_desc, j.region ORDER BY n DESC LIMIT 10`,
      win,
    );
    const totalsRows = await paramQuery<{ requests: number; converted: number; deposits: number }>(
      `SELECT count(*)::int AS requests,
              count(*) FILTER (WHERE status IN ('deposit_paid','confirmed'))::int AS converted,
              coalesce(sum(deposit_amount) FILTER (WHERE status IN ('deposit_paid','confirmed')),0)::float AS deposits
       FROM booking_requests WHERE created_at >= $1 AND created_at < $2`,
      win,
    );
    const contactRows = await paramQuery<{ n: number }>(
      `SELECT count(*)::int AS n FROM contact_messages WHERE created_at >= $1 AND created_at < $2`, win,
    );

    const t = totalsRows[0] ?? { requests: 0, converted: 0, deposits: 0 };
    return sendJson(res, 200, {
      ok: true,
      analytics: {
        totals: {
          requests: t.requests, converted: t.converted, deposits: t.deposits,
          contacts: contactRows[0]?.n ?? 0,
          conversionRate: t.requests ? Math.round((t.converted / t.requests) * 100) : 0,
        },
        series,
        byStatus: byStatus.map((r) => ({ status: r.status, n: r.n, deposits: r.deposits })),
        topJourneys: topJourneys.map((r) => ({ journeyId: r.journey_id, itinDesc: r.itin_desc, region: r.region, n: r.n, deposits: r.deposits })),
      },
    });
  } catch (err) {
    console.error('[admin/analytics/kpis]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
