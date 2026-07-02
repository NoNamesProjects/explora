import type { IncomingMessage, ServerResponse } from 'node:http';
import { paramQuery } from '../../lib/db/client';
import { sendJson } from '../../lib/http';
import { requireAuth, logAdminAction } from '../../lib/admin-auth';
import { toCsv, sendCsv } from '../../lib/csv';
import type { BookingGuestRow } from '../../lib/booking';

interface Row {
  id: number; ref: string; journey_id: string | null; suite_category: string | null;
  fare_code: string | null; currency: string; guest_count: number; guests: BookingGuestRow[];
  indicative_total: string | null; deposit_amount: string | null; status: string;
  paid_at: string | null; created_at: string;
}

function leadGuest(guests: BookingGuestRow[]): BookingGuestRow | null {
  if (!Array.isArray(guests) || !guests.length) return null;
  return guests.find((g) => g.lead) ?? guests[0];
}
function maskEmail(email?: string): string | null {
  if (!email) return null;
  const [u, d] = email.split('@');
  if (!d) return '•••';
  return `${u.slice(0, 1)}•••@${d}`;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'agent');
  if (!user) return;
  if (req.method !== 'GET') {
    res.statusCode = 405; res.setHeader('Allow', 'GET'); return res.end();
  }

  const url = new URL(req.url ?? '', 'http://x');
  const q = url.searchParams;
  const status = q.get('status') || null;          // csv of statuses
  const search = q.get('q')?.trim() || null;
  const from = q.get('from') || null;
  const to = q.get('to') || null;
  const format = q.get('format');
  const page = Math.max(1, Number(q.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(q.get('pageSize')) || 25));

  const where =
    `WHERE ($1::text IS NULL OR status = ANY(string_to_array($1, ',')))
       AND ($2::timestamptz IS NULL OR created_at >= $2)
       AND ($3::timestamptz IS NULL OR created_at < $3)
       AND ($4::text IS NULL OR ref ILIKE $4 OR journey_id ILIKE $4 OR guests::text ILIKE $4)`;
  const like = search ? `%${search}%` : null;
  const baseParams = [status, from, to, like];

  try {
    if (format === 'csv') {
      const rows = (await paramQuery<Row>(
        `SELECT id, ref, journey_id, suite_category, fare_code, currency, guest_count, guests,
                indicative_total, deposit_amount, status, paid_at, created_at
         FROM booking_requests ${where} ORDER BY created_at DESC LIMIT 5000`,
        baseParams,
      ));
      const out = rows.map((r) => {
        const lead = leadGuest(r.guests);
        return {
          ref: r.ref, created_at: r.created_at, status: r.status, journey_id: r.journey_id ?? '',
          suite_category: r.suite_category ?? '', fare_code: r.fare_code ?? '',
          guest_count: r.guest_count, currency: r.currency,
          lead_name: lead ? `${lead.firstName} ${lead.lastName}` : '',
          lead_email: lead?.email ?? '', lead_phone: lead?.phone ?? '',
          indicative_total: r.indicative_total ?? '', deposit_amount: r.deposit_amount ?? '',
          paid_at: r.paid_at ?? '',
        };
      });
      logAdminAction(user, req, { action: 'booking.export', entity: 'booking', after: { count: out.length } });
      const csv = toCsv(out, [
        { key: 'ref', header: 'Ref' }, { key: 'created_at', header: 'Created' },
        { key: 'status', header: 'Status' }, { key: 'journey_id', header: 'Journey' },
        { key: 'suite_category', header: 'Suite' }, { key: 'fare_code', header: 'Fare' },
        { key: 'guest_count', header: 'Guests' }, { key: 'currency', header: 'Currency' },
        { key: 'lead_name', header: 'Lead name' }, { key: 'lead_email', header: 'Lead email' },
        { key: 'lead_phone', header: 'Lead phone' }, { key: 'indicative_total', header: 'Total' },
        { key: 'deposit_amount', header: 'Deposit' }, { key: 'paid_at', header: 'Paid at' },
      ]);
      return sendCsv(res, `bookings-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    }

    const offset = (page - 1) * pageSize;
    const rows = (await paramQuery<Row>(
      `SELECT id, ref, journey_id, suite_category, currency, guest_count, guests,
              indicative_total, deposit_amount, status, paid_at, created_at
       FROM booking_requests ${where} ORDER BY created_at DESC LIMIT $5 OFFSET $6`,
      [...baseParams, pageSize, offset],
    ));
    const countRows = (await paramQuery<{ n: number }>(
      `SELECT count(*)::int AS n FROM booking_requests ${where}`,
      baseParams,
    ));

    const items = rows.map((r) => {
      const lead = leadGuest(r.guests);
      return {
        id: Number(r.id), ref: r.ref, journeyId: r.journey_id, suiteCategory: r.suite_category,
        currency: r.currency, guestCount: r.guest_count,
        indicativeTotal: r.indicative_total != null ? Number(r.indicative_total) : null,
        depositAmount: r.deposit_amount != null ? Number(r.deposit_amount) : null,
        status: r.status, paidAt: r.paid_at, createdAt: r.created_at,
        leadName: lead ? `${lead.firstName} ${lead.lastName?.slice(0, 1) ?? ''}.` : null,
        leadEmail: maskEmail(lead?.email),
      };
    });

    return sendJson(res, 200, { ok: true, items, total: countRows[0]?.n ?? 0, page, pageSize });
  } catch (err) {
    console.error('[admin/bookings]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
