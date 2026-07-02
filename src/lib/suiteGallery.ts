/**
 * Shared, pure (no-React) contract for the suite-page redesign.
 *
 * Everything the per-tier suite page renders is derived here from existing
 * sources of truth:
 *   - the 11 cabin tiers + their REAL photo arrays  → src/lib/shipAssets.ts
 *   - factual suite sizes (m²)                       → src/data/suiteDetails.ts (SQM_BY_TIER, re-derived locally)
 *   - canonical suite display names                  → src/lib/bookingUI.ts (SUITE_LABELS via suiteLabel)
 *   - physical berths (2 vs 4)                        → src/lib/bookingUI.ts (suiteBerths)
 *
 * No copy lives here — editorial text is in src/data/suiteContent.ts.
 */

import { SHIP_ASSETS, type TierKey } from '@/lib/shipAssets';
import { suiteLabel, suiteBerths } from '@/lib/bookingUI';

/**
 * The 11 tiers in showcase order — grandest first, easing down to the entry
 * Ocean Terrace suite. Ordered (not the union's declaration order) so callers
 * can map straight to a sensible grid / carousel without re-sorting.
 */
export const SUITE_TIER_KEYS: TierKey[] = [
  'owners',
  'grandPenthouse',
  'premierPenthouse',
  'deluxePenthouse',
  'penthouse',
  'oceanGrandTerrace',
  'cove',
  'retreat',
  'serenity',
  'cocoon',
  'oceanTerrace',
];

/**
 * A representative suite_category code for each tier, used to derive the
 * canonical display name (suiteLabel) and the physical berth count
 * (suiteBerths). Codes are real flatfile suite_category values — see
 * SUITE_LABELS / SUITE_TIER. Picking one code per tier keeps name + berths
 * factual and in lock-step with the booking flow.
 */
const REPRESENTATIVE_CODE: Record<TierKey, string> = {
  owners: 'OR',
  grandPenthouse: 'GP',
  premierPenthouse: 'PP',
  deluxePenthouse: 'DP',
  penthouse: 'PH',
  oceanGrandTerrace: 'GT',
  cove: 'CO',
  retreat: 'RR',
  serenity: 'SR',
  cocoon: 'CR',
  oceanTerrace: 'OT1',
};

/** Suite size in m² by tier — factual public Explora specifications. Mirrors
 *  suiteDetails.ts:SQM_BY_TIER (kept local so this module stays pure and does
 *  not import the React-adjacent suiteDetails surface). `null` where unknown. */
const SQM_BY_TIER: Record<TierKey, number | null> = {
  owners: 280,
  grandPenthouse: 78,
  premierPenthouse: 70,
  deluxePenthouse: 74,
  penthouse: 66,
  oceanGrandTerrace: 43,
  cove: 70,
  retreat: 70,
  serenity: 70,
  cocoon: 70,
  oceanTerrace: 35,
};

export interface SuiteTier {
  key: TierKey;
  /** Canonical suite name, e.g. "Owner's Residence", "Ocean Terrace Suite". */
  label: string;
  /** Floor area in m², or null when no confirmed figure exists. */
  sqm: number | null;
  /** Physical berths the suite sleeps (Ocean/Grand Terrace = 2, else 4). */
  berths: number;
}

/** The 11 tiers as fully-resolved cards, in showcase order. */
export const SUITE_TIERS: SuiteTier[] = SUITE_TIER_KEYS.map((key) => {
  const code = REPRESENTATIVE_CODE[key];
  return {
    key,
    label: suiteLabel(code),
    sqm: SQM_BY_TIER[key] ?? null,
    berths: suiteBerths(code),
  };
});

/** SUITE_TIERS indexed by key, for O(1) lookups. */
const TIER_BY_KEY: Record<TierKey, SuiteTier> = SUITE_TIERS.reduce(
  (acc, t) => {
    acc[t.key] = t;
    return acc;
  },
  {} as Record<TierKey, SuiteTier>,
);

/** The resolved {label, sqm, berths} for a tier. */
export function suiteTier(key: TierKey): SuiteTier {
  return TIER_BY_KEY[key];
}

/**
 * The richest REAL photo gallery for a tier: across all six ships, take the
 * `cabins[key]` array that is LONGEST, dedupe by path, and return it. Returns
 * [] when no ship has any photos for the tier (caller falls back to a
 * placeholder via tierHero).
 *
 * 6–10 paths typical, e.g. '/photos/explora_3/Cabins/owners_residences/…webp'.
 */
export function tierGallery(key: TierKey): string[] {
  let longest: string[] = [];
  for (const ship of Object.values(SHIP_ASSETS)) {
    const arr = ship.cabins[key];
    if (arr && arr.length > longest.length) longest = arr;
  }
  // Dedupe by path, preserving order.
  return [...new Set(longest)];
}

/**
 * The hero photo for a tier — the first gallery image, or a deterministic
 * placeholder id (resolved by imageUrl's placeholder registry) when the tier
 * has no photography yet.
 */
export function tierHero(key: TierKey): string {
  const gallery = tierGallery(key);
  return gallery[0] ?? `explora/placeholder/suite-${key}`;
}

/** Lowercased set of valid TierKeys, for tolerant slug matching. */
const LOWER_KEY_TO_TIER: Record<string, TierKey> = SUITE_TIER_KEYS.reduce(
  (acc, key) => {
    acc[key.toLowerCase()] = key;
    return acc;
  },
  {} as Record<string, TierKey>,
);

/**
 * Resolve a route slug to a TierKey, tolerantly:
 *   - exact camelCase key            ('grandPenthouse')      → 'grandPenthouse'
 *   - lowercased / kebab / spaced     ('grand-penthouse', 'GRAND PENTHOUSE',
 *                                       'oceanterrace')        → matching key
 * Returns null for 'overview', '', or any non-tier value (caller shows the
 * overview page instead).
 */
export function suiteTierFromSlug(slug: string | undefined): TierKey | null {
  if (!slug) return null;
  // Exact key match first (fast path for the camelCase canonical slug).
  if ((SUITE_TIER_KEYS as string[]).includes(slug)) return slug as TierKey;
  // Normalise: strip non-alphanumerics (kebab, spaces, underscores) and lowercase.
  const normalised = slug.toLowerCase().replace(/[^a-z0-9]/g, '');
  return LOWER_KEY_TO_TIER[normalised] ?? null;
}
