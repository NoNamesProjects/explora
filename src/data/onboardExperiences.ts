/**
 * Per-ship onboard experience catalogue, grouped by category.
 *
 * Venue NAMES are factual taxonomy (Sakura, Fil Rouge, Cartier Boutique, Ocean
 * Wellness Spa…) and are kept verbatim; the marketing one-liners live in i18n
 * under `onboard.desc.*` and are original copy. Photo `src` values are verified
 * real files under public/photos (same library that feeds shipAssets.ts).
 *
 * A category that is absent for a ship simply has no entry → its tab is omitted
 * by the consuming component. Thin ships carry a single card per category.
 */

import type { ShipCode } from '@/lib/shipAssets';

export type OnboardCategory = 'dining' | 'lounging' | 'wellness' | 'shopping';

export const ONBOARD_CATEGORIES = ['dining', 'lounging', 'wellness', 'shopping'] as const;

export const CATEGORY_LABEL_KEY: Record<OnboardCategory, string> = {
  dining: 'mega.experience.dining',
  lounging: 'mega.experience.lounging',
  wellness: 'mega.experience.wellness',
  shopping: 'mega.experience.shopping',
};

export interface OnboardItem {
  key: string;
  name: string;
  src: string;
  descKey: string;
}

// Shared lounging venues — identical across the Explora I/II/III sister-ship trio
// (same physical layout), sourced from each ship's own onboard-experience/lounging folder.
function loungingTrio(shipDir: 'Explora_1' | 'explora_2' | 'explora_3'): OnboardItem[] {
  const base = `/photos/${shipDir}/onboard-experience/lounging`;
  return [
    { key: 'astern-lounge', name: 'Astern Lounge', src: `${base}/OEX-ASTERN-LOUNGE.webp`, descKey: 'onboard.desc.asternLounge' },
    { key: 'astern-pool-bar', name: 'Astern Pool & Bar', src: `${base}/OEX-ASTERN-POOL-&-BAR.webp`, descKey: 'onboard.desc.asternPoolBar' },
    { key: 'atoll-pool-bar', name: 'Atoll Pool & Bar', src: `${base}/OEX-ATOLL-POOL-&-BAR-1.webp`, descKey: 'onboard.desc.atollPool' },
    { key: 'crema-cafe', name: 'Crema Café', src: `${base}/OEX-CREMA-CAFE.webp`, descKey: 'onboard.desc.cremaCafe' },
    { key: 'gelateria-conservatory', name: 'Gelateria & Crêperie at The Conservatory', src: `${base}/OEX-GELATERIA-&-CREPERIE-AT-THE-CONSERVATORY.webp`, descKey: 'onboard.desc.gelateriaConservatory' },
    { key: 'helios-pool-bar', name: 'Helios Pool & Bar', src: `${base}/OEX-HELIOS-POOL-&-BAR.webp`, descKey: 'onboard.desc.heliosPoolBar' },
    { key: 'malt-whisky-bar', name: 'Malt Whisky Bar', src: `${base}/OEX-MALT-WHISKY-BAR.webp`, descKey: 'onboard.desc.maltWhiskyBar' },
    { key: 'sky-bar-14', name: 'Sky Bar on 14', src: `${base}/OEX-SKY-BAR-ON-14.webp`, descKey: 'onboard.desc.skyBar14' },
    { key: 'conservatory-pool-bar', name: 'The Conservatory Pool & Bar', src: `${base}/OEX-THE-CONSERVATORY-POOL-&-BAR.webp`, descKey: 'onboard.desc.conservatoryPoolBar' },
  ];
}

// Shared wellness add-ons (Beauty / Wellbeing) — identical across the trio.
function wellnessTrio(shipDir: 'Explora_1' | 'explora_2' | 'explora_3'): OnboardItem[] {
  const base = `/photos/${shipDir}/onboard-experience/wellness`;
  return [
    { key: 'beauty-salon', name: 'Beauty Salon', src: `${base}/OEX-BEAUTY.webp`, descKey: 'onboard.desc.beautySalon' },
    { key: 'wellbeing', name: 'Wellbeing', src: `${base}/OEX-WELLBEING.webp`, descKey: 'onboard.desc.wellbeing' },
  ];
}

