/**
 * The editability registry — the single source of truth for WHAT the client can
 * edit. It drives the admin editor (grouped page → section, one control per
 * `type`, EN+ΕΛ side-by-side when `bilingual`) AND allowlists writes: the write
 * handler rejects any key not present here (the arbitrary-key / prototype guard).
 *
 * `kind`:  i18n  → overlaid onto i18next (any t() call site)
 *          data  → structured src/data override (read via content())
 *          media → an image slot (read via bannerSrc()/mediaSrc())
 * To make more of the site editable, add rows here — no other code changes for
 * plain i18n keys; a `rich` key also needs its render site to use <RichText/>.
 */

export type FieldKind = 'i18n' | 'data' | 'media';
export type FieldType = 'plain' | 'rich' | 'image' | 'number' | 'list';

export interface EditableField {
  key: string;
  kind: FieldKind;
  type: FieldType;
  bilingual: boolean; // i18n/data copy = true (en + el); media/number often false
  page: string;
  section: string;
  label: string;
  help?: string;
  maxLen?: number;
}

const t = (
  key: string,
  page: string,
  section: string,
  label: string,
  type: FieldType = 'plain',
  extra: Partial<EditableField> = {},
): EditableField => ({ key, kind: 'i18n', type, bilingual: true, page, section, label, ...extra });

const media = (key: string, page: string, section: string, label: string): EditableField => ({
  key,
  kind: 'media',
  type: 'image',
  bilingual: false,
  page,
  section,
  label,
});

const data = (
  key: string,
  page: string,
  section: string,
  label: string,
  type: FieldType = 'plain',
): EditableField => ({ key, kind: 'data', type, bilingual: true, page, section, label });

export const CONTENT_REGISTRY: EditableField[] = [
  // ── Brand / global ─────────────────────────────────────────────────────────
  t('brand.name', 'Global', 'Brand', 'Brand name'),
  t('brand.tagline', 'Global', 'Brand', 'Brand tagline'),
  t('promo.invitationLede', 'Global', 'Promo bar', 'Promo lede'),
  t('promo.invitationTail', 'Global', 'Promo bar', 'Promo tail'),
  t('promo.currentOfferPlaceholder', 'Global', 'Promo bar', 'Current offer text'),

  // ── Home — hero ────────────────────────────────────────────────────────────
  media('media.home.hero', 'Home', 'Hero', 'Hero background image'),
  t('hero.eyebrow', 'Home', 'Hero', 'Hero eyebrow'),
  t('hero.tagline', 'Home', 'Hero', 'Hero tagline (styled)', 'rich'),
  t('hero.subtitle', 'Home', 'Hero', 'Hero subtitle'),
  t('hero.primaryCta', 'Home', 'Hero', 'Primary button'),
  t('hero.secondaryCta', 'Home', 'Hero', 'Secondary button'),
  t('hero.rotatingPhrases', 'Home', 'Hero', 'Rotating phrases', 'list'),
  t('hero.statement.lead', 'Home', 'Hero statement', 'Statement lead'),
  t('hero.statement.highlight', 'Home', 'Hero statement', 'Statement highlight word'),
  t('hero.statement.tail', 'Home', 'Hero statement', 'Statement tail'),

  // ── Home — sections ────────────────────────────────────────────────────────
  t('home.packages.eyebrow', 'Home', 'Featured voyages', 'Eyebrow'),
  t('home.packages.titleLead', 'Home', 'Featured voyages', 'Title lead'),
  t('home.packages.title', 'Home', 'Featured voyages', 'Title', 'rich'),
  t('home.packages.intro', 'Home', 'Featured voyages', 'Intro'),
  t('home.packages.viewAll', 'Home', 'Featured voyages', 'View-all link'),
  t('home.video.eyebrow', 'Home', 'Film', 'Eyebrow'),
  t('home.video.title', 'Home', 'Film', 'Title'),
  t('home.destinations.eyebrow', 'Home', 'Destinations', 'Eyebrow'),
  t('home.destinations.titleLead', 'Home', 'Destinations', 'Title lead'),
  t('home.destinations.title', 'Home', 'Destinations', 'Title'),
  t('home.destinations.ourTitle', 'Home', 'Destinations', 'Our-destinations title'),
  t('home.destinations.ourIntro', 'Home', 'Destinations', 'Our-destinations intro'),
  t('home.lifeOnboard.eyebrow', 'Home', 'Life on board', 'Eyebrow'),
  t('home.lifeOnboard.titleLead', 'Home', 'Life on board', 'Title lead'),
  t('home.lifeOnboard.title', 'Home', 'Life on board', 'Title'),
  t('home.inclusions.eyebrow', 'Home', 'Inclusions', 'Eyebrow'),
  t('home.inclusions.titleLead', 'Home', 'Inclusions', 'Title lead'),
  t('home.inclusions.title', 'Home', 'Inclusions', 'Title'),
  t('home.inclusions.items', 'Home', 'Inclusions', 'Inclusion list', 'list'),
  t('home.inclusions.note', 'Home', 'Inclusions', 'Footnote'),
  t('home.newsletterBand.title', 'Home', 'Newsletter', 'Title'),
  t('home.newsletterBand.body', 'Home', 'Newsletter', 'Body'),
  t('home.awardBanner.title', 'Home', 'Award banner', 'Title'),

  // ── Ships index ────────────────────────────────────────────────────────────
  media('media.ships.hero', 'Ships', 'Hero', 'Fleet hero image'),
  t('shipsIndex.eyebrow', 'Ships', 'Hero', 'Eyebrow'),
  t('shipsIndex.titleLead', 'Ships', 'Hero', 'Title lead'),
  t('shipsIndex.title', 'Ships', 'Hero', 'Title'),
  t('shipsIndex.intro', 'Ships', 'Hero', 'Intro'),

  // ── Destinations (structured data overrides — region taglines) ─────────────
  data('data.regions.mediterranean.tagline', 'Destinations', 'Mediterranean', 'Region tagline'),
  data('data.regions.northern-europe.tagline', 'Destinations', 'Northern Europe', 'Region tagline'),
  data('data.regions.caribbean.tagline', 'Destinations', 'Caribbean', 'Region tagline'),
];

const BY_KEY = new Map(CONTENT_REGISTRY.map((f) => [f.key, f]));

/** Registry lookup — the write-side allowlist. */
export function fieldFor(key: string): EditableField | undefined {
  return BY_KEY.get(key);
}

export function isEditableKey(key: string): boolean {
  return BY_KEY.has(key);
}

/** Group the registry page → section → fields, for the editor UI. */
export function registryByPage(): Record<string, Record<string, EditableField[]>> {
  const out: Record<string, Record<string, EditableField[]>> = {};
  for (const f of CONTENT_REGISTRY) {
    (out[f.page] ??= {});
    (out[f.page][f.section] ??= []).push(f);
  }
  return out;
}
