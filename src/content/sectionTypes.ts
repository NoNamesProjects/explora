/**
 * The SECTION-TYPE registry — Tier B of the CMS (see lib/db/schema.sql).
 *
 * `src/content/registry.ts` (Tier A) allowlists a fixed set of flat leaf fields.
 * This file does the same job one level up: it declares the section TYPES a page
 * can be built from, and the field shape each type's config carries. It is
 * simultaneously
 *   1. the admin editor's form description (one control per field), and
 *   2. the server-side WRITE ALLOWLIST — api/admin/sections.ts refuses a
 *      section_type that isn't here and strips any config key that isn't a
 *      declared field (see lib/content-sanitize.ts sanitizeSectionConfig).
 *
 * The load-bearing property: adding a section INSTANCE is a database write (no
 * deploy); adding a section TYPE is a code change here + a matching renderer in
 * src/components/sections/registry.tsx. That split is deliberate — see the
 * design report for why fully no-code section types are out of scope.
 *
 * Keep this file dependency-free: it is imported by BOTH the client bundle and
 * the esbuild-bundled server handlers (same trick registry.ts already uses).
 */

// ── Field vocabulary ─────────────────────────────────────────────────────────

export type SectionFieldType =
  | 'plain'   // one-line/multi-line string
  | 'rich'    // RichDoc (styled spans) — the "graphic style letters" control
  | 'image'   // { src, alt? }
  | 'number'
  | 'list'    // string[]
  | 'link'    // a URL — scheme-validated on write, NEVER use 'plain' for an href
  | 'button'  // { labelEn, labelEl, href, style }
  | 'select'  // one of `options`
  | 'toggle'  // boolean
  | 'cards';  // repeating group described by `itemFields`

/**
 * A button value. Deliberately NOT locale-wrapped as a whole: only the label
 * differs per language, so wrapping the object would duplicate (and let drift)
 * the href and style across locales.
 */
export interface ButtonValue {
  labelEn?: string;
  labelEl?: string;
  href?: string;
  style?: string;
}

/** Declared display shape for an image slot, so the picker can warn on mismatch. */
export interface ImageSlot {
  w: number;
  h: number;
  /** Human note shown under the picker, e.g. "full-bleed banner". */
  note?: string;
}

export interface SectionField {
  key: string;
  type: SectionFieldType;
  label: string;
  /** Values stored as { en, el }. Defaults by type — see fieldIsBilingual(). */
  bilingual?: boolean;
  help?: string;
  /** select only */
  options?: Array<{ value: string; label: string }>;
  /** cards only — the shape of ONE repeated item. */
  itemFields?: SectionField[];
  /** cards / list only */
  maxItems?: number;
  /** image only */
  imageSlot?: ImageSlot;
}

export type PageKey =
  | 'home'
  | 'ships-index'
  | 'ship-detail'
  | 'destinations-index'
  | 'destination-detail';

export const PAGE_KEYS: Array<{ key: PageKey; label: string; entityKind?: string }> = [
  { key: 'home', label: 'Home' },
  { key: 'ships-index', label: 'Ships — index' },
  { key: 'ship-detail', label: 'Ships — detail', entityKind: 'ship' },
  { key: 'destinations-index', label: 'Destinations — index' },
  { key: 'destination-detail', label: 'Destinations — detail', entityKind: 'destination' },
];

/**
 * How much of a section the admin actually owns:
 *  - freeform    — every word and image is theirs; add as many as they like
 *  - structural  — the BODY is live data (journeys, facets, computed lists) and
 *                  must stay truthful, so only the surrounding chrome is editable
 *  - entity-bound— the body comes from the entity's own galleries/facts
 */
export type SectionNature = 'freeform' | 'structural' | 'entity-bound';

export interface SectionTypeDef {
  type: string;
  label: string;
  description?: string;
  nature: SectionNature;
  scope: PageKey[];
  fields: SectionField[];
  defaultConfig: () => Record<string, unknown>;
  /** Contributes an anchor to auto-generated sub-navs when set. */
  anchor?: string;
  /** i18n key for that anchor's nav label (falls back to `label`). */
  navLabelKey?: string;
  /**
   * Some sections render nothing for a given entity (a ship with no announced
   * godmother). Returning true here keeps them out of the sub-nav too, so the
   * nav can never point at an anchor that isn't on the page.
   */
  hidesWhenEmpty?: (entityFields: Record<string, unknown>) => boolean;
  /** Cap instances per page (a page can only hold one hero). */
  maxPerPage?: number;
}

