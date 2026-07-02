import type { IncomingMessage, ServerResponse } from 'node:http';

/** Read a JSON body from a raw request (Vercel/Express populate req.body; dev streams). */
export async function readJson(req: IncomingMessage): Promise<unknown> {
  // @ts-expect-error — runtime body on adapters
  if (req.body) return req.body;
  const chunks: Buffer[] = [];
  for await (const chunk of req as AsyncIterable<Buffer>) chunks.push(chunk);
  if (!chunks.length) return null;
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return null; }
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

/** Client IP + UA for audit. */
export function reqMeta(req: IncomingMessage): { ip: string | null; ua: string | null } {
  const fwd = (req.headers['x-forwarded-for'] as string) || '';
  const ip = fwd.split(',')[0].trim() || req.socket?.remoteAddress || null;
  const ua = (req.headers['user-agent'] as string) || null;
  return { ip, ua };
}
