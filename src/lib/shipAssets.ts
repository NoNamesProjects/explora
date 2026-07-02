/**
 * Typed asset manifest for the six Explora ships.
 *
 * All paths point at /photos/... (statically served from public/photos by
 * Vite, copied from /Photos at project root). image.ts:imageUrl() passes
 * paths starting with "/" through unchanged.
 *
 * Naming inconsistencies on disk (Explora_1 capital vs explora_2-6 lower;
 * ship_photos vs ship_photo; Onboard vs onboard) are absorbed here — the
 * rest of the codebase only sees clean kebab-case ship codes + tier keys.
 *
 * Partner workflow when more photos arrive: drop them into the relevant
 * Photos/<ship>/<category>/ folder, re-copy to public/photos, then add the
 * paths to this manifest. No code edits anywhere else.
 */

export type ShipCode =
  | 'explora-i'
  | 'explora-ii'
  | 'explora-iii'
  | 'explora-iv'
  | 'explora-v'
  | 'explora-vi';

export type TierKey =
  | 'owners'
  | 'cocoon'
  | 'serenity'
  | 'retreat'
  | 'cove'
  | 'grandPenthouse'
  | 'premierPenthouse'
  | 'deluxePenthouse'
  | 'penthouse'
  | 'oceanGrandTerrace'
  | 'oceanTerrace';

export interface OnboardVenue {
  key: string;
  name: string;
  src: string;
}

export interface DeckPlan {
  deck: number;
  src: string;
}

export interface ShipAssets {
  shipCode: ShipCode;
  shipNumber: 1 | 2 | 3 | 4 | 5 | 6;
  preview: string;
  hero: string;
  exterior: string[];
  onboard: OnboardVenue[];
  decks: DeckPlan[];
  cabins: Partial<Record<TierKey, string[]>>;
}

