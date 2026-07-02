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
 * Price a cabin for a guest composition. Adults take the per-person berths first
 * (1-2 at per-person, 3rd/4th reduced); children/infants always use their own
 * rate; a single guest (a lone adult) pays the Solo Fare.
 */
export function priceCabin(f: FarePricing, p: Party): CabinPrice {
  const adults = Math.max(0, Math.floor(p.adults || 0));
  const children = Math.max(0, Math.floor(p.children || 0));
  const infants = Math.max(0, Math.floor(p.infants || 0));
  const headcount = adults + children + infants;

  const empty = (total: number, guests: CabinPrice['guests'], solo: boolean): CabinPrice => ({
    total,
    byType: {
      adults: { count: adults, total: guests.filter((g) => g.type === 'adult').reduce((s, g) => s + g.price, 0) },
      children: { count: children, total: guests.filter((g) => g.type === 'child').reduce((s, g) => s + g.price, 0) },
      infants: { count: infants, total: guests.filter((g) => g.type === 'infant').reduce((s, g) => s + g.price, 0) },
    },
    guests,
    solo,
    perPerson: f.perPerson,
  });

  if (headcount === 0) return empty(0, [], false);

  // Single guest (normally a lone adult) → Solo Fare.
  if (headcount === 1) {
    const price = soloPrice(f);
    const type: GuestType = adults === 1 ? 'adult' : children === 1 ? 'child' : 'infant';
    return empty(price, [{ type, price }], true);
  }

  const adult3 = f.adult34 ?? f.perPerson; // 3rd/4th adult (fallback: per-person)
  const childRate = f.child34 ?? f.adult34 ?? f.perPerson;
  const infantRate = f.infant34 ?? 0;

  const guests: CabinPrice['guests'] = [];
  for (let i = 0; i < adults; i++) guests.push({ type: 'adult', price: Math.round(i < 2 ? f.perPerson : adult3) });
  for (let i = 0; i < children; i++) guests.push({ type: 'child', price: Math.round(childRate) });
  for (let i = 0; i < infants; i++) guests.push({ type: 'infant', price: Math.round(infantRate) });

  const total = guests.reduce((s, g) => s + g.price, 0);
  return empty(total, guests, false);
}
