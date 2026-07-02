import type { IncomingMessage, ServerResponse } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { db } from '../../../lib/db/client';
import { readJson, sendJson } from '../../../lib/http';
import { requireAuth, logAdminAction } from '../../../lib/admin-auth';

/**
 * Single media asset — DELETE (unlink file + remove row) and PATCH (edit the
 * alt text / category inline from the library page). Admin-only.
 */

const patchSchema = z.object({
  altEn: z.string().max(300).nullable().optional(),
  altEl: z.string().max(300).nullable().optional(),
  category: z.string().max(60).nullable().optional(),
});

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

function idFromUrl(req: IncomingMessage): number {
  return Number(new URL(req.url ?? '', 'http://x').pathname.split('/').filter(Boolean).pop());
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'admin');
  if (!user) return;

  const id = idFromUrl(req);
  if (!Number.isFinite(id)) return sendJson(res, 400, { ok: false, error: 'bad-id' });
  const sql = db();

  try {
    if (req.method === 'DELETE') {
      const rows = (await sql`DELETE FROM media_assets WHERE id = ${id} RETURNING filename, url`) as Array<{ filename: string; url: string }>;
      if (!rows[0]) return sendJson(res, 404, { ok: false, error: 'not-found' });

      // Best-effort unlink; basename() guards against any stored path traversal.
      const target = path.join(process.cwd(), 'uploads', path.basename(rows[0].filename));
      try {
        await fs.unlink(target);
      } catch (e) {
        if ((e as NodeJS.ErrnoException)?.code !== 'ENOENT') {
          console.error('[admin/media/:id] unlink', e instanceof Error ? e.message : e);
        }
      }

      logAdminAction(user, req, { action: 'media.delete', entity: 'media', entityId: id, after: { url: rows[0].url } });
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'PATCH') {
      const parsed = patchSchema.safeParse(await readJson(req));
      if (!parsed.success) return sendJson(res, 400, { ok: false, error: 'invalid' });
      const { altEn, altEl, category } = parsed.data;

      const cur = (await sql`SELECT id FROM media_assets WHERE id = ${id} LIMIT 1`) as Array<{ id: number }>;
      if (!cur[0]) return sendJson(res, 404, { ok: false, error: 'not-found' });

      if (altEn !== undefined) await sql`UPDATE media_assets SET alt_en = ${altEn || null} WHERE id = ${id}`;
      if (altEl !== undefined) await sql`UPDATE media_assets SET alt_el = ${altEl || null} WHERE id = ${id}`;
      if (category !== undefined) await sql`UPDATE media_assets SET category = ${category || null} WHERE id = ${id}`;

      const rows = (await sql`
        SELECT id, filename, url, original_name, mime, bytes, width, height, alt_en, alt_el, category, uploaded_by, created_at
        FROM media_assets WHERE id = ${id} LIMIT 1
      `) as Row[];
      logAdminAction(user, req, { action: 'media.update', entity: 'media', entityId: id, after: { altEn, altEl, category } });
      return sendJson(res, 200, { ok: true, asset: toAsset(rows[0]) });
    }

    res.statusCode = 405; res.setHeader('Allow', 'PATCH, DELETE'); return res.end();
  } catch (err) {
    console.error('[admin/media/:id]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
