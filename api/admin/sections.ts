/**
 * PAGE-BUILDER — list + create section instances for a page.
 *
 *   GET  /api/admin/sections?page=home[&entity=explora-i]
 *          → { ok, items: [...] }  the DRAFT state, ordered. Rows staged for
 *            deletion are included (flagged) so a delete is undoable pre-publish.
 *   POST /api/admin/sections
 *          body { pageKey, entitySlug?, sectionType, slug? }
 *          → creates one instance seeded from the type's defaultConfig().
 *
 * The section_type must exist in src/content/sectionTypes.ts AND declare this
 * page in its scope — that registry is the write allowlist, exactly as
 * CONTENT_REGISTRY is for api/admin/content.ts.
 *
 * These handlers use paramQuery (raw text + bound params) rather than the tagged
 * template, because they need a shared column list and `IS NOT DISTINCT FROM`
 * null-safe entity matching, neither of which a tagged template can express.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { paramQuery } from '../../lib/db/client';
import { readJson, sendJson } from '../../lib/http';
import { requireAuth, logAdminAction } from '../../lib/admin-auth';
import { sanitizeSectionConfig } from '../../lib/content-sanitize';
import { SECTION_COLS, normEntity, slugify, toAdminSection, type SectionRow } from '../../lib/sections';
import { sectionTypeDef, isKnownSectionType, PAGE_KEYS } from '../../src/content/sectionTypes';

const PAGE_SET = new Set(PAGE_KEYS.map((p) => p.key as string));

const createSchema = z.object({
  pageKey: z.string().min(1).max(60),
  entitySlug: z.string().max(80).optional().nullable(),
  sectionType: z.string().min(1).max(60),
  slug: z.string().max(60).optional(),
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'admin');
  if (!user) return;

  try {
    // ── List the draft state for one page ────────────────────────────────────
    if (req.method === 'GET') {
      const q = new URL(req.url ?? '', 'http://x').searchParams;
      const pageKey = q.get('page') ?? '';
      if (!PAGE_SET.has(pageKey)) return sendJson(res, 400, { ok: false, error: 'unknown-page' });
      const entity = normEntity(q.get('entity'));

      const rows = await paramQuery<SectionRow>(
        `SELECT ${SECTION_COLS} FROM page_sections
          WHERE page_key = $1 AND entity_slug IS NOT DISTINCT FROM $2
          ORDER BY position ASC, id ASC`,
        [pageKey, entity],
      );
      return sendJson(res, 200, { ok: true, items: rows.map(toAdminSection) });
    }

    // ── Add one section ──────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const parsed = createSchema.safeParse(await readJson(req));
      if (!parsed.success) return sendJson(res, 400, { ok: false, error: 'invalid' });
      const { pageKey, sectionType } = parsed.data;
      const entity = normEntity(parsed.data.entitySlug);

      if (!PAGE_SET.has(pageKey)) return sendJson(res, 400, { ok: false, error: 'unknown-page' });
      if (!isKnownSectionType(sectionType)) return sendJson(res, 400, { ok: false, error: 'unknown-section-type' });
      const def = sectionTypeDef(sectionType)!;
      if (!(def.scope as string[]).includes(pageKey)) {
        return sendJson(res, 400, { ok: false, error: 'type-not-allowed-on-page' });
      }

      // Per-type instance cap (a page holds one hero, one newsletter band, …).
      if (def.maxPerPage != null) {
        const existing = await paramQuery<{ n: number }>(
          `SELECT count(*)::int AS n FROM page_sections
            WHERE page_key = $1 AND entity_slug IS NOT DISTINCT FROM $2
              AND section_type = $3 AND NOT deleted_draft`,
          [pageKey, entity, sectionType],
        );
        if ((existing[0]?.n ?? 0) >= def.maxPerPage) {
          return sendJson(res, 409, { ok: false, error: 'max-per-page', max: def.maxPerPage });
        }
      }

      // Slugs are the stable anchor/identity, so they must be unique per page.
      const base = slugify(parsed.data.slug || sectionType, sectionType);
      const taken = await paramQuery<{ slug: string }>(
        `SELECT slug FROM page_sections WHERE page_key = $1 AND entity_slug IS NOT DISTINCT FROM $2`,
        [pageKey, entity],
      );
      const used = new Set(taken.map((t) => t.slug));
      let slug = base;
      for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;

      // Append to the end of the draft order (sparse steps of 1000).
      const tail = await paramQuery<{ p: number }>(
        `SELECT coalesce(max(position), 0)::int AS p FROM page_sections
          WHERE page_key = $1 AND entity_slug IS NOT DISTINCT FROM $2`,
        [pageKey, entity],
      );
      const position = (tail[0]?.p ?? 0) + 1000;
      const config = sanitizeSectionConfig(def.fields, def.defaultConfig());

      const rows = await paramQuery<SectionRow>(
        `INSERT INTO page_sections
           (page_key, entity_slug, section_type, slug, position, config_draft, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $7)
         RETURNING ${SECTION_COLS}`,
        [pageKey, entity, sectionType, slug, position, JSON.stringify(config), user.id],
      );

      logAdminAction(user, req, {
        action: 'section.create', entity: 'page_section', entityId: Number(rows[0].id),
        after: { pageKey, entitySlug: entity, sectionType, slug },
      });
      return sendJson(res, 200, { ok: true, section: toAdminSection(rows[0]) });
    }

    res.statusCode = 405; res.setHeader('Allow', 'GET, POST'); return res.end();
  } catch (err) {
    console.error('[admin/sections]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
