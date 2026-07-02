/**
 * POST /api/booking-request — create a PENDING booking request.
 * The deposit/indicative total is recomputed server-side from the flatfile fare
 * (the client can't set the price). The row is created BEFORE any payment so a
 * captured deposit is never orphaned (fail-soft audit trail).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { db, jsonbArg } from '../lib/db/client';
import { readJson, sendJson, reqMeta } from '../lib/http';
import { genRef, computeQuote } from '../lib/booking';
import { paypalConfigured } from '../lib/paypal';
import { sendBookingNotification } from '../lib/email';

const guestSchema = z.object({
  title: z.string().max(8).optional(),
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(32).optional(),
  phoneCountry: z.string().max(8).optional(),
  nationality: z.string().max(60).optional(),
  dateOfBirth: z.string().max(20).optional(),
  lead: z.boolean().optional(),
  type: z.enum(['adult', 'child', 'infant']).optional(),
});

const schema = z.object({
  journeyId: z.string().min(1).max(64),
  suiteCategory: z.string().min(1).max(40),
  fareCode: z.string().min(1).max(64),
  guestCount: z.coerce.number().int().min(1).max(12),
  adults: z.coerce.number().int().min(0).max(12).optional(),
  children: z.coerce.number().int().min(0).max(12).optional(),
  infants: z.coerce.number().int().min(0).max(12).optional(),
  guests: z.array(guestSchema).min(1).max(12),
  message: z.string().max(2000).optional(),
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    return res.end();
  }
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return sendJson(res, 400, { ok: false, error: 'invalid', issues: parsed.error.issues });
  const q = parsed.data;
  try {
    // Price per guest type (infants usually free); team confirms the final price.
    const party = q.adults != null
      ? { adults: q.adults, children: q.children ?? 0, infants: q.infants ?? 0 }
      : { adults: q.guestCount, children: 0, infants: 0 };
    const { bookable, indicativeTotal, depositAmount, currency } = await computeQuote(q.journeyId, q.suiteCategory, q.fareCode, party);
    // Withdrawn/expired sailing or vanished fare — refuse instead of creating
    // a deposit-less request for something that can't be fulfilled.
    if (!bookable) return sendJson(res, 409, { ok: false, error: 'not-bookable' });
    const { ip, ua } = reqMeta(req);
    const sql = db();
    let ref = genRef();
    for (let attempt = 1; ; attempt++) {
      try {
        await sql`
          INSERT INTO booking_requests
            (ref, journey_id, suite_category, fare_code, currency, guest_count, guests, indicative_total, deposit_amount, status, message, ip, user_agent)
          VALUES
            (${ref}, ${q.journeyId}, ${q.suiteCategory}, ${q.fareCode}, ${currency}, ${q.guestCount},
             ${jsonbArg(q.guests)}::jsonb, ${indicativeTotal}, ${depositAmount}, 'pending', ${q.message ?? null}, ${ip}, ${ua})
        `;
        break;
      } catch (e) {
        // Unique-ref collision → mint a new ref and retry (both drivers expose .code).
        const code = (e as { code?: string })?.code;
        if (code === '23505' && attempt < 3) { ref = genRef(); continue; }
        throw e;
      }
    }
    console.log(`[booking] created ${ref} journey=${q.journeyId} suite=${q.suiteCategory} guests=${q.guestCount} deposit=${depositAmount ?? '—'}`);

    const configured = paypalConfigured();
    // Request-only flow (no deposit step) → notify the team now, best-effort (fail-soft).
    if (!configured) {
      try {
        const sent = await sendBookingNotification({
          ref, journeyId: q.journeyId, suiteCategory: q.suiteCategory, fareCode: q.fareCode,
          currency, guestCount: q.guestCount, indicativeTotal, depositAmount,
          status: 'pending', message: q.message, guests: q.guests,
        });
        if (sent) await sql`UPDATE booking_requests SET notify_sent_at = now() WHERE ref = ${ref}`;
      } catch (e) {
        console.error(`[booking] ${ref} creation notify failed:`, e instanceof Error ? e.message : e);
      }
    }
    return sendJson(res, 200, { ok: true, ref, currency, indicativeTotal, depositAmount, paypalConfigured: configured });
  } catch (err) {
    console.error('[booking-request] failed:', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
