/**
 * Orchestrate one ingest run:
 *   auth → list-files → download all latest XLS → parse → upsert →
 *   30%-drop guard → ghost-resilient soft-delete → DELETE after 7 days.
 *
 * Patterns from the `ghost-resilient-inventory-sync` skill:
 *   - is_available flag (soft delete) before any hard DELETE.
 *   - consecutive_missing counter; DELETE only after 7 absences.
 *   - 30% drop guard: if today's count < 70% of yesterday's, ABORT.
 */

import { randomUUID } from 'node:crypto';
import { authenticate } from './auth';
import { listFiles } from './list-files';
import { downloadFile } from './download';
import { pickLatest } from './pick-latest';
import { parsePricing, type ParsedFare } from './parse-pricing';
import {
  parseGeneric,
  type ParsedShip,
  type ParsedPort,
  type ParsedSuiteCategory,
  type ParsedItinerary,
  type ParsedExcursion,
} from './parse-generic';
import { assemble } from './assemble';
import { db, dbIsNeon, jsonbArg, runInTransaction } from '../db/client';

export interface IngestResult {
  runId: string;
  status: 'ok' | 'dry-run' | 'aborted' | 'failed';
  durationMs: number;
  counts: {
    ships: number;
    ports: number;
    suiteCategories: number;
    journeys: number;
    journeyDays: number;
    fares: number;
    excursions: number;
  };
  notes?: string;
  /** Pricing files that failed to download/parse this run (run proceeds without them). */
  failedFiles?: string[];
}

export class IngestAbort extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IngestAbort';
  }
}

const DROP_GUARD_RATIO = 0.7;       // abort if today_count < 70% of yesterday_count
const DELETE_AFTER_MISSING_DAYS = 7;

