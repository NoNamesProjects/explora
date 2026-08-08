/**
 * Backfill the six ships into the entity model (page-builder Phase 2).
 *
 * Reads the existing hand-maintained sources — shipFacts.ts, shipAssets.ts
 * (635 lines of photo manifest), megaMenu.ts's `ships`, shipVisibility.ts, and
 * the shared ship.* locale copy — and writes one `site_entities` row per ship.
 * Nothing is re-typed by hand, so the migration can't introduce transcription
 * errors, and re-running is safe.
 *
 * After this, adding EXPLORA VII is a form in /admin/entities, not edits to
 * five TypeScript files plus a redeploy.
 *
 *   npm run seed:ships
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
import { entityTypeDef } from '../src/content/entityTypes';
import { SHIP_FACTS } from '../src/data/shipFacts';
import { SHIP_ASSETS, type ShipCode } from '../src/lib/shipAssets';
import { ships } from '../src/data/megaMenu';
import { HIDDEN_SHIP_CODES } from '../src/data/shipVisibility';

const ROOT = process.cwd();
const EN = JSON.parse(readFileSync(join(ROOT, 'src/locales/en.json'), 'utf8')) as Record<string, unknown>;
const EL = JSON.parse(readFileSync(join(ROOT, 'src/locales/el.json'), 'utf8')) as Record<string, unknown>;

function pick(bundle: Record<string, unknown>, dotted: string): unknown {
  return dotted.split('.').reduce<unknown>(
    (acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined),
    bundle,
  );
}
const tr = (key: string, loc: 'en' | 'el'): string => {
  const v = pick(loc === 'el' ? EL : EN, key);
  return typeof v === 'string' ? v : '';
};
const bi = (key: string) => ({ en: tr(key, 'en'), el: tr(key, 'el') });
const richOf = (key: string) => ({
  en: { type: 'rich', spans: [{ text: tr(key, 'en') }] },
  el: { type: 'rich', spans: [{ text: tr(key, 'el') }] },
});

interface Tier { key: string; name: string; tagline: string }
const tiersFor = (loc: 'en' | 'el'): Tier[] => {
  const v = pick(loc === 'el' ? EL : EN, 'ship.tiers');
  return Array.isArray(v) ? (v as Tier[]) : [];
};

/**
 * The shared spec LABELS live in the locale; only the VALUES vary per ship, and
 * the old model carried them as a positional array that had to stay in lockstep
 * with those labels by hand. Here they become five named fields, which is the
 * whole point — a new ship can't silently mis-order its own numbers.
 */
const SPEC_KEYS = ['specSuites', 'specPools', 'specRestaurants', 'specBars', 'specRatio'] as const;

function sharedSpecFallback(): string[] {
  const v = pick(EN, 'ship.stats');
  return Array.isArray(v) ? (v as Array<{ value: string }>).map((s) => s.value) : [];
}

function buildShip(code: ShipCode) {
  const facts = SHIP_FACTS[code];
  const assets = SHIP_ASSETS[code];
  const navEntry = ships.find((s) => s.code === code);
  const specs = facts.specValues ?? sharedSpecFallback();

  const fields: Record<string, unknown> = {
    heroImage: { src: assets.hero },
    previewImage: { src: assets.preview },
    numeral: facts.numeral,
    launchYear: facts.launchYear,
    status: facts.status,
    shipCd: navEntry?.shipCd ?? '',
    // Per-ship tagline override was never used (every taglineOverrideKey is
    // null) — leave blank so the shared fleet tagline keeps rendering.
    exteriorPhotos: assets.exterior.map((src) => ({ image: { src } })),
    onboardVenues: assets.onboard.map((v) => ({
      image: { src: v.src },
      // Venue names are English-only in the manifest; seed both sides so the
      // Greek page isn't blank, and let the admin translate at leisure.
      name: { en: v.name, el: v.name },
    })),
    deckPlans: assets.decks.map((d) => ({ deck: String(d.deck), image: { src: d.src } })),
    suiteTiers: buildTiers(assets.cabins),
  };

  for (let i = 0; i < SPEC_KEYS.length; i++) fields[SPEC_KEYS[i]] = specs[i] ?? '';

  if (facts.godmother.name) {
    fields.godmotherName = facts.godmother.name;
    if (facts.godmother.bioKey) fields.godmotherBio = richOf(facts.godmother.bioKey);
    if (facts.godmother.image) fields.godmotherImage = { src: facts.godmother.image };
  }

  return {
    slug: code,
    nameEn: facts.name,
    nameEl: navEntry ? tr(navEntry.labelKey, 'el') || facts.name : facts.name,
    // EXPLORA V/VI are pre-launch: seed them hidden, exactly as
    // shipVisibility.ts hides them today — now a data flag, not a hardcoded array.
    visible: !HIDDEN_SHIP_CODES.includes(code),
    fields,
  };
}

/** Tier copy is shared fleet-wide; only which tiers a ship HAS (and their photos) varies. */
function buildTiers(cabins: Record<string, string[] | undefined>) {
  const en = tiersFor('en');
  const el = tiersFor('el');
  return en
    .filter((t) => (cabins[t.key]?.length ?? 0) > 0)
    .map((t) => {
      const g = el.find((x) => x.key === t.key);
      return {
        tierKey: t.key,
        name: { en: t.name, el: g?.name ?? t.name },
        tagline: { en: t.tagline, el: g?.tagline ?? t.tagline },
        photos: (cabins[t.key] ?? []).map((src) => ({ image: { src } })),
      };
    });
}

async function main() {
  const def = entityTypeDef('ship');
  if (!def) throw new Error('ship entity type missing');

  const codes = Object.keys(SHIP_ASSETS) as ShipCode[];
  console.log(`Seeding ${codes.length} ships from shipFacts.ts + shipAssets.ts …\n`);

  let position = 10;
  for (const code of codes) {
    const s = buildShip(code);
    const clean = sanitizeSectionConfig(def.fields, s.fields);

    await paramQuery(
      `INSERT INTO site_entities (kind, slug, name_en, name_el, visible, position, fields)
       VALUES ('ship', $1, $2, $3, $4, $5, $6::jsonb)
       ON CONFLICT (slug) DO UPDATE SET
         name_en = EXCLUDED.name_en, name_el = EXCLUDED.name_el,
         visible = EXCLUDED.visible, position = EXCLUDED.position,
         fields = EXCLUDED.fields, updated_at = now()`,
      [s.slug, s.nameEn, s.nameEl, s.visible, position, JSON.stringify(clean)],
    );

    const t = clean.suiteTiers as unknown[] | undefined;
    const v = clean.onboardVenues as unknown[] | undefined;
    const d = clean.deckPlans as unknown[] | undefined;
    console.log(
      `  ${s.slug.padEnd(12)} ${s.visible ? 'visible' : 'hidden '}  ` +
      `${String(v?.length ?? 0).padStart(2)} venues · ${String(d?.length ?? 0).padStart(2)} decks · ` +
      `${String(t?.length ?? 0).padStart(2)} tiers`,
    );
    position += 10;
  }

  console.log(`\n✓ ${codes.length} ships are now editable records.`);
  console.log('  Their detail pages still render the built-in layout until ship sections are seeded.');
}

main().catch((err) => {
  console.error(`✗ seed failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
