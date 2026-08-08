/**
 * The ENTITY-TYPE registry — what a "ship" or a "destination" is, as data.
 *
 * This is what turns the closed `ShipCode` / `RegionKey` TypeScript unions (each
 * duplicated by hand across 5-7 files) into rows an admin can create. Same three
 * jobs as sectionTypes.ts: it drives the admin form, it's the server-side write
 * allowlist, and it's shared verbatim by the client and server bundles.
 *
 * Deliberate simplification: an entity's whole content lives in ONE jsonb column
 * (`site_entities.fields`), reusing the section field vocabulary — including
 * nested `cards` for galleries and suite tiers. That keeps a ship atomic (one
 * row, one save, no joins) and adds zero new endpoints. The `entity_media` /
 * `ship_suite_tiers` tables exist for the day a gallery outgrows jsonb; nothing
 * reads them yet.
 *
 * Entities do NOT have draft/publish. Edits save immediately (like media assets
 * or users); `visible` is the launch gate that decides whether the public site
 * shows the entity at all. Sections are the thing that stages — see sectionTypes.
 */

import type { SectionField, PageKey } from './sectionTypes';

export interface EntityMediaGroup {
  key: string;
  label: string;
}

export interface EntityTypeDef {
  kind: string;
  /** Plural, for headings and tabs. */
  label: string;
  labelSingular: string;
  /** Public route base — `${routeBase}/${slug}`. */
  routeBase: string;
  /** Which page_sections page_key holds this entity's detail-page sections. */
  detailPageKey: PageKey;
  /** Optional grouping vocabulary offered as suggestions (free text, not closed). */
  groupOptions?: Array<{ value: string; label: string }>;
  fields: SectionField[];
  helpText?: string;
}

// ── Shared fragments ─────────────────────────────────────────────────────────

const img = (key: string, label: string, w: number, h: number, note?: string): SectionField =>
  ({ key, type: 'image', label, bilingual: false, imageSlot: { w, h, note } });

const plainMono = (key: string, label: string, help?: string): SectionField =>
  ({ key, type: 'plain', label, bilingual: false, help });

// ── Ship ─────────────────────────────────────────────────────────────────────

const SHIP_FIELDS: SectionField[] = [
  img('heroImage', 'Hero image', 1920, 1080, 'full-bleed banner'),
  img('previewImage', 'Card image', 800, 500, '16:10 — used in fleet grids'),
  plainMono('numeral', 'Numeral', 'The roman numeral shown large in the hero, e.g. "IV".'),
  { key: 'launchYear', type: 'number', label: 'Launch year' },
  {
    key: 'status', type: 'select', label: 'Status',
    options: [
      { value: 'in-service', label: 'In service' },
      { value: 'launching', label: 'Launching soon' },
      { value: 'coming-soon', label: 'Coming soon' },
    ],
  },
  plainMono('shipCd', 'Catalogue code', 'Links this ship to real sailings, e.g. EP01. Leave blank if it has none yet.'),
  { key: 'tagline', type: 'rich', label: 'Tagline', help: 'Shown in the dark band under the hero. Blank uses the shared fleet tagline.' },

  // The five headline numbers. Named fields, not a positional array — the old
  // specValues[5] had to stay in lockstep with the shared i18n labels by hand.
  plainMono('specSuites', 'Spec — ocean-front suites'),
  plainMono('specPools', 'Spec — heated pools'),
  plainMono('specRestaurants', 'Spec — restaurants'),
  plainMono('specBars', 'Spec — bars & lounges'),
  plainMono('specRatio', 'Spec — guest-to-host ratio'),

  plainMono('godmotherName', 'Godmother — name', 'Leave blank until announced; the whole section then hides itself.'),
  { key: 'godmotherBio', type: 'rich', label: 'Godmother — biography' },
  img('godmotherImage', 'Godmother — portrait', 880, 1100, 'portrait 4:5'),

  {
    key: 'exteriorPhotos', type: 'cards', label: 'Exterior photos', maxItems: 24,
    itemFields: [img('image', 'Photo', 1400, 900)],
  },
  {
    key: 'onboardVenues', type: 'cards', label: 'Onboard spaces', maxItems: 40,
    help: 'The venue carousel, and the images reused by the “Life on board” grid.',
    itemFields: [
      img('image', 'Photo', 1200, 800),
      { key: 'name', type: 'plain', label: 'Venue name' },
    ],
  },
  {
    key: 'deckPlans', type: 'cards', label: 'Deck plans', maxItems: 30,
    itemFields: [
      plainMono('deck', 'Deck number'),
      img('image', 'Plan', 1600, 900, 'wide'),
    ],
  },
  {
    key: 'suiteTiers', type: 'cards', label: 'Suite tiers', maxItems: 20,
    help: 'Each tier carries its own name, tagline and photo set.',
    itemFields: [
      plainMono('tierKey', 'Reference key', 'Lowercase, no spaces — e.g. oceanTerrace.'),
      { key: 'name', type: 'plain', label: 'Tier name' },
      { key: 'tagline', type: 'plain', label: 'Tier tagline' },
      {
        key: 'photos', type: 'cards', label: 'Photos', maxItems: 20,
        itemFields: [img('image', 'Photo', 1200, 800)],
      },
    ],
  },
];