// ── Shared field fragments ───────────────────────────────────────────────────

const TONE_OPTIONS = [
  { value: 'cream', label: 'Cream' },
  { value: 'cream-soft', label: 'Cream (soft)' },
  { value: 'ink', label: 'Navy (dark)' },
];

const tone = (): SectionField => ({
  key: 'tone',
  type: 'select',
  label: 'Background',
  options: TONE_OPTIONS,
  help: 'Sections usually alternate cream / cream-soft down the page.',
});

const align = (): SectionField => ({
  key: 'align',
  type: 'select',
  label: 'Alignment',
  options: [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Centred' },
  ],
});

const eyebrow = (): SectionField => ({
  key: 'eyebrow',
  type: 'plain',
  label: 'Eyebrow',
  help: 'The small uppercase label above the heading.',
});

const heading = (): SectionField => ({ key: 'heading', type: 'rich', label: 'Heading' });
const intro = (): SectionField => ({ key: 'intro', type: 'plain', label: 'Intro paragraph' });

/** One card inside a cards-grid. */
const CARD_ITEM_FIELDS: SectionField[] = [
  { key: 'image', type: 'image', label: 'Image', bilingual: false, imageSlot: { w: 760, h: 1013, note: 'portrait 3:4' } },
  { key: 'title', type: 'plain', label: 'Title' },
  { key: 'body', type: 'plain', label: 'Body' },
  { key: 'href', type: 'link', label: 'Link', bilingual: false, help: '/a-page or https://…  — leave blank for a non-clickable card.' },
  { key: 'ctaLabel', type: 'plain', label: 'Link label', help: 'Defaults to "Explore" when blank.' },
];

// ── The registry ─────────────────────────────────────────────────────────────

const ALL_PAGES: PageKey[] = [
  'home', 'ships-index', 'ship-detail', 'destinations-index', 'destination-detail',
];

