/**
 * Single source of truth for the eleven Explora cruising regions.
 *
 * Shared by BOTH the home "Our Destinations" row (src/components/home/DestinationsRow.tsx)
 * and the /destinations "All Destinations" atlas index (grouped by ocean). Keeping the
 * region list, labels, imagery assets and grouping in one module means the two surfaces
 * can never drift apart.
 */

export interface DestinationRegion {
  slug: string;
  labelKey: string;
  asset: string;
  /** A representative photographed port (same harvested set the package cards use,
   *  src/data/portImages.generated.json) — a real photo of a place in the region.
   *  Falls back to the `asset` placeholder ladder when absent. */
  port?: string;
}

/** The eleven regions, in canonical display order. */
export const DESTINATION_REGIONS: DestinationRegion[] = [
  { slug: 'mediterranean', labelKey: 'mega.destinations.regions.mediterranean', asset: 'explora/placeholder/destination-mediterranean', port: 'ESBCN' },
  { slug: 'caribbean', labelKey: 'mega.destinations.regions.caribbean', asset: 'explora/placeholder/destination-caribbean', port: 'USMIA' },
  { slug: 'alaska', labelKey: 'mega.destinations.regions.alaska', asset: 'explora/placeholder/destination-alaska', port: 'USJNU' },
  { slug: 'asia', labelKey: 'mega.destinations.regions.asia', asset: 'explora/placeholder/destination-asia', port: 'JPTYO' },
  { slug: 'northern-europe', labelKey: 'mega.destinations.regions.northernEurope', asset: 'explora/placeholder/destination-northern-europe', port: 'DKCPH' },
  { slug: 'transatlantic', labelKey: 'mega.destinations.regions.transatlantic', asset: 'explora/placeholder/destination-transatlantic', port: 'USNYC' },
  { slug: 'arabian', labelKey: 'mega.destinations.regions.arabian', asset: 'explora/placeholder/destination-arabian', port: 'AEDXB' },
  { slug: 'south-america', labelKey: 'mega.destinations.regions.southAmerica', asset: 'explora/placeholder/destination-south-america', port: 'BRMAO' },
  { slug: 'pacific-coast', labelKey: 'mega.destinations.regions.pacificCoast', asset: 'explora/placeholder/destination-pacific-coast', port: 'USSFO' },
  { slug: 'canada-new-england', labelKey: 'mega.destinations.regions.canadaNewEngland', asset: 'explora/placeholder/destination-canada-new-england', port: 'CAQUE' },
  // World Journey is not a single place — keep its curated global placeholder (no port).
  { slug: 'world-journey', labelKey: 'mega.destinations.regions.worldJourney', asset: 'explora/placeholder/destination-world-journey' },
];

export interface RegionGroup {
  labelKey: string;
  slugs: string[];
}

/**
 * The atlas grouping for the /destinations index — regions gathered by ocean / theme.
 * Order matters: groups render top-to-bottom in this sequence.
 */
export const REGION_GROUPS: RegionGroup[] = [
  { labelKey: 'destination.index.groups.mediterraneanEurope', slugs: ['mediterranean', 'northern-europe'] },
  { labelKey: 'destination.index.groups.americas', slugs: ['caribbean', 'canada-new-england', 'pacific-coast', 'south-america', 'alaska'] },
  { labelKey: 'destination.index.groups.asiaArabia', slugs: ['asia', 'arabian'] },
  { labelKey: 'destination.index.groups.grandVoyages', slugs: ['transatlantic', 'world-journey'] },
];
