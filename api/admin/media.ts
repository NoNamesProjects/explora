import type { IncomingMessage, ServerResponse } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { db, paramQuery } from '../../lib/db/client';
import { sendJson } from '../../lib/http';
import { requireAuth, logAdminAction, type AuthUser } from '../../lib/admin-auth';

/**
 * Media library — GET (list, filter, paginate) + POST (upload one image).
 *
 * Storage decision: files live on the host's disk under a top-level `uploads/`
 * dir and are served at `/uploads/<filename>` (server.js adds the static mount;
 * see the module MANIFEST). On Vercel disk writes don't persist, so POST 501s.
 *
 * The POST reads RAW bytes from the request stream (bypassing the 256kb JSON
 * body cap in server.js) with the filename / category / alt passed as query
 * params and the mime carried in the Content-Type header.
 */

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const uploadsDir = () => path.join(process.cwd(), 'uploads');

// ── Image validation (magic numbers) — inlined from scripts/fetch-port-images.ts ──

/** Validate real image bytes (JPEG/PNG/WebP/GIF) so an error page never gets saved. */
function isImage(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true; // JPEG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true; // PNG
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return true;
  if (buf.subarray(0, 4).toString('ascii') === 'GIF8') return true; // GIF
  return false;
}

/** Derive the true mime from the magic number (never trust the client header). */
function mimeFromImage(buf: Buffer): string {
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return 'image/gif';
}

/**
 * Read pixel dimensions straight from the header bytes we already have in
 * memory. Dependency-free on purpose: `sharp` ships a native binary that's a
 * liability on cPanel shared hosting, and this only needs the header, not a
 * decode. Returns nulls for anything it can't parse — width/height are a
 * nice-to-have (they drive the aspect-mismatch hint), never a gate on upload.
 */
function imageSize(buf: Buffer): { width: number | null; height: number | null } {
  const none = { width: null, height: null };
  try {
    // PNG: IHDR width/height are big-endian u32 at byte 16.
    if (buf[0] === 0x89 && buf[1] === 0x50) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    // GIF: logical screen width/height are little-endian u16 at byte 6.
    if (buf.subarray(0, 3).toString('ascii') === 'GIF') {
      return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    }
    // WebP: VP8 / VP8L / VP8X each store the size differently.
    if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
      const fourcc = buf.subarray(12, 16).toString('ascii');
      if (fourcc === 'VP8 ') {
        return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
      }
      if (fourcc === 'VP8L') {
        const bits = buf.readUInt32LE(21);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
      if (fourcc === 'VP8X') {
        const rd24 = (o: number) => buf[o] | (buf[o + 1] << 8) | (buf[o + 2] << 16);
        return { width: rd24(24) + 1, height: rd24(27) + 1 };
      }
      return none;
    }
    // JPEG: walk the segment chain to the SOFn frame header.
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let o = 2;
      while (o + 9 < buf.length) {
        if (buf[o] !== 0xff) { o++; continue; }
        const marker = buf[o + 1];
        // SOF0-SOF15, excluding the non-frame markers DHT(c4)/JPG(c8)/DAC(cc).
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { height: buf.readUInt16BE(o + 5), width: buf.readUInt16BE(o + 7) };
        }
        o += 2 + buf.readUInt16BE(o + 2);
      }
    }
  } catch {
    /* malformed header — fall through to nulls */
  }
  return none;
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif',
};
function extFromMime(mime: string): string {
  return EXT_BY_MIME[mime] ?? '.jpg';
}

/** Safe, unique on-disk name: slug of the original + a time/random suffix + ext. */
function safeFilename(originalName: string | null, ext: string): string {
  const base =
    (originalName ?? 'image')
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'image';
  return `${base}-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}${ext}`;
}

/** Read the raw request body into a Buffer, aborting past `limit`. */
async function readRawBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += b.length;
    if (total > limit) throw new Error('too-large');
    chunks.push(b);
  }
  return Buffer.concat(chunks);
}

// ── Row → API shape ──────────────────────────────────────────────────────────

interface Row {
  id: number | string; filename: string; url: string; original_name: string | null;
  mime: string | null; bytes: number | string | null; width: number | null; height: number | null;
  alt_en: string | null; alt_el: string | null; category: string | null;
  uploaded_by: number | string | null; created_at: string;
}

