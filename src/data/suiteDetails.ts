/**
 * Original, factual suite-detail content for the booking-flow detail modal.
 *
 * IP note: these are plain, original feature descriptions — NOT verbatim brand
 * marketing copy. The m²/size figures in SQM_BY_TIER are sourced public Explora
 * specifications (factual data, not invented) — see the table note below; a few
 * are best-effort pending the partner's authoritative fact sheet. No
 * struck-through prices, no fabricated floorplans. Factual amenity names are
 * fine; the phrasing here is written from scratch so it reads honestly.
 *
 * Consumed by SuiteDetailModal's "Full Details" and "Inclusions" tabs and the
 * "Overview" paragraph.
 */

import { suiteTierKey } from '@/lib/shipAssets';
import i18n from '@/i18n';

/**
 * English fallbacks. The localized copy lives in the locale JSONs under
 * booking.suiteModal.* (featureItems / inclusionItems / overview / overviewLarger);
 * the accessors below resolve the active locale and fall back to these. Reading
 * i18n.t at call time (not module load) means the right language is returned on
 * every render — the same locale-aware pattern as formatEUR in lib/bookingUI.
 */
const SUITE_FEATURES_EN: string[] = [
  'Floor-to-ceiling windows framing the ocean',
  'Private furnished terrace',
  'Separate lounge area with a coffee and dining table',
  'Walk-in wardrobe and dressing area',
  'In-suite welcome champagne on arrival',
  'Private refrigerated minibar, replenished daily',
  'Espresso machine, kettle and a selection of teas',
  'Complimentary refillable water bottle for each guest',
  'Binoculars to enjoy the passing coastline',
  'In-room safe sized for laptops and tablets',
  'Twice-daily housekeeping and evening turndown',
];

const SUITE_INCLUSIONS_EN: string[] = [
  'Sea view',
  'Floor-to-ceiling windows',
  'Lounge area',
  'Private refrigerated minibar',
  'Private sun terrace',
  'Heated bathroom floors',
];

/** Bulleted feature list for the "Full Details" tab — locale-aware, applies across tiers. */
export function suiteFeatures(): string[] {
  return i18n.t('booking.suiteModal.featureItems', { returnObjects: true, defaultValue: SUITE_FEATURES_EN }) as string[];
}

/** Short, scannable inclusion chips for the "Inclusions" tab — locale-aware. */
export function suiteInclusions(): string[] {
  return i18n.t('booking.suiteModal.inclusionItems', { returnObjects: true, defaultValue: SUITE_INCLUSIONS_EN }) as string[];
}

/** Suite names that denote a larger residence/penthouse with separate living + sleeping zones. */
const LARGER_RESIDENCE = /residence|penthouse|owner/i;

/**
 * One or two original sentences describing a suite by name, generic enough to
 * read well for any tier. Larger residences/penthouses get a second sentence
 * noting their separate living and sleeping areas. Locale-aware: the {{name}}
 * (a proper noun) is interpolated into the active-language template.
 */
export function suiteOverview(name: string): string {
  const key = LARGER_RESIDENCE.test(name)
    ? 'booking.suiteModal.overviewLarger'
    : 'booking.suiteModal.overview';
  const fallback =
    `${name} is an ocean-front retreat with floor-to-ceiling windows, a private terrace ` +
    `and a calm, residential interior — designed to feel like a home at sea.` +
    (LARGER_RESIDENCE.test(name)
      ? ' As one of the larger residences, it separates the living and sleeping areas, ' +
        'so there is room to relax, dine and rest without ever feeling on top of one another.'
      : '');
  return i18n.t(key, { name, defaultValue: fallback });
}

/**
 * Suite size in m² by suite tier (resolved from the suite_category code via
 * shipAssets' suiteTierKey). Factual public Explora specifications — TOTAL size
 * incl. the private terrace, the figure Explora markets (e.g. Ocean Terrace 35 =
 * 28 m² interior + 7 m² terrace). Sourced Jun 2026 from the official suite pages
 * + cross-checked against cruisemapper's interior/terrace breakdown:
 *   - oceanTerrace 35 and owners 280 are well-confirmed (multiple sources).
 *   - residences run smallest→largest Cove 70 → Retreat 77 → Serenity 113 →
 *     Cocoon 149; penthouses Penthouse 43 → Deluxe 48 → Premier 52 → Grand 60.
 *   - refine against the partner's authoritative fact sheet if it differs.
 * Returns null for any tier with no known size, so the UI omits the line rather
 * than showing a fabricated number.
 */
const SQM_BY_TIER: Record<string, number> = {
  oceanTerrace: 35,
  oceanGrandTerrace: 39,
  cove: 70,
  cocoon: 149,
  serenity: 113,
  retreat: 77,
  penthouse: 43,
  premierPenthouse: 52,
  deluxePenthouse: 48,
  grandPenthouse: 60,
  owners: 280,
};

export function suiteSqm(suiteCode: string, tierKey?: string | null): number | null {
  const tier = tierKey ?? suiteTierKey(suiteCode);
  return tier ? SQM_BY_TIER[tier] ?? null : null;
}