// Shared shopping add-ons (everything but Cartier, which each ship already keeps its own photo for).
function shoppingTrio(shipDir: 'Explora_1' | 'explora_2' | 'explora_3'): OnboardItem[] {
  const base = `/photos/${shipDir}/onboard-experience/shopping`;
  return [
    { key: 'panerai', name: 'Panerai', src: `${base}/OEX-PANERAI.webp`, descKey: 'onboard.desc.panerai' },
    { key: 'piaget', name: 'Piaget', src: `${base}/OEX-PIAGET.webp`, descKey: 'onboard.desc.piaget' },
    { key: 'rolex', name: 'Rolex', src: `${base}/OEX-ROLEX.webp`, descKey: 'onboard.desc.rolex' },
    { key: 'the-journey', name: 'The Journey', src: `${base}/OEX-THE-JOURNEY.webp`, descKey: 'onboard.desc.theJourney' },
  ];
}

export const ONBOARD_EXPERIENCES: Record<ShipCode, Partial<Record<OnboardCategory, OnboardItem[]>>> = {
  // ═══════════════════════ EXPLORA I (photo-rich) ════════════════════════
  'explora-i': {
    dining: [
      { key: 'sakura', name: 'Sakura', src: '/photos/Explora_1/Onboard/SAKURA-0.webp', descKey: 'onboard.desc.sakura' },
      { key: 'fil-rouge', name: 'Fil Rouge', src: '/photos/Explora_1/Onboard/resturants/Explora---Fil-Rouge-large.webp', descKey: 'onboard.desc.filRouge' },
      { key: 'marble-grill', name: 'Marble & Co. Grill', src: '/photos/Explora_1/Onboard/resturants/Explora---Marble-&-Co.-Grill-large.webp', descKey: 'onboard.desc.marbleGrill' },
      { key: 'anthology', name: 'Anthology', src: '/photos/Explora_1/Onboard/resturants/Explora---Anthology-large.webp', descKey: 'onboard.desc.anthology' },
      { key: 'med-yacht-club', name: 'Med Yacht Club', src: '/photos/Explora_1/Onboard/resturants/Explora---Med-Yacht-Club-large.webp', descKey: 'onboard.desc.medYachtClub' },
      { key: 'emporium', name: 'Emporium Marketplace', src: '/photos/Explora_1/Onboard/resturants/Explora---Emporium-large.webp', descKey: 'onboard.desc.emporium' },
      { key: 'in-suite-dining', name: 'In-Suite Dining', src: '/photos/Explora_1/Onboard/In-Suite-Dining.webp', descKey: 'onboard.desc.inSuiteDining' },
    ],
    lounging: [
      { key: 'explora-lounge', name: 'Explora Lounge', src: '/photos/Explora_1/Onboard/EXPLORA-LOUNGE-8.webp', descKey: 'onboard.desc.exploraLounge' },
      { key: 'journeys-lounge', name: 'Explora Journeys Lounge', src: '/photos/Explora_1/Onboard/EXPLORA-JOURNEYS-LOUNGE-7.webp', descKey: 'onboard.desc.journeysLounge' },
      { key: 'crema-cafe', name: 'Crema Café', src: '/photos/Explora_1/Onboard/resturants/Explora---Crema-Cafe-large.webp', descKey: 'onboard.desc.cremaCafe' },
      { key: 'lobby-bar', name: 'Lobby Bar', src: '/photos/Explora_1/onboard-experience/lounging/OEX-LOBBY-BAR.webp', descKey: 'onboard.desc.lobby' },
      ...loungingTrio('Explora_1'),
    ],
    wellness: [
      { key: 'ocean-wellness-spa', name: 'Ocean Wellness Spa', src: '/photos/Explora_1/Onboard/Spa/EXPLORA-I_WELLNESS_02-large.webp', descKey: 'onboard.desc.oceanWellnessSpa' },
      { key: 'thermal-suite', name: 'Thermal Suite', src: '/photos/Explora_1/Onboard/Spa/EXPLORA-I_WELLNESS_04-large.webp', descKey: 'onboard.desc.thermalSuite' },
      { key: 'relaxation-pool', name: 'Relaxation Pool', src: '/photos/Explora_1/Onboard/Spa/EXPLORA-I_WELLNESS_05-large.webp', descKey: 'onboard.desc.relaxationPool' },
      { key: 'treatment-rooms', name: 'Treatment Rooms', src: '/photos/Explora_1/Onboard/Spa/EXPLORA-I_WELLNESS_09-large.webp', descKey: 'onboard.desc.treatmentRooms' },
      { key: 'spa-lounge', name: 'Spa Lounge', src: '/photos/Explora_1/Onboard/Spa/EXPLORA-I_WELLNESS_13-large.webp', descKey: 'onboard.desc.spaLounge' },
      { key: 'fitness-centre', name: 'Fitness Centre', src: '/photos/Explora_1/Onboard/FITNESS-CENTRE-0.webp', descKey: 'onboard.desc.fitnessCentre' },
      ...wellnessTrio('Explora_1'),
    ],
    shopping: [
      { key: 'cartier', name: 'Cartier Boutique', src: '/photos/Explora_1/onboard-experience/shopping/OEX-CARTIER.webp', descKey: 'onboard.desc.cartier' },
      ...shoppingTrio('Explora_1'),
    ],
  },

  // ═══════════════════════ EXPLORA II ════════════════════════════════════
  'explora-ii': {
    dining: [
      { key: 'fil-rouge', name: 'Fil Rouge', src: '/photos/explora_2/Onboard/FIL-ROUGE-22.webp', descKey: 'onboard.desc.filRouge' },
      { key: 'anthology', name: 'Anthology', src: '/photos/explora_2/onboard-experience/dining/OEX-ANTHOLOGY.webp', descKey: 'onboard.desc.anthology' },
      { key: 'emporium', name: 'Emporium Marketplace', src: '/photos/explora_2/onboard-experience/dining/OEX-EMPORIUM-MARKETPLACE.webp', descKey: 'onboard.desc.emporium' },
      { key: 'marble-grill', name: 'Marble & Co. Grill', src: '/photos/explora_2/onboard-experience/dining/OEX-MARBLE-&-CO-GRILL.webp', descKey: 'onboard.desc.marbleGrill' },
      { key: 'med-yacht-club', name: 'Med Yacht Club', src: '/photos/explora_2/onboard-experience/dining/OEX-MED-YACHT-CLUB.webp', descKey: 'onboard.desc.medYachtClub' },
      { key: 'sakura', name: 'Sakura', src: '/photos/explora_2/onboard-experience/dining/OEX-SAKURA.webp', descKey: 'onboard.desc.sakura' },
    ],
    lounging: [
      { key: 'journeys-lounge', name: 'Explora Journeys Lounge', src: '/photos/explora_2/Onboard/EXPLORA-JOURNEYS-LOUNGE-10.webp', descKey: 'onboard.desc.journeysLounge' },
      { key: 'lobby-bar', name: 'Lobby Bar', src: '/photos/explora_2/Onboard/Lobby-12.webp', descKey: 'onboard.desc.lobby' },
      { key: 'explora-lounge', name: 'Explora Lounge', src: '/photos/explora_2/onboard-experience/lounging/OEX-EXPLORA-LOUNGE.webp', descKey: 'onboard.desc.exploraLounge' },
      ...loungingTrio('explora_2'),
    ],
    wellness: [
      { key: 'ocean-wellness-spa', name: 'Ocean Wellness Spa', src: '/photos/explora_2/Onboard/OCEAN-WELLNESS-SPA-7.webp', descKey: 'onboard.desc.oceanWellnessSpa' },
      { key: 'fitness-centre', name: 'Fitness Centre', src: '/photos/explora_2/onboard-experience/wellness/OEX-FITNESS.webp', descKey: 'onboard.desc.fitnessCentre' },
      ...wellnessTrio('explora_2'),
    ],
    shopping: [
      { key: 'cartier', name: 'Cartier Boutique', src: '/photos/explora_2/Onboard/CARTIER-1.webp', descKey: 'onboard.desc.cartier' },
      ...shoppingTrio('explora_2'),
    ],
  },

  // ═══════════════════════ EXPLORA III ═══════════════════════════════════
  'explora-iii': {
    dining: [
      { key: 'med-yacht-club', name: 'Med Yacht Club', src: '/photos/explora_3/onboard/Dining-21.webp', descKey: 'onboard.desc.medYachtClub' },
      { key: 'anthology', name: 'Anthology', src: '/photos/explora_3/onboard-experience/dining/OEX-ANTHOLOGY.webp', descKey: 'onboard.desc.anthology' },
      { key: 'chefs-kitchen', name: "Chef's Kitchen", src: '/photos/explora_3/onboard-experience/dining/OEX-CHEFS.webp', descKey: 'onboard.desc.chefsKitchen' },
      { key: 'emporium', name: 'Emporium Marketplace', src: '/photos/explora_3/onboard-experience/dining/OEX-EMPORIUM-MARKETPLACE.webp', descKey: 'onboard.desc.emporium' },
      { key: 'fil-rouge', name: 'Fil Rouge', src: '/photos/explora_3/onboard-experience/dining/OEX-FIL-ROUGE.webp', descKey: 'onboard.desc.filRouge' },
      { key: 'in-suite-dining', name: 'In-Suite Dining', src: '/photos/explora_3/onboard-experience/dining/OEX-IN-SUITE-DINING.webp', descKey: 'onboard.desc.inSuiteDining' },
      { key: 'marble-grill', name: 'Marble & Co. Grill', src: '/photos/explora_3/onboard-experience/dining/OEX-MARBLE-&-CO-GRILL.webp', descKey: 'onboard.desc.marbleGrill' },
      { key: 'sakura', name: 'Sakura', src: '/photos/explora_3/onboard-experience/dining/OEX-SAKURA.webp', descKey: 'onboard.desc.sakura' },
      { key: 'shore-club', name: 'Shore Club', src: '/photos/explora_3/onboard-experience/dining/OEX-SHORE.webp', descKey: 'onboard.desc.shoreClub' },
    ],
    lounging: [
      { key: 'journeys-lounge', name: 'Explora Journeys Lounge', src: '/photos/explora_3/onboard/EXPLORA-JOURNEYS-LOUNGE-9.webp', descKey: 'onboard.desc.journeysLounge' },
      { key: 'lobby-bar', name: 'Lobby Bar', src: '/photos/explora_3/onboard/Lobby-4-1.webp', descKey: 'onboard.desc.lobby' },
      { key: 'explora-lounge', name: 'Explora Lounge', src: '/photos/explora_3/onboard-experience/lounging/OEX-EXPLORA-LOUNGE.webp', descKey: 'onboard.desc.exploraLounge' },
      ...loungingTrio('explora_3'),
    ],
    wellness: [
      { key: 'sound-wellness', name: 'Sound Wellness', src: '/photos/explora_3/onboard/Sound-wellness.webp', descKey: 'onboard.desc.soundWellness' },
      { key: 'fitness-centre', name: 'Fitness Centre', src: '/photos/explora_3/onboard-experience/wellness/OEX-FITNESS.webp', descKey: 'onboard.desc.fitnessCentre' },
      ...wellnessTrio('explora_3'),
    ],
    shopping: [
      { key: 'chopard', name: 'Chopard Boutique', src: '/photos/explora_3/onboard/Chopard-1.webp', descKey: 'onboard.desc.chopard' },
      { key: 'cartier', name: 'Cartier Boutique', src: '/photos/explora_3/onboard-experience/shopping/OEX-CARTIER.webp', descKey: 'onboard.desc.cartier' },
      ...shoppingTrio('explora_3'),
    ],
  },

  // ═══════════════════════ EXPLORA IV ════════════════════════════════════
  'explora-iv': {
    dining: [
      { key: 'med-yacht-club', name: 'Mediterranean Yacht Club', src: '/photos/explora_4/Onboard/MED-YACHT-CLUB-2.webp', descKey: 'onboard.desc.medYachtClub' },
      { key: 'chefs-kitchen', name: "Chef's Kitchen", src: '/photos/explora_4/onboard-experience/dining/the_chef_table.webp', descKey: 'onboard.desc.chefsKitchen' },
      { key: 'emporium', name: 'Emporium Marketplace', src: '/photos/explora_4/onboard-experience/dining/emporium_marketplace.webp', descKey: 'onboard.desc.emporium' },
      { key: 'in-suite-dining', name: 'In-Suite Dining', src: '/photos/explora_4/onboard-experience/dining/in_suit_Dining.webp', descKey: 'onboard.desc.inSuiteDining' },
      { key: 'shore-club', name: 'Shore Club', src: '/photos/explora_4/onboard-experience/dining/shore_club.webp', descKey: 'onboard.desc.shoreClub' },
    ],
    lounging: [
      { key: 'explora-lounge', name: 'Explora Lounge', src: '/photos/explora_4/Onboard/EXPLORA-LOUNGE-4.webp', descKey: 'onboard.desc.exploraLounge' },
      { key: 'journeys-lounge', name: 'Explora Journeys Lounge', src: '/photos/explora_4/Onboard/EXPLORA-JOURNEYS-LOUNGE-6.webp', descKey: 'onboard.desc.journeysLounge' },
      { key: 'atoll-pool', name: 'Atoll Pool', src: '/photos/explora_4/Onboard/Explora_Atoll_Pool_Kids_1873_MASTER_Medium.webp', descKey: 'onboard.desc.atollPool' },
      { key: 'malt-whisky-bar', name: 'Malt Whisky Bar', src: '/photos/explora_4/Onboard/MALT-WHISKY-BAR-1.webp', descKey: 'onboard.desc.maltWhiskyBar' },
    ],
    wellness: [
      { key: 'fitness-centre', name: 'Fitness Centre', src: '/photos/explora_4/Onboard/FITNESS-CENTRE-4.webp', descKey: 'onboard.desc.fitnessCentre' },
    ],
  },

  // ═══════════════════════ EXPLORA V ═════════════════════════════════════
  'explora-v': {
    dining: [
      { key: 'sakura', name: 'Sakura', src: '/photos/explora_5/Onboard/Sakura-food.webp', descKey: 'onboard.desc.sakura' },
      { key: 'in-suite-dining', name: 'In-Suite Dining', src: '/photos/explora_5/Onboard/In-Suite-Dining.webp', descKey: 'onboard.desc.inSuiteDining' },
    ],
    lounging: [
      { key: 'sky-lounge', name: 'Explora Sky Lounge', src: '/photos/explora_5/Onboard/EXPLORA-SKY-LOUNGE-2.webp', descKey: 'onboard.desc.skyLounge' },
      { key: 'nautilus-lounge', name: 'Nautilus Lounge', src: '/photos/explora_5/Onboard/EXPLORA-NAUTILUS-LOUNGE-1.webp', descKey: 'onboard.desc.nautilusLounge' },
      { key: 'journeys-lounge', name: 'Explora Journeys Lounge', src: '/photos/explora_5/Onboard/EXPLORA-JOURNEYS-LOUNGE-1.webp', descKey: 'onboard.desc.journeysLounge' },
    ],
    wellness: [
      { key: 'ocean-wellness-spa', name: 'Ocean Wellness Spa', src: '/photos/explora_5/Onboard/OCEAN-WELLNESS-SPA-6.webp', descKey: 'onboard.desc.oceanWellnessSpa' },
    ],
  },

  // ═══════════════════════ EXPLORA VI ════════════════════════════════════
  'explora-vi': {
    dining: [
      { key: 'anthology', name: 'Anthology', src: '/photos/explora_6/Onboard/Anthology-12.webp', descKey: 'onboard.desc.anthology' },
    ],
    lounging: [
      { key: 'nautilus-lounge', name: 'Nautilus Lounge', src: '/photos/explora_6/Onboard/EXPLORA-NAUTILUS-LOUNGE-1.webp', descKey: 'onboard.desc.nautilusLounge' },
    ],
    wellness: [
      { key: 'ocean-wellness-spa', name: 'Ocean Wellness Spa', src: '/photos/explora_6/Onboard/OCEAN-WELLNESS-SPA-6.webp', descKey: 'onboard.desc.oceanWellnessSpa' },
    ],
  },
};

/** Feed ship code (EP01..EP06) → asset slug. Mirrors shipAssets.ts pairing. */
const SHIP_CD_TO_CODE: Record<string, ShipCode> = {
  EP01: 'explora-i',
  EP02: 'explora-ii',
  EP03: 'explora-iii',
  EP04: 'explora-iv',
  EP05: 'explora-v',
  EP06: 'explora-vi',
};

/**
 * Resolve the onboard catalogue for a feed ship code (e.g. "EP01").
 * Falls back to Explora I on an unknown/empty code.
 */
export function getOnboardExperiences(
  shipCd: string | null | undefined,
): Partial<Record<OnboardCategory, OnboardItem[]>> {
  const code: ShipCode = (shipCd ? SHIP_CD_TO_CODE[shipCd] : undefined) ?? 'explora-i';
  return ONBOARD_EXPERIENCES[code] ?? ONBOARD_EXPERIENCES['explora-i'];
}
