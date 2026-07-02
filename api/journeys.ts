/**
 * GET /api/journeys?region=&ship=&month=YYYY-MM&minNights=&maxNights=&departurePort=&minPrice=&maxPrice=&sort=&page=&pageSize=
 * GET /api/journeys?facets=1&region=&ship=&month=&departurePort=
 *   → { ok, facets: { regions, ships, months, embarkPorts, nightsMin, nightsMax, priceMin, priceMax } }
 *
 * FACETED filter options: each dropdown's available values are computed with the
 * OTHER current selections applied but NOT its own — so picking a ship narrows the
 * destination/port/month lists to what that ship actually sails, while the ship
 * list itself stays switchable. The nights/price bounds apply ALL selections.
 *
 * Returns (non-facet): { journeys: JourneyCard[], total, page, pageSize }
 * Search results — only is_available=true rows, lowest EUR fare per journey JOINed.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { db } from '../lib/db/client';
// Minimum days between today and a sailing's departure for it to be listed.
// Same as the MSC site: we skip today's (and tomorrow's) departures — there is
// no time to process a booking — and show from CURRENT_DATE + 2 onward.
// Shared with the authoritative booking quote so listable === bookable.
import { MIN_LEAD_DAYS } from '../lib/booking';

const querySchema = z.object({
  region: z.string().min(1).max(40).optional(),
  ship: z.string().min(1).max(40).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  nights: z.coerce.number().int().min(1).max(180).optional(),
  minNights: z.coerce.number().int().min(1).max(400).optional(),
  maxNights: z.coerce.number().int().min(1).max(400).optional(),
  departurePort: z.string().min(1).max(20).optional(),
  minPrice: z.coerce.number().min(0).max(1_000_000).optional(),
  maxPrice: z.coerce.number().min(0).max(1_000_000).optional(),
  sort: z.enum(['date', 'price-asc', 'price-desc', 'nights-asc', 'nights-desc']).default('date'),
  facets: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).max(500).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(60).optional().default(24),
});

interface JourneyCardRow {
  journey_id: string;
  ship_cd: string;
  itin_desc: string | null;
  region: string | null;
  sailing_port: string | null;
  termination_port: string | null;
  sailing_port_name: string | null;
  termination_port_name: string | null;
  sailing_date: string;
  nights: number;
  ship_name: string | null;
  lowest_eur: number | null;
  destinations: Array<{ code: string; name: string; day: number; country: string | null; arrivalTime: string | null; departureTime: string | null }> | null;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    return res.end(JSON.stringify({ ok: false, error: 'method-not-allowed' }));
  }

  const url = new URL(req.url ?? '/', 'http://x');
  const parse = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parse.success) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, error: 'invalid-query', issues: parse.error.issues }));
  }
  const q = parse.data;

  // Selected month → [start, nextMonthStart) date range (null when no month chosen).
  const monthStart = q.month ? `${q.month}-01` : null;
  const monthEnd = q.month
    ? new Date(new Date(`${q.month}-01T00:00:00Z`).setUTCMonth(new Date(`${q.month}-01T00:00:00Z`).getUTCMonth() + 1))
        .toISOString().slice(0, 10)
    : null;

  // Reusable selection params (null = unset). Each facet query below applies the
  // SUBSET that excludes its own field.
  const fRegion = q.region ?? null;
  const fShip = q.ship ?? null;
  const fPort = q.departurePort ?? null;

  try {
    const sql = db();

    // ── Faceted filter options ───────────────────────────────────────────────
    if (q.facets) {
      // Available destinations — apply ship + port + month, NOT region.
      const regions = (await sql`
        SELECT DISTINCT j.region AS region
        FROM journeys j
        WHERE j.is_available = true
          AND j.sailing_date >= CURRENT_DATE + ${MIN_LEAD_DAYS}::int
          AND j.ship_cd NOT IN ('EP05', 'EP06')
          AND j.region IS NOT NULL
          AND (${fShip}::text IS NULL OR j.ship_cd = ${fShip})
          AND (${fPort}::text IS NULL OR j.sailing_port = ${fPort})
          AND (${monthStart}::date IS NULL OR j.sailing_date >= ${monthStart}::date)
          AND (${monthEnd}::date IS NULL OR j.sailing_date < ${monthEnd}::date)
      `) as Array<{ region: string | null }>;

      // Available ships — apply region + port + month, NOT ship.
      const ships = (await sql`
        SELECT DISTINCT j.ship_cd AS ship_cd
        FROM journeys j
        WHERE j.is_available = true
          AND j.sailing_date >= CURRENT_DATE + ${MIN_LEAD_DAYS}::int
          AND j.ship_cd NOT IN ('EP05', 'EP06')
          AND (${fRegion}::text IS NULL OR j.region = ${fRegion})
          AND (${fPort}::text IS NULL OR j.sailing_port = ${fPort})
          AND (${monthStart}::date IS NULL OR j.sailing_date >= ${monthStart}::date)
          AND (${monthEnd}::date IS NULL OR j.sailing_date < ${monthEnd}::date)
      `) as Array<{ ship_cd: string }>;

      // Available months (YYYY-MM) — apply region + ship + port, NOT month.
      const months = (await sql`
        SELECT DISTINCT to_char(j.sailing_date, 'YYYY-MM') AS ym
        FROM journeys j
        WHERE j.is_available = true
          AND j.sailing_date >= CURRENT_DATE + ${MIN_LEAD_DAYS}::int
          AND j.ship_cd NOT IN ('EP05', 'EP06')
          AND (${fRegion}::text IS NULL OR j.region = ${fRegion})
          AND (${fShip}::text IS NULL OR j.ship_cd = ${fShip})
          AND (${fPort}::text IS NULL OR j.sailing_port = ${fPort})
        ORDER BY ym
      `) as Array<{ ym: string }>;

      // Available embarkation ports — apply region + ship + month, NOT port.
      const ports = (await sql`
        SELECT DISTINCT j.sailing_port AS code, p.port_name AS name
        FROM journeys j
        LEFT JOIN ports p ON p.port_cd = j.sailing_port
        WHERE j.is_available = true
          AND j.sailing_date >= CURRENT_DATE + ${MIN_LEAD_DAYS}::int
          AND j.ship_cd NOT IN ('EP05', 'EP06')
          AND j.sailing_port IS NOT NULL
          AND (${fRegion}::text IS NULL OR j.region = ${fRegion})
          AND (${fShip}::text IS NULL OR j.ship_cd = ${fShip})
          AND (${monthStart}::date IS NULL OR j.sailing_date >= ${monthStart}::date)
          AND (${monthEnd}::date IS NULL OR j.sailing_date < ${monthEnd}::date)
        ORDER BY name NULLS LAST
      `) as Array<{ code: string; name: string | null }>;

      // Nights / price bounds — apply ALL selections so the sliders tighten too.
      const bounds = (await sql`
        WITH min_fare AS (
          SELECT journey_id, MIN(NULLIF((prices->>'2A')::numeric, 0))::float8 AS lowest_eur
          FROM fares
          WHERE currency = 'EUR' AND now_available = true
          GROUP BY journey_id
        )
        SELECT
          MIN(j.nights)::int AS nights_min,
          MAX(j.nights)::int AS nights_max,
          FLOOR(MIN(mf.lowest_eur))::int AS price_min,
          CEIL(MAX(mf.lowest_eur))::int AS price_max
        FROM journeys j
        LEFT JOIN min_fare mf ON mf.journey_id = j.journey_id
        WHERE j.is_available = true
          AND j.sailing_date >= CURRENT_DATE + ${MIN_LEAD_DAYS}::int
          AND j.ship_cd NOT IN ('EP05', 'EP06')
          AND (${fRegion}::text IS NULL OR j.region = ${fRegion})
          AND (${fShip}::text IS NULL OR j.ship_cd = ${fShip})
          AND (${fPort}::text IS NULL OR j.sailing_port = ${fPort})
          AND (${monthStart}::date IS NULL OR j.sailing_date >= ${monthStart}::date)
          AND (${monthEnd}::date IS NULL OR j.sailing_date < ${monthEnd}::date)
      `) as Array<{ nights_min: number | null; nights_max: number | null; price_min: number | null; price_max: number | null }>;

      const b = bounds[0];
      res.statusCode = 200;
      // Short cache: the options now depend on selections, so vary per query.
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
      return res.end(JSON.stringify({
        ok: true,
        facets: {
          regions: regions.map((r) => r.region).filter((r): r is string => !!r),
          ships: ships.map((r) => r.ship_cd).filter((s): s is string => !!s),
          months: months.map((r) => r.ym).filter((m): m is string => !!m),
          embarkPorts: ports
            .filter((p) => p.code)
            .map((p) => ({ code: p.code, name: p.name ?? p.code })),
          nightsMin: b?.nights_min ?? 1,
          nightsMax: b?.nights_max ?? 30,
          priceMin: b?.price_min ?? 0,
          priceMax: b?.price_max ?? 50000,
        },
      }));
    }

    const offset = (q.page - 1) * q.pageSize;

    const rows = (await sql`
      WITH min_fare AS (
        SELECT journey_id,
               MIN(NULLIF((prices->>'2A')::numeric, 0))::float8 AS lowest_eur
        FROM fares
        WHERE currency = 'EUR'
          AND now_available = true
        GROUP BY journey_id
      ),
      itin AS (
        -- Full ordered list of REAL destinations (sea days excluded: sea days
        -- are ingested as port_cd NULL or the "At Sea" port code AAATC). Objects
        -- carry the code (for the thumbnail), name, day number, and country.
        SELECT jd.journey_id,
               json_agg(
                 json_build_object('code', jd.port_cd, 'name', p.port_name, 'day', jd.day_number, 'country', p.country,
                                 'arrivalTime', jd.arrival_time, 'departureTime', jd.departure_time)
                 ORDER BY jd.day_number
               ) FILTER (WHERE jd.port_cd IS NOT NULL AND lower(coalesce(p.port_name, '')) <> 'at sea') AS destinations
        FROM journey_days jd
        LEFT JOIN ports p ON p.port_cd = jd.port_cd
        GROUP BY jd.journey_id
      )
      SELECT
        j.journey_id,
        j.ship_cd,
        j.itin_desc,
        j.region,
        j.sailing_port,
        j.termination_port,
        emb.port_name AS sailing_port_name,
        dis.port_name AS termination_port_name,
        j.sailing_date::text,
        j.nights,
        s.ship_name,
        COALESCE(o.override_price, mf.lowest_eur)::float8 AS lowest_eur,
        pv.destinations
      FROM journeys j
      LEFT JOIN ships s ON s.ship_cd = j.ship_cd
      LEFT JOIN ports emb ON emb.port_cd = j.sailing_port
      LEFT JOIN ports dis ON dis.port_cd = j.termination_port
      LEFT JOIN min_fare mf ON mf.journey_id = j.journey_id
      LEFT JOIN fare_overrides o
        ON o.journey_id = j.journey_id AND o.suite_category = '' AND o.currency = 'EUR' AND o.enabled
      LEFT JOIN itin pv ON pv.journey_id = j.journey_id
      WHERE j.is_available = true
        AND j.sailing_date >= CURRENT_DATE + ${MIN_LEAD_DAYS}::int
        AND j.ship_cd NOT IN ('EP05', 'EP06') -- EXPLORA V/VI hidden until launch
        AND (${q.region ?? null}::text IS NULL OR j.region = ${q.region ?? null})
        AND (${q.ship ?? null}::text IS NULL OR j.ship_cd = ${q.ship ?? null})
        AND (${q.nights ?? null}::int IS NULL OR j.nights = ${q.nights ?? null})
        AND (${q.minNights ?? null}::int IS NULL OR j.nights >= ${q.minNights ?? null})
        AND (${q.maxNights ?? null}::int IS NULL OR j.nights <= ${q.maxNights ?? null})
        AND (${q.departurePort ?? null}::text IS NULL OR j.sailing_port = ${q.departurePort ?? null})
        AND (${q.minPrice ?? null}::float8 IS NULL OR COALESCE(o.override_price, mf.lowest_eur) >= ${q.minPrice ?? null})
        AND (${q.maxPrice ?? null}::float8 IS NULL OR COALESCE(o.override_price, mf.lowest_eur) <= ${q.maxPrice ?? null})
        AND (${monthStart}::date IS NULL OR j.sailing_date >= ${monthStart}::date)
        AND (${monthEnd}::date IS NULL OR j.sailing_date < ${monthEnd}::date)
      ORDER BY
        CASE WHEN ${q.sort} = 'price-asc'   THEN COALESCE(o.override_price, mf.lowest_eur) END ASC NULLS LAST,
        CASE WHEN ${q.sort} = 'price-desc'  THEN COALESCE(o.override_price, mf.lowest_eur) END DESC NULLS LAST,
        CASE WHEN ${q.sort} = 'nights-asc'  THEN j.nights END ASC,
        CASE WHEN ${q.sort} = 'nights-desc' THEN j.nights END DESC,
        j.sailing_date ASC
      LIMIT ${q.pageSize} OFFSET ${offset}
    `) as JourneyCardRow[];

    const totalRow = (await sql`
      WITH min_fare AS (
        SELECT journey_id,
               MIN(NULLIF((prices->>'2A')::numeric, 0))::float8 AS lowest_eur
        FROM fares
        WHERE currency = 'EUR'
          AND now_available = true
        GROUP BY journey_id
      )
      SELECT COUNT(*)::int AS total
      FROM journeys j
      LEFT JOIN min_fare mf ON mf.journey_id = j.journey_id
      LEFT JOIN fare_overrides o
        ON o.journey_id = j.journey_id AND o.suite_category = '' AND o.currency = 'EUR' AND o.enabled
      WHERE j.is_available = true
        AND j.sailing_date >= CURRENT_DATE + ${MIN_LEAD_DAYS}::int
        AND j.ship_cd NOT IN ('EP05', 'EP06') -- EXPLORA V/VI hidden until launch
        AND (${q.region ?? null}::text IS NULL OR j.region = ${q.region ?? null})
        AND (${q.ship ?? null}::text IS NULL OR j.ship_cd = ${q.ship ?? null})
        AND (${q.nights ?? null}::int IS NULL OR j.nights = ${q.nights ?? null})
        AND (${q.minNights ?? null}::int IS NULL OR j.nights >= ${q.minNights ?? null})
        AND (${q.maxNights ?? null}::int IS NULL OR j.nights <= ${q.maxNights ?? null})
        AND (${q.departurePort ?? null}::text IS NULL OR j.sailing_port = ${q.departurePort ?? null})
        AND (${q.minPrice ?? null}::float8 IS NULL OR COALESCE(o.override_price, mf.lowest_eur) >= ${q.minPrice ?? null})
        AND (${q.maxPrice ?? null}::float8 IS NULL OR COALESCE(o.override_price, mf.lowest_eur) <= ${q.maxPrice ?? null})
        AND (${monthStart}::date IS NULL OR j.sailing_date >= ${monthStart}::date)
        AND (${monthEnd}::date IS NULL OR j.sailing_date < ${monthEnd}::date)
    `) as Array<{ total: number }>;

    res.statusCode = 200;
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    res.end(JSON.stringify({
      ok: true,
      page: q.page,
      pageSize: q.pageSize,
      total: totalRow[0]?.total ?? 0,
      journeys: rows.map((r) => ({
        journeyId: r.journey_id,
        shipCd: r.ship_cd,
        shipName: r.ship_name,
        itinDesc: r.itin_desc,
        region: r.region,
        sailingPort: r.sailing_port,
        terminationPort: r.termination_port,
        sailingPortName: r.sailing_port_name,
        terminationPortName: r.termination_port_name,
        sailingDate: r.sailing_date,
        nights: r.nights,
        lowestPriceEUR: r.lowest_eur,
        destinations: r.destinations ?? [],
      })),
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/journeys] failed:', message);
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: 'server-error' }));
  }
}
