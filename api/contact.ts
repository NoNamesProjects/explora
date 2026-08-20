/**
 * POST /api/contact — record a contact-form message.
 * Zod-validated, persisted to contact_messages, with ip/ua for audit.
 * Mirrors the shape of api/booking-request.ts (shared lib/http helpers + db()).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { db } from '../lib/db/client';
import { readJson, sendJson, reqMeta } from '../lib/http';
import { rateLimited } from '../lib/rate-limit';

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(160),
  phone: z.string().max(40).optional(),
  message: z.string().min(1).max(4000),
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    return res.end();
  }
  // 10/10min absorbs shared-IP visitors (hotel/office NAT) while still
  // bounding contact spam.
  if (rateLimited(req, res, { scope: 'contact', limit: 10, windowMs: 10 * 60_000 })) return;
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return sendJson(res, 400, { ok: false, error: 'invalid', issues: parsed.error.issues });
  const { name, email, phone, message } = parsed.data;
  try {
    const { ip, ua } = reqMeta(req);
    const sql = db();
    await sql`
      INSERT INTO contact_messages (name, email, phone, message, ip, user_agent)
      VALUES (${name}, ${email}, ${phone ?? null}, ${message}, ${ip}, ${ua})
    `;
    console.log(`[contact] message from ${email} (${name})`);
    return sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error('[contact] failed:', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
