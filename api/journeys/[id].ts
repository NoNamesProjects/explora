/**
 * GET /api/journeys/:id — single journey detail.
 *
 * Returns: { journey, ship, days, fares }
 *   - journey: full row
 *   - ship: matched ships row (or null)
 *   - days: journey_days joined with ports for port_name
 *   - fares: grouped by suite_category + currency
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { db } from '../../lib/db/client';
import { isCustomId, getCustomPackage, getCustomPackageFares, customPackageDetail } from '../../lib/custom-packages';
import { MIN_LEAD_DAYS } from '../../lib/booking';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    return res.end(JSON.stringify({ ok: false, error: 'method-not-allowed' }));
  }

  // Parse id from the URL path. Works on both Vercel (raw IncomingMessage)
  // and Express-mounted server.js routes.
  const url = new URL(req.url ?? '/', 'http://x');
  const parts = url.pathname.split('/').filter(Boolean);
  const idEncoded = parts[parts.length - 1] ?? '';
  const id = decodeURIComponent(idEncoded);

  if (!id || id.length > 60) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, error: 'invalid-id' }));
  }

  try {
    // ── Custom packages (own tables, ingest-proof) ───────────────────────────
    // Same response shape as a feed sailing plus the custom media/copy fields,
    // so JourneyDetail and the whole booking wizard work unchanged.
    if (isCustomId(id)) {
      const pkg = await getCustomPackage(id);
      const earliest = new Date();
      earliest.setUTCDate(earliest.getUTCDate() + MIN_LEAD_DAYS);
      const listable = pkg && pkg.sailing_date && pkg.sailing_date >= earliest.toISOString().slice(0, 10);
      if (!pkg || !listable) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ ok: false, error: 'not-found' }));
      }
      const fares = await getCustomPackageFares(pkg.id);
      res.statusCode = 200;
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
      return res.end(JSON.stringify(customPackageDetail(pkg, fares)));
    }

    const sql = db();

    const journeyRows = (await sql`
      SELECT
        j.journey_id, j.ship_cd, j.itin_cd, j.itin_desc, j.region,
        j.sailing_port, j.termination_port,
        emb.port_name AS sailing_port_name,
        dis.port_name AS termination_port_name,
        j.sailing_date::text AS sailing_date,
        j.nights, j.embk_time, j.dis_embk_time, j.is_available
      FROM journeys j
      LEFT JOIN ports emb ON emb.port_cd = j.sailing_port
      LEFT JOIN ports dis ON dis.port_cd = j.termination_port
      WHERE j.journey_id = ${id}
        AND j.is_available = true
        AND j.ship_cd NOT IN ('EP05', 'EP06') -- EXPLORA V/VI hidden until launch (404 their journeys)
      LIMIT 1
    `) as Array<{
      journey_id: string; ship_cd: string; itin_cd: string; itin_desc: string | null;
      region: string | null; sailing_port: string | null; termination_port: string | null;
      sailing_port_name: string | null; termination_port_name: string | null;
      sailing_date: string; nights: number; embk_time: string | null; dis_embk_time: string | null;
      is_available: boolean;
    }>;

    if (!journeyRows.length) {
      res.statusCode = 404;
      return res.end(JSON.stringify({ ok: false, error: 'not-found' }));
    }
    const j = journeyRows[0];

    const shipRows = (await sql`
      SELECT ship_cd, ship_name, imo, decks, capacity, launch_year, hero_image
      FROM ships
      WHERE ship_cd = ${j.ship_cd}
      LIMIT 1
    `) as Array<Record<string, unknown>>;

    const dayRows = (await sql`
      SELECT
        jd.day_number, jd.port_cd, jd.arrival_time, jd.departure_time,
        jd.overnight, jd.description,
        p.port_name, p.country, p.lat, p.lon
      FROM journey_days jd
      LEFT JOIN ports p ON p.port_cd = jd.port_cd
      WHERE jd.journey_id = ${id}
      ORDER BY jd.day_number ASC
    `) as Array<{
      day_number: number; port_cd: string | null; arrival_time: string | null;
      departure_time: string | null; overnight: boolean; description: string | null;
      port_name: string | null; country: string | null; lat: number | null; lon: number | null;
    }>;

    const fareRows = (await sql`
      SELECT
        fare_code, fare_desc, price_type, suite_category,
        prices, currency, gft, ncf,
        fare_start_date::text AS fare_start_date,
        fare_end_date::text AS fare_end_date,
        now_available, items, raw
      FROM fares
      WHERE journey_id = ${id}
        AND now_available = true
      ORDER BY suite_category ASC, currency ASC
    `) as Array<Record<string, unknown>>;

    // ── Manual price overrides (survive the nightly flatfile ingest) ─────────
    // A whole-journey override (suite_category = '') pins the "from" price; a
    // per-suite override is merged INTO the matching EUR fare's prices['2A'] so
    // everything downstream (suite cards, cabinPricing, the server quote in
    // lib/booking.ts) prices from the same number. fare_overrides is never
    // touched by the ingest, so these persist.
    const overrideRows = (await sql`
      SELECT suite_category, override_price
      FROM fare_overrides
      WHERE journey_id = ${id} AND currency = 'EUR' AND enabled
    `) as Array<{ suite_category: string; override_price: string | number | null }>;

    const suiteOverride = new Map<string, number>();
    let wholeJourneyOverride: number | null = null;
    for (const o of overrideRows) {
      if (o.override_price == null) continue;
      const price = Number(o.override_price);
      if (!Number.isFinite(price) || price <= 0) continue;
      if (o.suite_category === '') wholeJourneyOverride = price;
      else suiteOverride.set(o.suite_category, price);
    }

    const mergedFares = fareRows.map((f) => {
      const sc = f.suite_category as string | null;
      const ov = sc && f.currency === 'EUR' ? suiteOverride.get(sc) : undefined;
      if (ov == null) return f;
      const prices = { ...((f.prices as Record<string, unknown> | null) ?? {}), '2A': ov };
      return { ...f, prices, override_price: ov };
    });

    // Lowest "from" price computed AFTER the merge so suite overrides count.
    const eurFeed = mergedFares
      .filter((f) => f.currency === 'EUR')
      .map((f) => Number((f.prices as Record<string, unknown> | null | undefined)?.['2A']))
      .filter((n) => Number.isFinite(n) && n > 0);
    const lowestFeedEUR = eurFeed.length ? Math.min(...eurFeed) : null;
    const lowestPriceEUR = wholeJourneyOverride ?? lowestFeedEUR;
    const priceOverridden = wholeJourneyOverride != null || suiteOverride.size > 0;

    res.statusCode = 200;
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    res.end(JSON.stringify({
      ok: true,
      journey: {
        journeyId: j.journey_id,
        shipCd: j.ship_cd,
        itinCd: j.itin_cd,
        itinDesc: j.itin_desc,
        region: j.region,
        sailingPort: j.sailing_port,
        terminationPort: j.termination_port,
        sailingPortName: j.sailing_port_name,
        terminationPortName: j.termination_port_name,
        sailingDate: j.sailing_date,
        nights: j.nights,
        embkTime: j.embk_time,
        disEmbkTime: j.dis_embk_time,
        lowestPriceEUR,
        priceOverridden,
      },
      ship: shipRows[0] ?? null,
      days: dayRows.map((d) => ({
        dayNumber: d.day_number,
        portCd: d.port_cd,
        portName: d.port_name,
        country: d.country,
        lat: d.lat,
        lon: d.lon,
        arrivalTime: d.arrival_time,
        departureTime: d.departure_time,
        overnight: d.overnight,
        description: d.description,
      })),
      fares: mergedFares,
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/journeys/:id] failed:', message);
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: 'server-error' }));
  }
}
