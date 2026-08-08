/**
 * PAGE-BUILDER — batch reorder one page's sections.
 *
 *   POST /api/admin/sections/reorder
 *     body { pageKey, entitySlug?, orderedIds: number[] }
 *
 * One statement rewrites every row's DRAFT position from the supplied order, so
 * a drag lands as a single atomic write instead of N racing PUTs. Ids that don't
 * belong to this page are ignored (the WHERE clause re-checks ownership), and
 * any row omitted from the list keeps a position after the listed ones.
 *
 * Registered BEFORE api/admin/sections/[id].ts in vite-plugin-api.ts — static
 * segments must precede [param] patterns there (ROUTES.find takes the first hit).
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
  orderedIds: z.array(z.number().int().positive()).max(200),
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'admin');
  if (!user) return;
  if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Allow', 'POST'); return res.end(); }

  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return sendJson(res, 400, { ok: false, error: 'invalid' });
  const { pageKey, orderedIds } = parsed.data;
  const entity = normEntity(parsed.data.entitySlug);

  try {
    if (orderedIds.length) {
      // position = (index + 1) * 1000, applied via a VALUES join so the whole
      // reorder is one round-trip. Ownership is re-checked in the WHERE clause
      // so a crafted id from another page can never be moved.
      const values = orderedIds.map((_, i) => `($${i + 1}::bigint, ${(i + 1) * 1000})`).join(', ');
      await paramQuery(
        `UPDATE page_sections AS s
            SET position = v.pos, updated_at = now(), updated_by = $${orderedIds.length + 1}
           FROM (VALUES ${values}) AS v(id, pos)
          WHERE s.id = v.id
            AND s.page_key = $${orderedIds.length + 2}
            AND s.entity_slug IS NOT DISTINCT FROM $${orderedIds.length + 3}`,
        [...orderedIds, user.id, pageKey, entity],
      );
    }

    const rows = await paramQuery<SectionRow>(
      `SELECT ${SECTION_COLS} FROM page_sections
        WHERE page_key = $1 AND entity_slug IS NOT DISTINCT FROM $2
        ORDER BY position ASC, id ASC`,
      [pageKey, entity],
    );
    logAdminAction(user, req, {
      action: 'section.reorder', entity: 'page', entityId: pageKey,
      after: { entitySlug: entity, count: orderedIds.length },
    });
    return sendJson(res, 200, { ok: true, items: rows.map(toAdminSection) });
  } catch (err) {
    console.error('[admin/sections/reorder]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