export async function runIngest(opts: { dryRun?: boolean; runId?: string } = {}): Promise<IngestResult> {
  // The admin endpoint pre-claims the ingest_runs row atomically and passes its
  // id in; standalone callers (cron, scripts) claim here. The partial unique
  // index ingest_runs_one_running_idx allows at most one 'running' row, so a
  // concurrent run makes this insert claim nothing — abort instead of
  // double-writing the catalog.
  const runId = opts.runId ?? randomUUID();
  const t0 = Date.now();
  const sql = db();

  // 0. Cross-process single-flight. A partial unique index on
  //    ingest_runs(status) WHERE status='running' makes this INSERT an atomic
  //    claim on both drivers — a second concurrent run (cron + manual admin +
  //    CLI, any process) claims nothing and aborts before touching Okta or the
  //    catalog. Stale claims (crashed runs) are swept first so a zombie can't
  //    block work forever. When opts.runId is set the admin endpoint already
  //    claimed this row, so the conflict is expected and must NOT abort.
  await sql`
    UPDATE ingest_runs
    SET status = 'failed', finished_at = now(),
        notes = COALESCE(notes, 'stale — swept at next run start')
    WHERE status = 'running' AND started_at < now() - interval '30 minutes'
  `;
  const claimed = (await sql`
    INSERT INTO ingest_runs (run_id, status)
    VALUES (${runId}, 'running')
    ON CONFLICT DO NOTHING
    RETURNING run_id
  `) as Array<{ run_id: string }>;
  if (!opts.runId && claimed.length === 0) {
    throw new IngestAbort('another ingest run is already in progress — no writes applied.');
  }

  try {
    // 1. Auth + list (consumes the token)
    const auth = await authenticate();
    const files = await listFiles(auth.sessionToken);
    const latest = pickLatest(files);

    if (!latest.generic) {
      throw new Error(
        'No ItineraryReport file found in flatfile listing. Cannot proceed without itinerary master data.',
      );
    }

    // 2. Download EVERYTHING first (S3 URLs are presigned with a short TTL —
    //    parsing between downloads used to let the pricing URLs expire), then
    //    parse. The itinerary master must succeed; pricing files are settled
    //    individually so one bad currency file no longer fails the whole run.
    const [genericBuf, pricingSettled] = await Promise.all([
      downloadFile(latest.generic.file.s3SignedUrl),
      Promise.allSettled(
        latest.pricing.map(async (p) => ({ p, buf: await downloadFile(p.file.s3SignedUrl) })),
      ),
    ]);
    const generic = parseGeneric(genericBuf);

    const pricingResults: ReturnType<typeof parsePricing>[] = [];
    const okCurrencies: string[] = [];
    const failedFiles: string[] = [];
    for (let i = 0; i < pricingSettled.length; i++) {
      const ref = latest.pricing[i];
      const settled = pricingSettled[i];
      if (settled.status === 'rejected') {
        failedFiles.push(ref.file.fileName);
        console.error(`[ingest] pricing ${ref.currency} download failed:`, settled.reason instanceof Error ? settled.reason.message : settled.reason);
        continue;
      }
      try {
        pricingResults.push(parsePricing(settled.value.buf, ref.currency));
        okCurrencies.push(ref.currency);
      } catch (e) {
        failedFiles.push(ref.file.fileName);
        console.error(`[ingest] pricing ${ref.currency} parse failed:`, e instanceof Error ? e.message : e);
      }
    }
    if (latest.pricing.length > 0 && okCurrencies.length === 0) {
      throw new Error(`all ${latest.pricing.length} pricing files failed (${failedFiles.join(', ')})`);
    }
    const failNote = failedFiles.length ? ` (${failedFiles.length} pricing file(s) skipped: ${failedFiles.join(', ')})` : '';

    // 4. Merge the two sources into one upsert-ready dataset.
    const data = assemble(generic, pricingResults);
    const totalFares = data.faresByCurrency.reduce((acc, p) => acc + p.fares.length, 0);

    const counts: IngestResult['counts'] = {
      ships: data.ships.length,
      ports: data.ports.length,
      suiteCategories: data.suiteCategories.length,
      journeys: data.journeys.length,
      journeyDays: data.journeys.reduce((a, it) => a + it.days.length, 0),
      fares: totalFares,
      excursions: generic.excursions.length,
    };

    if (opts.dryRun) {
      await sql`
        UPDATE ingest_runs
        SET status = 'ok', finished_at = now(),
            journey_count = ${counts.journeys},
            fare_count = ${counts.fares},
            failed_files = ${failedFiles.length},
            notes = ${'dry run — no DB writes' + failNote}
        WHERE run_id = ${runId}
      `;
      return {
        runId,
        status: 'dry-run',
        durationMs: Date.now() - t0,
        counts,
        notes: 'dry run — no DB writes' + failNote,
        failedFiles,
      };
    }

    // 4. 30%-drop guards BEFORE any destructive change — journeys AND fares.
    const [{ yesterday_count }] = (await sql`
      SELECT COUNT(*)::int AS yesterday_count
      FROM journeys
      WHERE is_available = true
    `) as Array<{ yesterday_count: number }>;
    if (yesterday_count > 0 && counts.journeys < yesterday_count * DROP_GUARD_RATIO) {
      const note = `aborted — today's journeys (${counts.journeys}) < ${Math.round(
        DROP_GUARD_RATIO * 100,
      )}% of yesterday's (${yesterday_count}). No writes applied.`;
      await sql`
        UPDATE ingest_runs
        SET status = 'aborted', finished_at = now(),
            journey_count = ${counts.journeys},
            fare_count = ${counts.fares},
            failed_files = ${failedFiles.length},
            notes = ${note}
        WHERE run_id = ${runId}
      `;
      throw new IngestAbort(note);
    }

    // Fare guard: only over the currencies that parsed this run (a skipped
    // file's fares are left untouched below, so they don't count against us).
    const [{ existing_fares }] = (await sql`
      SELECT COUNT(*)::int AS existing_fares
      FROM fares
      WHERE now_available = true AND currency = ANY(${okCurrencies})
    `) as Array<{ existing_fares: number }>;
    if (existing_fares > 0 && counts.fares < existing_fares * DROP_GUARD_RATIO) {
      const note = `aborted — today's fares (${counts.fares}) < ${Math.round(
        DROP_GUARD_RATIO * 100,
      )}% of yesterday's (${existing_fares}) across ${okCurrencies.join('/')}. No writes applied.`;
      await sql`
        UPDATE ingest_runs
        SET status = 'aborted', finished_at = now(),
            journey_count = ${counts.journeys},
            fare_count = ${counts.fares},
            failed_files = ${failedFiles.length},
            notes = ${note}
        WHERE run_id = ${runId}
      `;
      throw new IngestAbort(note);
    }

    // 5. Upsert master data FIRST so journey + fare FKs resolve.
    await upsertShips(data.ships);
    await upsertPorts(data.ports);
    await upsertSuiteCategories(data.suiteCategories);
    await upsertExcursions(generic.excursions);

    // 6. Upsert journeys + days.
    await upsertJourneys(data.journeys);

    // 7. Upsert fares per currency.
    for (const { currency, fares } of data.faresByCurrency) {
      await upsertFares(currency, fares);
    }

    // 8. Ghost-resilient soft-delete on journeys: any row whose last_seen_at
    //    wasn't bumped by upsertJourneys gets is_available=false and bumps
    //    consecutive_missing (kept for observability; deletion is time-keyed).
    await sql`
      UPDATE journeys
      SET is_available = false,
          consecutive_missing = consecutive_missing + 1,
          updated_at = now()
      WHERE last_seen_at < now() - interval '12 hours'
        AND is_available = true
    `;

    // Reset consecutive_missing on rows seen today.
    await sql`
      UPDATE journeys
      SET consecutive_missing = 0
      WHERE last_seen_at >= now() - interval '12 hours'
        AND consecutive_missing > 0
    `;

    // 8b. Same ghost-resilience for FARES — a price that vanished from the
    //     feed must stop being quotable (lib/booking.ts requires
    //     now_available). Scoped to the currencies that parsed this run so a
    //     skipped/broken pricing file never expires its own currency's fares.
    await sql`
      UPDATE fares
      SET now_available = false
      WHERE last_seen_at < now() - interval '12 hours'
        AND now_available = true
        AND currency = ANY(${okCurrencies})
    `;
    await sql`
      DELETE FROM fares
      WHERE now_available = false
        AND last_seen_at < now() - make_interval(days => ${DELETE_AFTER_MISSING_DAYS})
        AND currency = ANY(${okCurrencies})
    `;

    // 9. Hard-DELETE journeys only after the grace period, keyed on elapsed
    //    time since the feed last contained them — NOT on consecutive_missing,
    //    which counts runs (a manual run + the nightly cron would double-count
    //    a day, and the old WHERE is_available=true bump meant the counter
    //    froze at 1 and the delete never fired at all).
    await sql`
      DELETE FROM journeys
      WHERE is_available = false
        AND last_seen_at < now() - make_interval(days => ${DELETE_AFTER_MISSING_DAYS})
    `;

    // 10. Finalize audit row.
    await sql`
      UPDATE ingest_runs
      SET status = 'ok', finished_at = now(),
          journey_count = ${counts.journeys},
          fare_count = ${counts.fares},
          failed_files = ${failedFiles.length},
          notes = ${failedFiles.length ? `ok${failNote}` : null}
      WHERE run_id = ${runId}
    `;

    return { runId, status: 'ok', durationMs: Date.now() - t0, counts, failedFiles, notes: failedFiles.length ? `ok${failNote}` : undefined };
  } catch (err) {
    const isAbort = err instanceof IngestAbort;
    const note = err instanceof Error ? err.message : String(err);
    if (!isAbort) {
      await sql`
        UPDATE ingest_runs
        SET status = 'failed', finished_at = now(), notes = ${note}
        WHERE run_id = ${runId}
      `.catch(() => {/* swallow — original error is what matters */});
    }
    throw err;
  }
}

