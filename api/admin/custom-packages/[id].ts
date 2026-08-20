/**
 * CUSTOM PACKAGE detail — read / update / delete one owner-managed offer.
 *
 *   GET    /api/admin/custom-packages/:id
 *   PATCH  /api/admin/custom-packages/:id   body: any subset of the fields, plus
 *                                           an optional full `fares` array
 *   DELETE /api/admin/custom-packages/:id
 *
 * `fares` is replace-all: the client always sends the complete rate card, which
 * keeps the editor simple and makes a removed suite actually disappear. The
 * fares are rewritten inside a transaction with the package update so a package
 * can never be left half-repriced.
 *
 * Publishing is just `visible` — the public read paths (api/journeys*) and the
 * authoritative quote (lib/booking.ts) all gate on it, so unticking the box pulls
 * an offer from the site and makes it unbookable in the same move.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { paramQuery, runInTransaction, jsonbArg } from '../../../lib/db/client';
import { readJson, sendJson } from '../../../lib/http';
import { requireAuth, logAdminAction } from '../../../lib/admin-auth';
import {
  PACKAGE_COLS, toAdminPackage, type CustomPackageRow, type CustomFareRow,
} from '../../../lib/custom-packages';

const photoSchema = z.object({
  url: z.string().min(1).max(500),
  altEn: z.string().max(300).optional().nullable(),
  altEl: z.string().max(300).optional().nullable(),
});

const daySchema = z.object({
  dayNumber: z.coerce.number().int().min(1).max(60).optional(),
  portName: z.string().max(120).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
  arrivalTime: z.string().max(20).optional().nullable(),
  departureTime: z.string().max(20).optional().nullable(),
  overnight: z.boolean().optional(),
  description: z.string().max(2000).optional().nullable(),
});

const fareSchema = z.object({
  suiteCategory: z.string().min(1).max(40),
  suiteName: z.string().max(120).optional().nullable(),
  fareCode: z.string().min(1).max(64),
  fareLabel: z.string().max(120).optional().nullable(),
  perPerson: z.coerce.number().min(0).max(1_000_000),
  thirdFourthAdult: z.coerce.number().min(0).max(1_000_000).optional().nullable(),
  thirdFourthChild: z.coerce.number().min(0).max(1_000_000).optional().nullable(),
  thirdFourthInfant: z.coerce.number().min(0).max(1_000_000).optional().nullable(),
  soloFare: z.coerce.number().min(0).max(1_000_000).optional().nullable(),
  soloSupplPct: z.coerce.number().min(0).max(500).optional().nullable(),
  nowAvailable: z.boolean().optional(),
  items: z.array(z.string().max(120)).max(30).optional(),
});

const patchSchema = z.object({
  titleEn: z.string().min(1).max(160).optional(),
  titleEl: z.string().max(160).optional().nullable(),
  summaryEn: z.string().max(600).optional().nullable(),
  summaryEl: z.string().max(600).optional().nullable(),
  descriptionEn: z.string().max(8000).optional().nullable(),
  descriptionEl: z.string().max(8000).optional().nullable(),
  region: z.string().max(60).optional().nullable(),
  nights: z.coerce.number().int().min(0).max(365).optional(),
  sailingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  sailingPortName: z.string().max(120).optional().nullable(),
  terminationPortName: z.string().max(120).optional().nullable(),
  heroImage: z.string().max(500).optional().nullable(),
  photos: z.array(photoSchema).max(40).optional(),
  itinerary: z.array(daySchema).max(60).optional(),
  inclusions: z.array(z.string().max(200)).max(40).optional(),
  depositPct: z.coerce.number().min(0).max(100).optional().nullable(),
  visible: z.boolean().optional(),
  fares: z.array(fareSchema).max(30).optional(),
});

/** Explicit-undefined check so a patch can clear a field by sending null. */
function pick<T>(next: T | undefined, current: T): T {
  return next !== undefined ? next : current;
}

function idFromUrl(req: IncomingMessage): number {
  const url = new URL(req.url ?? '/', 'http://x');
  const last = url.pathname.split('/').filter(Boolean).pop() ?? '';
  return Number(decodeURIComponent(last));
}

