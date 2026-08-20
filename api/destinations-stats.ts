/**
 * GET /api/destinations-stats
 *   → { ok, stats: { [regionSlug]: { total, nightsMin, nightsMax, priceFrom } } }
 *
 * One query, every region's card figures. Exists because the /destinations
 * page previously computed these client-side by firing 2 requests PER region
 * (a journeys search + a facets call) — ~20-22 concurrent requests for one
 * page load, against a DB pool capped at 8 connections (lib/db/client.ts).
 * That is not just slow, it is a real contention risk under concurrent
 * traffic: many simultaneous visitors to /destinations would queue behind
 * each other's fan-out on top of their own. This replaces that entire pattern
 * with a single GROUP BY region.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { db } from '../lib/db/client';
import { MIN_LEAD_DAYS } from '../lib/booking';

interface StatsRow {
  region: string;
  total: number;
  nights_min: number | null;
  nights_max: number | null;
  price_from: number | null;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    return res.end(JSON.stringify({ ok: false, error: 'method-not-allowed' }));
  }

  try {
    const sql = db();
    const rows = (await sql`
      WITH min_fare AS (
        SELECT journey_id, MIN(NULLIF((prices->>'2A')::numeric, 0))::float8 AS lowest_eur
        FROM fares
        WHERE currency = 'EUR' AND now_available = true
        GROUP BY journey_id
      ),
      custom_min_fare AS (
        SELECT package_id, MIN(NULLIF(per_person, 0))::float8 AS lowest_eur
        FROM custom_package_fares
        WHERE currency = 'EUR' AND now_available = true
        GROUP BY package_id
      ),
      combined AS (
        SELECT j.region, j.nights, COALESCE(o.override_price, mf.lowest_eur)::float8 AS lowest_eur
        FROM journeys j
        LEFT JOIN min_fare mf ON mf.journey_id = j.journey_id
        LEFT JOIN fare_overrides o
          ON o.journey_id = j.journey_id AND o.suite_category = '' AND o.currency = 'EUR' AND o.enabled
        WHERE j.is_available = true
          AND j.sailing_date >= CURRENT_DATE + ${MIN_LEAD_DAYS}::int
          AND j.ship_cd NOT IN ('EP05', 'EP06')
          AND j.region IS NOT NULL
        UNION ALL
        SELECT cp.region, cp.nights, cmf.lowest_eur
        FROM custom_packages cp
        LEFT JOIN custom_min_fare cmf ON cmf.package_id = cp.id
        WHERE cp.visible = true
          AND cp.sailing_date IS NOT NULL
          AND cp.sailing_date >= CURRENT_DATE + ${MIN_LEAD_DAYS}::int
          AND cp.region IS NOT NULL
      )
      SELECT
        region,
        COUNT(*)::int AS total,
        MIN(nights)::int AS nights_min,
        MAX(nights)::int AS nights_max,
        FLOOR(MIN(lowest_eur))::int AS price_from
      FROM combined
      GROUP BY region
    `) as StatsRow[];

    const stats: Record<string, { total: number; nightsMin: number | null; nightsMax: number | null; priceFrom: number | null }> = {};
    for (const r of rows) {
      stats[r.region] = {
        total: r.total,
        nightsMin: r.nights_min,
        nightsMax: r.nights_max,
        priceFrom: r.price_from,
      };
    }

    res.statusCode = 200;
    // Same freshness window as the catalog list — this reflects the same
    // underlying data and is cheap to recompute, but no need to hit the DB
    // on every single page view.
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    res.end(JSON.stringify({ ok: true, stats }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/destinations-stats] failed:', message);
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: 'server-error' }));
  }
}