export const SECTION_TYPES: SectionTypeDef[] = [
  // ═══ Freeform: the building blocks an admin can add anywhere ═══════════════
  {
    type: 'hero',
    label: 'Hero banner',
    description: 'Full-height photo with an overlaid headline. One per page.',
    nature: 'freeform',
    scope: ALL_PAGES,
    maxPerPage: 1,
    fields: [
      { key: 'image', type: 'image', label: 'Background image', bilingual: false, imageSlot: { w: 1920, h: 1200, note: 'wide, full-bleed' } },
      eyebrow(),
      { key: 'tagline', type: 'rich', label: 'Headline' },
      { key: 'subtitle', type: 'plain', label: 'Sub-line' },
      { key: 'primaryCta', type: 'button', label: 'Primary button' },
      { key: 'secondaryCta', type: 'button', label: 'Secondary button' },
      {
        key: 'height', type: 'select', label: 'Height',
        options: [
          { value: 'tall', label: 'Tall (full screen)' },
          { value: 'medium', label: 'Medium' },
          { value: 'short', label: 'Short' },
        ],
      },
      { key: 'showSearch', type: 'toggle', label: 'Show the journey search bar', bilingual: false },
    ],
    defaultConfig: () => ({ height: 'medium', showSearch: false }),
  },
  {
    type: 'rich-text',
    label: 'Text block',
    description: 'A heading and body copy. The plain workhorse section.',
    nature: 'freeform',
    scope: ALL_PAGES,
    fields: [eyebrow(), heading(), { key: 'body', type: 'rich', label: 'Body' }, align(), tone()],
    defaultConfig: () => ({ align: 'center', tone: 'cream' }),
  },
  {
    type: 'cards-grid',
    label: 'Cards grid',
    description: 'A heading over a row of photo cards. Add as many cards as you like.',
    nature: 'freeform',
    scope: ALL_PAGES,
    fields: [
      eyebrow(),
      heading(),
      intro(),
      { key: 'cards', type: 'cards', label: 'Cards', itemFields: CARD_ITEM_FIELDS, maxItems: 24 },
      {
        key: 'columns', type: 'select', label: 'Columns',
        options: [
          { value: '2', label: '2 across' },
          { value: '3', label: '3 across' },
          { value: '4', label: '4 across' },
        ],
      },
      {
        key: 'cardStyle', type: 'select', label: 'Card style',
        options: [
          { value: 'overlay', label: 'Text over the photo' },
          { value: 'below', label: 'Text under the photo' },
        ],
      },
      tone(),
    ],
    defaultConfig: () => ({ columns: '3', cardStyle: 'overlay', tone: 'cream', cards: [] }),
  },
  {
    type: 'image-banner',
    label: 'Image + text',
    description: 'A photo beside a block of copy, with an optional button.',
    nature: 'freeform',
    scope: ALL_PAGES,
    fields: [
      { key: 'image', type: 'image', label: 'Image', bilingual: false, imageSlot: { w: 880, h: 1100, note: 'portrait 4:5' } },
      eyebrow(),
      heading(),
      { key: 'body', type: 'rich', label: 'Body' },
      { key: 'cta', type: 'button', label: 'Button' },
      {
        key: 'layout', type: 'select', label: 'Image position',
        options: [
          { value: 'left', label: 'Image on the left' },
          { value: 'right', label: 'Image on the right' },
        ],
      },
      tone(),
    ],
    defaultConfig: () => ({ layout: 'left', tone: 'cream' }),
  },
  {
    type: 'checklist-band',
    label: 'Inclusions list',
    description: 'A ticked list beside a photo — used for "All journeys include".',
    nature: 'freeform',
    scope: ALL_PAGES,
    fields: [
      eyebrow(),
      heading(),
      { key: 'items', type: 'list', label: 'List items', maxItems: 40, help: 'One per line.' },
      { key: 'note', type: 'plain', label: 'Footnote' },
      { key: 'image', type: 'image', label: 'Photo', bilingual: false, imageSlot: { w: 760, h: 950, note: 'portrait 4:5' } },
      tone(),
    ],
    defaultConfig: () => ({ tone: 'cream-soft', items: [] }),
  },
  {
    type: 'cta-band',
    label: 'Call-to-action band',
    description: 'A short invitation with one or two buttons.',
    nature: 'freeform',
    scope: ALL_PAGES,
    fields: [
      eyebrow(),
      heading(),
      { key: 'body', type: 'plain', label: 'Body' },
      { key: 'primaryCta', type: 'button', label: 'Primary button' },
      { key: 'secondaryCta', type: 'button', label: 'Secondary button' },
      tone(),
    ],
    defaultConfig: () => ({ tone: 'ink' }),
  },
  {
    type: 'video',
    label: 'Video',
    description: 'A click-to-play YouTube film with a poster image.',
    nature: 'freeform',
    scope: ALL_PAGES,
    fields: [
      eyebrow(),
      { key: 'title', type: 'rich', label: 'Title' },
      { key: 'videoId', type: 'plain', label: 'YouTube video ID', bilingual: false, help: 'The part after v= in the URL, e.g. Zi5FES_5OSc' },
      { key: 'poster', type: 'image', label: 'Poster image', bilingual: false, imageSlot: { w: 1600, h: 900, note: '16:9' }, help: 'Blank uses YouTube’s own thumbnail.' },
      tone(),
    ],
    defaultConfig: () => ({ tone: 'cream' }),
  },
  {
    type: 'newsletter-band',
    label: 'Newsletter sign-up',
    description: 'The subscribe form with your own heading and copy.',
    nature: 'freeform',
    scope: ALL_PAGES,
    maxPerPage: 1,
    fields: [heading(), { key: 'body', type: 'plain', label: 'Body' }, tone()],
    defaultConfig: () => ({ tone: 'ink' }),
  },

  // ═══ Structural: live data, only the chrome is editable ═══════════════════
  {
    type: 'packages-teaser',
    label: 'Featured voyages (live)',
    description: 'Three real sailings pulled live from the catalogue. Only the heading is editable.',
    nature: 'structural',
    scope: ['home', 'destinations-index', 'ships-index'],
    maxPerPage: 1,
    fields: [
      eyebrow(),
      { key: 'titleLead', type: 'plain', label: 'Title lead-in' },
      heading(),
      intro(),
      { key: 'ctaLabel', type: 'plain', label: 'View-all link label' },
      { key: 'ctaHref', type: 'link', label: 'View-all link', bilingual: false },
      tone(),
    ],
    defaultConfig: () => ({ tone: 'cream', ctaHref: '/find-your-journey' }),
  },
  {
    type: 'destinations-row',
    label: 'Destinations carousel (live)',
    description: 'A scrolling row of every published destination. Only the heading is editable.',
    nature: 'structural',
    scope: ['home', 'ships-index', 'ship-detail'],
    maxPerPage: 1,
    fields: [
      heading(),
      intro(),
      { key: 'ctaLabel', type: 'plain', label: 'View-all link label' },
      tone(),
    ],
    defaultConfig: () => ({ tone: 'cream' }),
  },

  // ═══ Ship pages — content comes from the ship record, not this config ══════
  // These render the existing interactive widgets. The admin controls order,
  // visibility and the surrounding heading; the photos/specs/tiers live on the
  // ship itself (Entities → Ships), because they belong to the ship, not a page.
  {
    type: 'ship-hero',
    label: 'Ship hero',
    description: 'The cinematic hero, using this ship’s own photo, numeral and status.',
    nature: 'entity-bound',
    scope: ['ship-detail'],
    maxPerPage: 1,
    fields: [
      { key: 'image', type: 'image', label: 'Override image', bilingual: false, imageSlot: { w: 1920, h: 1080, note: 'blank uses the ship’s hero' } },
    ],
    defaultConfig: () => ({}),
  },
  {
    type: 'ship-tagline',
    label: 'Ship tagline band',
    description: 'The dark statement band. Blank uses the shared fleet tagline.',
    nature: 'entity-bound',
    scope: ['ship-detail'],
    maxPerPage: 1,
    fields: [heading()],
    defaultConfig: () => ({}),
  },
  {
    type: 'venue-carousel',
    label: 'Onboard spaces carousel',
    description: 'The venue carousel, from this ship’s onboard photos.',
    nature: 'entity-bound',
    scope: ['ship-detail'],
    anchor: 'venues',
    navLabelKey: 'ship.subNav.onBoard',
    maxPerPage: 1,
    fields: [eyebrow(), heading()],
    defaultConfig: () => ({}),
  },
  {
    type: 'spec-band',
    label: 'Specifications band',
    description: 'The five headline numbers, from this ship’s record.',
    nature: 'entity-bound',
    scope: ['ship-detail'],
    maxPerPage: 1,
    fields: [eyebrow()],
    defaultConfig: () => ({}),
  },
  {
    type: 'suite-tier-carousel',
    label: 'Suite tiers carousel',
    description: 'The suite tiers and their photo sets, from this ship’s record.',
    nature: 'entity-bound',
    scope: ['ship-detail'],
    anchor: 'suites',
    navLabelKey: 'ship.subNav.suites',
    maxPerPage: 1,
    fields: [eyebrow(), heading(), intro()],
    defaultConfig: () => ({}),
  },
  {
    type: 'deck-plan-switcher',
    label: 'Deck plans',
    description: 'The deck switcher and facility legend, from this ship’s deck plans.',
    nature: 'entity-bound',
    scope: ['ship-detail'],
    anchor: 'decks',
    navLabelKey: 'ship.subNav.deckPlans',
    maxPerPage: 1,
    fields: [eyebrow(), heading(), intro()],
    defaultConfig: () => ({}),
  },
  {
    type: 'ship-life-onboard',
    label: 'Life on board links',
    description: 'The five experience links, illustrated with this ship’s photos.',
    nature: 'structural',
    scope: ['ship-detail'],
    anchor: 'life',
    navLabelKey: 'ship.subNav.lifeOnBoard',
    maxPerPage: 1,
    fields: [eyebrow(), heading()],
    defaultConfig: () => ({}),
  },
  {
    type: 'ship-journeys',
    label: 'Journeys with this ship (live)',
    description: 'Real sailings for this ship, pulled live from the catalogue.',
    nature: 'structural',
    scope: ['ship-detail'],
    anchor: 'journeys',
    navLabelKey: 'ship.subNav.journeys',
    maxPerPage: 1,
    fields: [],
    defaultConfig: () => ({}),
  },
  {
    type: 'ship-godmother',
    label: 'Godmother',
    description: 'Hides itself automatically until a godmother is named on the ship record.',
    nature: 'entity-bound',
    scope: ['ship-detail'],
    anchor: 'godmother',
    navLabelKey: 'ship.subNav.godmother',
    hidesWhenEmpty: (f) => !String(f.godmotherName ?? '').trim(),
    maxPerPage: 1,
    fields: [eyebrow()],
    defaultConfig: () => ({}),
  },
  {
    type: 'related-ships',
    label: 'Other ships',
    description: 'Three other published ships. The list is automatic.',
    nature: 'structural',
    scope: ['ship-detail', 'ships-index', 'home'],
    maxPerPage: 1,
    fields: [eyebrow(), heading(), tone()],
    defaultConfig: () => ({ tone: 'cream-soft' }),
  },
  {
    type: 'fleet-register',
    label: 'Fleet register',
    description: 'The full alternating-row list of every published ship.',
    nature: 'structural',
    scope: ['ships-index'],
    maxPerPage: 1,
    fields: [eyebrow(), heading(), tone()],
    defaultConfig: () => ({ tone: 'cream' }),
  },
  {
    type: 'stat-band',
    label: 'Statistics band',
    description: 'A row of big numbers with captions.',
    nature: 'freeform',
    scope: ALL_PAGES,
    fields: [
      eyebrow(),
      {
        key: 'stats', type: 'cards', label: 'Figures', maxItems: 8,
        itemFields: [
          { key: 'value', type: 'plain', label: 'Figure' },
          { key: 'label', type: 'plain', label: 'Caption' },
        ],
      },
      tone(),
    ],
    defaultConfig: () => ({ tone: 'cream-soft', stats: [] }),
  },
];

