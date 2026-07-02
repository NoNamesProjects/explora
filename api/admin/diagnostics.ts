import type { IncomingMessage, ServerResponse } from 'node:http';
import { db, dbIsNeon } from '../../lib/db/client';
import { sendJson } from '../../lib/http';
import { requireAuth } from '../../lib/admin-auth';

/**
 * Reports configured/mode flags only — NEVER a secret value, prefix, or length.
 * Only the DB does a live reachability ping; external APIs are presence-only
 * (pinging Okta would consume the single flatfile session token).
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'admin');
  if (!user) return;
  if (req.method !== 'GET') { res.statusCode = 405; res.setHeader('Allow', 'GET'); return res.end(); }

  const env = process.env;
  let dbReachable = false;
  try { await db()`SELECT 1`; dbReachable = true; } catch { dbReachable = false; }

  const checks = {
    database: { configured: !!env.DATABASE_URL, reachable: dbReachable, driver: dbIsNeon() ? 'neon' : 'postgres' },
    exploraFlatfile: { configured: !!(env.EXPLORA_USERNAME && env.EXPLORA_PASSWORD), mode: env.EXPLORA_ENV || 'preprod' },
    paypal: { configured: !!(env.PAYPAL_CLIENT_ID && env.PAYPAL_SECRET), mode: env.PAYPAL_ENV || 'sandbox' },
    resend: { configured: !!env.RESEND_API_KEY },
    bookingNotify: { configured: !!(env.BOOKING_NOTIFY_EMAIL || env.RESEND_FROM) },
    cronSecret: { configured: !!env.CRON_SECRET },
    adminSessions: { configured: true },
  };

  return sendJson(res, 200, { ok: true, diagnostics: { generatedAt: new Date().toISOString(), checks } });
}