// ═════════════════════════ EXPLORA I ════════════════════════════════════
const EXPLORA_I: ShipAssets = {
  shipCode: 'explora-i',
  shipNumber: 1,
  preview: '/photos/Explora_1/EXI-preview.webp',
  hero: '/photos/Explora_1/ship_photos/Explora_I_Greenland.webp',
  exterior: [
    '/photos/Explora_1/ship_photos/Explora_Conservatory_Pool_Drone_347_MASTER-1.webp',
    '/photos/Explora_1/ship_photos/Explora_Conservatory_Pool_Drone_96_MASTER_Extended-2.webp',
    '/photos/Explora_1/ship_photos/Explora_I_Greenland.webp',
  ],
  onboard: [
    { key: 'explora-lounge', name: 'Explora Lounge', src: '/photos/Explora_1/Onboard/EXPLORA-LOUNGE-8.webp' },
    { key: 'sakura', name: 'Sakura', src: '/photos/Explora_1/Onboard/SAKURA-0.webp' },
    { key: 'fitness-centre', name: 'Fitness Centre', src: '/photos/Explora_1/Onboard/FITNESS-CENTRE-0.webp' },
    { key: 'in-suite-dining', name: 'In-Suite Dining', src: '/photos/Explora_1/Onboard/In-Suite-Dining.webp' },
    { key: 'the-journey', name: 'The Journey', src: '/photos/Explora_1/Onboard/THE-JOURNEY-1.webp' },
    { key: 'explora-journeys-lounge', name: 'Explora Journeys Lounge', src: '/photos/Explora_1/Onboard/EXPLORA-JOURNEYS-LOUNGE-7.webp' },
    { key: 'art-onboard', name: 'Art Onboard', src: '/photos/Explora_1/Onboard/art_Onboard.jpg' },
  ],
  decks: [
    { deck: 3, src: '/photos/Explora_1/Deck_Plans/EXI_Deck_3.png' },
    { deck: 4, src: '/photos/Explora_1/Deck_Plans/EXI_Deck_4.png' },
    { deck: 5, src: '/photos/Explora_1/Deck_Plans/EXI_Deck_5.png' },
    { deck: 6, src: '/photos/Explora_1/Deck_Plans/EXI_Deck_6.png' },
    { deck: 7, src: '/photos/Explora_1/Deck_Plans/EXI_Deck_7.png' },
    { deck: 8, src: '/photos/Explora_1/Deck_Plans/EXI_Deck_8.png' },
    { deck: 9, src: '/photos/Explora_1/Deck_Plans/EXI_Deck_9.png' },
    { deck: 10, src: '/photos/Explora_1/Deck_Plans/EXI_Deck_10.png' },
    { deck: 11, src: '/photos/Explora_1/Deck_Plans/EXI_Deck_11.png' },
    { deck: 12, src: '/photos/Explora_1/Deck_Plans/EXI_Deck_12.png' },
    { deck: 14, src: '/photos/Explora_1/Deck_Plans/EXI_Deck_14.png' },
  ],
  cabins: {
    owners: [
      '/photos/Explora_1/Cabins/owners_residences/OR_02-1.webp',
      '/photos/Explora_1/Cabins/owners_residences/OR_03-1.webp',
      '/photos/Explora_1/Cabins/owners_residences/OR_06-1.webp',
      '/photos/Explora_1/Cabins/owners_residences/OR_08-1.webp',
      '/photos/Explora_1/Cabins/owners_residences/OR_12-1.webp',
      '/photos/Explora_1/Cabins/owners_residences/OR_18-1.webp',
      '/photos/Explora_1/Cabins/owners_residences/OR_21-1.webp',
    ],
    cocoon: [
      '/photos/Explora_1/Cabins/Cocoon_Residences/Cocoon_Residences.webp',
      '/photos/Explora_1/Cabins/Cocoon_Residences/Terrace-2.webp',
      '/photos/Explora_1/Cabins/Cocoon_Residences/SERENITY-RESIDENCE-7.webp',
      '/photos/Explora_1/Cabins/Cocoon_Residences/SERENITY-RESIDENCE-10.webp',
    ],
    serenity: [
      '/photos/Explora_1/Cabins/Serenity_Residences/SERENITY-RESIDENCE-4.webp',
      '/photos/Explora_1/Cabins/Serenity_Residences/SERENITY-RESIDENCE-7.webp',
      '/photos/Explora_1/Cabins/Serenity_Residences/SERENITY-RESIDENCE-8.webp',
      '/photos/Explora_1/Cabins/Serenity_Residences/SERENITY-RESIDENCE-10.webp',
      '/photos/Explora_1/Cabins/Serenity_Residences/SERENITY-RESIDENCE-12.webp',
    ],
    retreat: [
      '/photos/Explora_1/Cabins/Retreat_Residences/RETREAT-RESIDENCE-1.webp',
      '/photos/Explora_1/Cabins/Retreat_Residences/RETREAT-RESIDENCE-4.webp',
      '/photos/Explora_1/Cabins/Retreat_Residences/RETREAT-RESIDENCE-5.webp',
      '/photos/Explora_1/Cabins/Retreat_Residences/RETREAT-RESIDENCE-6.webp',
      '/photos/Explora_1/Cabins/Retreat_Residences/RETREAT-RESIDENCE-7.webp',
      '/photos/Explora_1/Cabins/Retreat_Residences/RETREAT-RESIDENCE-8.webp',
    ],
    cove: [
      '/photos/Explora_1/Cabins/Cove_Residences/COVE-RESIDENCE-2.webp',
      '/photos/Explora_1/Cabins/Cove_Residences/COVE-RESIDENCE-5.webp',
      '/photos/Explora_1/Cabins/Cove_Residences/COVE-RESIDENCE-7.webp',
      '/photos/Explora_1/Cabins/Cove_Residences/COVE-RESIDENCE-10.webp',
      '/photos/Explora_1/Cabins/Cove_Residences/Terrace-1.webp',
      '/photos/Explora_1/Cabins/Cove_Residences/Bathroom-1.webp',
    ],
    grandPenthouse: [
      '/photos/Explora_1/Cabins/Grand_Penthouses/GRAND-PENTHOUSE-2.webp',
      '/photos/Explora_1/Cabins/Grand_Penthouses/GRAND-PENTHOUSE-4.webp',
      '/photos/Explora_1/Cabins/Grand_Penthouses/GRAND-PENTHOUSE-11.webp',
      '/photos/Explora_1/Cabins/Grand_Penthouses/GRAND-PENTHOUSE-12.webp',
      '/photos/Explora_1/Cabins/Grand_Penthouses/Bathroom-1.webp',
    ],
    premierPenthouse: [
      '/photos/Explora_1/Cabins/Premier_Penthouses/PREMIER-PENTHOUSE-2.webp',
      '/photos/Explora_1/Cabins/Premier_Penthouses/PREMIER-PENTHOUSE-3.webp',
      '/photos/Explora_1/Cabins/Premier_Penthouses/PREMIER-PENTHOUSE-4.webp',
      '/photos/Explora_1/Cabins/Premier_Penthouses/Terrace-1.webp',
      '/photos/Explora_1/Cabins/Premier_Penthouses/Terrace-2.webp',
    ],
    deluxePenthouse: [
      '/photos/Explora_1/Cabins/Deluxe_Penthouses/DELUXE-PENTHOUSE-1.webp',
      '/photos/Explora_1/Cabins/Deluxe_Penthouses/DELUXE-PENTHOUSE-5.webp',
      '/photos/Explora_1/Cabins/Deluxe_Penthouses/Terrace-2.webp',
      '/photos/Explora_1/Cabins/Deluxe_Penthouses/Bathroom-1.webp',
    ],
    penthouse: [
      '/photos/Explora_1/Cabins/Penthouses/PENTHOUSE-1.webp',
      '/photos/Explora_1/Cabins/Penthouses/PENTHOUSE-2.webp',
      '/photos/Explora_1/Cabins/Penthouses/PENTHOUSE-4.webp',
      '/photos/Explora_1/Cabins/Penthouses/Bathroom-1.webp',
    ],
    oceanGrandTerrace: [
      '/photos/Explora_1/Cabins/Ocean_Grand_Terrace_Suites/OCEAN-GRAND-TERRACE-2.webp',
      '/photos/Explora_1/Cabins/Ocean_Grand_Terrace_Suites/OCEAN-TERRACE-SUITE-1.webp',
      '/photos/Explora_1/Cabins/Ocean_Grand_Terrace_Suites/OCEAN-TERRACE-SUITE-6.webp',
      '/photos/Explora_1/Cabins/Ocean_Grand_Terrace_Suites/Terrace-1.webp',
      '/photos/Explora_1/Cabins/Ocean_Grand_Terrace_Suites/Terrace-2.webp',
    ],
    oceanTerrace: [
      '/photos/Explora_1/Cabins/Ocean_Terrace_Suites/OCEAN-TERRACE-SUITE-1.webp',
      '/photos/Explora_1/Cabins/Ocean_Terrace_Suites/OCEAN-TERRACE-SUITE-6.webp',
      '/photos/Explora_1/Cabins/Ocean_Terrace_Suites/OCEAN-GRAND-TERRACE-2.webp',
      '/photos/Explora_1/Cabins/Ocean_Terrace_Suites/Terrace-1.webp',
      '/photos/Explora_1/Cabins/Ocean_Terrace_Suites/Terrace-2.webp',
      '/photos/Explora_1/Cabins/Ocean_Terrace_Suites/Bathroom-1.webp',
    ],
  },
};

