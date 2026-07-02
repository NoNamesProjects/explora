/**
 * Manual "from"/fare price overrides for a journey — the write side of the seam
 * that lets an admin pin a price that SURVIVES the nightly flatfile ingest.
 *
 * The read path (api/journeys.ts + api/journeys/[id].ts) COALESCEs an enabled
 * fare_overrides row over the fed fares.prices; the ingest never touches this
 * table, so an override persists until an admin reverts it here.
 *
 *   GET    /api/admin/catalog/pricing/:journeyId
 *            → { ok, overrides: [...] }        (all rows for the journey)
 *   PUT    /api/admin/catalog/pricing/:journeyId
 *            body { suiteCategory?, currency?, price, note?, enabled? }
 *            → UPSERT one override, { ok, override }
 *   DELETE /api/admin/catalog/pricing/:journeyId?suiteCategory=&currency=
 *            → drop the row → revert to feed price, { ok }
 *
 * suite_category '' = the whole-journey "from" price. currency defaults to EUR.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { db } from '../../../../lib/db/client';
import { readJson, sendJson } from '../../../../lib/http';
import { requireAuth, logAdminAction } from '../../../../lib/admin-auth';

const CURRENCY_RE = /^[A-Z]{3}$/;

const putSchema = z.object({
  suiteCategory: z.string().max(40).optional(),
  currency: z.string().regex(CURRENCY_RE).optional(),
  price: z.number().finite().min(0),
  note: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
});

interface OverrideRow {
  journey_id: string;
  suite_category: string;
  currency: string;
  override_price: string | number | null;
  note: string | null;
  enabled: boolean;
  updated_at: string | Date;
}

/** Last path segment → decoded journey id (Vercel raw req + Express :journeyId). */
function journeyIdFromUrl(req: IncomingMessage): string {
  const seg = new URL(req.url ?? '', 'http://x').pathname.split('/').filter(Boolean).pop() ?? '';
  return decodeURIComponent(seg);
}

/** DB row → API shape (numeric→number, timestamp→ISO string). */
function shape(r: OverrideRow) {
  return {
    journeyId: r.journey_id,
    suiteCategory: r.suite_category,
    currency: r.currency,
    price: r.override_price == null ? null : Number(r.override_price),
    note: r.note,
    enabled: r.enabled,
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
  };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'admin');
  if (!user) return;

  const journeyId = journeyIdFromUrl(req);
  if (!journeyId || journeyId.length > 60) return sendJson(res, 400, { ok: false, error: 'bad-journey-id' });

  const sql = db();

  try {
    if (req.method === 'GET') {
      const rows = (await sql`
        SELECT journey_id, suite_category, currency, override_price, note, enabled, updated_at
        FROM fare_overrides
        WHERE journey_id = ${journeyId}
        ORDER BY suite_category ASC, currency ASC
      `) as OverrideRow[];
      return sendJson(res, 200, { ok: true, overrides: rows.map(shape) });
    }

    if (req.method === 'PUT') {
      const parsed = putSchema.safeParse(await readJson(req));
      if (!parsed.success) return sendJson(res, 400, { ok: false, error: 'invalid' });
      const suiteCategory = parsed.data.suiteCategory ?? '';
      const currency = parsed.data.currency ?? 'EUR';
      const price = parsed.data.price;
      const note = parsed.data.note ?? null;
      const enabled = parsed.data.enabled ?? true;

      const before = (await sql`
        SELECT override_price, enabled
        FROM fare_overrides
        WHERE journey_id = ${journeyId} AND suite_category = ${suiteCategory} AND currency = ${currency}
        LIMIT 1
      `) as Array<{ override_price: string | number | null; enabled: boolean }>;

      const rows = (await sql`
        INSERT INTO fare_overrides (journey_id, suite_category, currency, override_price, note, enabled, updated_by, updated_at)
        VALUES (${journeyId}, ${suiteCategory}, ${currency}, ${price}, ${note}, ${enabled}, ${user.id}, now())
        ON CONFLICT (journey_id, suite_category, currency)
        DO UPDATE SET override_price = EXCLUDED.override_price,
                      note           = EXCLUDED.note,
                      enabled        = EXCLUDED.enabled,
                      updated_by     = EXCLUDED.updated_by,
                      updated_at     = now()
        RETURNING journey_id, suite_category, currency, override_price, note, enabled, updated_at
      `) as OverrideRow[];

      logAdminAction(user, req, {
        action: 'pricing.override',
        entity: 'journey',
        entityId: journeyId,
        before: before[0]
          ? {
              price: before[0].override_price == null ? null : Number(before[0].override_price),
              suiteCategory,
              currency,
              enabled: before[0].enabled,
            }
          : null,
        after: { price, suiteCategory, currency, enabled },
      });
      return sendJson(res, 200, { ok: true, override: shape(rows[0]) });
    }

    if (req.method === 'DELETE') {
      const params = new URL(req.url ?? '', 'http://x').searchParams;
      const suiteCategory = (params.get('suiteCategory') ?? '').slice(0, 40);
      const currency = params.get('currency') || 'EUR';
      if (!CURRENCY_RE.test(currency)) return sendJson(res, 400, { ok: false, error: 'invalid' });

      const before = (await sql`
        SELECT override_price, enabled
        FROM fare_overrides
        WHERE journey_id = ${journeyId} AND suite_category = ${suiteCategory} AND currency = ${currency}
        LIMIT 1
      `) as Array<{ override_price: string | number | null; enabled: boolean }>;

      await sql`
        DELETE FROM fare_overrides
        WHERE journey_id = ${journeyId} AND suite_category = ${suiteCategory} AND currency = ${currency}
      `;

      logAdminAction(user, req, {
        action: 'pricing.revert',
        entity: 'journey',
        entityId: journeyId,
        before: before[0]
          ? { price: before[0].override_price == null ? null : Number(before[0].override_price), suiteCategory, currency }
          : null,
        after: null,
      });
      return sendJson(res, 200, { ok: true });
    }

    res.statusCode = 405;
    res.setHeader('Allow', 'GET, PUT, DELETE');
    return res.end();
  } catch (err) {
    console.error('[admin/catalog/pricing/:journeyId]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
