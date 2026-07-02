import type { IncomingMessage, ServerResponse } from 'node:http';
import { db } from '../lib/db/client';

/**
 * Liveness probe. Returns { ok: true, ts } when the server is reachable, plus
 * two additive dependency booleans so a misconfigured deploy is visible:
 *   - db:    a SELECT 1 succeeded (false → DATABASE_URL missing/unreachable)
 *   - email: RESEND_API_KEY is present (false → the newsletter double-opt-in
 *            silently strands subscribers as pending — fix before launch)
 * ok stays true as long as the process serves requests (liveness ≠ readiness);
 * no secrets or connection details are ever returned.
 */
export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  let dbOk = false;
  try {
    await db()`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    ok: true,
    ts: new Date().toISOString(),
    db: dbOk,
    email: Boolean(process.env.RESEND_API_KEY),
  }));
}
