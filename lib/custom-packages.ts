/**
 * Custom packages — owner-managed offers that are NOT in the Explora flatfile.
 *
 * They live in their own tables (custom_packages / custom_package_fares) so the
 * nightly ingest can never soft-delete or wipe them, then are merged into the
 * public read paths and priced by the SAME engine as feed sailings
 * (lib/pricing.ts fareToPricing + priceCabin), so a custom package books through
 * the normal wizard + PayPal deposit flow.
 *
 * Public ids are namespaced `CUSTOM-<slug>` — that prefix is the branch key used
 * by api/journeys/[id].ts and lib/booking.ts computeQuote().
 *
 * Server-only — never import from src/.
 */
import { db } from './db/client';

/** Prefix that marks a journey id as a custom package rather than a feed sailing. */
export const CUSTOM_ID_PREFIX = 'CUSTOM-';

export function isCustomId(journeyId: string | null | undefined): boolean {
  return !!journeyId && journeyId.startsWith(CUSTOM_ID_PREFIX);
}

export function publicIdForSlug(slug: string): string {
  return `${CUSTOM_ID_PREFIX}${slug}`;
}

export interface CustomPackageRow {
  id: number;
  public_id: string;
  slug: string;
  title_en: string;
  title_el: string | null;
  summary_en: string | null;
  summary_el: string | null;
  description_en: string | null;
  description_el: string | null;
  region: string | null;
  nights: number;
  sailing_date: string | null;
  sailing_port_name: string | null;
  termination_port_name: string | null;
  hero_image: string | null;
  photos: unknown;
  itinerary: unknown;
  inclusions: unknown;
  deposit_pct: string | number | null;
  visible: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CustomFareRow {
  id: number;
  package_id: number;
  suite_category: string;
  suite_name: string | null;
  fare_code: string;
  fare_label: string | null;
  currency: string;
  per_person: string | number;
  third_fourth_adult: string | number | null;
  third_fourth_child: string | number | null;
  third_fourth_infant: string | number | null;
  solo_fare: string | number | null;
  solo_suppl_pct: string | number | null;
  now_available: boolean;
  items: unknown;
  sort_order: number;
}

/** jsonb columns arrive as objects (porsager) or strings (Neon HTTP) — normalize. */
function parseJson<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === 'string') {
    try { return JSON.parse(v) as T; } catch { return fallback; }
  }
  return v as T;
}

