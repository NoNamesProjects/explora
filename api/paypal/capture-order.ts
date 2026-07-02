/**
 * POST /api/paypal/capture-order { ref, orderId } — capture the approved deposit.
 *
 * Money-safety order of operations:
 *  1) idempotent fast-path — an already-paid ref is a no-op;
 *  2) BIND the request to the stored order — the client-sent orderId must equal
 *     the paypal_order_id minted by create-order for this ref (409 otherwise),
 *     so a capture can never be attached to a different booking;
 *  3) atomically CLAIM the row (status='pending' + capture_started_at lease) so
 *     two concurrent calls can't both reach PayPal;
 *  4) capture the STORED order id — never the client's string;
 *  5) VERIFY the capture: status COMPLETED + amount/currency equal the stored
 *     deposit — a mismatch is never marked paid (loud log + flagged email);
 *  6) record it with retries; a DB failure after capture still alerts the
 *     agency via email (independent channel) — the capture id is never lost
 *     silently. Email failure never undoes the capture (fail-soft).
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
  // 1) Idempotent — already captured.
  if (row.status === 'deposit_paid' || row.paypal_capture_id) {
    return sendJson(res, 200, { ok: true, ref, status: 'deposit_paid' });
  }
  // 2) Bind to the stored order: the only capturable order for this ref is the
  //    one create-order minted for it.
  if (!row.paypal_order_id || orderId !== row.paypal_order_id) {
    return sendJson(res, 409, { ok: false, error: 'order-mismatch' });
  }
  if (row.status !== 'pending') return sendJson(res, 409, { ok: false, error: 'not-pending' });

  const sql = db();
  // 3) Atomic claim — exactly one concurrent call proceeds; the lease expires
  //    so a crashed attempt doesn't wedge the booking.
  const claimed = (await sql`
    UPDATE booking_requests SET capture_started_at = now()
    WHERE ref = ${ref} AND status = 'pending' AND paypal_capture_id IS NULL
      AND (capture_started_at IS NULL OR capture_started_at < now() - interval '2 minutes')
    RETURNING ref
  `) as unknown[];
  if (claimed.length === 0) return sendJson(res, 409, { ok: false, error: 'capture-in-progress' });

  // 4) Capture the STORED order id.
  let cap: Awaited<ReturnType<typeof captureOrder>>;
  try {
    cap = await captureOrder(row.paypal_order_id, ref);
  } catch (err) {
    console.error(`[paypal/capture] ${ref} capture failed:`, err instanceof Error ? err.message : err);
    // Release the claim so the buyer can retry immediately (nothing was captured).
    await sql`UPDATE booking_requests SET capture_started_at = NULL WHERE ref = ${ref} AND paypal_capture_id IS NULL`.catch(() => {});
    return sendJson(res, 502, { ok: false, error: 'capture-failed' });
  }

  // 5) Verify the capture against the stored deposit before marking paid.
  const expectedAmount = row.deposit_amount != null ? Number(row.deposit_amount).toFixed(2) : null;
  const expectedCurrency = (row.currency || 'EUR').toUpperCase();
  const capturedAmount = cap.amountValue != null ? Number(cap.amountValue).toFixed(2) : null;
  if (
    cap.status !== 'COMPLETED' ||
    expectedAmount == null ||
    capturedAmount !== expectedAmount ||
    (cap.currencyCode ?? '').toUpperCase() !== expectedCurrency
  ) {
    // Money may have moved but does NOT match this booking's deposit — never
    // mark paid. Keep the claim (prevents hammering), log loudly, alert the
    // agency for manual reconciliation.
    console.error(
      `[paypal/capture] ⚠️ ${ref} CAPTURE MISMATCH — order ${row.paypal_order_id}, capture ${cap.captureId}, ` +
        `status ${cap.status}, captured ${cap.currencyCode ?? '?'} ${cap.amountValue ?? '?'}, ` +
        `expected ${expectedCurrency} ${expectedAmount ?? '?'} — reconcile manually`,
    );
    notifyAgency(row, `CAPTURE MISMATCH — capture ${cap.captureId} (status ${cap.status}, ${cap.currencyCode ?? '?'} ${cap.amountValue ?? '?'}) does not match the stored deposit ${expectedCurrency} ${expectedAmount ?? '?'}. Booking NOT marked paid — reconcile manually.`).catch(() => {});
    return sendJson(res, 409, { ok: false, error: 'capture-mismatch' });
  }

  // 6) Record it now — money is captured; the response must not fail past here.
  let recorded = false;
  for (let attempt = 1; attempt <= 3 && !recorded; attempt++) {
    try {
      await sql`UPDATE booking_requests SET status = 'deposit_paid', paypal_capture_id = ${cap.captureId}, paid_at = now(), updated_at = now() WHERE ref = ${ref}`;
      recorded = true;
    } catch (e) {
      console.error(`[paypal/capture] ${ref} DB record attempt ${attempt}/3 failed:`, e instanceof Error ? e.message : e);
      if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 500));
    }
  }
  if (!recorded) {
    console.error(
      `[paypal/capture] ⚠️ ${ref} DEPOSIT CAPTURED (order ${row.paypal_order_id}, capture ${cap.captureId}) BUT DB UPDATE FAILED — reconcile manually`,
    );
    // Independent channel: the DB is down, so alert by email with the ids.
    notifyAgency(row, `DB RECORD FAILED after successful capture — order ${row.paypal_order_id}, capture ${cap.captureId}. Mark ${ref} deposit_paid manually.`).catch(() => {});
  }

  // 7) Notify the agency — best-effort.
  try {
    const fresh = recorded ? await getBookingByRef(ref) : row;
    if (fresh) {
      const sent = await notifyAgency({ ...fresh, status: 'deposit_paid' }, fresh.message);
      if (sent && recorded) await sql`UPDATE booking_requests SET notify_sent_at = now() WHERE ref = ${ref}`;
    }
  } catch (e) {
    console.error(`[paypal/capture] ${ref} notify error (non-fatal):`, e instanceof Error ? e.message : e);
  }

  return sendJson(res, 200, { ok: true, ref, status: 'deposit_paid' });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function notifyAgency(row: any, message?: string | null): Promise<boolean> {
  return sendBookingNotification({
    ref: row.ref,
    journeyId: row.journey_id,
    suiteCategory: row.suite_category,
    fareCode: row.fare_code,
    currency: row.currency,
    guestCount: row.guest_count,
    indicativeTotal: row.indicative_total != null ? Number(row.indicative_total) : null,
    depositAmount: row.deposit_amount != null ? Number(row.deposit_amount) : null,
    status: row.status,
    message: message ?? row.message,
    guests: row.guests ?? [],
  });
}