// ── Lookups ──────────────────────────────────────────────────────────────────

const BY_TYPE = new Map(SECTION_TYPES.map((t) => [t.type, t]));

export function sectionTypeDef(type: string): SectionTypeDef | undefined {
  return BY_TYPE.get(type);
}

export function isKnownSectionType(type: string): boolean {
  return BY_TYPE.has(type);
}

export function sectionTypesForPage(page: string): SectionTypeDef[] {
  return SECTION_TYPES.filter((t) => (t.scope as string[]).includes(page));
}

/**
 * Text-ish fields are per-locale by default; media / numbers / presentation
 * knobs are locale-agnostic. An explicit `bilingual` on the field always wins.
 *
 * Two deliberate exclusions:
 *  - `cards` — the ARRAY is shared across locales (adding a card must add it in
 *    both); each card's own text fields carry the per-locale values instead.
 *  - `button` — carries labelEn/labelEl internally, so href/style stay single.
 */
export function fieldIsBilingual(field: SectionField): boolean {
  if (typeof field.bilingual === 'boolean') return field.bilingual;
  switch (field.type) {
    case 'plain':
    case 'rich':
    case 'list':
      return true;
    default:
      return false;
  }
}

/** Resolve a ButtonValue's label for the active locale. */
export function buttonLabel(btn: unknown, locale: string): string {
  if (!btn || typeof btn !== 'object') return '';
  const b = btn as ButtonValue;
  const pick = locale === 'el' ? b.labelEl : b.labelEn;
  return (pick || b.labelEn || b.labelEl || '').trim();
}

/**
 * Read one field out of a stored config in the active locale.
 * Bilingual values are `{ en, el }`; anything else is stored bare. Falls back
 * EN → the other locale → undefined so a half-translated draft still renders.
 */
export function fieldValue(config: unknown, field: SectionField, locale: string): unknown {
  if (!config || typeof config !== 'object') return undefined;
  const raw = (config as Record<string, unknown>)[field.key];
  if (raw == null) return undefined;
  if (!fieldIsBilingual(field)) return raw;
  if (typeof raw !== 'object' || Array.isArray(raw)) return raw; // tolerate pre-bilingual data
  const byLocale = raw as Record<string, unknown>;
  // A bilingual wrapper always has en/el keys; anything else is a bare value
  // (e.g. an image object) that predates the field being marked bilingual.
  if (!('en' in byLocale) && !('el' in byLocale)) return raw;
  return byLocale[locale] ?? byLocale.en ?? byLocale.el ?? undefined;
}

/** Same as fieldValue but for a nested card item. */
export function itemValue(item: unknown, field: SectionField, locale: string): unknown {
  return fieldValue(item, field, locale);
}
