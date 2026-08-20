/**
 * CUSTOM PACKAGES — list + create the owner's own offers.
 *
 *   GET  /api/admin/custom-packages
 *   POST /api/admin/custom-packages   body { titleEn, slug?, ... }
 *
 * These are the offers that are NOT in the Explora flatfile: own price, photos,
 * copy and itinerary. They live in custom_packages / custom_package_fares, which
 * the nightly ingest never touches, so a refresh can never wipe them.
 *
 * New packages start hidden (visible=false) so the admin can fill in copy,
 * photos and at least one fare before anything reaches the public site.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { paramQuery } from '../../lib/db/client';
import { readJson, sendJson } from '../../lib/http';
import { requireAuth, logAdminAction } from '../../lib/admin-auth';
import {
  PACKAGE_COLS, toAdminPackage, packageSlugify, publicIdForSlug,
  type CustomPackageRow, type CustomFareRow,
} from '../../lib/custom-packages';

const createSchema = z.object({
  titleEn: z.string().min(1).max(160),
  titleEl: z.string().max(160).optional().nullable(),
  slug: z.string().max(60).optional(),
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'admin');
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const rows = await paramQuery<CustomPackageRow>(
        `SELECT ${PACKAGE_COLS} FROM custom_packages ORDER BY sailing_date ASC NULLS LAST, id DESC`);
      // One round-trip for every package's fares, then group in memory.
      const fares = await paramQuery<CustomFareRow>(
        `SELECT * FROM custom_package_fares ORDER BY package_id ASC, sort_order ASC`);
      const byPkg = new Map<number, CustomFareRow[]>();
      for (const f of fares) {
        const k = Number(f.package_id);
        const list = byPkg.get(k);
        if (list) list.push(f); else byPkg.set(k, [f]);
      }
      return sendJson(res, 200, {
        ok: true,
        items: rows.map((r) => toAdminPackage(r, byPkg.get(Number(r.id)) ?? [])),
      });
    }

    if (req.method === 'POST') {
      const parsed = createSchema.safeParse(await readJson(req));
      if (!parsed.success) return sendJson(res, 400, { ok: false, error: 'invalid' });
      const { titleEn } = parsed.data;

      const slug = packageSlugify(parsed.data.slug || titleEn);
      if (!slug) return sendJson(res, 400, { ok: false, error: 'bad-slug' });

      const clash = await paramQuery<{ n: number }>(
        `SELECT count(*)::int AS n FROM custom_packages WHERE slug = $1`, [slug]);
      if ((clash[0]?.n ?? 0) > 0) return sendJson(res, 409, { ok: false, error: 'slug-taken' });

      const rows = await paramQuery<CustomPackageRow>(
        `INSERT INTO custom_packages (public_id, slug, title_en, title_el, visible, created_by, updated_by)
         VALUES ($1, $2, $3, $4, false, $5, $5)
         RETURNING ${PACKAGE_COLS}`,
        [publicIdForSlug(slug), slug, titleEn, parsed.data.titleEl || null, user.id],
      );

      logAdminAction(user, req, {
        action: 'custom-package.create', entity: 'custom_package', entityId: slug, after: { titleEn },
      });
      return sendJson(res, 200, { ok: true, package: toAdminPackage(rows[0]) });
    }

    res.statusCode = 405; res.setHeader('Allow', 'GET, POST'); return res.end();
  } catch (err) {
    console.error('[admin/custom-packages]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