// ─── Upsert helpers ─────────────────────────────────────────────────────
//
// Each helper builds one tagged-template statement per row (lazy — not yet
// executed) and commits them in chunked transactions. Every transaction() is a
// SINGLE HTTP request to Neon, so a first ingest (~47k rows) goes from tens of
// thousands of sequential round-trips (20–40 min, would time out) down to a few
// dozen requests (seconds). ON CONFLICT upsert semantics are per-statement and
// fully preserved.

// Chunk size for batched commits. On Neon each chunk is ONE HTTP transaction
// (kept modest to bound request body size — fares carry jsonb). On a local
// postgres connection each built query runs on await; round-trips are
// sub-millisecond so even tens of thousands complete in seconds.
const TX_CHUNK = 500;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function commitInChunks(stmts: any[]): Promise<void> {
  if (!stmts.length) return;
  const sql = db();
  if (dbIsNeon()) {
    for (let i = 0; i < stmts.length; i += TX_CHUNK) {
      await sql.transaction(stmts.slice(i, i + TX_CHUNK));
    }
  } else {
    // porsager: each tagged-template query executes when awaited.
    for (const s of stmts) await s;
  }
}

async function upsertShips(rows: ParsedShip[]): Promise<void> {
  if (!rows.length) return;
  const sql = db();
  await commitInChunks(rows.map((s) => sql`
    INSERT INTO ships (ship_cd, ship_name, imo, decks, capacity, launch_year, updated_at)
    VALUES (${s.shipCd}, ${s.shipName}, ${s.imo}, ${s.decks}, ${s.capacity}, ${s.launchYear}, now())
    ON CONFLICT (ship_cd) DO UPDATE
      SET ship_name = EXCLUDED.ship_name,
          imo = EXCLUDED.imo,
          decks = EXCLUDED.decks,
          capacity = EXCLUDED.capacity,
          launch_year = EXCLUDED.launch_year,
          updated_at = now()
  `));
}