// ── Destination ──────────────────────────────────────────────────────────────

const DESTINATION_FIELDS: SectionField[] = [
  img('heroImage', 'Hero image', 1920, 1080, 'full-bleed banner'),
  img('cardImage', 'Card image', 800, 1000, 'portrait 4:5 — used in the atlas grid'),
  { key: 'tagline', type: 'rich', label: 'Tagline' },
  { key: 'intro', type: 'plain', label: 'Introduction' },
  { key: 'ashoreCulture', type: 'plain', label: 'Ashore — culture' },
  { key: 'ashoreCulinary', type: 'plain', label: 'Ashore — culinary' },
  { key: 'ashoreHistory', type: 'plain', label: 'Ashore — history' },
  { key: 'ashoreNature', type: 'plain', label: 'Ashore — nature' },
  plainMono('repPortCode', 'Representative port code', 'Used to pick the hero photo when none is set, e.g. GRJTR.'),
  {
    key: 'ports', type: 'cards', label: 'Named ports', maxItems: 30,
    help: 'The editorial port strip. The bookable ports shown on the page come live from the catalogue.',
    itemFields: [
      plainMono('code', 'Port code'),
      { key: 'name', type: 'plain', label: 'Port name' },
    ],
  },
  {
    key: 'ingestRegionNames', type: 'list', label: 'Feed region labels', bilingual: false,
    help: 'How this region is named in the pricing feed. Needed before its sailings can be filtered by region.',
  },
];

export const ENTITY_TYPES: EntityTypeDef[] = [
  {
    kind: 'ship',
    label: 'Ships',
    labelSingular: 'Ship',
    routeBase: '/ships',
    detailPageKey: 'ship-detail',
    fields: SHIP_FIELDS,
    helpText: 'Each ship has its own detail page, built from sections under Pages → Ships — detail.',
  },
  {
    kind: 'destination',
    label: 'Destinations',
    labelSingular: 'Destination',
    routeBase: '/destinations',
    detailPageKey: 'destination-detail',
    groupOptions: [
      { value: 'mediterraneanEurope', label: 'Mediterranean & Europe' },
      { value: 'americas', label: 'The Americas' },
      { value: 'asiaArabia', label: 'Asia & Arabia' },
      { value: 'grandVoyages', label: 'Grand Voyages' },
    ],
    fields: DESTINATION_FIELDS,
    helpText: 'Adding a destination here creates its page. Its sailings also need a feed region label (below) before they can be filtered.',
  },
];

const BY_KIND = new Map(ENTITY_TYPES.map((e) => [e.kind, e]));

export function entityTypeDef(kind: string): EntityTypeDef | undefined {
  return BY_KIND.get(kind);
}

export function isKnownEntityKind(kind: string): boolean {
  return BY_KIND.has(kind);
}

/** The entity kind a page's sections hang off, or undefined for singleton pages. */
export function entityKindForPage(pageKey: string): string | undefined {
  return ENTITY_TYPES.find((e) => e.detailPageKey === pageKey)?.kind;
}

// ── The shape the client renders from ────────────────────────────────────────

export interface PublicEntity {
  slug: string;
  kind: string;
  nameEn: string;
  nameEl: string;
  groupKey: string | null;
  position: number;
  fields: Record<string, unknown>;
}

/** Locale-resolved display name. */
export function entityName(e: Pick<PublicEntity, 'nameEn' | 'nameEl'>, locale: string): string {
  return (locale === 'el' ? e.nameEl : e.nameEn) || e.nameEn || e.nameEl || '';
}
