import type { IncomingMessage, ServerResponse } from 'node:http';
import { sendJson } from '../../../lib/http';
import { requireAuth } from '../../../lib/admin-auth';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    return res.end();
  }
  const user = await requireAuth(req, res);
  if (!user) return;
  return sendJson(res, 200, { ok: true, user });
}
