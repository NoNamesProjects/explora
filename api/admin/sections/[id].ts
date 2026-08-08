/**
 * PAGE-BUILDER — edit / hide / delete one section instance.
 *
 *   PUT    /api/admin/sections/:id   body { config?, visible?, slug? }
 *            Writes DRAFT columns only. `config` is sanitized against the
 *            section type's declared fields, so unknown keys are dropped.
 *   DELETE /api/admin/sections/:id[?restore=1]
 *            Never published → hard delete (nothing was ever live).
 *            Already published → stage it (deleted_draft), reversible until the
 *            page is published. ?restore=1 un-stages.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { paramQuery } from '../../../lib/db/client';
import { readJson, sendJson } from '../../../lib/http';
import { requireAuth, logAdminAction } from '../../../lib/admin-auth';
import { sanitizeSectionConfig } from '../../../lib/content-sanitize';
import { SECTION_COLS, slugify, toAdminSection, type SectionRow } from '../../../lib/sections';
import { sectionTypeDef } from '../../../src/content/sectionTypes';

const putSchema = z.object({
  config: z.unknown().optional(),
  visible: z.boolean().optional(),
  slug: z.string().max(60).optional(),
});

function idFromUrl(req: IncomingMessage): number {
  return Number(new URL(req.url ?? '', 'http://x').pathname.split('/').filter(Boolean).pop());
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'admin');
  if (!user) return;

  const id = idFromUrl(req);
  if (!Number.isInteger(id) || id <= 0) return sendJson(res, 400, { ok: false, error: 'bad-id' });

  try {
    const cur = await paramQuery<SectionRow>(
      `SELECT ${SECTION_COLS} FROM page_sections WHERE id = $1 LIMIT 1`, [id],
    );
    if (!cur[0]) return sendJson(res, 404, { ok: false, error: 'not-found' });
    const row = cur[0];

    if (req.method === 'PUT') {
      const parsed = putSchema.safeParse(await readJson(req));
      if (!parsed.success) return sendJson(res, 400, { ok: false, error: 'invalid' });

      const def = sectionTypeDef(row.section_type);
      if (!def) return sendJson(res, 409, { ok: false, error: 'unknown-section-type' });

      // Build the SET list from only the keys actually supplied.
      const sets: string[] = ['updated_by = $1', 'updated_at = now()'];
      const params: unknown[] = [user.id];
      const add = (frag: string, value: unknown) => {
        params.push(value);
        sets.push(frag.replace('$?', `$${params.length}`));
      };

      if (parsed.data.config !== undefined) {
        add('config_draft = $?::jsonb', JSON.stringify(sanitizeSectionConfig(def.fields, parsed.data.config)));
      }
      if (parsed.data.visible !== undefined) add('visible_draft = $?', parsed.data.visible);
      if (parsed.data.slug !== undefined) {
        // Slug is the anchor + per-page identity; keep it unique or 409.
        const next = slugify(parsed.data.slug, row.slug);
        if (next !== row.slug) {
          const clash = await paramQuery<{ n: number }>(
            `SELECT count(*)::int AS n FROM page_sections
              WHERE page_key = $1 AND entity_slug IS NOT DISTINCT FROM $2 AND slug = $3 AND id <> $4`,
            [row.page_key, row.entity_slug, next, id],
          );
          if ((clash[0]?.n ?? 0) > 0) return sendJson(res, 409, { ok: false, error: 'slug-taken' });
          add('slug = $?', next);
        }
      }

      params.push(id);
      const rows = await paramQuery<SectionRow>(
        `UPDATE page_sections SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING ${SECTION_COLS}`,
        params,
      );
      logAdminAction(user, req, {
        action: 'section.update', entity: 'page_section', entityId: id,
        after: { visible: parsed.data.visible, changedConfig: parsed.data.config !== undefined },
      });
      return sendJson(res, 200, { ok: true, section: toAdminSection(rows[0]) });
    }

    if (req.method === 'DELETE') {
      const restore = new URL(req.url ?? '', 'http://x').searchParams.get('restore') === '1';

      if (restore) {
        const rows = await paramQuery<SectionRow>(
          `UPDATE page_sections SET deleted_draft = false, updated_by = $1, updated_at = now()
            WHERE id = $2 RETURNING ${SECTION_COLS}`,
          [user.id, id],
        );
        logAdminAction(user, req, { action: 'section.restore', entity: 'page_section', entityId: id });
        return sendJson(res, 200, { ok: true, section: toAdminSection(rows[0]) });
      }

      // Never went live → nothing to stage, just drop it.
      if (row.is_new) {
        await paramQuery(`DELETE FROM page_sections WHERE id = $1`, [id]);
        logAdminAction(user, req, {
          action: 'section.delete', entity: 'page_section', entityId: id,
          before: { slug: row.slug, sectionType: row.section_type, staged: false },
        });
        return sendJson(res, 200, { ok: true, removed: true });
      }

      const rows = await paramQuery<SectionRow>(
        `UPDATE page_sections SET deleted_draft = true, updated_by = $1, updated_at = now()
          WHERE id = $2 RETURNING ${SECTION_COLS}`,
        [user.id, id],
      );
      logAdminAction(user, req, {
        action: 'section.stage-delete', entity: 'page_section', entityId: id,
        before: { slug: row.slug, sectionType: row.section_type },
      });
      return sendJson(res, 200, { ok: true, section: toAdminSection(rows[0]) });
    }

    res.statusCode = 405; res.setHeader('Allow', 'PUT, DELETE'); return res.end();
  } catch (err) {
    console.error('[admin/sections/:id]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
