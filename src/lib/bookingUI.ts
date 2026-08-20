import type { JourneyDetail } from '@/lib/api';
import { fareToPricing, priceCabin, suiteBerths, type FarePricing, type CabinPrice, type Party } from '@lib/pricing';
import i18n from '@/i18n';

// suiteBerths now lives in the shared pricing module so the server booking
// validator and this client use one source of truth (occupancy can't drift from
// pricing). Re-exported here so existing importers keep working.
export { suiteBerths };

/** Explora suite_category code → display name (from the suite_categories catalog). */
export const SUITE_LABELS: Record<string, string> = {
  OT1: 'Ocean Terrace Suite', OT2: 'Ocean Terrace Suite', OT3: 'Ocean Terrace Suite', OT4: 'Ocean Terrace Suite',
  GT: 'Ocean Grand Terrace Suite',
  PH: 'Penthouse', DP: 'Deluxe Penthouse', PP: 'Premier Penthouse',
  GP: 'Grand Penthouse', GPJ: 'Grand Penthouse with Whirlpool',
  CO: 'Cove Residence', CO1: 'Cove Residence', COJ: 'Cove Residence', CR: 'Cocoon Residence',
  RR: 'Retreat Residence', SR: 'Serenity Residence',
  OR: "Owner's Residence", OR1: "Owner's Residence", OR2: "Owner's Residence",
};

export function suiteLabel(code: string): string {
  return SUITE_LABELS[code] ?? code;
}

/** Slug fare code → readable label, e.g. EXPLORA_JOURNEYS_FARE → "Explora Journeys Fare". */
export function fareLabel(code: string): string {
  return code
    .toLowerCase()
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export function fare2A(prices: Record<string, number | null> | undefined): number | null {
  const v = prices?.['2A'];
  return typeof v === 'number' ? v : null;
}

/**
 * A fare is bookable when the feed flags it available AND it carries a real
 * per-guest (2A) EUR price. A suite the guest can't actually book — sold out
 * (now_available=false) or unpriced — must never appear as a selectable card.
 * The detail API already filters now_available=true server-side; this is the
 * matching front-end guard so "Choose your suite" only shows bookable suites.
 */
export function isBookableFare(f: JourneyDetail['fares'][number]): boolean {
  if (f.currency !== 'EUR') return false;
  if (f.now_available === false) return false;
  const p = fare2A(f.prices);
  return p != null && p > 0;
}

export function formatEUR(n: number | null | undefined): string {
  return n != null ? `€${Math.round(n).toLocaleString(i18n.language || 'en')}` : '—';
}

export interface SuiteGroup {
  code: string;
  name: string;
  fares: JourneyDetail['fares'];
  from: number | null;
}

/**
 * Group a journey's bookable EUR fares into one card per suite *type*, cheapest-first.
 *
 * Grouped by display NAME (suiteLabel), not the raw suite_category code, so the
 * deck/location variants that share a name — OT1–OT4 → "Ocean Terrace Suite",
 * CO/CO1/COJ → "Cove Residence", OR/OR1/OR2 → "Owner's Residence" — collapse into a
 * single card showing the cheapest "from" price (mirrors Explora's booking page).
 * The group's `code` is the cheapest variant's real suite_category, so selection,
 * the ?suite=&fare= deep link, cabin photos, and the server quote all stay valid.
 */
export function groupSuites(detail: JourneyDetail | null): SuiteGroup[] {
  if (!detail) return [];
  const map = new Map<string, JourneyDetail['fares']>();
  // Only bookable suites — available + truly priced. Unavailable cabins drop out
  // here, so a suite with no bookable fare never becomes a card.
  for (const f of detail.fares.filter(isBookableFare)) {
    const name = suiteLabel(f.suite_category);
    const arr = map.get(name) ?? [];
    arr.push(f);
    map.set(name, arr);
  }
  return [...map.entries()]
    .map(([name, fares]) => {
      // Cheapest offer/variant first, so fares[0] is the one we auto-accept; its
      // suite_category becomes the group code and its price the "from".
      const sorted = [...fares].sort(
        (a, b) => (fare2A(a.prices) ?? Number.MAX_SAFE_INTEGER) - (fare2A(b.prices) ?? Number.MAX_SAFE_INTEGER),
      );
      const from = fare2A(sorted[0]?.prices);
      return { code: sorted[0].suite_category, name, fares: sorted, from };
    })
    .sort((a, b) => (a.from ?? Number.MAX_SAFE_INTEGER) - (b.from ?? Number.MAX_SAFE_INTEGER));
}

/** The selected EUR fare row, if present. */
export function selectedFare(detail: JourneyDetail | null, suiteCategory?: string, fareCode?: string) {
  if (!detail || !suiteCategory || !fareCode) return undefined;
  return detail.fares.find((f) => f.suite_category === suiteCategory && f.fare_code === fareCode && f.currency === 'EUR');
}

/** Per-guest-type pricing model for the selected fare (perPerson + 3rd/4th + solo). */
export function farePricingFor(detail: JourneyDetail | null, suiteCategory?: string, fareCode?: string): FarePricing | null {
  const f = selectedFare(detail, suiteCategory, fareCode);
  return f ? fareToPricing(f.prices, f.raw) : null;
}

/** How many guests the selected suite sleeps (from the berth map; flatfile has no field). */
export function suiteMaxOccupancy(_detail: JourneyDetail | null, suiteCategory?: string, _fareCode?: string): number {
  return suiteBerths(suiteCategory);
}

/** Whether a suite can seat this party — purely occupancy: party size ≤ berths, ≥1 adult, ≤4. */
export function suiteFitsParty(_detail: JourneyDetail | null, suiteCategory: string | undefined, _fareCode: string | undefined, party: Party): boolean {
  const size = (party.adults || 0) + (party.children || 0) + (party.infants || 0);
  return party.adults >= 1 && size >= 1 && size <= suiteBerths(suiteCategory);
}

/** Full cabin price + per-guest breakdown for a composition (adults/children/infants). */
export function cabinPricing(
  detail: JourneyDetail | null,
  suiteCategory: string | undefined,
  fareCode: string | undefined,
  party: Party,
): CabinPrice | null {
  const fp = farePricingFor(detail, suiteCategory, fareCode);
  return fp ? priceCabin(fp, party) : null;
}