// ═════════════════════════ EXPLORA II ═══════════════════════════════════
const EXPLORA_II: ShipAssets = {
  shipCode: 'explora-ii',
  shipNumber: 2,
  preview: '/photos/explora_2/EXII-preview.webp',
  hero: '/photos/explora_2/ship_Photo/Explora_Conservatory_Pool_Drone_356_MASTER-2.webp',
  exterior: [
    '/photos/explora_2/ship_Photo/Explora_Conservatory_Pool_Drone_356_MASTER-2.webp',
    '/photos/explora_2/ship_Photo/Explora_I_ship_page_5.webp',
  ],
  onboard: [
    { key: 'explora-journeys-lounge', name: 'Explora Journeys Lounge', src: '/photos/explora_2/Onboard/EXPLORA-JOURNEYS-LOUNGE-10.webp' },
    { key: 'fil-rouge', name: 'Fil Rouge', src: '/photos/explora_2/Onboard/FIL-ROUGE-22.webp' },
    { key: 'cartier-boutique', name: 'Cartier Boutique', src: '/photos/explora_2/Onboard/CARTIER-1.webp' },
    { key: 'lobby', name: 'The Lobby', src: '/photos/explora_2/Onboard/Lobby-12.webp' },
    { key: 'ocean-wellness-spa', name: 'Ocean Wellness Spa', src: '/photos/explora_2/Onboard/OCEAN-WELLNESS-SPA-7.webp' },
    { key: 'family-journeys', name: 'Journeys for the Whole Family', src: '/photos/explora_2/Onboard/Journeys-for-the-whole-family-2.webp' },
  ],
  decks: [
    { deck: 3, src: '/photos/explora_2/Deck_Plans/EXII_Deck_03.png' },
    { deck: 4, src: '/photos/explora_2/Deck_Plans/EXII_Deck_04.png' },
    { deck: 5, src: '/photos/explora_2/Deck_Plans/EXII_Deck_05.png' },
    { deck: 6, src: '/photos/explora_2/Deck_Plans/EXII_Deck_6.png' },
    { deck: 7, src: '/photos/explora_2/Deck_Plans/EXII_Deck_7.png' },
    { deck: 8, src: '/photos/explora_2/Deck_Plans/EXII_Deck_8.png' },
    { deck: 10, src: '/photos/explora_2/Deck_Plans/EXII_Deck_10.png' },
    { deck: 11, src: '/photos/explora_2/Deck_Plans/EXII_Deck_11.png' },
    { deck: 12, src: '/photos/explora_2/Deck_Plans/EXII_Deck_12.png' },
    { deck: 14, src: '/photos/explora_2/Deck_Plans/EXII_Deck_14.png' },
  ],
  cabins: {
    owners: [
      '/photos/explora_2/Cabins/owners_residences/OR_02-1.webp',
      '/photos/explora_2/Cabins/owners_residences/OR_03-1.webp',
      '/photos/explora_2/Cabins/owners_residences/OR_06-1.webp',
      '/photos/explora_2/Cabins/owners_residences/OR_08-1.webp',
      '/photos/explora_2/Cabins/owners_residences/OR_18-1.webp',
    ],
    cocoon: [
      '/photos/explora_2/Cabins/Cocoon_Residences/CO1_02.webp',
      '/photos/explora_2/Cabins/Cocoon_Residences/CO1_04.webp',
      '/photos/explora_2/Cabins/Cocoon_Residences/CO1_Bathroom.webp',
      '/photos/explora_2/Cabins/Cocoon_Residences/CO1_TOP_VIEW.webp',
    ],
    serenity: [
      '/photos/explora_2/Cabins/Serenity_Residences/SERENITY-RESIDENCE-4.webp',
      '/photos/explora_2/Cabins/Serenity_Residences/SERENITY-RESIDENCE-7.webp',
      '/photos/explora_2/Cabins/Serenity_Residences/SERENITY-RESIDENCE-8.webp',
      '/photos/explora_2/Cabins/Serenity_Residences/SERENITY-RESIDENCE-10.webp',
      '/photos/explora_2/Cabins/Serenity_Residences/SERENITY-RESIDENCE-12.webp',
    ],
    retreat: [
      '/photos/explora_2/Cabins/Retreat_Residences/RETREAT-RESIDENCE-1.webp',
      '/photos/explora_2/Cabins/Retreat_Residences/RETREAT-RESIDENCE-4.webp',
      '/photos/explora_2/Cabins/Retreat_Residences/RETREAT-RESIDENCE-5.webp',
      '/photos/explora_2/Cabins/Retreat_Residences/RETREAT-RESIDENCE-6.webp',
      '/photos/explora_2/Cabins/Retreat_Residences/RETREAT-RESIDENCE-7.webp',
    ],
    cove: [
      '/photos/explora_2/Cabins/Cove_Residences/COVE-RESIDENCE-2.webp',
      '/photos/explora_2/Cabins/Cove_Residences/COVE-RESIDENCE-5.webp',
      '/photos/explora_2/Cabins/Cove_Residences/COVE-RESIDENCE-7.webp',
      '/photos/explora_2/Cabins/Cove_Residences/COVE-RESIDENCE-10.webp',
      '/photos/explora_2/Cabins/Cove_Residences/Terrace-1.webp',
    ],
    grandPenthouse: [
      '/photos/explora_2/Cabins/Grand_Penthouses/GRAND-PENTHOUSE-2.webp',
      '/photos/explora_2/Cabins/Grand_Penthouses/GRAND-PENTHOUSE-4.webp',
      '/photos/explora_2/Cabins/Grand_Penthouses/GRAND-PENTHOUSE-11.webp',
      '/photos/explora_2/Cabins/Grand_Penthouses/GRAND-PENTHOUSE-12.webp',
    ],
    premierPenthouse: [
      '/photos/explora_2/Cabins/Premier_Penthouses/PREMIER-PENTHOUSE-2.webp',
      '/photos/explora_2/Cabins/Premier_Penthouses/PREMIER-PENTHOUSE-3.webp',
      '/photos/explora_2/Cabins/Premier_Penthouses/PREMIER-PENTHOUSE-4.webp',
      '/photos/explora_2/Cabins/Premier_Penthouses/Terrace-1.webp',
    ],
    deluxePenthouse: [
      '/photos/explora_2/Cabins/Deluxe_Penthouses/DELUXE-PENTHOUSE-1.webp',
      '/photos/explora_2/Cabins/Deluxe_Penthouses/DELUXE-PENTHOUSE-5.webp',
      '/photos/explora_2/Cabins/Deluxe_Penthouses/Terrace-2.webp',
    ],
    penthouse: [
      '/photos/explora_2/Cabins/Penthouses/PENTHOUSE-1.webp',
      '/photos/explora_2/Cabins/Penthouses/PENTHOUSE-2.webp',
      '/photos/explora_2/Cabins/Penthouses/PENTHOUSE-4.webp',
    ],
    oceanGrandTerrace: [
      '/photos/explora_2/Cabins/Ocean_Grand_Terrace_Suites/OCEAN-GRAND-TERRACE-2.webp',
      '/photos/explora_2/Cabins/Ocean_Grand_Terrace_Suites/OCEAN-TERRACE-SUITE-1.webp',
      '/photos/explora_2/Cabins/Ocean_Grand_Terrace_Suites/OCEAN-TERRACE-SUITE-6.webp',
      '/photos/explora_2/Cabins/Ocean_Grand_Terrace_Suites/Terrace-1.webp',
    ],
    oceanTerrace: [
      '/photos/explora_2/Cabins/Ocean_Terrace_Suites/OCEAN-TERRACE-SUITE-1.webp',
      '/photos/explora_2/Cabins/Ocean_Terrace_Suites/OCEAN-TERRACE-SUITE-6.webp',
      '/photos/explora_2/Cabins/Ocean_Terrace_Suites/Terrace-1.webp',
      '/photos/explora_2/Cabins/Ocean_Terrace_Suites/Terrace-2.webp',
    ],
  },
};