async function upsertPorts(rows: ParsedPort[]): Promise<void> {
  if (!rows.length) return;
  const sql = db();
  await commitInChunks(rows.map((p) => sql`
    INSERT INTO ports (port_cd, port_name, country, lat, lon, timezone)
    VALUES (${p.portCd}, ${p.portName}, ${p.country}, ${p.lat}, ${p.lon}, ${p.timezone})
    ON CONFLICT (port_cd) DO UPDATE
      SET port_name = EXCLUDED.port_name,
          country = EXCLUDED.country,
          lat = EXCLUDED.lat,
          lon = EXCLUDED.lon,
          timezone = EXCLUDED.timezone
  `));
}

async function upsertSuiteCategories(rows: ParsedSuiteCategory[]): Promise<void> {
  if (!rows.length) return;
  const sql = db();
  await commitInChunks(rows.map((c) => sql`
    INSERT INTO suite_categories (code, name, tier, sqm, has_balcony, max_occupancy)
    VALUES (${c.code}, ${c.name}, ${c.tier ?? 'Unknown'}, ${c.sqm}, ${c.hasBalcony}, ${c.maxOccupancy})
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          tier = EXCLUDED.tier,
          sqm = EXCLUDED.sqm,
          has_balcony = EXCLUDED.has_balcony,
          max_occupancy = EXCLUDED.max_occupancy
  `));
}

async function upsertExcursions(rows: ParsedExcursion[]): Promise<void> {
  if (!rows.length) return;
  const sql = db();
  await commitInChunks(rows.map((e) => sql`
    INSERT INTO excursions (excursion_cd, port_cd, name, duration_minutes, intensity, price_eur, last_seen_at)
    VALUES (${e.excursionCd}, ${e.portCd}, ${e.name}, ${e.durationMinutes}, ${e.intensity}, ${e.priceEUR}, now())
    ON CONFLICT (excursion_cd) DO UPDATE
      SET port_cd = EXCLUDED.port_cd,
          name = EXCLUDED.name,
          duration_minutes = EXCLUDED.duration_minutes,
          intensity = EXCLUDED.intensity,
          price_eur = EXCLUDED.price_eur,
          last_seen_at = now()
  `));
}

