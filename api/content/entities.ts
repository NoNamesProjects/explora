/**
 * PUBLIC — the visible ships / destinations the site renders.
 *
 *   GET /api/content/entities?kind=ship            → all visible, in order
 *   GET /api/content/entities?kind=ship&slug=x     → one (404 if hidden/missing)
 *
 * With `?draft=1` and an admin session, hidden entities are included too, so an
 * unlaunched ship can be previewed on its real URL before it goes public.
 *
 * Hidden means hidden: without that session a hidden entity 404s exactly like a
 * non-existent one, which is what lets the route treat an unknown slug as a real
 * 404 instead of silently falling back to another entity (the bug the old closed
 * `REGION_SLUG_TO_KEY[region] ?? 'mediterranean'` map shipped with).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { paramQuery } from '../../lib/db/client';
import { sendJson } from '../../lib/http';
import { parseCookies } from '../../lib/admin-auth';
import { ENTITY_COLS, toPublicEntity, type EntityRow } from '../../lib/entities';

async function isAdminSession(req: IncomingMessage): Promise<boolean> {
  const token = parseCookies(req)['exp_admin'];
  if (!token) return false;
  try {
    const rows = await paramQuery<{ n: number }>(
      `SELECT count(*)::int AS n FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id
        WHERE s.token = $1 AND s.expires_at > now() AND NOT u.disabled`,
      [token],
    );
    return (rows[0]?.n ?? 0) > 0;
  } catch { return false; }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.statusCode = 405; res.setHeader('Allow', 'GET'); return res.end();
  }

  const q = new URL(req.url ?? '', 'http://x').searchParams;
  const kind = (q.get('kind') ?? '').slice(0, 40);
  const slug = (q.get('slug') ?? '').slice(0, 60);
  if (!kind) return sendJson(res, 400, { ok: false, error: 'kind-required' });

  try {
    const includeHidden = q.get('draft') === '1' && (await isAdminSession(req));
    const visibleClause = includeHidden ? '' : ' AND visible';

    if (slug) {
      const rows = await paramQuery<EntityRow>(
        `SELECT ${ENTITY_COLS} FROM site_entities WHERE kind = $1 AND slug = $2${visibleClause} LIMIT 1`,
        [kind, slug],
      );
      if (!rows[0]) return sendJson(res, 404, { ok: false, error: 'not-found' });
      res.setHeader('Cache-Control', includeHidden ? 'no-store' : process.env.VERCEL ? 's-maxage=30, stale-while-revalidate=300' : 'no-cache');
      return sendJson(res, 200, { ok: true, entity: toPublicEntity(rows[0]) });
    }

    const rows = await paramQuery<EntityRow>(
      `SELECT ${ENTITY_COLS} FROM site_entities WHERE kind = $1${visibleClause} ORDER BY position ASC, id ASC`,
      [kind],
    );
    res.setHeader('Cache-Control', includeHidden ? 'no-store' : process.env.VERCEL ? 's-maxage=30, stale-while-revalidate=300' : 'no-cache');
    return sendJson(res, 200, { ok: true, items: rows.map(toPublicEntity) });
  } catch (err) {
    console.error('[api/content/entities]', err instanceof Error ? err.message : err);
    // Empty rather than a 500 — callers fall back to their hardcoded data.
    return sendJson(res, 200, { ok: true, items: [] });
  }
}
