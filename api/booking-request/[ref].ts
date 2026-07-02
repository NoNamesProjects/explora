/**
 * GET /api/booking-request/:ref — redacted booking record for the confirmation page.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { sendJson } from '../../lib/http';
import { getBookingByRef, publicRecord } from '../../lib/booking';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    return res.end();
  }
  const url = new URL(req.url ?? '/', 'http://x');
  const ref = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() ?? '');
  if (!ref || ref === 'booking-request') return sendJson(res, 400, { ok: false, error: 'missing-ref' });
  try {
    const row = await getBookingByRef(ref);
    if (!row) return sendJson(res, 404, { ok: false, error: 'not-found' });
    return sendJson(res, 200, { ok: true, booking: publicRecord(row) });
  } catch (err) {
    console.error('[booking-request/:ref] failed:', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
