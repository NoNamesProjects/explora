/**
 * POST /api/paypal/create-order { ref } — create a PayPal deposit order for a
 * pending booking request. Amount comes from the stored deposit (server-side).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { db } from '../../lib/db/client';
import { readJson, sendJson } from '../../lib/http';
import { getBookingByRef } from '../../lib/booking';
import { paypalConfigured, createOrder } from '../../lib/paypal';

const schema = z.object({ ref: z.string().min(1).max(40) });

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    return res.end();
  }
  if (!paypalConfigured()) return sendJson(res, 400, { ok: false, error: 'paypal-not-configured' });
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return sendJson(res, 400, { ok: false, error: 'invalid' });
  try {
    const row = await getBookingByRef(parsed.data.ref);
    if (!row) return sendJson(res, 404, { ok: false, error: 'not-found' });
    const deposit = row.deposit_amount != null ? Number(row.deposit_amount) : null;
    if (!deposit || deposit <= 0) return sendJson(res, 400, { ok: false, error: 'no-deposit' });
    const orderId = await createOrder(deposit, row.currency || 'EUR', row.ref);
    const sql = db();
    await sql`UPDATE booking_requests SET paypal_order_id = ${orderId}, updated_at = now() WHERE ref = ${row.ref}`;
    return sendJson(res, 200, { ok: true, orderId });
  } catch (err) {
    console.error('[paypal/create-order] failed:', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
