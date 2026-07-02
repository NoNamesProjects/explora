import type { IncomingMessage, ServerResponse } from 'node:http';
import { db } from '../../../lib/db/client';
import { sendJson } from '../../../lib/http';
import { parseCookies, destroySession, clearSessionCookie, logAdminAction } from '../../../lib/admin-auth';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    return res.end();
  }
  const token = parseCookies(req)['exp_admin'];
  if (token) {
    // Resolve who is logging out (best-effort) so the audit trail records the
    // full session lifecycle — login is already logged; this closes the loop.
    try {
      const rows = (await db()`
        SELECT u.id, u.email FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id
        WHERE s.token = ${token} LIMIT 1
      `) as Array<{ id: number; email: string }>;
      if (rows[0]) logAdminAction({ id: Number(rows[0].id), email: rows[0].email }, req, { action: 'auth.logout' });
    } catch { /* best effort — never block logout */ }
    await destroySession(token);
  }
  clearSessionCookie(res, req);
  return sendJson(res, 200, { ok: true });
}
