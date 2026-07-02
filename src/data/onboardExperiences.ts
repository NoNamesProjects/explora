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
      { key: 'crema-cafe', name: 'Crema Café', src: '/photos/Explora_1/Onboard/resturants/Explora---Crema-Cafe-large.webp', descKey: 'onboard.desc.cremaCafe' },
      { key: 'in-suite-dining', name: 'In-Suite Dining', src: '/photos/Explora_1/Onboard/In-Suite-Dining.webp', descKey: 'onboard.desc.inSuiteDining' },
    ],
    lounging: [
      { key: 'explora-lounge', name: 'Explora Lounge', src: '/photos/Explora_1/Onboard/EXPLORA-LOUNGE-8.webp', descKey: 'onboard.desc.exploraLounge' },
      { key: 'journeys-lounge', name: 'Explora Journeys Lounge', src: '/photos/Explora_1/Onboard/EXPLORA-JOURNEYS-LOUNGE-7.webp', descKey: 'onboard.desc.journeysLounge' },
      { key: 'the-journey', name: 'The Journey', src: '/photos/Explora_1/Onboard/THE-JOURNEY-1.webp', descKey: 'onboard.desc.theJourney' },
    ],
    wellness: [
      { key: 'ocean-wellness-spa', name: 'Ocean Wellness Spa', src: '/photos/Explora_1/Onboard/Spa/EXPLORA-I_WELLNESS_02-large.webp', descKey: 'onboard.desc.oceanWellnessSpa' },
      { key: 'thermal-suite', name: 'Thermal Suite', src: '/photos/Explora_1/Onboard/Spa/EXPLORA-I_WELLNESS_04-large.webp', descKey: 'onboard.desc.thermalSuite' },
      { key: 'relaxation-pool', name: 'Relaxation Pool', src: '/photos/Explora_1/Onboard/Spa/EXPLORA-I_WELLNESS_05-large.webp', descKey: 'onboard.desc.relaxationPool' },
      { key: 'treatment-rooms', name: 'Treatment Rooms', src: '/photos/Explora_1/Onboard/Spa/EXPLORA-I_WELLNESS_09-large.webp', descKey: 'onboard.desc.treatmentRooms' },
      { key: 'spa-lounge', name: 'Spa Lounge', src: '/photos/Explora_1/Onboard/Spa/EXPLORA-I_WELLNESS_13-large.webp', descKey: 'onboard.desc.spaLounge' },
      { key: 'fitness-centre', name: 'Fitness Centre', src: '/photos/Explora_1/Onboard/FITNESS-CENTRE-0.webp', descKey: 'onboard.desc.fitnessCentre' },
    ],
  },

  // ═══════════════════════ EXPLORA II ════════════════════════════════════
  'explora-ii': {
    dining: [
      { key: 'fil-rouge', name: 'Fil Rouge', src: '/photos/explora_2/Onboard/FIL-ROUGE-22.webp', descKey: 'onboard.desc.filRouge' },
    ],
    lounging: [
      { key: 'journeys-lounge', name: 'Explora Journeys Lounge', src: '/photos/explora_2/Onboard/EXPLORA-JOURNEYS-LOUNGE-10.webp', descKey: 'onboard.desc.journeysLounge' },
      { key: 'lobby', name: 'The Lobby', src: '/photos/explora_2/Onboard/Lobby-12.webp', descKey: 'onboard.desc.lobby' },
    ],
    wellness: [
      { key: 'ocean-wellness-spa', name: 'Ocean Wellness Spa', src: '/photos/explora_2/Onboard/OCEAN-WELLNESS-SPA-7.webp', descKey: 'onboard.desc.oceanWellnessSpa' },
    ],
    shopping: [
      { key: 'cartier', name: 'Cartier Boutique', src: '/photos/explora_2/Onboard/CARTIER-1.webp', descKey: 'onboard.desc.cartier' },
    ],
  },

  // ═══════════════════════ EXPLORA III ═══════════════════════════════════
  'explora-iii': {
    dining: [
      { key: 'med-yacht-club', name: 'Med Yacht Club', src: '/photos/explora_3/onboard/Dining-21.webp', descKey: 'onboard.desc.medYachtClub' },
    ],
    lounging: [
      { key: 'journeys-lounge', name: 'Explora Journeys Lounge', src: '/photos/explora_3/onboard/EXPLORA-JOURNEYS-LOUNGE-9.webp', descKey: 'onboard.desc.journeysLounge' },
      { key: 'lobby', name: 'The Lobby', src: '/photos/explora_3/onboard/Lobby-4-1.webp', descKey: 'onboard.desc.lobby' },
    ],
    wellness: [
      { key: 'sound-wellness', name: 'Sound Wellness', src: '/photos/explora_3/onboard/Sound-wellness.webp', descKey: 'onboard.desc.soundWellness' },
    ],
    shopping: [
      { key: 'chopard', name: 'Chopard Boutique', src: '/photos/explora_3/onboard/Chopard-1.webp', descKey: 'onboard.desc.chopard' },
    ],
  },

  // ═══════════════════════ EXPLORA IV ════════════════════════════════════
  'explora-iv': {
    dining: [
      { key: 'malt-whisky-bar', name: 'Malt Whisky Bar', src: '/photos/explora_4/Onboard/MALT-WHISKY-BAR-1.webp', descKey: 'onboard.desc.maltWhiskyBar' },
    ],
    lounging: [
      { key: 'explora-lounge', name: 'Explora Lounge', src: '/photos/explora_4/Onboard/EXPLORA-LOUNGE-4.webp', descKey: 'onboard.desc.exploraLounge' },
      { key: 'journeys-lounge', name: 'Explora Journeys Lounge', src: '/photos/explora_4/Onboard/EXPLORA-JOURNEYS-LOUNGE-6.webp', descKey: 'onboard.desc.journeysLounge' },
      { key: 'med-yacht-club', name: 'Mediterranean Yacht Club', src: '/photos/explora_4/Onboard/MED-YACHT-CLUB-2.webp', descKey: 'onboard.desc.medYachtClub' },
      { key: 'atoll-pool', name: 'Atoll Pool', src: '/photos/explora_4/Onboard/Explora_Atoll_Pool_Kids_1873_MASTER_Medium.webp', descKey: 'onboard.desc.atollPool' },
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