async function upsertJourneys(rows: ParsedItinerary[]): Promise<void> {
  const valid = rows.filter((it) => it.sailingDate && it.shipCd); // skip incomplete rows defensively
  if (!valid.length) return;
  const sql = db();

  // 1. Journeys.
  await commitInChunks(valid.map((it) => sql`
    INSERT INTO journeys (
      journey_id, ship_cd, itin_cd, itin_desc, region, sailing_port, termination_port,
      sailing_date, nights, embk_time, dis_embk_time,
      is_available, consecutive_missing, last_seen_at, updated_at
    )
    VALUES (
      ${it.journeyId}, ${it.shipCd}, ${it.itinCd ?? ''}, ${it.itinDesc},
      ${it.region}, ${it.sailingPort}, ${it.terminationPort},
      ${it.sailingDate}, ${it.nights ?? 0}, ${it.embkTime}, ${it.disEmbkTime},
      true, 0, now(), now()
    )
    ON CONFLICT (journey_id) DO UPDATE
      SET ship_cd = EXCLUDED.ship_cd,
          itin_cd = EXCLUDED.itin_cd,
          itin_desc = EXCLUDED.itin_desc,
          region = EXCLUDED.region,
          sailing_port = EXCLUDED.sailing_port,
          termination_port = EXCLUDED.termination_port,
          sailing_date = EXCLUDED.sailing_date,
          nights = EXCLUDED.nights,
          embk_time = EXCLUDED.embk_time,
          dis_embk_time = EXCLUDED.dis_embk_time,
          is_available = true,
          consecutive_missing = 0,
          last_seen_at = now(),
          updated_at = now()
  `));

  // 2. Refresh days ATOMICALLY per journey-chunk: the DELETE and the
  //    re-INSERTs commit in ONE transaction, so a crash mid-refresh can never
  //    leave journeys with their days deleted but not yet re-inserted.
  //    ~50 journeys ≈ a few hundred statements per transaction — same order of
  //    magnitude as TX_CHUNK, bounding the Neon HTTP request body.
  const DAYS_TX_JOURNEYS = 50;
  for (let i = 0; i < valid.length; i += DAYS_TX_JOURNEYS) {
    const chunk = valid.slice(i, i + DAYS_TX_JOURNEYS);
    const ids = chunk.map((it) => it.journeyId);
    await runInTransaction((tx) => [
      tx`DELETE FROM journey_days WHERE journey_id = ANY(${ids})`,
      ...chunk.flatMap((it) =>
        it.days.map((d) => tx`
          INSERT INTO journey_days (
            journey_id, day_number, port_cd, arrival_time, departure_time, overnight, description
          )
          VALUES (
            ${it.journeyId}, ${d.dayNumber}, ${d.portCd},
            ${d.arrivalTime}, ${d.departureTime}, ${d.overnight}, ${d.description}
          )
          ON CONFLICT (journey_id, day_number) DO NOTHING
        `),
      ),
    ]);
  }
}

async function upsertFares(currency: string, rows: ParsedFare[]): Promise<void> {
  if (!rows.length) return;
  const sql = db();
  await commitInChunks(rows.map((f) => sql`
    INSERT INTO fares (
      journey_id, fare_code, fare_desc, price_type, suite_category,
      prices, currency, gft, ncf, fare_start_date, fare_end_date,
      now_available, items, raw, last_seen_at
    )
    VALUES (
      ${f.journeyId}, ${f.fareCode}, ${f.fareDesc}, ${f.priceType}, ${f.suiteCategory},
      ${jsonbArg(f.prices)}::jsonb, ${currency},
      ${jsonbArg(f.gft)}::jsonb,
      ${jsonbArg(f.ncf)}::jsonb,
      ${f.fareStartDate}, ${f.fareEndDate},
      ${f.nowAvailable}, ${f.items},
      ${jsonbArg(f.raw)}::jsonb, now()
    )
    ON CONFLICT (journey_id, fare_code, suite_category, currency) DO UPDATE
      SET fare_desc = EXCLUDED.fare_desc,
          price_type = EXCLUDED.price_type,
          prices = EXCLUDED.prices,
          gft = EXCLUDED.gft,
          ncf = EXCLUDED.ncf,
          fare_start_date = EXCLUDED.fare_start_date,
          fare_end_date = EXCLUDED.fare_end_date,
          now_available = EXCLUDED.now_available,
          items = EXCLUDED.items,
          raw = EXCLUDED.raw,
          last_seen_at = now()
  `));
}
