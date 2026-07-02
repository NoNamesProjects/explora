/**
 * Booking-request helpers: reference generation, server-side deposit/quote
 * computation from the flatfile fare (so the client can't tamper with prices),
 * and row lookup + public (redacted) mapping.
 */

import { db } from './db/client';
import { fareToPricing, priceCabin, type Party } from './pricing';

export interface BookingGuestRow {
  title?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  phoneCountry?: string;
  nationality?: string;
  dateOfBirth?: string;
  lead?: boolean;
  type?: 'adult' | 'child' | 'infant';
}

export interface BookingNote {
  id: string;
  at: string;
  by: number | null;
  byName: string;
  text: string;
}

export function genRef(): string {
  const t = Date.now().toString(36).slice(-4);
  const r = Math.random().toString(36).slice(2, 6);
  return `EXP-${(t + r).toUpperCase()}`;
}

export function depositPercent(): number {
  const n = Number(process.env.DEPOSIT_PERCENT);
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : 20;
}

/**
 * Indicative total + deposit from the journey's flatfile fare (EUR), priced
 * per guest type (adult/child/infant) via the shared pricing model. The same
 * priceCabin() runs on the front-end, so the displayed total and the captured
 * deposit always agree.
 */
export async function computeQuote(
  journeyId: string,
  suiteCategory: string,
  fareCode: string,
  party: Party,
): Promise<{ indicativeTotal: number | null; depositAmount: number | null; currency: string }> {
  const sql = db();
  const rows = (await sql`
    SELECT prices, raw, currency FROM fares
    WHERE journey_id = ${journeyId} AND suite_category = ${suiteCategory}
      AND fare_code = ${fareCode} AND currency = 'EUR'
    LIMIT 1
  `) as Array<{ prices: unknown; raw: unknown; currency: string }>;
  let indicativeTotal: number | null = null;
  let currency = 'EUR';
  const row = rows[0];
  if (row) {
    currency = row.currency || 'EUR';
    const prices = (typeof row.prices === 'string' ? JSON.parse(row.prices) : row.prices) as Record<string, unknown> | null;
    const raw = (typeof row.raw === 'string' ? JSON.parse(row.raw) : row.raw) as Record<string, unknown> | null;
    const fp = fareToPricing(prices, raw);
    if (fp) indicativeTotal = priceCabin(fp, party).total;
  }
  const depositAmount = indicativeTotal != null ? Math.round((indicativeTotal * depositPercent()) / 100) : null;
  return { indicativeTotal, depositAmount, currency };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getBookingByRef(ref: string): Promise<any | null> {
  const sql = db();
  const rows = (await sql`SELECT * FROM booking_requests WHERE ref = ${ref} LIMIT 1`) as unknown[];
  return (rows[0] as unknown) ?? null;
}

/** Redacted record for the public confirmation page (no full PII). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function publicRecord(row: any) {
  return {
    ref: row.ref,
    journeyId: row.journey_id,
    suiteCategory: row.suite_category,
    fareCode: row.fare_code,
    currency: row.currency,
    guestCount: row.guest_count,
    guests: (row.guests ?? []).map((g: BookingGuestRow) => ({ firstName: g.firstName, lead: !!g.lead })),
    indicativeTotal: row.indicative_total != null ? Number(row.indicative_total) : null,
    depositAmount: row.deposit_amount != null ? Number(row.deposit_amount) : null,
    status: row.status,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  };
}

/**
 * FULL booking record for the authenticated admin/agent detail view — the
 * deliberate opposite of publicRecord: every guest field, the message, internal
 * notes, and the PayPal ids. Only ever returned from a requireAuth-gated route.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function adminRecord(row: any) {
  return {
    id: Number(row.id),
    ref: row.ref,
    journeyId: row.journey_id,
    suiteCategory: row.suite_category,
    fareCode: row.fare_code,
    currency: row.currency,
    guestCount: row.guest_count,
    guests: (row.guests ?? []) as BookingGuestRow[],
    indicativeTotal: row.indicative_total != null ? Number(row.indicative_total) : null,
    depositAmount: row.deposit_amount != null ? Number(row.deposit_amount) : null,
    status: row.status,
    paypalOrderId: row.paypal_order_id,
    paypalCaptureId: row.paypal_capture_id,
    paidAt: row.paid_at,
    notifySentAt: row.notify_sent_at,
    message: row.message,
    adminNotes: (row.admin_notes ?? []) as BookingNote[],
    ip: row.ip,
    userAgent: row.user_agent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
