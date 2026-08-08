/**
 * ENTITIES — read / update / delete one ship or destination.
 *
 *   GET    /api/admin/entities/:slug
 *   PUT    /api/admin/entities/:slug   body { nameEn?, nameEl?, groupKey?, visible?, position?, fields? }
 *   DELETE /api/admin/entities/:slug   — also removes its detail-page sections
 *
 * `fields` is sanitized against the entity type's declared field list, so an
 * unknown key can never reach the jsonb column and an href can never arrive
 * unvalidated (see lib/content-sanitize.ts).
 *
 * Unlike sections, entity edits are IMMEDIATE — there is no draft copy. `visible`
 * is the launch gate instead: build a new ship hidden, flip it on when ready.
 * The slug is immutable once created because it is the public URL and the key
 * every page_sections row for this entity points at.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { paramQuery } from '../../../lib/db/client';
import { readJson, sendJson } from '../../../lib/http';
import { requireAuth, logAdminAction } from '../../../lib/admin-auth';
import { sanitizeSectionConfig } from '../../../lib/content-sanitize';
import { ENTITY_COLS, toAdminEntity, type EntityRow } from '../../../lib/entities';
import { entityTypeDef } from '../../../src/content/entityTypes';

const putSchema = z.object({
  nameEn: z.string().max(160).optional(),
  nameEl: z.string().max(160).optional(),
  groupKey: z.string().max(60).nullable().optional(),
  visible: z.boolean().optional(),
  position: z.number().int().optional(),
  fields: z.unknown().optional(),
});

function slugFromUrl(req: IncomingMessage): string {
  const seg = new URL(req.url ?? '', 'http://x').pathname.split('/').filter(Boolean).pop() ?? '';
  return decodeURIComponent(seg).slice(0, 60);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'admin');
  if (!user) return;

  const slug = slugFromUrl(req);
  if (!slug) return sendJson(res, 400, { ok: false, error: 'bad-slug' });

  try {
    const cur = await paramQuery<EntityRow>(
      `SELECT ${ENTITY_COLS} FROM site_entities WHERE slug = $1 LIMIT 1`, [slug]);
    if (!cur[0]) return sendJson(res, 404, { ok: false, error: 'not-found' });
    const row = cur[0];

    if (req.method === 'GET') {
      return sendJson(res, 200, { ok: true, entity: toAdminEntity(row) });
    }

    if (req.method === 'PUT') {
      const parsed = putSchema.safeParse(await readJson(req));
      if (!parsed.success) return sendJson(res, 400, { ok: false, error: 'invalid' });

      const def = entityTypeDef(row.kind);
      if (!def) return sendJson(res, 409, { ok: false, error: 'unknown-kind' });

      const sets: string[] = ['updated_by = $1', 'updated_at = now()'];
      const params: unknown[] = [user.id];
      const add = (frag: string, value: unknown) => {
        params.push(value);
        sets.push(frag.replace('$?', `$${params.length}`));
      };

      if (parsed.data.nameEn !== undefined) add('name_en = $?', parsed.data.nameEn);
      if (parsed.data.nameEl !== undefined) add('name_el = $?', parsed.data.nameEl);
      if (parsed.data.groupKey !== undefined) add('group_key = $?', parsed.data.groupKey || null);
      if (parsed.data.visible !== undefined) add('visible = $?', parsed.data.visible);
      if (parsed.data.position !== undefined) add('position = $?', parsed.data.position);
      if (parsed.data.fields !== undefined) {
        add('fields = $?::jsonb', JSON.stringify(sanitizeSectionConfig(def.fields, parsed.data.fields)));
      }

      params.push(slug);
      const rows = await paramQuery<EntityRow>(
        `UPDATE site_entities SET ${sets.join(', ')} WHERE slug = $${params.length} RETURNING ${ENTITY_COLS}`,
        params,
      );
      logAdminAction(user, req, {
        action: 'entity.update', entity: 'site_entity', entityId: slug,
        before: { visible: row.visible },
        after: { visible: parsed.data.visible ?? row.visible, changedFields: parsed.data.fields !== undefined },
      });
      return sendJson(res, 200, { ok: true, entity: toAdminEntity(rows[0]) });
    }

    if (req.method === 'DELETE') {
      // Sections are keyed by entity_slug with no FK (soft ref), so drop them
      // here or they'd linger as orphans no page could ever render.
      const orphans = await paramQuery<{ id: number }>(
        `DELETE FROM page_sections WHERE entity_slug = $1 RETURNING id`, [slug]);
      await paramQuery(`DELETE FROM site_entities WHERE slug = $1`, [slug]);
      logAdminAction(user, req, {
        action: 'entity.delete', entity: 'site_entity', entityId: slug,
        before: { kind: row.kind, nameEn: row.name_en, sectionsRemoved: orphans.length },
      });
      return sendJson(res, 200, { ok: true, sectionsRemoved: orphans.length });
    }

    res.statusCode = 405; res.setHeader('Allow', 'GET, PUT, DELETE'); return res.end();
  } catch (err) {
    console.error('[admin/entities/:slug]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