// ═════════════════════════ EXPLORA III ══════════════════════════════════
const EXPLORA_III: ShipAssets = {
  shipCode: 'explora-iii',
  shipNumber: 3,
  preview: '/photos/explora_3/ship_photo/EXIII.webp',
  hero: '/photos/explora_3/ship_photo/EXPLORA_III_ExteriorView_04.webp',
  exterior: [
    '/photos/explora_3/ship_photo/EXPLORA_III_ExteriorView_04.webp',
    '/photos/explora_3/ship_photo/Drone-Shoot-106.webp',
    '/photos/explora_3/ship_photo/EXIII.webp',
  ],
  onboard: [
    { key: 'explora-journeys-lounge', name: 'Explora Journeys Lounge', src: '/photos/explora_3/onboard/EXPLORA-JOURNEYS-LOUNGE-9.webp' },
    { key: 'med-yacht-club', name: 'Med Yacht Club', src: '/photos/explora_3/onboard/Dining-21.webp' },
    { key: 'chopard-boutique', name: 'Chopard Boutique', src: '/photos/explora_3/onboard/Chopard-1.webp' },
    { key: 'lobby', name: 'The Lobby', src: '/photos/explora_3/onboard/Lobby-4-1.webp' },
    { key: 'nautilus-juniors', name: 'Nautilus Juniors', src: '/photos/explora_3/onboard/Nautilus-Juniors-2.webp' },
    { key: 'sound-wellness', name: 'Sound Wellness', src: '/photos/explora_3/onboard/Sound-wellness.webp' },
  ],
  decks: [
    { deck: 3, src: '/photos/explora_3/Deck_Plans/EXIII_Deck_3.png' },
    { deck: 4, src: '/photos/explora_3/Deck_Plans/EXIII_Deck_4.png' },
    { deck: 5, src: '/photos/explora_3/Deck_Plans/EXIII_Deck_5.png' },
    { deck: 6, src: '/photos/explora_3/Deck_Plans/EXIII_Deck_6.png' },
    { deck: 7, src: '/photos/explora_3/Deck_Plans/EXIII_Deck_7.png' },
    { deck: 8, src: '/photos/explora_3/Deck_Plans/EXIII_Deck_8.png' },
    { deck: 9, src: '/photos/explora_3/Deck_Plans/EXIII_Deck_9.png' },
    { deck: 10, src: '/photos/explora_3/Deck_Plans/EXIII_Deck_10.png' },
    { deck: 11, src: '/photos/explora_3/Deck_Plans/EXIII_Deck_11.png' },
    { deck: 12, src: '/photos/explora_3/Deck_Plans/EXIII_Deck_12.png' },
    { deck: 14, src: '/photos/explora_3/Deck_Plans/EXIII_Dek_14.png' },
  ],
  cabins: {
    owners: [
      '/photos/explora_3/Cabins/owners_residences/OR1-Deck8-1.webp',
      '/photos/explora_3/Cabins/owners_residences/OR1-Deck8-5.webp',
      '/photos/explora_3/Cabins/owners_residences/OR1-Deck8-6.webp',
      '/photos/explora_3/Cabins/owners_residences/OR1-Deck8-8.webp',
      '/photos/explora_3/Cabins/owners_residences/OR1-Deck8-10.webp',
    ],
    cocoon: [
      '/photos/explora_3/Cabins/Cocoon_Residences/Cocoon-Residence-3-1.webp',
      '/photos/explora_3/Cabins/Cocoon_Residences/Cocoon-Residence-4-1.webp',
      '/photos/explora_3/Cabins/Cocoon_Residences/Cocoon-Residence-13-1.webp',
      '/photos/explora_3/Cabins/Cocoon_Residences/Cocoon-Residence-14-1.webp',
      '/photos/explora_3/Cabins/Cocoon_Residences/Cocoon-Residence-16-1.webp',
    ],
    cove: [
      '/photos/explora_3/Cabins/Cove_Residences/Cove-Residence-1-2.webp',
      '/photos/explora_3/Cabins/Cove_Residences/Cove-Residence-2-2.webp',
      '/photos/explora_3/Cabins/Cove_Residences/Cove-Residence-3-2.webp',
      '/photos/explora_3/Cabins/Cove_Residences/Cove-Residence-4-2.webp',
      '/photos/explora_3/Cabins/Cove_Residences/Cove-Residence--5.webp',
    ],
    grandPenthouse: [
      '/photos/explora_3/Cabins/Grand_Penthouses/Grand-Penthouse-1-1.webp',
      '/photos/explora_3/Cabins/Grand_Penthouses/Grand-Penthouse-2-1.webp',
      '/photos/explora_3/Cabins/Grand_Penthouses/Grand-Penthouse-4-1.webp',
      '/photos/explora_3/Cabins/Grand_Penthouses/Grand-Penthouse-5-1.webp',
    ],
    premierPenthouse: [
      '/photos/explora_3/Cabins/Premier_Penthouses/Premier-Penthouse-2.webp',
      '/photos/explora_3/Cabins/Premier_Penthouses/Premier-Penthouse-3.webp',
      '/photos/explora_3/Cabins/Premier_Penthouses/Premier-Penthouse-11.webp',
      '/photos/explora_3/Cabins/Premier_Penthouses/Premier-Penthouse-12.webp',
    ],
    penthouse: [
      '/photos/explora_3/Cabins/Penthouses/Deluxe-Penthouse--2.webp',
      '/photos/explora_3/Cabins/Penthouses/Deluxe-Penthouse-3-1.webp',
      '/photos/explora_3/Cabins/Penthouses/Deluxe-Penthouse-5-5.webp',
      '/photos/explora_3/Cabins/Penthouses/Deluxe-Penthouse-7-1.webp',
      '/photos/explora_3/Cabins/Penthouses/Deluxe-Penthouse-8-1.webp',
    ],
    retreat: [
      '/photos/explora_3/Cabins/Retreat_Residences/Retreat-Residence-1-1.webp',
      '/photos/explora_3/Cabins/Retreat_Residences/Retreat-Residence-3-1.webp',
      '/photos/explora_3/Cabins/Retreat_Residences/Retreat-Residence-4-1.webp',
      '/photos/explora_3/Cabins/Retreat_Residences/Retreat-Residence-5-1.webp',
      '/photos/explora_3/Cabins/Retreat_Residences/Retreat-Residence-7-1.webp',
    ],
  },
};

