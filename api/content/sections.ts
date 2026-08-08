/**
 * PUBLIC — the ordered section list a page renders.
 *
 *   GET /api/content/sections?page=home[&entity=explora-i]
 *         → published sections only, visible ones, in published order. Cached.
 *   GET /api/content/sections?page=home&draft=1
 *         → the DRAFT projection instead. Requires an admin session; never
 *           cached. This is what powers ?cms_preview=1 on the real routes, so
 *           preview renders through the exact same components as the live site
 *           and can't drift from it.
 *
 * Never breaks the page: any failure returns an empty list, and the caller
 * falls back to its hardcoded composition.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { paramQuery } from '../../lib/db/client';
import { sendJson } from '../../lib/http';
import { parseCookies } from '../../lib/admin-auth';
import { SECTION_COLS, normEntity, toPublicSection, toPreviewSection, type SectionRow } from '../../lib/sections';

/** Resolve the admin session WITHOUT requireAuth's side effect of sending a 401. */
async function isAdminSession(req: IncomingMessage): Promise<boolean> {
  const token = parseCookies(req)['exp_admin'];
  if (!token) return false;
  try {
    const rows = await paramQuery<{ n: number }>(
      `SELECT count(*)::int AS n
         FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id
        WHERE s.token = $1 AND s.expires_at > now() AND NOT u.disabled`,
      [token],
    );
    return (rows[0]?.n ?? 0) > 0;
  } catch {
    return false;
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    return res.end();
  }

  const q = new URL(req.url ?? '', 'http://x').searchParams;
  const pageKey = (q.get('page') ?? '').slice(0, 60);
  const entity = normEntity(q.get('entity'));
  const wantsDraft = q.get('draft') === '1';

  if (!pageKey) return sendJson(res, 400, { ok: false, error: 'page-required' });

  try {
    const draft = wantsDraft && (await isAdminSession(req));

    // Preview shows everything the admin can see except rows staged for delete;
    // the live site additionally requires a published, visible projection.
    const rows = draft
      ? await paramQuery<SectionRow>(
          `SELECT ${SECTION_COLS} FROM page_sections
            WHERE page_key = $1 AND entity_slug IS NOT DISTINCT FROM $2
              AND NOT deleted_draft AND visible_draft
            ORDER BY position ASC, id ASC`,
          [pageKey, entity],
        )
      : await paramQuery<SectionRow>(
          `SELECT ${SECTION_COLS} FROM page_sections
            WHERE page_key = $1 AND entity_slug IS NOT DISTINCT FROM $2
              AND config_published IS NOT NULL AND visible_published
            ORDER BY position_published ASC NULLS LAST, id ASC`,
          [pageKey, entity],
        );

    res.setHeader(
      'Cache-Control',
      draft ? 'no-store' : process.env.VERCEL ? 's-maxage=30, stale-while-revalidate=300' : 'no-cache',
    );
    return sendJson(res, 200, {
      ok: true,
      draft,
      items: rows.map(draft ? toPreviewSection : toPublicSection),
    });
  } catch (err) {
    console.error('[api/content/sections]', err instanceof Error ? err.message : err);
    // Empty list → the page renders its code fallback rather than a blank screen.
    return sendJson(res, 200, { ok: true, draft: false, items: [] });
  }
}
