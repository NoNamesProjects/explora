import type { IncomingMessage, ServerResponse } from 'node:http';
import { sendJson } from '../../../lib/http';
import { parseCookies, destroySession, clearSessionCookie } from '../../../lib/admin-auth';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    return res.end();
  }
  const token = parseCookies(req)['exp_admin'];
  if (token) await destroySession(token);
  clearSessionCookie(res);
  return sendJson(res, 200, { ok: true });
}
