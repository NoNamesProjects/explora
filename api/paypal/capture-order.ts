/**
 * POST /api/paypal/capture-order { ref, orderId } — capture the approved deposit.
 *
 * Fail-soft (per the `fail-soft-external-api-after-payment` skill):
 *  1) capture the money;
 *  2) record it on the row IMMEDIATELY (a DB failure here is logged loudly with
 *     the order + capture id for manual reconciliation — never lost);
 *  3) notify the agency best-effort (email failure never undoes the capture).
 * Idempotent: a second call for an already-paid ref is a no-op.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { db } from '../../lib/db/client';
import { readJson, sendJson } from '../../lib/http';
import { getBookingByRef } from '../../lib/booking';
import { captureOrder } from '../../lib/paypal';
import { sendBookingNotification } from '../../lib/email';

const schema = z.object({ ref: z.string().min(1).max(40), orderId: z.string().min(1).max(64) });

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    return res.end();
  }
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return sendJson(res, 400, { ok: false, error: 'invalid' });
  const { ref, orderId } = parsed.data;

  const row = await getBookingByRef(ref).catch(() => null);
  if (!row) return sendJson(res, 404, { ok: false, error: 'not-found' });
  // Idempotent — already captured.
  if (row.status === 'deposit_paid' || row.paypal_capture_id) {
    return sendJson(res, 200, { ok: true, ref, status: 'deposit_paid' });
  }

  // 1) Capture the deposit.
  let captureId: string;
  try {
    ({ captureId } = await captureOrder(orderId));
  } catch (err) {
    console.error(`[paypal/capture] ${ref} capture failed:`, err instanceof Error ? err.message : err);
    return sendJson(res, 502, { ok: false, error: 'capture-failed' });
  }

  // 2) Record it now — money is captured; the response must not fail past here.
  try {
    const sql = db();
    await sql`UPDATE booking_requests SET status = 'deposit_paid', paypal_capture_id = ${captureId}, paid_at = now(), updated_at = now() WHERE ref = ${ref}`;
  } catch (e) {
    console.error(`[paypal/capture] ⚠️ ${ref} DEPOSIT CAPTURED (order ${orderId}, capture ${captureId}) BUT DB UPDATE FAILED — reconcile manually`, e);
  }

  // 3) Notify the agency — best-effort.
  try {
    const fresh = await getBookingByRef(ref);
    if (fresh) {
      const sent = await sendBookingNotification({
        ref: fresh.ref,
        journeyId: fresh.journey_id,
        suiteCategory: fresh.suite_category,
        fareCode: fresh.fare_code,
        currency: fresh.currency,
        guestCount: fresh.guest_count,
        indicativeTotal: fresh.indicative_total != null ? Number(fresh.indicative_total) : null,
        depositAmount: fresh.deposit_amount != null ? Number(fresh.deposit_amount) : null,
        status: fresh.status,
        message: fresh.message,
        guests: fresh.guests ?? [],
      });
      if (sent) await db()`UPDATE booking_requests SET notify_sent_at = now() WHERE ref = ${ref}`;
    }
  } catch (e) {
    console.error(`[paypal/capture] ${ref} notify error (non-fatal):`, e instanceof Error ? e.message : e);
  }

  return sendJson(res, 200, { ok: true, ref, status: 'deposit_paid' });
}
