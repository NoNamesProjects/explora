/**
 * Experience detail-page configuration for the Life-onboard targets
 * (`/experience/:topic`). Three topics — suites / dining / wellness — each a
 * templated editorial page rendered by `src/routes/Experience.tsx`.
 *
 * Image paths only (verified against /public/photos and sourced from
 * shipAssets.ts conventions); all prose lives in i18n under `experience.*`.
 * Gallery item `name`s are factual venue/suite taxonomy (IP-safe), matching
 * the names used in shipAssets.ts so the carousels read consistently.
 */

export type ExperienceTopic = 'suites' | 'dining' | 'wellness';

export interface ExperienceFeature {
  /** i18n base key, e.g. 'experience.suites.f1' → page reads `.heading` / `.body`. */
  copyKey: string;
  image: string;
}

export interface ExperienceGalleryItem {
  key: string;
  /** Factual venue / suite-tier name (taxonomy — IP-safe). */
  name: string;
  src: string;
}

export interface ExperienceConfig {
  topic: ExperienceTopic;
  i18nKey: string;
  heroImage: string;
  features: ExperienceFeature[];
  gallery: ExperienceGalleryItem[];
  ctaHref: string;
  secondaryCtaHref: string;
}

export const EXPERIENCES: Record<ExperienceTopic, ExperienceConfig> = {
  suites: {
    topic: 'suites',
    i18nKey: 'experience.suites',
    heroImage: '/photos/Explora_1/Cabins/owners_residences/OR_02-1.webp',
    features: [
      { copyKey: 'experience.suites.f1', image: '/photos/Explora_1/Cabins/owners_residences/OR_06-1.webp' },
      { copyKey: 'experience.suites.f2', image: '/photos/Explora_1/Cabins/Cove_Residences/COVE-RESIDENCE-5.webp' },
      { copyKey: 'experience.suites.f3', image: '/photos/Explora_1/Cabins/Penthouses/PENTHOUSE-2.webp' },
    ],
    // Suites uses SuiteTierCarousel on the page (ship.tiers + cabins), but a
    // gallery is provided here as a typed fallback / shared shape.
    gallery: [
      { key: 'owners', name: "Owner's Residence", src: '/photos/Explora_1/Cabins/owners_residences/OR_02-1.webp' },
      { key: 'serenity', name: 'Serenity Residence', src: '/photos/Explora_1/Cabins/Serenity_Residences/SERENITY-RESIDENCE-7.webp' },
      { key: 'retreat', name: 'Retreat Residence', src: '/photos/Explora_1/Cabins/Retreat_Residences/RETREAT-RESIDENCE-4.webp' },
      { key: 'cove', name: 'Cove Residence', src: '/photos/Explora_1/Cabins/Cove_Residences/COVE-RESIDENCE-5.webp' },
      { key: 'grandPenthouse', name: 'Grand Penthouse', src: '/photos/Explora_1/Cabins/Grand_Penthouses/GRAND-PENTHOUSE-2.webp' },
      { key: 'penthouse', name: 'Penthouse', src: '/photos/Explora_1/Cabins/Penthouses/PENTHOUSE-2.webp' },
    ],
    ctaHref: '/find-your-journey',
    secondaryCtaHref: '/contact',
  },

  dining: {
    topic: 'dining',
    i18nKey: 'experience.dining',
    heroImage: '/photos/explora_3/onboard/Dining-21.webp',
    features: [
      { copyKey: 'experience.dining.f1', image: '/photos/Explora_1/Onboard/SAKURA-0.webp' },
      { copyKey: 'experience.dining.f2', image: '/photos/explora_2/Onboard/FIL-ROUGE-22.webp' },
      { copyKey: 'experience.dining.f3', image: '/photos/explora_5/Onboard/In-Suite-Dining.webp' },
    ],
    gallery: [
      { key: 'med-yacht-club', name: 'Med Yacht Club', src: '/photos/explora_3/onboard/Dining-21.webp' },
      { key: 'sakura', name: 'Sakura', src: '/photos/Explora_1/Onboard/SAKURA-0.webp' },
      { key: 'fil-rouge', name: 'Fil Rouge', src: '/photos/explora_2/Onboard/FIL-ROUGE-22.webp' },
      { key: 'in-suite-dining', name: 'In-Suite Dining', src: '/photos/explora_5/Onboard/In-Suite-Dining.webp' },
      { key: 'the-journey', name: 'The Journey', src: '/photos/Explora_1/Onboard/THE-JOURNEY-1.webp' },
    ],
    ctaHref: '/find-your-journey',
    secondaryCtaHref: '/contact',
  },

  wellness: {
    topic: 'wellness',
    i18nKey: 'experience.wellness',
    heroImage: '/photos/explora_2/Onboard/OCEAN-WELLNESS-SPA-7.webp',
    features: [
      { copyKey: 'experience.wellness.f1', image: '/photos/explora_5/Onboard/OCEAN-WELLNESS-SPA-6.webp' },
      { copyKey: 'experience.wellness.f2', image: '/photos/Explora_1/Onboard/FITNESS-CENTRE-0.webp' },
      { copyKey: 'experience.wellness.f3', image: '/photos/explora_3/onboard/Sound-wellness.webp' },
    ],
    gallery: [
      { key: 'ocean-wellness-spa', name: 'Ocean Wellness Spa', src: '/photos/explora_2/Onboard/OCEAN-WELLNESS-SPA-7.webp' },
      { key: 'ocean-wellness-spa-2', name: 'Ocean Wellness Spa', src: '/photos/explora_5/Onboard/OCEAN-WELLNESS-SPA-6.webp' },
      { key: 'fitness-centre', name: 'Fitness Centre', src: '/photos/Explora_1/Onboard/FITNESS-CENTRE-0.webp' },
      { key: 'sound-wellness', name: 'Sound Wellness', src: '/photos/explora_3/onboard/Sound-wellness.webp' },
    ],
    ctaHref: '/find-your-journey',
    secondaryCtaHref: '/contact',
  },
};

export const isExperienceTopic = (t?: string): t is ExperienceTopic =>
  t === 'suites' || t === 'dining' || t === 'wellness';
