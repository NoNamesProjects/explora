import type { IncomingMessage, ServerResponse } from 'node:http';

/** Liveness probe. Returns { ok: true, ts } when the server is reachable. */
export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true, ts: new Date().toISOString() }));
}
