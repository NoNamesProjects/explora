/**
 * Backfill the Home page into admin-managed sections (page-builder Phase 1).
 *
 * Reads the CURRENT live values — a published site_content override if the
 * client already edited a field, otherwise the code default from src/locales —
 * and writes them into page_sections in today's exact order, published. The
 * result is a pure refactor: the page renders identically, but every section is
 * now reorderable / hideable / deletable and new ones can be added beside them.
 *
 * Idempotent: re-running replaces the seeded rows. It only touches sections it
 * seeded (matched by slug), so an admin-added section is never clobbered.
 *
 *   npm run seed:home-sections            # seed / re-seed
 *   npm run seed:home-sections -- --force # also drop admin-added Home sections
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

for (const p of ['.env.local', '.env']) {
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?(.*?)"?\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

import { paramQuery } from '../lib/db/client';
import { sanitizeSectionConfig } from '../lib/content-sanitize';
import { sectionTypeDef } from '../src/content/sectionTypes';

const ROOT = process.cwd();
const EN = JSON.parse(readFileSync(join(ROOT, 'src/locales/en.json'), 'utf8')) as Record<string, unknown>;
const EL = JSON.parse(readFileSync(join(ROOT, 'src/locales/el.json'), 'utf8')) as Record<string, unknown>;

const FORCE = process.argv.includes('--force');

// ── Value lookup: published override wins over the code default ──────────────

type Overrides = Map<string, unknown>; // `${key}|${locale}` → published value
let overrides: Overrides = new Map();

function fromJson(bundle: Record<string, unknown>, dotted: string): unknown {
  return dotted.split('.').reduce<unknown>(
    (acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined),
    bundle,
  );
}

/** The value the site shows RIGHT NOW for an i18n key in one locale. */
function live(key: string, locale: 'en' | 'el'): unknown {
  const o = overrides.get(`${key}|${locale}`);
  if (o !== undefined && o !== null) return o;
  return fromJson(locale === 'el' ? EL : EN, key);
}

const str = (key: string, locale: 'en' | 'el'): string => {
  const v = live(key, locale);
  return typeof v === 'string' ? v : '';
};

/** Bilingual plain field. */
const bi = (key: string) => ({ en: str(key, 'en'), el: str(key, 'el') });

interface RichSpan { text: string; i?: boolean }
const doc = (spans: RichSpan[]) => ({ type: 'rich', spans: spans.filter((s) => s.text) });

/**
 * A heading currently rendered as `{titleLead} <em italic>{title}</em>` becomes
 * a two-span RichDoc — same pixels, but the admin now controls the styling of
 * each run instead of the italic being hardcoded in JSX.
 */
function leadPlusItalic(leadKey: string, italicKey: string) {
  const build = (loc: 'en' | 'el') => {
    const lead = str(leadKey, loc);
    const em = str(italicKey, loc);
    return doc([{ text: lead ? `${lead} ` : '' }, { text: em, i: true }]);
  };
  return { en: build('en'), el: build('el') };
}

/** A single-run RichDoc from one i18n key (or an existing RichDoc override). */
function richFrom(key: string) {
  const build = (loc: 'en' | 'el') => {
    const v = live(key, loc);
    if (v && typeof v === 'object' && (v as { type?: string }).type === 'rich') return v;
    return doc([{ text: typeof v === 'string' ? v : '' }]);
  };
  return { en: build('en'), el: build('el') };
}

const listOf = (key: string) => {
  const pick = (loc: 'en' | 'el') => {
    const v = live(key, loc);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  };
  return { en: pick('en'), el: pick('el') };
};

/** Media slot: a published media override wins over the hardcoded path. */
function mediaSlot(slot: string, fallback: string) {
  const o = overrides.get(`media.${slot}|`) as { src?: string; alt?: string } | undefined;
  return { src: o?.src || fallback, alt: o?.alt };
}

// ── The Home composition, in today's order ───────────────────────────────────

/** Matches the MEDIA map + /experience routes currently hardcoded in LifeOnboard.tsx. */
const LIFE_CARDS = [
  { key: 'suites', src: '/photos/Explora_1/Cabins/Serenity_Residences/SERENITY-RESIDENCE-7.webp', href: '/experience/suites' },
  { key: 'dining', src: '/photos/explora_3/onboard/Dining-21.webp', href: '/experience/dining' },
  { key: 'wellness', src: '/photos/explora_2/Onboard/OCEAN-WELLNESS-SPA-7.webp', href: '/experience/wellness' },
];

function lifeOnboardCards() {
  const items = (loc: 'en' | 'el') => {
    const v = live('home.lifeOnboard.items', loc);
    return Array.isArray(v) ? (v as Array<{ key: string; title: string; body: string }>) : [];
  };
  const en = items('en');
  const el = items('el');
  const cta = bi('home.lifeOnboard.exploreCta');

  return LIFE_CARDS.map((media) => {
    const e = en.find((i) => i.key === media.key);
    const g = el.find((i) => i.key === media.key);
    return {
      image: { src: media.src },
      title: { en: e?.title ?? '', el: g?.title ?? e?.title ?? '' },
      body: { en: e?.body ?? '', el: g?.body ?? e?.body ?? '' },
      href: media.href,
      // The old copy was "Explore {{subject}}" — the interpolation has no meaning
      // per-card here, so seed the plain word and let the admin refine it.
      ctaLabel: { en: cta.en.replace(/\s*\{\{subject\}\}/, ''), el: cta.el.replace(/\s*\{\{subject\}\}/, '') },
    };
  });
}

