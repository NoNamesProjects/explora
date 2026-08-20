/**
 * Cabin pricing from the Explora flatfile fare columns — shared by the front-end
 * (display) and the server (authoritative deposit quote) so the indicative total
 * and the captured deposit can never disagree.
 *
 * The flatfile gives, per suite fare:
 *   - prices['2A']          → Per Person Fare (double occupancy; berths 1 & 2)
 *   - raw.thirdFourthAdult  → 3rd & 4th Adult rate
 *   - raw.thirdFourthChild  → 3rd & 4th Child rate
 *   - raw.thirdFourthInfant → 3rd & 4th Infant rate (often 0 / free)
 *   - raw.soloFare          → Solo Fare (single occupancy)
 *   - raw.soloSupplPct      → Solo supplement % (fallback for solo)
 *
 * Policy ("follow the flatfile"): adults 1-2 pay per-person, the 3rd/4th adult the
 * reduced adult rate; children always the child rate; infants the infant rate or
 * free; a lone adult pays the Solo Fare. Max 4 per cabin — a suite with no 3rd/4th
 * rates sleeps 2.
 */

export interface FarePricing {
  perPerson: number; // prices['2A']
  adult34: number | null;
  child34: number | null;
  infant34: number | null;
  solo: number | null;
  soloSupplPct: number | null;
}

export interface Party {
  adults: number;
  children: number;
  infants: number;
}

export type GuestType = 'adult' | 'child' | 'infant';

export interface CabinPrice {
  total: number;
  byType: {
    adults: { count: number; total: number };
    children: { count: number; total: number };
    infants: { count: number; total: number };
  };
  /** Per-individual prices, in adults→children→infants order (for the review list). */
  guests: Array<{ type: GuestType; price: number }>;
  solo: boolean;
  perPerson: number;
}

// ── Occupancy rules (shared by the server booking validator AND the client
// steppers/pricing, so capacity and price can never drift) ───────────────────
export const MAX_GUESTS = 4; // a cabin sleeps at most 4 (Explora policy)
export const ADULTS_MIN = 1;
export const ADULTS_MAX = 4;
export const CHILDREN_MIN = 0;
export const CHILDREN_MAX = 3;
export const INFANTS_MIN = 0;
export const INFANTS_MAX = 2;

// Suites that physically sleep only 2 (the flatfile carries no occupancy field,
// suite_categories.max_occupancy is empty). Every other suite sleeps up to 4.
export const TWO_BERTH_SUITES = new Set(['OT1', 'OT2', 'OT3', 'OT4', 'GT']);

/** How many guests a suite category physically sleeps (2 for Ocean/Grand Terrace, else 4). */
export function suiteBerths(suiteCategory?: string): number {
  return suiteCategory && TWO_BERTH_SUITES.has(suiteCategory) ? 2 : MAX_GUESTS;
}

function toNum(v: unknown): number | null {
  const x = typeof v === 'string' ? Number(v) : (v as number);
  return typeof x === 'number' && Number.isFinite(x) ? x : null;
}

/** Build FarePricing from an API fare's `prices` + `raw` jsonb (tolerant of string/number). */
export function fareToPricing(
  prices: Record<string, unknown> | null | undefined,
  raw: Record<string, unknown> | null | undefined,
): FarePricing | null {
  const perPerson = toNum(prices?.['2A']);
  if (perPerson == null || perPerson <= 0) return null;
  return {
    perPerson,
    adult34: toNum(raw?.thirdFourthAdult),
    child34: toNum(raw?.thirdFourthChild),
    infant34: toNum(raw?.thirdFourthInfant),
    solo: toNum(raw?.soloFare),
    soloSupplPct: toNum(raw?.soloSupplPct),
  };
}

function soloPrice(f: FarePricing): number {
  if (f.solo != null && f.solo > 0) return Math.round(f.solo);
  if (f.soloSupplPct != null) return Math.round(f.perPerson * (1 + f.soloSupplPct / 100));
  return Math.round(f.perPerson);
}

/**
 * Price a cabin for a guest composition, returning a complete per-guest
 * breakdown. Adults take the per-person berths first (1-2 at per-person, 3rd/4th
 * reduced); children and infants always use their own rate.
 *
 * Solo Fare applies when exactly ONE fare-paying adult occupies the cabin with
 * no children. Infants take no paid berth, so a lone adult travelling with an
 * infant is still solo (and the infant rides free) — that is the single-supplement
 * case, not double occupancy.
 */
export function priceCabin(f: FarePricing, p: Party): CabinPrice {
  const adults = Math.max(0, Math.floor(p.adults || 0));
  const children = Math.max(0, Math.floor(p.children || 0));
  const infants = Math.max(0, Math.floor(p.infants || 0));
  const headcount = adults + children + infants;

  // Solo = one paying adult alone (children fill a paid berth and defeat solo;
  // infants never do).
  const solo = adults === 1 && children === 0 && headcount >= 1;

  const guests: CabinPrice['guests'] = [];
  if (solo) {
    guests.push({ type: 'adult', price: soloPrice(f) });
    const infantRate = Math.round(f.infant34 ?? 0);
    for (let i = 0; i < infants; i++) guests.push({ type: 'infant', price: infantRate });
  } else if (headcount > 0) {
    const adult3 = f.adult34 ?? f.perPerson; // 3rd/4th adult (fallback: per-person)
    const childRate = f.child34 ?? f.adult34 ?? f.perPerson;
    const infantRate = f.infant34 ?? 0;
    for (let i = 0; i < adults; i++) guests.push({ type: 'adult', price: Math.round(i < 2 ? f.perPerson : adult3) });
    for (let i = 0; i < children; i++) guests.push({ type: 'child', price: Math.round(childRate) });
    for (let i = 0; i < infants; i++) guests.push({ type: 'infant', price: Math.round(infantRate) });
  }

  const total = guests.reduce((s, g) => s + g.price, 0);
  return {
    total,
    byType: {
      adults: { count: adults, total: guests.filter((g) => g.type === 'adult').reduce((s, g) => s + g.price, 0) },
      children: { count: children, total: guests.filter((g) => g.type === 'child').reduce((s, g) => s + g.price, 0) },
      infants: { count: infants, total: guests.filter((g) => g.type === 'infant').reduce((s, g) => s + g.price, 0) },
    },
    guests,
    solo,
    perPerson: f.perPerson,
  };
}
