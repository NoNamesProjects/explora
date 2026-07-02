/**
 * GET /api/admin/subscribers — newsletter subscriber list.
 *
 * The paginated on-screen list is agent-readable; the ?format=csv BULK export
 * is admin-only (a whole-list dump of subscriber emails + consent/unsubscribe
 * timestamps is the GDPR-relevant risk — gated inside the csv branch below).
 *
 * Filters: ?status=confirmed|pending|unsubscribed & ?q= & ?page= & ?pageSize=,
 * plus ?format=csv export. Mirrors api/admin/contacts.ts (paramQuery + toCsv).
 * A valid recipient = confirmed = true AND unsubscribed_at IS NULL.
 *
 * Server-side only — never import from src/.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { paramQuery } from '../../lib/db/client';
import { sendJson } from '../../lib/http';
import { requireAuth, logAdminAction } from '../../lib/admin-auth';
import { toCsv, sendCsv } from '../../lib/csv';

interface Row {
  email: string;
  confirmed: boolean;
  consent_at: string | null;
  unsubscribed_at: string | null;
  locale: string | null;
}

type Status = 'confirmed' | 'pending' | 'unsubscribed';
function deriveStatus(r: Row): Status {
  if (r.unsubscribed_at) return 'unsubscribed';
  return r.confirmed ? 'confirmed' : 'pending';
}

// Fixed (whitelisted) SQL fragments — never interpolate user input here.
const STATUS_SQL: Record<Status, string> = {
  confirmed: 'confirmed = true AND unsubscribed_at IS NULL',
  pending: 'confirmed = false AND unsubscribed_at IS NULL',
  unsubscribed: 'unsubscribed_at IS NOT NULL',
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'agent');
  if (!user) return;
  if (req.method !== 'GET') { res.statusCode = 405; res.setHeader('Allow', 'GET'); return res.end(); }

  const q = new URL(req.url ?? '', 'http://x').searchParams;
  const search = q.get('q')?.trim() || null;
  const statusParam = q.get('status');
  const status: Status | null =
    statusParam && Object.prototype.hasOwnProperty.call(STATUS_SQL, statusParam)
      ? (statusParam as Status)
      : null;
  const format = q.get('format');
  const page = Math.max(1, Number(q.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(q.get('pageSize')) || 25));

  const statusClause = status ? STATUS_SQL[status] : 'TRUE';
  const where = `WHERE (${statusClause}) AND ($1::text IS NULL OR email ILIKE $1)`;
  const like = search ? `%${search}%` : null;
  const params: unknown[] = [like];

  try {
    if (format === 'csv') {
      // Bulk PII export is admin-only; agents keep the paginated on-screen list.
      if (user.role !== 'admin') return sendJson(res, 403, { ok: false, error: 'forbidden' });
      const rows = await paramQuery<Row>(
        `SELECT email, confirmed, consent_at, unsubscribed_at, locale
           FROM newsletter_subscribers ${where}
          ORDER BY consent_at DESC NULLS LAST LIMIT 10000`,
        params,
      );
      logAdminAction(user, req, { action: 'subscriber.export', entity: 'subscriber', after: { count: rows.length } });
      const csv = toCsv(
        rows.map((r) => ({
          email: r.email,
          status: deriveStatus(r),
          locale: r.locale ?? '',
          consent_at: r.consent_at,
          unsubscribed_at: r.unsubscribed_at,
        })),
        [
          { key: 'email', header: 'Email' },
          { key: 'status', header: 'Status' },
          { key: 'locale', header: 'Locale' },
          { key: 'consent_at', header: 'Subscribed' },
          { key: 'unsubscribed_at', header: 'Unsubscribed' },
        ],
      );
      return sendCsv(res, `subscribers-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    }

    const offset = (page - 1) * pageSize;
    const rows = await paramQuery<Row>(
      `SELECT email, confirmed, consent_at, unsubscribed_at, locale
         FROM newsletter_subscribers ${where}
        ORDER BY consent_at DESC NULLS LAST LIMIT $2 OFFSET $3`,
      [...params, pageSize, offset],
    );
    const countRows = await paramQuery<{ n: number }>(
      `SELECT count(*)::int AS n FROM newsletter_subscribers ${where}`, params,
    );
    // Global status tallies (unfiltered) for the StatCards.
    const tallies = await paramQuery<{ confirmed: number; pending: number; unsubscribed: number }>(
      `SELECT
         count(*) FILTER (WHERE confirmed = true  AND unsubscribed_at IS NULL)::int AS confirmed,
         count(*) FILTER (WHERE confirmed = false AND unsubscribed_at IS NULL)::int AS pending,
         count(*) FILTER (WHERE unsubscribed_at IS NOT NULL)::int                   AS unsubscribed
       FROM newsletter_subscribers`,
    );

    const items = rows.map((r) => ({
      email: r.email,
      status: deriveStatus(r),
      locale: r.locale,
      consentAt: r.consent_at,
      unsubscribedAt: r.unsubscribed_at,
    }));
    const counts = tallies[0] ?? { confirmed: 0, pending: 0, unsubscribed: 0 };
    return sendJson(res, 200, { ok: true, items, total: countRows[0]?.n ?? 0, page, pageSize, counts });
  } catch (err) {
    console.error('[admin/subscribers]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