async function loadFares(packageId: number): Promise<CustomFareRow[]> {
  return paramQuery<CustomFareRow>(
    `SELECT * FROM custom_package_fares WHERE package_id = $1 ORDER BY sort_order ASC, id ASC`,
    [packageId],
  );
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'admin');
  if (!user) return;

  const id = idFromUrl(req);
  if (!Number.isInteger(id) || id <= 0) return sendJson(res, 400, { ok: false, error: 'invalid-id' });

  try {
    const existing = await paramQuery<CustomPackageRow>(
      `SELECT ${PACKAGE_COLS} FROM custom_packages WHERE id = $1`, [id]);
    const pkg = existing[0];
    if (!pkg) return sendJson(res, 404, { ok: false, error: 'not-found' });

    if (req.method === 'GET') {
      return sendJson(res, 200, { ok: true, package: toAdminPackage(pkg, await loadFares(id)) });
    }

    if (req.method === 'PATCH') {
      const parsed = patchSchema.safeParse(await readJson(req));
      if (!parsed.success) {
        return sendJson(res, 400, { ok: false, error: 'invalid', issues: parsed.error.issues });
      }
      const body = parsed.data;

      // Refuse to publish an offer nobody could book: it needs a date far enough
      // out and at least one available EUR fare, else it would list and 404/refuse
      // at the quote step.
      if (body.visible === true) {
        const date = body.sailingDate !== undefined ? body.sailingDate : pkg.sailing_date;
        if (!date) return sendJson(res, 400, { ok: false, error: 'needs-sailing-date' });
        const fares = body.fares ?? (await loadFares(id)).map((f) => ({
          perPerson: Number(f.per_person), nowAvailable: f.now_available,
        }));
        const bookable = fares.some((f) => (f.nowAvailable ?? true) && Number(f.perPerson) > 0);
        if (!bookable) return sendJson(res, 400, { ok: false, error: 'needs-fare' });
      }

      // Merge patch over the current values in JS, then write every column with
      // one tagged-template UPDATE. Avoids dynamic SQL and works identically on
      // both drivers (the Neon HTTP transaction batches statements, so each
      // statement must be built from `tx`).
      const cur = toAdminPackage(pkg);
      const next = {
        titleEn: pick(body.titleEn, cur.titleEn),
        titleEl: pick(body.titleEl, cur.titleEl),
        summaryEn: pick(body.summaryEn, cur.summaryEn),
        summaryEl: pick(body.summaryEl, cur.summaryEl),
        descriptionEn: pick(body.descriptionEn, cur.descriptionEn),
        descriptionEl: pick(body.descriptionEl, cur.descriptionEl),
        region: pick(body.region, cur.region),
        nights: pick(body.nights, cur.nights),
        sailingDate: pick(body.sailingDate, cur.sailingDate),
        sailingPortName: pick(body.sailingPortName, cur.sailingPortName),
        terminationPortName: pick(body.terminationPortName, cur.terminationPortName),
        heroImage: pick(body.heroImage, cur.heroImage),
        photos: pick(body.photos, cur.photos),
        itinerary: pick(body.itinerary, cur.itinerary),
        inclusions: pick(body.inclusions, cur.inclusions),
        depositPct: pick(body.depositPct, cur.depositPct),
        visible: pick(body.visible, cur.visible),
      };

      await runInTransaction((tx) => [
        tx`
          UPDATE custom_packages SET
            title_en = ${next.titleEn},
            title_el = ${next.titleEl},
            summary_en = ${next.summaryEn},
            summary_el = ${next.summaryEl},
            description_en = ${next.descriptionEn},
            description_el = ${next.descriptionEl},
            region = ${next.region},
            nights = ${next.nights},
            sailing_date = ${next.sailingDate}::date,
            sailing_port_name = ${next.sailingPortName},
            termination_port_name = ${next.terminationPortName},
            hero_image = ${next.heroImage},
            photos = ${jsonbArg(next.photos)}::jsonb,
            itinerary = ${jsonbArg(next.itinerary)}::jsonb,
            inclusions = ${jsonbArg(next.inclusions)}::jsonb,
            deposit_pct = ${next.depositPct},
            visible = ${next.visible},
            updated_by = ${user.id},
            updated_at = now()
          WHERE id = ${id}
        `,
        // Replace-all rate card (only when the client sent one).
        ...(body.fares
          ? [
              tx`DELETE FROM custom_package_fares WHERE package_id = ${id}`,
              ...body.fares.map((f, i) => tx`
                INSERT INTO custom_package_fares (
                  package_id, suite_category, suite_name, fare_code, fare_label, currency,
                  per_person, third_fourth_adult, third_fourth_child, third_fourth_infant,
                  solo_fare, solo_suppl_pct, now_available, items, sort_order
                ) VALUES (
                  ${id}, ${f.suiteCategory}, ${f.suiteName ?? null}, ${f.fareCode},
                  ${f.fareLabel ?? null}, 'EUR',
                  ${f.perPerson}, ${f.thirdFourthAdult ?? null}, ${f.thirdFourthChild ?? null},
                  ${f.thirdFourthInfant ?? null}, ${f.soloFare ?? null}, ${f.soloSupplPct ?? null},
                  ${f.nowAvailable ?? true}, ${jsonbArg(f.items ?? [])}::jsonb, ${i + 1}
                )
              `),
            ]
          : []),
      ]);

      logAdminAction(user, req, {
        action: 'custom-package.update',
        entity: 'custom_package',
        entityId: pkg.slug,
        before: { visible: pkg.visible },
        after: { changed: Object.keys(body) },
      });

      const fresh = await paramQuery<CustomPackageRow>(
        `SELECT ${PACKAGE_COLS} FROM custom_packages WHERE id = $1`, [id]);
      return sendJson(res, 200, { ok: true, package: toAdminPackage(fresh[0], await loadFares(id)) });
    }

    if (req.method === 'DELETE') {
      // Fares cascade. Any booking_requests already taken keep their journey_id
      // (it is FK-free by design), so paid deposits are never orphaned.
      await paramQuery(`DELETE FROM custom_packages WHERE id = $1`, [id]);
      logAdminAction(user, req, {
        action: 'custom-package.delete', entity: 'custom_package', entityId: pkg.slug,
        before: { titleEn: pkg.title_en, visible: pkg.visible },
      });
      return sendJson(res, 200, { ok: true });
    }

    res.statusCode = 405; res.setHeader('Allow', 'GET, PATCH, DELETE'); return res.end();
  } catch (err) {
    console.error('[admin/custom-packages/:id]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