// ═════════════════════════ EXPLORA IV ═══════════════════════════════════
// Same fleet (Vista-class) — onboard photos differ; cabin file names mirror
// Explora III (shared library); deck plans use the EXIV_Deck_*.png set.
const EXPLORA_IV: ShipAssets = {
  shipCode: 'explora-iv',
  shipNumber: 4,
  preview: '/photos/explora_4/EXPLORA-IV-preview.webp',
  hero: '/photos/explora_4/EXIV-8.webp',
  exterior: [
    '/photos/explora_4/EXIV-8.webp',
    '/photos/explora_4/EXPLORA-IV-preview.webp',
  ],
  onboard: [
    { key: 'explora-lounge', name: 'Explora Lounge', src: '/photos/explora_4/Onboard/EXPLORA-LOUNGE-4.webp' },
    { key: 'malt-whisky-bar', name: 'Malt Whisky Bar', src: '/photos/explora_4/Onboard/MALT-WHISKY-BAR-1.webp' },
    { key: 'fitness-centre', name: 'Fitness Centre', src: '/photos/explora_4/Onboard/FITNESS-CENTRE-4.webp' },
    { key: 'atoll-pool', name: 'Atoll Pool', src: '/photos/explora_4/Onboard/Explora_Atoll_Pool_Kids_1873_MASTER_Medium.webp' },
    { key: 'med-yacht-club', name: 'Mediterranean Yacht Club', src: '/photos/explora_4/Onboard/MED-YACHT-CLUB-2.webp' },
    { key: 'explora-journeys-lounge', name: 'Explora Journeys Lounge', src: '/photos/explora_4/Onboard/EXPLORA-JOURNEYS-LOUNGE-6.webp' },
  ],
  decks: [
    { deck: 3, src: '/photos/explora_4/Deck_Plans/EXIV_Deck_3.png' },
    { deck: 4, src: '/photos/explora_4/Deck_Plans/EXIV_Deck_4.png' },
    { deck: 5, src: '/photos/explora_4/Deck_Plans/EXIV_Deck_5.png' },
    { deck: 6, src: '/photos/explora_4/Deck_Plans/EXIV_Deck_6.png' },
    { deck: 7, src: '/photos/explora_4/Deck_Plans/EXIV_Deck_7.png' },
    { deck: 8, src: '/photos/explora_4/Deck_Plans/EXIV_Deck_8.png' },
    { deck: 9, src: '/photos/explora_4/Deck_Plans/EXIV_Deck_9.png' },
    { deck: 10, src: '/photos/explora_4/Deck_Plans/EXIV_Deck_10.png' },
    { deck: 11, src: '/photos/explora_4/Deck_Plans/EXIV_Deck_11.png' },
    { deck: 12, src: '/photos/explora_4/Deck_Plans/EXIV_Deck_12.png' },
    { deck: 14, src: '/photos/explora_4/Deck_Plans/EXIV_Deck_14.png' },
  ],
  cabins: {
    owners: [
      '/photos/explora_4/Cabins/owners_residences/OR1-Deck8-1.webp',
      '/photos/explora_4/Cabins/owners_residences/OR1-Deck8-5.webp',
      '/photos/explora_4/Cabins/owners_residences/OR1-Deck8-6.webp',
      '/photos/explora_4/Cabins/owners_residences/OR1-Deck8-8.webp',
      '/photos/explora_4/Cabins/owners_residences/OR1-Deck8-10.webp',
    ],
    cocoon: [
      '/photos/explora_4/Cabins/Cocoon_Residences/Cocoon-Residence-3-1.webp',
      '/photos/explora_4/Cabins/Cocoon_Residences/Cocoon-Residence-4-1.webp',
      '/photos/explora_4/Cabins/Cocoon_Residences/Cocoon-Residence-13-1.webp',
      '/photos/explora_4/Cabins/Cocoon_Residences/Cocoon-Residence-14-1.webp',
    ],
    cove: [
      '/photos/explora_4/Cabins/Cove_Residences/Cove-Residence-1-2.webp',
      '/photos/explora_4/Cabins/Cove_Residences/Cove-Residence-2-2.webp',
      '/photos/explora_4/Cabins/Cove_Residences/Cove-Residence-3-2.webp',
      '/photos/explora_4/Cabins/Cove_Residences/Cove-Residence-4-2.webp',
      '/photos/explora_4/Cabins/Cove_Residences/Cove-Residence--5.webp',
    ],
    grandPenthouse: [
      '/photos/explora_4/Cabins/Grand_Penthouses/Grand-Penthouse-1-1.webp',
      '/photos/explora_4/Cabins/Grand_Penthouses/Grand-Penthouse-2-1.webp',
      '/photos/explora_4/Cabins/Grand_Penthouses/Grand-Penthouse-4-1.webp',
      '/photos/explora_4/Cabins/Grand_Penthouses/Grand-Penthouse-5-1.webp',
    ],
    premierPenthouse: [
      '/photos/explora_4/Cabins/Premier_Penthouses/Premier-Penthouse-2.webp',
      '/photos/explora_4/Cabins/Premier_Penthouses/Premier-Penthouse-3.webp',
      '/photos/explora_4/Cabins/Premier_Penthouses/Premier-Penthouse-11.webp',
    ],
    penthouse: [
      '/photos/explora_4/Cabins/Penthouses/Deluxe-Penthouse--2.webp',
      '/photos/explora_4/Cabins/Penthouses/Deluxe-Penthouse-3-1.webp',
      '/photos/explora_4/Cabins/Penthouses/Deluxe-Penthouse-5-5.webp',
      '/photos/explora_4/Cabins/Penthouses/Deluxe-Penthouse-7-1.webp',
    ],
    retreat: [
      '/photos/explora_4/Cabins/Retreat_Residences/Retreat-Residence-1-1.webp',
      '/photos/explora_4/Cabins/Retreat_Residences/Retreat-Residence-3-1.webp',
      '/photos/explora_4/Cabins/Retreat_Residences/Retreat-Residence-4-1.webp',
      '/photos/explora_4/Cabins/Retreat_Residences/Retreat-Residence-5-1.webp',
    ],
  },
};

