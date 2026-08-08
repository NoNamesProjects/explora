/**
 * PAGE-BUILDER — publish one page's staged changes.
 *
 *   POST /api/admin/sections/publish   body { pageKey, entitySlug? }
 *
 * Publish is the single point of no return, and it covers ALL THREE staged
 * dimensions at once (unlike site_content's publish, which only moves a value):
 *   · order      position        → position_published
 *   · visibility visible_draft   → visible_published
 *   · content    config_draft    → config_published
 * Rows staged for deletion are hard-deleted here, after their final state is
 * written to admin_audit — that table is the durable history, so the section
 * table itself never accumulates tombstones.
 *
 * Registered BEFORE api/admin/sections/[id].ts (static-before-param rule).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { paramQuery } from '../../../lib/db/client';
import { readJson, sendJson } from '../../../lib/http';
import { requireAuth, logAdminAction } from '../../../lib/admin-auth';
import { SECTION_COLS, normEntity, toAdminSection, type SectionRow } from '../../../lib/sections';

const schema = z.object({
  pageKey: z.string().min(1).max(60),
  entitySlug: z.string().max(80).optional().nullable(),
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'admin');
  if (!user) return;
  if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Allow', 'POST'); return res.end(); }

  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return sendJson(res, 400, { ok: false, error: 'invalid' });
  const { pageKey } = parsed.data;
  const entity = normEntity(parsed.data.entitySlug);

  try {
    // 1. Snapshot then drop the rows staged for deletion.
    const doomed = await paramQuery<SectionRow>(
      `SELECT ${SECTION_COLS} FROM page_sections
        WHERE page_key = $1 AND entity_slug IS NOT DISTINCT FROM $2 AND deleted_draft`,
      [pageKey, entity],
    );
    for (const d of doomed) {
      logAdminAction(user, req, {
        action: 'section.publish-delete', entity: 'page_section', entityId: Number(d.id),
        before: { slug: d.slug, sectionType: d.section_type, config: d.config_published },
      });
    }
    if (doomed.length) {
      await paramQuery(
        `DELETE FROM page_sections
          WHERE page_key = $1 AND entity_slug IS NOT DISTINCT FROM $2 AND deleted_draft`,
        [pageKey, entity],
      );
    }

    // 2. Promote draft → published for everything that survives.
    const promoted = await paramQuery<{ id: number }>(
      `UPDATE page_sections
          SET config_published   = config_draft,
              visible_published  = visible_draft,
              position_published = position,
              is_new             = false,
              published_at       = now(),
              updated_by         = $3
        WHERE page_key = $1 AND entity_slug IS NOT DISTINCT FROM $2
        RETURNING id`,
      [pageKey, entity, user.id],
    );

    const rows = await paramQuery<SectionRow>(
      `SELECT ${SECTION_COLS} FROM page_sections
        WHERE page_key = $1 AND entity_slug IS NOT DISTINCT FROM $2
        ORDER BY position ASC, id ASC`,
      [pageKey, entity],
    );

    logAdminAction(user, req, {
      action: 'section.publish', entity: 'page', entityId: pageKey,
      after: { entitySlug: entity, published: promoted.length, deleted: doomed.length },
    });
    return sendJson(res, 200, {
      ok: true, published: promoted.length, deleted: doomed.length, items: rows.map(toAdminSection),
    });
  } catch (err) {
    console.error('[admin/sections/publish]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
