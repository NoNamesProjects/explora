/**
 * Seed the ship-detail and ships-index pages into sections (Phase 2, part 2).
 *
 * Every ship gets the same section set, in the order ShipDetail.tsx hardcodes
 * today — so each ship page renders identically, but each is now independently
 * reorderable: one ship can lead with its suites while another leads with decks.
 *
 * Section SLUGS deliberately match the old DOM anchor ids (venues / suites /
 * decks / life / journeys / godmother) so existing deep links keep working and
 * the auto-generated sub-nav lands on the same targets.
 *
 * Idempotent — re-running replaces the seeded rows. Run AFTER seed:ships.
 *
 *   npm run seed:ship-sections
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

function pick(b: Record<string, unknown>, dotted: string): unknown {
  return dotted.split('.').reduce<unknown>(
    (a, k) => (a && typeof a === 'object' ? (a as Record<string, unknown>)[k] : undefined), b);
}
const tr = (key: string, loc: 'en' | 'el'): string => {
  const v = pick(loc === 'el' ? EL : EN, key);
  return typeof v === 'string' ? v : '';
};
const bi = (key: string) => ({ en: tr(key, 'en'), el: tr(key, 'el') });
const rich = (key: string) => ({
  en: { type: 'rich', spans: [{ text: tr(key, 'en') }] },
  el: { type: 'rich', spans: [{ text: tr(key, 'el') }] },
});

/**
 * The ship detail page as it stands today. Configs are left mostly EMPTY on
 * purpose: each renderer falls back to the shared `ship.*` locale copy that
 * every ship already uses, so the seed doesn't freeze a snapshot of translated
 * text into 6 × N rows that would then have to be re-translated by hand.
 * The admin can override any heading per ship whenever they want to.
 */
const SHIP_DETAIL_SECTIONS: Array<{ slug: string; type: string; config?: Record<string, unknown> }> = [
  { slug: 'hero', type: 'ship-hero' },
  { slug: 'tagline', type: 'ship-tagline' },
  { slug: 'venues', type: 'venue-carousel' },
  { slug: 'specifications', type: 'spec-band' },
  { slug: 'suites', type: 'suite-tier-carousel' },
  { slug: 'decks', type: 'deck-plan-switcher' },
  { slug: 'life', type: 'ship-life-onboard' },
  { slug: 'journeys', type: 'ship-journeys' },
  { slug: 'godmother', type: 'ship-godmother' },
  { slug: 'other-ships', type: 'related-ships', config: { tone: 'cream-soft' } },
];

function shipsIndexSections() {
  const stats = pick(EN, 'ship.stats');
  const statsEl = pick(EL, 'ship.stats');
  const rows = Array.isArray(stats) ? (stats as Array<{ value: string; label: string }>) : [];
  const rowsEl = Array.isArray(statsEl) ? (statsEl as Array<{ value: string; label: string }>) : [];

  return [
    {
      slug: 'hero',
      type: 'hero',
      config: {
        image: { src: '/photos/banner/explora-ii-aerial.webp' },
        eyebrow: bi('shipsIndex.eyebrow'),
        tagline: {
          en: { type: 'rich', spans: [
            { text: `${tr('shipsIndex.titleLead', 'en')} ` },
            { text: tr('shipsIndex.title', 'en'), i: true },
          ] },
          el: { type: 'rich', spans: [
            { text: `${tr('shipsIndex.titleLead', 'el')} ` },
            { text: tr('shipsIndex.title', 'el'), i: true },
          ] },
        },
        height: 'medium',
        showSearch: false,
      },
    },
    {
      slug: 'intro',
      type: 'rich-text',
      config: {
        // `shipsIndex.intro` interpolates a live ship count ({{word}}) that a
        // static string can't carry — seed the copy without it and let the
        // admin phrase it however they like.
        heading: rich('shipsIndex.intro'),
        align: 'center',
        tone: 'ink',
      },
    },
    {
      slug: 'fleet-highlights',
      type: 'stat-band',
      config: {
        eyebrow: bi('ship.statsHeading'),
        tone: 'cream-soft',
        stats: rows.map((r, i) => ({
          value: r.value,
          label: { en: r.label, el: rowsEl[i]?.label ?? r.label },
        })),
      },
    },
    { slug: 'fleet-register', type: 'fleet-register', config: { tone: 'cream' } },
  ];
}

async function seedPage(
  pageKey: string,
  entitySlug: string | null,
  defs: Array<{ slug: string; type: string; config?: Record<string, unknown> }>,
) {
  const slugs = defs.map((d) => d.slug);
  await paramQuery(
    `DELETE FROM page_sections
      WHERE page_key = $1 AND entity_slug IS NOT DISTINCT FROM $2 AND slug = ANY($3)`,
    [pageKey, entitySlug, slugs],
  );

  let position = 1000;
  for (const d of defs) {
    const def = sectionTypeDef(d.type);
    if (!def) throw new Error(`unknown section type: ${d.type}`);
    const clean = sanitizeSectionConfig(def.fields, d.config ?? {});
    await paramQuery(
      `INSERT INTO page_sections
         (page_key, entity_slug, section_type, slug, position, position_published,
          visible_draft, visible_published, config_draft, config_published,
          is_new, deleted_draft, published_at)
       VALUES ($1, $2, $3, $4, $5, $5, true, true, $6::jsonb, $6::jsonb, false, false, now())`,
      [pageKey, entitySlug, d.type, d.slug, position, JSON.stringify(clean)],
    );
    position += 1000;
  }
  return defs.length;
}

async function main() {
  const ships = await paramQuery<{ slug: string; name_en: string; visible: boolean }>(
    `SELECT slug, name_en, visible FROM site_entities WHERE kind = 'ship' ORDER BY position`);
  if (!ships.length) {
    console.error('✗ No ship entities found. Run `npm run seed:ships` first.');
    process.exit(1);
  }

  console.log('Seeding ships-index sections …');
  const n = await seedPage('ships-index', null, shipsIndexSections());
  console.log(`  ${n} sections\n`);

  console.log(`Seeding ship-detail sections for ${ships.length} ships …`);
  for (const s of ships) {
    const count = await seedPage('ship-detail', s.slug, SHIP_DETAIL_SECTIONS);
    console.log(`  ${s.slug.padEnd(12)} ${count} sections  ${s.visible ? '' : '(ship hidden)'}`);
  }

  console.log('\n✓ Ship pages are now admin-managed.');
  console.log('  Each ship can be reordered independently under Pages → Ships — detail.');
}

main().catch((err) => {
  console.error(`✗ seed failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
