/**
 * Booking-request helpers: reference generation, server-side deposit/quote
 * computation from the flatfile fare (so the client can't tamper with prices),
 * and row lookup + public (redacted) mapping.
 */

import { randomBytes } from 'node:crypto';
import { db } from './db/client';
import { fareToPricing, priceCabin, type Party } from './pricing';
import { isCustomId, getCustomFare, customFareToApiShape } from './custom-packages';

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

/**
 * Bookings only open MIN_LEAD_DAYS out — same constant gates the public
 * journey listings (api/journeys*) and the authoritative quote below, so a
 * journey you can see is a journey you can book, and nothing sooner.
 */
export const MIN_LEAD_DAYS = 2;

export function genRef(): string {
  // crypto-random, unambiguous alphabet (no 0/O/1/I) — collision odds ~1 in 33^8.
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const bytes = randomBytes(8);
  let s = '';
  for (let i = 0; i < 8; i++) s += alphabet[bytes[i] % alphabet.length];
  return `EXP-${s}`;
}

export function depositPercent(): number {
  const n = Number(process.env.DEPOSIT_PERCENT);
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : 20;
}

/** Today + MIN_LEAD_DAYS as YYYY-MM-DD (UTC), the earliest bookable departure. */
function earliestSailingDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + MIN_LEAD_DAYS);
  return d.toISOString().slice(0, 10);
}

/**
 * Quote a CUSTOM package (see lib/custom-packages.ts). Same pricing engine and
 * the same lead-time gate as the feed path — only the storage differs, so the
 * deposit a custom package charges is computed exactly like a feed sailing's.
 * A per-package deposit_pct overrides the global DEPOSIT_PERCENT.
 */
async function computeCustomQuote(
  publicId: string,
  suiteCategory: string,
  fareCode: string,
  party: Party,
): Promise<{ bookable: boolean; indicativeTotal: number | null; depositAmount: number | null; currency: string }> {
  const found = await getCustomFare(publicId, suiteCategory, fareCode);
  if (!found) return { bookable: false, indicativeTotal: null, depositAmount: null, currency: 'EUR' };
  const { pkg, fare } = found;
  // A dated package must still be far enough out; an undated one is not listable
  // publicly and must not be bookable either.
  if (!pkg.sailing_date || pkg.sailing_date < earliestSailingDate()) {
    return { bookable: false, indicativeTotal: null, depositAmount: null, currency: 'EUR' };
  }
  const shaped = customFareToApiShape(fare);
  const fp = fareToPricing(shaped.prices, shaped.raw);
  const indicativeTotal = fp ? priceCabin(fp, party).total : null;
  const pctRaw = pkg.deposit_pct != null ? Number(pkg.deposit_pct) : NaN;
  const pct = Number.isFinite(pctRaw) && pctRaw > 0 && pctRaw <= 100 ? pctRaw : depositPercent();
  const depositAmount = indicativeTotal != null ? Math.round((indicativeTotal * pct) / 100) : null;
  return { bookable: true, indicativeTotal, depositAmount, currency: shaped.currency || 'EUR' };
}

/**
 * Indicative total + deposit from the journey's flatfile fare (EUR), priced
 * per guest type (adult/child/infant) via the shared pricing model. The same
 * priceCabin() runs on the front-end, so the displayed total and the captured
 * deposit always agree.
 *
 * Gated on availability (journey visible + not withdrawn + fare still in the
 * feed + sailing far enough out) so a soft-deleted sailing can never be
 * quoted/booked, and honors an enabled per-suite fare_override the same way
 * api/journeys/[id] merges it into prices['2A'] for display — displayed price
 * and charged deposit stay equal. (The whole-journey '' override only pins the
 * card "from" price and never re-prices a specific suite.)
 */
export async function computeQuote(
  journeyId: string,
  suiteCategory: string,
  fareCode: string,
  party: Party,
): Promise<{ bookable: boolean; indicativeTotal: number | null; depositAmount: number | null; currency: string }> {
  // Custom packages live outside the flatfile tables — same engine, own storage.
  if (isCustomId(journeyId)) return computeCustomQuote(journeyId, suiteCategory, fareCode, party);
  const sql = db();
  const rows = (await sql`
    SELECT f.prices, f.raw, f.currency, o.override_price
    FROM fares f
    JOIN journeys j ON j.journey_id = f.journey_id
      AND j.is_available = true
      AND j.sailing_date >= CURRENT_DATE + ${MIN_LEAD_DAYS}::int
      AND j.ship_cd NOT IN ('EP05', 'EP06')
    LEFT JOIN fare_overrides o
      ON o.journey_id = f.journey_id AND o.suite_category = f.suite_category
      AND o.currency = f.currency AND o.enabled
    WHERE f.journey_id = ${journeyId} AND f.suite_category = ${suiteCategory}
      AND f.fare_code = ${fareCode} AND f.currency = 'EUR'
      AND f.now_available = true
    LIMIT 1
  `) as Array<{ prices: unknown; raw: unknown; currency: string; override_price: string | number | null }>;
  let indicativeTotal: number | null = null;
  let currency = 'EUR';
  const row = rows[0];
  if (row) {
    currency = row.currency || 'EUR';
    const prices = (typeof row.prices === 'string' ? JSON.parse(row.prices) : row.prices) as Record<string, unknown> | null;
    const raw = (typeof row.raw === 'string' ? JSON.parse(row.raw) : row.raw) as Record<string, unknown> | null;
    const override = row.override_price != null ? Number(row.override_price) : null;
    const merged = override != null && Number.isFinite(override) && override > 0
      ? { ...(prices ?? {}), '2A': override }
      : prices;
    const fp = fareToPricing(merged, raw);
    if (fp) indicativeTotal = priceCabin(fp, party).total;
  }
  const depositAmount = indicativeTotal != null ? Math.round((indicativeTotal * depositPercent()) / 100) : null;
  return { bookable: !!row, indicativeTotal, depositAmount, currency };
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