function buildSections() {
  return [
    {
      slug: 'hero',
      type: 'hero',
      config: {
        image: mediaSlot('home.hero', '/photos/banner/astern-pool.webp'),
        tagline: richFrom('hero.tagline'),
        height: 'medium',
        showSearch: true,
      },
    },
    {
      slug: 'featured-voyages',
      type: 'packages-teaser',
      config: {
        eyebrow: bi('home.packages.eyebrow'),
        titleLead: bi('home.packages.titleLead'),
        heading: richFrom('home.packages.title'),
        intro: bi('home.packages.intro'),
        ctaLabel: bi('home.packages.viewAll'),
        ctaHref: '/find-your-journey',
        tone: 'cream',
      },
    },
    {
      slug: 'film',
      type: 'video',
      config: {
        eyebrow: bi('home.video.eyebrow'),
        title: richFrom('home.video.title'),
        videoId: 'Zi5FES_5OSc',
        tone: 'cream',
      },
    },
    {
      slug: 'our-destinations',
      type: 'destinations-row',
      config: {
        heading: richFrom('home.destinations.ourTitle'),
        intro: bi('home.destinations.ourIntro'),
        ctaLabel: bi('home.destinations.viewAll'),
        tone: 'cream',
      },
    },
    {
      slug: 'life-on-board',
      type: 'cards-grid',
      config: {
        heading: richFrom('home.lifeOnboard.eyebrow'),
        cards: lifeOnboardCards(),
        columns: '3',
        cardStyle: 'overlay',
        tone: 'cream-soft',
      },
    },
    {
      slug: 'all-journeys-include',
      type: 'checklist-band',
      config: {
        eyebrow: bi('home.inclusions.eyebrow'),
        heading: leadPlusItalic('home.inclusions.titleLead', 'home.inclusions.title'),
        items: listOf('home.inclusions.items'),
        note: bi('home.inclusions.note'),
        image: { src: '/photos/explora_5/Onboard/In-Suite-Dining.webp', alt: str('home.inclusions.photoAlt', 'en') },
        tone: 'cream',
      },
    },
    {
      slug: 'newsletter',
      type: 'newsletter-band',
      config: {
        heading: richFrom('home.newsletterBand.title'),
        body: bi('home.newsletterBand.body'),
        tone: 'cream',
      },
    },
  ];
}

// ── Run ──────────────────────────────────────────────────────────────────────

async function main() {
  const rows = await paramQuery<{ key: string; locale: string; published_value: unknown }>(
    `SELECT key, locale, published_value FROM site_content WHERE published_value IS NOT NULL`,
  );
  overrides = new Map(rows.map((r) => [`${r.key}|${r.locale}`, r.published_value]));
  console.log(`Loaded ${overrides.size} published content override(s) — these win over the code defaults.`);

  const sections = buildSections();
  const slugs = sections.map((s) => s.slug);

  if (FORCE) {
    const wiped = await paramQuery<{ id: number }>(
      `DELETE FROM page_sections WHERE page_key = 'home' AND entity_slug IS NULL RETURNING id`,
    );
    console.log(`--force: removed all ${wiped.length} existing Home section(s).`);
  } else {
    const wiped = await paramQuery<{ id: number }>(
      `DELETE FROM page_sections WHERE page_key = 'home' AND entity_slug IS NULL AND slug = ANY($1) RETURNING id`,
      [slugs],
    );
    console.log(`Replaced ${wiped.length} previously-seeded section(s); admin-added ones left untouched.`);
  }

  let position = 1000;
  for (const s of sections) {
    const def = sectionTypeDef(s.type);
    if (!def) throw new Error(`unknown section type in seed: ${s.type}`);
    const clean = sanitizeSectionConfig(def.fields, s.config);

    await paramQuery(
      `INSERT INTO page_sections
         (page_key, entity_slug, section_type, slug, position, position_published,
          visible_draft, visible_published, config_draft, config_published,
          is_new, deleted_draft, published_at)
       VALUES ('home', NULL, $1, $2, $3, $3, true, true, $4::jsonb, $4::jsonb, false, false, now())`,
      [s.type, s.slug, position, JSON.stringify(clean)],
    );
    console.log(`  ${String(position).padStart(5)}  ${s.type.padEnd(18)} ${s.slug}`);
    position += 1000;
  }

  console.log(`\n✓ Seeded ${sections.length} Home sections (draft + published in lockstep).`);
  console.log('  The page renders identically — but every section is now admin-managed.');
}

main().catch((err) => {
  console.error(`✗ seed failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