// ═════════════════════════ EXPLORA V ════════════════════════════════════
const EXPLORA_V: ShipAssets = {
  shipCode: 'explora-v',
  shipNumber: 5,
  preview: '/photos/explora_5/ship_photo/EXV-Preview-Image.webp',
  hero: '/photos/explora_5/ship_photo/EXV-Preview-Image.webp',
  exterior: [
    '/photos/explora_5/ship_photo/EXV-Preview-Image.webp',
  ],
  onboard: [
    { key: 'explora-sky-lounge', name: 'Explora Sky Lounge', src: '/photos/explora_5/Onboard/EXPLORA-SKY-LOUNGE-2.webp' },
    { key: 'nautilus-lounge', name: 'Nautilus Lounge', src: '/photos/explora_5/Onboard/EXPLORA-NAUTILUS-LOUNGE-1.webp' },
    { key: 'sakura', name: 'Sakura', src: '/photos/explora_5/Onboard/Sakura-food.webp' },
    { key: 'in-suite-dining', name: 'In-Suite Dining', src: '/photos/explora_5/Onboard/In-Suite-Dining.webp' },
    { key: 'ocean-wellness-spa', name: 'Ocean Wellness Spa', src: '/photos/explora_5/Onboard/OCEAN-WELLNESS-SPA-6.webp' },
    { key: 'explora-journeys-lounge', name: 'Explora Journeys Lounge', src: '/photos/explora_5/Onboard/EXPLORA-JOURNEYS-LOUNGE-1.webp' },
  ],
  decks: [
    { deck: 3, src: '/photos/explora_5/Deck_Plans/Deck-03.png' },
    { deck: 4, src: '/photos/explora_5/Deck_Plans/Deck-04.png' },
    { deck: 5, src: '/photos/explora_5/Deck_Plans/Deck-05.png' },
    { deck: 6, src: '/photos/explora_5/Deck_Plans/Deck-06.png' },
    { deck: 7, src: '/photos/explora_5/Deck_Plans/Deck-07.png' },
    { deck: 8, src: '/photos/explora_5/Deck_Plans/Deck-08.png' },
    { deck: 9, src: '/photos/explora_5/Deck_Plans/Deck-09.png' },
    { deck: 10, src: '/photos/explora_5/Deck_Plans/Deck-10.png' },
    { deck: 11, src: '/photos/explora_5/Deck_Plans/Deck-11.png' },
    { deck: 12, src: '/photos/explora_5/Deck_Plans/Deck-12.png' },
    { deck: 14, src: '/photos/explora_5/Deck_Plans/Deck-14.png' },
  ],
  cabins: {
    owners: [
      '/photos/explora_5/Cabins/owners_residences/OR1-Deck8-1.webp',
      '/photos/explora_5/Cabins/owners_residences/OR1-Deck8-5.webp',
      '/photos/explora_5/Cabins/owners_residences/OR1-Deck8-6.webp',
      '/photos/explora_5/Cabins/owners_residences/OR1-Deck8-8.webp',
    ],
    cocoon: [
      '/photos/explora_5/Cabins/Cocoon_Residences/Cocoon-Residence-3-1.webp',
      '/photos/explora_5/Cabins/Cocoon_Residences/Cocoon-Residence-4-1.webp',
      '/photos/explora_5/Cabins/Cocoon_Residences/Cocoon-Residence-13-1.webp',
      '/photos/explora_5/Cabins/Cocoon_Residences/Cocoon-Residence-14-1.webp',
    ],
    cove: [
      '/photos/explora_5/Cabins/Cove_Residences/Cove-Residence-1-2.webp',
      '/photos/explora_5/Cabins/Cove_Residences/Cove-Residence-2-2.webp',
      '/photos/explora_5/Cabins/Cove_Residences/Cove-Residence-3-2.webp',
      '/photos/explora_5/Cabins/Cove_Residences/Cove-Residence--5.webp',
    ],
    grandPenthouse: [
      '/photos/explora_5/Cabins/Grand_Penthouses/Grand-Penthouse-1-1.webp',
      '/photos/explora_5/Cabins/Grand_Penthouses/Grand-Penthouse-2-1.webp',
      '/photos/explora_5/Cabins/Grand_Penthouses/Grand-Penthouse-4-1.webp',
      '/photos/explora_5/Cabins/Grand_Penthouses/Grand-Penthouse-5-1.webp',
    ],
    premierPenthouse: [
      '/photos/explora_5/Cabins/Premier_Penthouses/Premier-Penthouse-2.webp',
      '/photos/explora_5/Cabins/Premier_Penthouses/Premier-Penthouse-3.webp',
      '/photos/explora_5/Cabins/Premier_Penthouses/Premier-Penthouse-11.webp',
    ],
    penthouse: [
      '/photos/explora_5/Cabins/Penthouses/Deluxe-Penthouse--2.webp',
      '/photos/explora_5/Cabins/Penthouses/Deluxe-Penthouse-3-1.webp',
      '/photos/explora_5/Cabins/Penthouses/Deluxe-Penthouse-5-5.webp',
    ],
    retreat: [
      '/photos/explora_5/Cabins/Retreat_Residences/Retreat-Residence-1-1.webp',
      '/photos/explora_5/Cabins/Retreat_Residences/Retreat-Residence-3-1.webp',
      '/photos/explora_5/Cabins/Retreat_Residences/Retreat-Residence-4-1.webp',
    ],
  },
};