function num(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

export interface CustomItineraryDay {
  dayNumber?: number;
  portName?: string | null;
  country?: string | null;
  arrivalTime?: string | null;
  departureTime?: string | null;
  overnight?: boolean;
  description?: string | null;
}

export interface CustomPhoto {
  url: string;
  altEn?: string | null;
  altEl?: string | null;
}

/**
 * A custom fare rendered in the SAME shape as a row of api/journeys/[id]'s
 * `fares`, so the booking wizard, suite cards and fareToPricing() all read it
 * without a special case.
 */
export function customFareToApiShape(f: CustomFareRow) {
  return {
    fare_code: f.fare_code,
    fare_desc: f.fare_label,
    price_type: null as string | null,
    suite_category: f.suite_category,
    suite_name: f.suite_name,
    prices: { '2A': num(f.per_person) },
    currency: f.currency,
    gft: null as null,
    ncf: null as null,
    fare_start_date: null as string | null,
    fare_end_date: null as string | null,
    now_available: f.now_available,
    items: parseJson<string[]>(f.items, []),
    raw: {
      thirdFourthAdult: num(f.third_fourth_adult),
      thirdFourthChild: num(f.third_fourth_child),
      thirdFourthInfant: num(f.third_fourth_infant),
      soloFare: num(f.solo_fare),
      soloSupplPct: num(f.solo_suppl_pct),
    } as Record<string, number | null>,
  };
}

/**
 * Explicit column list for admin reads. `sailing_date` is cast to text because
 * the TCP driver returns a JS Date for `date` columns while every consumer
 * (comparisons, JSON, the admin form) expects YYYY-MM-DD.
 */
export const PACKAGE_COLS = `
  id, public_id, slug, title_en, title_el, summary_en, summary_el,
  description_en, description_el, region, nights,
  sailing_date::text AS sailing_date,
  sailing_port_name, termination_port_name, hero_image,
  photos, itinerary, inclusions, deposit_pct, visible,
  created_at, updated_at
`;

/** DB row → the camelCase shape the admin console edits. */
export function toAdminPackage(r: CustomPackageRow, fares: CustomFareRow[] = []) {
  return {
    id: Number(r.id),
    publicId: r.public_id,
    slug: r.slug,
    titleEn: r.title_en,
    titleEl: r.title_el,
    summaryEn: r.summary_en,
    summaryEl: r.summary_el,
    descriptionEn: r.description_en,
    descriptionEl: r.description_el,
    region: r.region,
    nights: Number(r.nights),
    sailingDate: r.sailing_date,
    sailingPortName: r.sailing_port_name,
    terminationPortName: r.termination_port_name,
    heroImage: r.hero_image,
    photos: parseJson<CustomPhoto[]>(r.photos, []),
    itinerary: parseJson<CustomItineraryDay[]>(r.itinerary, []),
    inclusions: parseJson<string[]>(r.inclusions, []),
    depositPct: num(r.deposit_pct),
    visible: !!r.visible,
    createdAt: r.created_at ?? null,
    updatedAt: r.updated_at ?? null,
    fares: fares.map(toAdminFare),
  };
}

export function toAdminFare(f: CustomFareRow) {
  return {
    id: Number(f.id),
    suiteCategory: f.suite_category,
    suiteName: f.suite_name,
    fareCode: f.fare_code,
    fareLabel: f.fare_label,
    currency: f.currency,
    perPerson: num(f.per_person),
    thirdFourthAdult: num(f.third_fourth_adult),
    thirdFourthChild: num(f.third_fourth_child),
    thirdFourthInfant: num(f.third_fourth_infant),
    soloFare: num(f.solo_fare),
    soloSupplPct: num(f.solo_suppl_pct),
    nowAvailable: !!f.now_available,
    items: parseJson<string[]>(f.items, []),
    sortOrder: Number(f.sort_order),
  };
}

/** URL-safe slug from a free-text title (mirrors lib/entities entitySlugify). */
export function packageSlugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Load a visible custom package by public id. `includeHidden` is for the admin
 * preview path only — public callers must leave it false so an unpublished
 * package 404s.
 */
export async function getCustomPackage(
  publicId: string,
  opts: { includeHidden?: boolean } = {},
): Promise<CustomPackageRow | null> {
  const sql = db();
  // sailing_date is cast to text on purpose: the TCP driver hands back a JS Date
  // for `date` columns, and every caller compares it as a YYYY-MM-DD string.
  const rows = (await sql`
    SELECT id, public_id, slug, title_en, title_el, summary_en, summary_el,
           description_en, description_el, region, nights,
           sailing_date::text AS sailing_date,
           sailing_port_name, termination_port_name, hero_image,
           photos, itinerary, inclusions, deposit_pct, visible
    FROM custom_packages
    WHERE public_id = ${publicId}
      AND (${opts.includeHidden ?? false}::boolean OR visible = true)
    LIMIT 1
  `) as CustomPackageRow[];
  return rows[0] ?? null;
}

export async function getCustomPackageFares(packageId: number): Promise<CustomFareRow[]> {
  const sql = db();
  return (await sql`
    SELECT * FROM custom_package_fares
    WHERE package_id = ${packageId}
    ORDER BY sort_order ASC, per_person ASC
  `) as CustomFareRow[];
}

/**
 * Look up ONE bookable custom fare for the authoritative server quote. Mirrors
 * the availability gate of the feed path in lib/booking.ts computeQuote():
 * package visible, fare still offered, EUR.
 *
 * Date gating is intentionally NOT applied here — it is applied by the caller
 * alongside MIN_LEAD_DAYS so feed and custom share one rule.
 */
export async function getCustomFare(
  publicId: string,
  suiteCategory: string,
  fareCode: string,
): Promise<{ pkg: CustomPackageRow; fare: CustomFareRow } | null> {
  const sql = db();
  const rows = (await sql`
    SELECT p.id, p.public_id, p.slug, p.title_en, p.nights,
           p.sailing_date::text AS sailing_date, p.deposit_pct, p.visible,
           row_to_json(f.*) AS fare_json
    FROM custom_packages p
    JOIN custom_package_fares f ON f.package_id = p.id
    WHERE p.public_id = ${publicId}
      AND p.visible = true
      AND f.suite_category = ${suiteCategory}
      AND f.fare_code = ${fareCode}
      AND f.currency = 'EUR'
      AND f.now_available = true
    LIMIT 1
  `) as Array<CustomPackageRow & { fare_json: CustomFareRow | string }>;
  const row = rows[0];
  if (!row) return null;
  const fare = typeof row.fare_json === 'string'
    ? (JSON.parse(row.fare_json) as CustomFareRow)
    : row.fare_json;
  return { pkg: row, fare };
}

/**
 * Build the /api/journeys/:id detail payload for a custom package — identical in
 * shape to the feed detail (journey / ship / days / fares) plus the custom-only
 * media and copy fields the detail page renders (isCustom, heroImage, photos,
 * summary, description, inclusions).
 */
export function customPackageDetail(pkg: CustomPackageRow, fares: CustomFareRow[]) {
  const apiFares = fares.filter((f) => f.now_available).map(customFareToApiShape);
  const eur = apiFares
    .filter((f) => f.currency === 'EUR')
    .map((f) => f.prices['2A'])
    .filter((n): n is number => typeof n === 'number' && n > 0);
  const lowestPriceEUR = eur.length ? Math.min(...eur) : null;

  const itinerary = parseJson<CustomItineraryDay[]>(pkg.itinerary, []);

  return {
    ok: true as const,
    journey: {
      journeyId: pkg.public_id,
      shipCd: '',
      itinCd: '',
      itinDesc: pkg.title_en,
      region: pkg.region,
      sailingPort: null as string | null,
      terminationPort: null as string | null,
      sailingPortName: pkg.sailing_port_name,
      terminationPortName: pkg.termination_port_name,
      sailingDate: pkg.sailing_date,
      nights: pkg.nights,
      embkTime: null as string | null,
      disEmbkTime: null as string | null,
      lowestPriceEUR,
      priceOverridden: false,
      // ── custom-only ──
      isCustom: true as const,
      titleEl: pkg.title_el,
      summary: pkg.summary_en,
      summaryEl: pkg.summary_el,
      description: pkg.description_en,
      descriptionEl: pkg.description_el,
      heroImage: pkg.hero_image,
      photos: parseJson<CustomPhoto[]>(pkg.photos, []),
      inclusions: parseJson<string[]>(pkg.inclusions, []),
    },
    ship: null,
    days: itinerary.map((d, i) => ({
      dayNumber: d.dayNumber ?? i + 1,
      portCd: null as string | null,
      portName: d.portName ?? null,
      country: d.country ?? null,
      lat: null as number | null,
      lon: null as number | null,
      arrivalTime: d.arrivalTime ?? null,
      departureTime: d.departureTime ?? null,
      overnight: d.overnight ?? false,
      description: d.description ?? null,
    })),
    fares: apiFares,
  };
}