function toAsset(r: Row) {
  return {
    id: Number(r.id),
    filename: r.filename,
    url: r.url,
    originalName: r.original_name,
    mime: r.mime,
    bytes: r.bytes != null ? Number(r.bytes) : null,
    width: r.width != null ? Number(r.width) : null,
    height: r.height != null ? Number(r.height) : null,
    altEn: r.alt_en,
    altEl: r.alt_el,
    category: r.category,
    uploadedBy: r.uploaded_by != null ? Number(r.uploaded_by) : null,
    createdAt: r.created_at,
  };
}

const SELECT_COLS =
  'id, filename, url, original_name, mime, bytes, width, height, alt_en, alt_el, category, uploaded_by, created_at';

// ── Handlers ─────────────────────────────────────────────────────────────────

async function list(req: IncomingMessage, res: ServerResponse) {
  const q = new URL(req.url ?? '', 'http://x').searchParams;
  const category = q.get('category')?.trim() || null;
  const search = q.get('q')?.trim() || null;
  const page = Math.max(1, Number(q.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(q.get('pageSize')) || 24));

  const where =
    `WHERE ($1::text IS NULL OR category = $1)
       AND ($2::text IS NULL OR original_name ILIKE $2 OR filename ILIKE $2 OR alt_en ILIKE $2 OR alt_el ILIKE $2)`;
  const like = search ? `%${search}%` : null;
  const params = [category, like];

  try {
    const offset = (page - 1) * pageSize;
    const rows = await paramQuery<Row>(
      `SELECT ${SELECT_COLS} FROM media_assets ${where} ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
      [...params, pageSize, offset],
    );
    const countRows = await paramQuery<{ n: number }>(
      `SELECT count(*)::int AS n FROM media_assets ${where}`,
      params,
    );
    return sendJson(res, 200, {
      ok: true, items: rows.map(toAsset), total: countRows[0]?.n ?? 0, page, pageSize,
    });
  } catch (err) {
    console.error('[admin/media] list', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}

async function upload(req: IncomingMessage, res: ServerResponse, user: AuthUser) {
  // No persistent disk on Vercel — uploads simply aren't supported there.
  if (process.env.VERCEL) return sendJson(res, 501, { ok: false, error: 'uploads-need-disk-host' });

  let buf: Buffer;
  try {
    buf = await readRawBody(req, MAX_BYTES);
  } catch (e) {
    if (e instanceof Error && e.message === 'too-large') {
      return sendJson(res, 413, { ok: false, error: 'file-too-large' });
    }
    return sendJson(res, 400, { ok: false, error: 'read-failed' });
  }
  if (!buf.length) return sendJson(res, 400, { ok: false, error: 'empty' });
  if (!isImage(buf)) return sendJson(res, 415, { ok: false, error: 'not-an-image' });

  const q = new URL(req.url ?? '', 'http://x').searchParams;
  const originalName = q.get('filename')?.trim() || null;
  const category = q.get('category')?.trim() || null;
  const altEn = q.get('altEn')?.trim() || null;
  const altEl = q.get('altEl')?.trim() || null;

  const mime = mimeFromImage(buf);
  const filename = safeFilename(originalName, extFromMime(mime));
  const url = `/uploads/${filename}`;
  const dir = uploadsDir();

  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, filename), buf);
  } catch (err) {
    console.error('[admin/media] write', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'write-failed' });
  }

  try {
    const sql = db();
    const { width, height } = imageSize(buf);
    const rows = (await sql`
      INSERT INTO media_assets (filename, url, original_name, mime, bytes, width, height, category, alt_en, alt_el, uploaded_by)
      VALUES (${filename}, ${url}, ${originalName}, ${mime}, ${buf.length}, ${width}, ${height}, ${category}, ${altEn}, ${altEl}, ${user.id})
      RETURNING id, filename, url, original_name, mime, bytes, width, height, alt_en, alt_el, category, uploaded_by, created_at
    `) as Row[];
    const asset = toAsset(rows[0]);
    logAdminAction(user, req, { action: 'media.upload', entity: 'media', entityId: asset.id, after: { url } });
    return sendJson(res, 200, { ok: true, asset });
  } catch (err) {
    // Roll back the orphaned file if the DB insert failed (best effort).
    try { await fs.unlink(path.join(dir, filename)); } catch { /* ignore */ }
    console.error('[admin/media] insert', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'admin');
  if (!user) return;

  if (req.method === 'GET') return list(req, res);
  if (req.method === 'POST') return upload(req, res, user);

  res.statusCode = 405; res.setHeader('Allow', 'GET, POST'); return res.end();
}