// ═════════════════════════ EXPLORA VI (coming soon) ═════════════════════
// Limited asset set — placeholder hero from ship_photo/img.jpeg, deck plans
// share the un-prefixed Deck-NN.png set, NO cabin photos yet.
const EXPLORA_VI: ShipAssets = {
  shipCode: 'explora-vi',
  shipNumber: 6,
  preview: '/photos/explora_6/ship_photo/img.jpeg',
  hero: '/photos/explora_6/ship_photo/img.jpeg',
  exterior: [
    '/photos/explora_6/ship_photo/img.jpeg',
    '/photos/explora_6/ship_photo/img (1).jpeg',
    '/photos/explora_6/ship_photo/img (2).jpeg',
    '/photos/explora_6/ship_photo/img (6).jpeg',
  ],
  onboard: [
    { key: 'anthology', name: 'Anthology', src: '/photos/explora_6/Onboard/Anthology-12.webp' },
    { key: 'entertainment', name: 'Entertainment', src: '/photos/explora_6/Onboard/Entertainment-13.webp' },
    { key: 'nautilus-lounge', name: 'Nautilus Lounge', src: '/photos/explora_6/Onboard/EXPLORA-NAUTILUS-LOUNGE-1.webp' },
    { key: 'ocean-wellness-spa', name: 'Ocean Wellness Spa', src: '/photos/explora_6/Onboard/OCEAN-WELLNESS-SPA-6.webp' },
    { key: 'perfect-host', name: 'The Perfect Host', src: '/photos/explora_6/Onboard/The-Perfect-Host-2.webp' },
  ],
  decks: [
    { deck: 3, src: '/photos/explora_6/Deck_Plans/Deck-03.png' },
    { deck: 4, src: '/photos/explora_6/Deck_Plans/Deck-04.png' },
    { deck: 5, src: '/photos/explora_6/Deck_Plans/Deck-05.png' },
    { deck: 6, src: '/photos/explora_6/Deck_Plans/Deck-06.png' },
    { deck: 7, src: '/photos/explora_6/Deck_Plans/Deck-07.png' },
    { deck: 8, src: '/photos/explora_6/Deck_Plans/Deck-08.png' },
    { deck: 9, src: '/photos/explora_6/Deck_Plans/Deck-09.png' },
    { deck: 10, src: '/photos/explora_6/Deck_Plans/Deck-10.png' },
    { deck: 11, src: '/photos/explora_6/Deck_Plans/Deck-11.png' },
    { deck: 12, src: '/photos/explora_6/Deck_Plans/Deck-12.png' },
    { deck: 14, src: '/photos/explora_6/Deck_Plans/Deck-14.png' },
  ],
  cabins: {
    // Explora VI cabins not photographed yet — fall back to Explora I imagery.
    owners: EXPLORA_I.cabins.owners,
    cocoon: EXPLORA_I.cabins.cocoon,
    serenity: EXPLORA_I.cabins.serenity,
    retreat: EXPLORA_I.cabins.retreat,
    cove: EXPLORA_I.cabins.cove,
    grandPenthouse: EXPLORA_I.cabins.grandPenthouse,
    premierPenthouse: EXPLORA_I.cabins.premierPenthouse,
    deluxePenthouse: EXPLORA_I.cabins.deluxePenthouse,
    penthouse: EXPLORA_I.cabins.penthouse,
    oceanGrandTerrace: EXPLORA_I.cabins.oceanGrandTerrace,
    oceanTerrace: EXPLORA_I.cabins.oceanTerrace,
  },
};

