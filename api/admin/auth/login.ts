import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { db } from '../../../lib/db/client';
import { readJson, sendJson, reqMeta } from '../../../lib/http';
import {
  verifyPassword,
  dummyVerify,
  createSession,
  setSessionCookie,
  checkLoginThrottle,
  recordLoginAttempt,
  sweepExpiredSessions,
  logAdminAction,
} from '../../../lib/admin-auth';

const schema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(1).max(200),
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    return res.end();
  }

  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return sendJson(res, 400, { ok: false, error: 'invalid' });

  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;
  const { ip } = reqMeta(req);

  if (!(await checkLoginThrottle(ip, email))) {
    return sendJson(res, 429, { ok: false, error: 'too-many-attempts' });
  }

  const sql = db();
  const rows = (await sql`
    SELECT id, email, name, role, disabled, password_hash
    FROM admin_users WHERE lower(email) = ${email} LIMIT 1
  `) as Array<{ id: number; email: string; name: string; role: 'admin' | 'agent'; disabled: boolean; password_hash: string }>;
  const user = rows[0];

  // Constant-time path for missing/disabled users (anti-enumeration).
  const ok = user && !user.disabled
    ? await verifyPassword(password, user.password_hash)
    : (await dummyVerify(password), false);

  if (!ok || !user) {
    await recordLoginAttempt(ip, email, false);
    return sendJson(res, 401, { ok: false, error: 'invalid-credentials' });
  }

  const { token } = await createSession(Number(user.id), req);
  setSessionCookie(req, res, token);
  await sql`UPDATE admin_users SET last_login_at = now() WHERE id = ${user.id}`;
  await recordLoginAttempt(ip, email, true);
  logAdminAction({ id: Number(user.id), email: user.email }, req, { action: 'login' });
  void sweepExpiredSessions();

  return sendJson(res, 200, {
    ok: true,
    user: { id: Number(user.id), email: user.email, name: user.name, role: user.role },
  });
}
