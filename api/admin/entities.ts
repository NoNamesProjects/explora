/**
 * ENTITIES — list + create the ships / destinations an admin manages.
 *
 *   GET  /api/admin/entities?kind=ship
 *   POST /api/admin/entities   body { kind, slug, nameEn, nameEl?, groupKey? }
 *
 * Creating one is what makes "add a 7th ship" a database write instead of edits
 * across five TypeScript files plus a redeploy. New entities start hidden
 * (visible=false) so the admin can fill them in before anyone sees them.
 *
 * One file serves every kind, present and future — the `kind` is a parameter,
 * not a route segment, so a third entity type costs zero new endpoints (and zero
 * new entries in the two hand-maintained route tables).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { paramQuery } from '../../lib/db/client';
import { readJson, sendJson } from '../../lib/http';
import { requireAuth, logAdminAction } from '../../lib/admin-auth';
import { ENTITY_COLS, entitySlugify, toAdminEntity, type EntityRow } from '../../lib/entities';
import { isKnownEntityKind } from '../../src/content/entityTypes';

const createSchema = z.object({
  kind: z.string().min(1).max(40),
  slug: z.string().min(1).max(60),
  nameEn: z.string().min(1).max(160),
  nameEl: z.string().max(160).optional(),
  groupKey: z.string().max(60).optional().nullable(),
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'admin');
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const kind = new URL(req.url ?? '', 'http://x').searchParams.get('kind');
      const rows = kind
        ? await paramQuery<EntityRow>(
            `SELECT ${ENTITY_COLS} FROM site_entities WHERE kind = $1 ORDER BY position ASC, id ASC`, [kind])
        : await paramQuery<EntityRow>(
            `SELECT ${ENTITY_COLS} FROM site_entities ORDER BY kind ASC, position ASC, id ASC`);
      return sendJson(res, 200, { ok: true, items: rows.map(toAdminEntity) });
    }

    if (req.method === 'POST') {
      const parsed = createSchema.safeParse(await readJson(req));
      if (!parsed.success) return sendJson(res, 400, { ok: false, error: 'invalid' });
      const { kind, nameEn } = parsed.data;
      if (!isKnownEntityKind(kind)) return sendJson(res, 400, { ok: false, error: 'unknown-kind' });

      const slug = entitySlugify(parsed.data.slug);
      if (!slug) return sendJson(res, 400, { ok: false, error: 'bad-slug' });

      const clash = await paramQuery<{ n: number }>(
        `SELECT count(*)::int AS n FROM site_entities WHERE slug = $1`, [slug]);
      if ((clash[0]?.n ?? 0) > 0) return sendJson(res, 409, { ok: false, error: 'slug-taken' });

      const tail = await paramQuery<{ p: number }>(
        `SELECT coalesce(max(position), 0)::int AS p FROM site_entities WHERE kind = $1`, [kind]);

      const rows = await paramQuery<EntityRow>(
        `INSERT INTO site_entities (kind, slug, name_en, name_el, group_key, position, visible, fields, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, false, '{}'::jsonb, $7, $7)
         RETURNING ${ENTITY_COLS}`,
        [kind, slug, nameEn, parsed.data.nameEl || nameEn, parsed.data.groupKey || null,
         (tail[0]?.p ?? 0) + 10, user.id],
      );

      logAdminAction(user, req, {
        action: 'entity.create', entity: 'site_entity', entityId: slug, after: { kind, nameEn },
      });
      return sendJson(res, 200, { ok: true, entity: toAdminEntity(rows[0]) });
    }

    res.statusCode = 405; res.setHeader('Allow', 'GET, POST'); return res.end();
  } catch (err) {
    console.error('[admin/entities]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
