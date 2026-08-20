/**
 * Shared occupancy rules for the booking party. The guest-count steppers (now in
 * the booking summary rail) and the Step 2 guest-detail form both derive from
 * these, so the visible rows, the validation, and the sidebar selector always
 * agree on how many of each guest type are allowed.
 */

// Occupancy caps now live in the shared pricing module, so the server booking
// validator and these client steppers enforce identical limits (no drift).
// Imported for clampParty() below and re-exported so existing importers keep
// pulling them from here.
import {
  MAX_GUESTS, ADULTS_MIN, ADULTS_MAX, CHILDREN_MIN, CHILDREN_MAX, INFANTS_MIN, INFANTS_MAX,
} from '@lib/pricing';
export { MAX_GUESTS, ADULTS_MIN, ADULTS_MAX, CHILDREN_MIN, CHILDREN_MAX, INFANTS_MIN, INFANTS_MAX };

export const ADULT_BAND = '18+ years';
export const CHILD_BAND = '2–17 years';
export const INFANT_BAND = 'Under 2';

export interface Party {
  adults: number;
  children: number;
  infants: number;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

/**
 * Coerce a possibly-partial/legacy selection into a valid party (defaults 2/0/0),
 * clamped per category AND to the cabin's max occupancy (`maxOcc`, default 4). If
 * the total exceeds the cap, trim infants → children → extra adults (keep ≥1 adult)
 * — so a 4-guest party picked on one suite collapses cleanly onto a 2-berth suite.
 */
export function clampParty(
  p: { adults?: number; children?: number; infants?: number },
  maxOcc: number = MAX_GUESTS,
): Party {
  let adults = clamp(p.adults ?? 2, ADULTS_MIN, ADULTS_MAX);
  let children = clamp(p.children ?? 0, CHILDREN_MIN, CHILDREN_MAX);
  let infants = clamp(p.infants ?? 0, INFANTS_MIN, INFANTS_MAX);
  const cap = Math.max(ADULTS_MIN, Math.min(maxOcc, MAX_GUESTS));
  let total = adults + children + infants;
  while (total > cap && infants > 0) { infants--; total--; }
  while (total > cap && children > 0) { children--; total--; }
  while (total > cap && adults > ADULTS_MIN) { adults--; total--; }
  return { adults, children, infants };
}
