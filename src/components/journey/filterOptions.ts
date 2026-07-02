import type { JourneySort } from '@/lib/api';
import { HIDDEN_SHIP_CDS } from '@/data/shipVisibility';

/**
 * Shared option lists for the journey filter bar — used by both the Find-a-Journey
 * page and the hero SearchWidget so the two stay in lock-step. Region labels are
 * i18n keys (resolved at render); ship/sort labels are brand-fixed strings.
 */

export const REGIONS: Array<{ value: string; labelKey: string }> = [
  { value: '', labelKey: 'common.viewAll' },
  { value: 'mediterranean', labelKey: 'mega.destinations.regions.mediterranean' },
  { value: 'caribbean', labelKey: 'mega.destinations.regions.caribbean' },
  { value: 'alaska', labelKey: 'mega.destinations.regions.alaska' },
  { value: 'asia', labelKey: 'mega.destinations.regions.asia' },
  { value: 'northern-europe', labelKey: 'mega.destinations.regions.northernEurope' },
  { value: 'transatlantic', labelKey: 'mega.destinations.regions.transatlantic' },
  { value: 'arabian', labelKey: 'mega.destinations.regions.arabian' },
  { value: 'south-america', labelKey: 'mega.destinations.regions.southAmerica' },
  { value: 'pacific-coast', labelKey: 'mega.destinations.regions.pacificCoast' },
  { value: 'canada-new-england', labelKey: 'mega.destinations.regions.canadaNewEngland' },
  { value: 'world-journey', labelKey: 'mega.destinations.regions.worldJourney' },
];

// Ships not yet launched (EP05/EP06) are filtered out via shipVisibility; the full
// list stays here so re-enabling is just emptying HIDDEN_SHIP_CDS.
const ALL_SHIP_OPTIONS = [
  { value: '', label: 'Any ship' },
  { value: 'EP01', label: 'EXPLORA I' },
  { value: 'EP02', label: 'EXPLORA II' },
  { value: 'EP03', label: 'EXPLORA III' },
  { value: 'EP04', label: 'EXPLORA IV' },
  { value: 'EP05', label: 'EXPLORA V' },
  { value: 'EP06', label: 'EXPLORA VI' },
];

export const SHIP_OPTIONS = ALL_SHIP_OPTIONS.filter((o) => !HIDDEN_SHIP_CDS.includes(o.value));

// Price low→high is FIRST so it is the default/neutral sort (FilterSelect treats
// options[0] as the neutral value): a fresh search shows cheapest sailings first.
// Labels are i18n keys (resolved at the consuming sites via t(labelKey)).
export const SORT_OPTIONS: Array<{ value: JourneySort; labelKey: string }> = [
  { value: 'price-asc', labelKey: 'filters.sort.priceAsc' },
  { value: 'price-desc', labelKey: 'filters.sort.priceDesc' },
  { value: 'date', labelKey: 'filters.sort.date' },
  { value: 'nights-asc', labelKey: 'filters.sort.nightsAsc' },
  { value: 'nights-desc', labelKey: 'filters.sort.nightsDesc' },
];

/** The default sort applied when none is chosen — cheapest sailing first. */
export const DEFAULT_SORT = 'price-asc' as const;

/**
 * Narrow a static option list to the values the FACETED endpoint reports as still
 * available for the current selections, always keeping the neutral ('') option and
 * the currently-selected value so a user's own choice never disappears from its
 * own dropdown. `available` undefined (facets not yet loaded / old server) ⇒ all.
 * Shared by the hero SearchWidget and the Find-a-Journey filter bar.
 */
export function narrowOptions<T extends { value: string }>(
  all: T[],
  available: string[] | undefined,
  selected: string,
): T[] {
  if (!available) return all;
  const set = new Set(available);
  return all.filter((o) => o.value === '' || set.has(o.value) || o.value === selected);
}
