import type { IncomingMessage, ServerResponse } from 'node:http';

// Matches the express.json limit in server.js. The manual stream fallback below
// is the path non-JSON content types take on the Express deploy, so it must
// enforce the same cap or a single huge text/plain POST can OOM the process.
const MAX_JSON_BYTES = 256 * 1024;

/** Thrown by readJson when a streamed body exceeds MAX_JSON_BYTES; the Express
 *  error handler in server.js maps it (and express.json's entity.too.large)
 *  to a 413 response. */
export class BodyTooLargeError extends Error {
  statusCode = 413;
  constructor() { super('body-too-large'); }
}

/** Read a JSON body from a raw request (Vercel/Express populate req.body; dev streams). */
export async function readJson(req: IncomingMessage): Promise<unknown> {
  // @ts-expect-error — runtime body on adapters
  if (req.body) return req.body;
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += b.length;
    if (total > MAX_JSON_BYTES) throw new BodyTooLargeError();
    chunks.push(b);
  }
  if (!chunks.length) return null;
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return null; }
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

// Loopback / RFC1918 / link-local / unique-local ranges — an upstream hop in
// these ranges means "our own reverse proxy", not the client.
const PRIVATE_ADDR_RE = /^(?:127\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|169\.254\.|::1$|f[cd][0-9a-f]{2}:|fe80:)/i;

function isPrivateAddr(addr: string): boolean {
  return PRIVATE_ADDR_RE.test(addr.replace(/^::ffff:/i, ''));
}

/**
 * Client IP for throttling + audit. The FIRST x-forwarded-for entry is
 * client-suppliable (append-style proxies keep it), so it is never trusted:
 * on a direct connection the socket address wins and the header is ignored;
 * behind a local/private reverse proxy (VPS nginx, Vercel's edge) the LAST
 * entry — the one appended or overwritten by our own proxy — is used.
 */
export function clientIp(req: IncomingMessage): string | null {
  const sock = req.socket?.remoteAddress || null;
  const fwd = (req.headers['x-forwarded-for'] as string) || '';
  const entries = fwd.split(',').map((s) => s.trim()).filter(Boolean);
  if (!entries.length) return sock;
  if (sock && !isPrivateAddr(sock)) return sock;
  return entries[entries.length - 1];
}

/** Client IP + UA for audit. */
export function reqMeta(req: IncomingMessage): { ip: string | null; ua: string | null } {
  const ua = (req.headers['user-agent'] as string) || null;
  return { ip: clientIp(req), ua };
}