export const SHIP_ASSETS: Record<ShipCode, ShipAssets> = {
  'explora-i': EXPLORA_I,
  'explora-ii': EXPLORA_II,
  'explora-iii': EXPLORA_III,
  'explora-iv': EXPLORA_IV,
  'explora-v': EXPLORA_V,
  'explora-vi': EXPLORA_VI,
};

export function getShipAssets(code: string): ShipAssets {
  return SHIP_ASSETS[code as ShipCode] ?? EXPLORA_I;
}

/** Feed ship code (EP01..EP06) → asset slug. Same pairing as `ships` in megaMenu. */
const SHIP_CD_TO_CODE: Record<string, ShipCode> = {
  EP01: 'explora-i',
  EP02: 'explora-ii',
  EP03: 'explora-iii',
  EP04: 'explora-iv',
  EP05: 'explora-v',
  EP06: 'explora-vi',
};

/**
 * Resolve a ship photo from a feed ship code (e.g. "EP01") for journey cards.
 * Defaults to the smaller `preview` image — only 6 unique photos across a
 * results grid, so they cache well. Falls back to Explora I on an unknown code.
 */
export function shipImageForCode(shipCd: string, variant: 'preview' | 'hero' = 'preview'): string {
  const code = SHIP_CD_TO_CODE[shipCd] ?? 'explora-i';
  const assets = getShipAssets(code);
  return assets[variant] ?? assets.hero;
}

/** suite_category code → cabin tier key (for cabin photography). */
const SUITE_TIER: Record<string, TierKey> = {
  OT1: 'oceanTerrace', OT2: 'oceanTerrace', OT3: 'oceanTerrace', OT4: 'oceanTerrace',
  GT: 'oceanGrandTerrace',
  PH: 'penthouse', DP: 'deluxePenthouse', PP: 'premierPenthouse',
  GP: 'grandPenthouse', GPJ: 'grandPenthouse',
  CO: 'cove', CO1: 'cove', COJ: 'cove', CR: 'cocoon',
  RR: 'retreat', SR: 'serenity',
  OR: 'owners', OR1: 'owners', OR2: 'owners',
};

/** A cabin photo for a journey's ship + suite_category, falling back to the ship preview. */
export function cabinImageForSuite(shipCd: string, suiteCode: string): string {
  const code = SHIP_CD_TO_CODE[shipCd] ?? 'explora-i';
  const assets = getShipAssets(code);
  const tier = SUITE_TIER[suiteCode];
  return (tier && assets.cabins[tier]?.[0]) || assets.preview || assets.hero;
}

/**
 * The FULL list of cabin photos for a journey's ship + suite_category, for a
 * gallery/carousel. Mirrors cabinImageForSuite but returns every photo of the
 * tier; falls back to a single-image array ([preview] or [hero]) when the tier
 * has no photos (e.g. an un-photographed suite). Always returns ≥1 path.
 */
export function cabinImagesForSuite(shipCd: string, suiteCode: string): string[] {
  const code = SHIP_CD_TO_CODE[shipCd] ?? 'explora-i';
  const assets = getShipAssets(code);
  const tier = SUITE_TIER[suiteCode];
  const imgs = tier ? assets.cabins[tier] : undefined;
  return imgs && imgs.length > 0 ? imgs : [assets.preview || assets.hero];
}

/** Map a suite_category code (CR, DP, GP, OT2…) to its tier key — used to look
 *  up the tier's display copy (name/tagline) from the locale `ship.tiers`. */
export function suiteTierKey(suiteCode: string): TierKey | undefined {
  return SUITE_TIER[suiteCode];
}
