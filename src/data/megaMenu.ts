/**
 * Structural data for the global mega-menu + footer.
 * Labels reference i18n keys in src/locales/{en,el}.json — keep them in sync.
 * All copy is generic navigation vocabulary; partner replaces in the locale files.
 *
 * Live brand has 6 top-level mega-nav triggers (captured 2026-05-24 via WebFetch):
 *   Destinations · Journeys Collections · Ships · The Explora Experience · Why Explora · Offers
 * And 6 footer columns:
 *   Professional Spaces · Plan Your Journeys · About · Legal · Social · Switcher (bottom band)
 */

import { HIDDEN_SHIP_CODES } from '@/data/shipVisibility';

export interface MegaLink {
  labelKey: string;
  href: string;
  badge?: string; // i18n key for a small pill (e.g. "Coming soon")
  comingSoon?: boolean; // render as a non-navigating "Soon" item (page not built yet)
}

export interface MegaColumn {
  headingKey?: string;
  links: MegaLink[];
}

export interface MegaFeaturedCard {
  image: string;
  eyebrowKey?: string;
  titleKey: string;
  href: string;
}

export interface MegaPanel {
  triggerKey: string;
  /** If set, clicking the top-level trigger navigates here (the dropdown still opens on hover). */
  triggerHref?: string;
  columns: MegaColumn[];
  featured?: MegaFeaturedCard[];
}

export const megaMenu: MegaPanel[] = [
  // ── 1. DESTINATIONS ────────────────────────────────────────────────────
  {
    triggerKey: 'nav.destinations',
    triggerHref: '/destinations',
    columns: [
      {
        headingKey: 'mega.destinations.destinationsHeading',
        links: [
          { labelKey: 'mega.destinations.regions.mediterranean', href: '/destinations/mediterranean' },
          { labelKey: 'mega.destinations.regions.caribbean', href: '/destinations/caribbean' },
          { labelKey: 'mega.destinations.regions.alaska', href: '/destinations/alaska' },
          { labelKey: 'mega.destinations.regions.asia', href: '/destinations/asia' },
          { labelKey: 'mega.destinations.regions.northernEurope', href: '/destinations/northern-europe' },
          { labelKey: 'mega.destinations.regions.transatlantic', href: '/destinations/transatlantic' },
          { labelKey: 'mega.destinations.regions.arabian', href: '/destinations/arabian' },
          { labelKey: 'mega.destinations.regions.southAmerica', href: '/destinations/south-america' },
          { labelKey: 'mega.destinations.regions.pacificCoast', href: '/destinations/pacific-coast' },
          { labelKey: 'mega.destinations.regions.canadaNewEngland', href: '/destinations/canada-new-england' },
          { labelKey: 'mega.destinations.regions.worldJourney', href: '/destinations/world-journey' },
          { labelKey: 'mega.destinations.allDestinations', href: '/destinations' },
        ],
      },
    ],
  },

  // ── 2. JOURNEYS COLLECTIONS ────────────────────────────────────────────
  {
    triggerKey: 'nav.journeysCollections',
    columns: [
      {
        headingKey: 'mega.collections.heading',
        links: [
          { labelKey: 'mega.collections.summer2026', href: '/collections/summer-2026' },
          { labelKey: 'mega.collections.winter2026', href: '/collections/winter-2026-27' },
          { labelKey: 'mega.collections.summer2027', href: '/collections/summer-2027' },
          { labelKey: 'mega.collections.winter2027', href: '/collections/winter-2027-28' },
          { labelKey: 'mega.collections.summer2028', href: '/collections/summer-2028' },
          { labelKey: 'mega.collections.christmas', href: '/collections/festive-season' },
          { labelKey: 'mega.collections.extendedJourneys', href: '/collections/grand-extended' },
        ],
      },
      {
        links: [
          { labelKey: 'mega.collections.f1Monaco', href: '/collections/f1-monaco' },
          { labelKey: 'mega.collections.worldJourney2029', href: '/destinations/world-journey' },
        ],
      },
    ],
    featured: [
      { image: 'explora/placeholder/collection-summer', titleKey: 'mega.collections.summer2026', href: '/collections/summer-2026' },
    ],
  },

  // ── 3. SHIPS ───────────────────────────────────────────────────────────
  {
    triggerKey: 'nav.ships',
    triggerHref: '/ships',
    columns: [
      {
        headingKey: 'mega.ships.heading',
        links: [
          { labelKey: 'mega.ships.exploraI', href: '/ships/explora-i' },
          { labelKey: 'mega.ships.exploraII', href: '/ships/explora-ii' },
          { labelKey: 'mega.ships.exploraIII', href: '/ships/explora-iii' },
          { labelKey: 'mega.ships.exploraIV', href: '/ships/explora-iv' },
          // EXPLORA V/VI hidden until launch — see src/data/shipVisibility.ts
        ],
      },
    ],
  },

  // ── 4. THE EXPLORA EXPERIENCE ──────────────────────────────────────────
  {
    triggerKey: 'nav.experience',
    columns: [
      {
        headingKey: 'mega.experience.lifeOnboard',
        links: [
          { labelKey: 'mega.experience.suites', href: '/experience/suites' },
          { labelKey: 'mega.experience.dining', href: '/experience/dining' },
          { labelKey: 'mega.experience.wellness', href: '/experience/wellness' },
          { labelKey: 'mega.experience.lounging', href: '/life-on-explora/lounging', comingSoon: true },
          { labelKey: 'mega.experience.entertainment', href: '/life-on-explora/entertainment', comingSoon: true },
          { labelKey: 'mega.experience.shopping', href: '/life-on-explora/shopping', comingSoon: true },
          { labelKey: 'mega.experience.multigen', href: '/life-on-explora/multi-generational', comingSoon: true },
          { labelKey: 'mega.experience.inclusions', href: '/life-on-explora/inclusions', comingSoon: true },
        ],
      },
    ],
    featured: [
      { image: 'explora/placeholder/dining', titleKey: 'mega.experience.dining', href: '/experience/dining' },
    ],
  },

  // ── 5. WHY EXPLORA JOURNEYS ────────────────────────────────────────────
  {
    triggerKey: 'nav.whyExplora',
    columns: [
      {
        headingKey: 'mega.why.heading',
        links: [
          { labelKey: 'mega.why.suites', href: '/suites/overview' },
          { labelKey: 'mega.why.ourStory', href: '/about' },
          { labelKey: 'mega.why.sustainability', href: '/sustainability' },
          { labelKey: 'mega.why.awards', href: '/awards' },
          { labelKey: 'mega.why.exploraClub', href: '/explora-club' },
          { labelKey: 'mega.why.ambassadors', href: '/ambassadors' },
          { labelKey: 'mega.why.imageGallery', href: '/image-gallery' },
          { labelKey: 'mega.why.oceanStateOfMind', href: '/ocean-state-of-mind' },
        ],
      },
    ],
    featured: [
      { image: 'explora/placeholder/why-explora', titleKey: 'mega.why.oceanStateOfMind', href: '/ocean-state-of-mind' },
    ],
  },

  // ── 6. OFFERS & FARES ──────────────────────────────────────────────────
  {
    triggerKey: 'nav.offers',
    columns: [
      {
        headingKey: 'mega.offers.exclusiveHeading',
        links: [
          { labelKey: 'mega.offers.invitation', href: '/offers/an-invitation' },
          { labelKey: 'mega.offers.spontaneousSummer', href: '/offers/spontaneous-summer' },
          { labelKey: 'mega.offers.earlyBird', href: '/offers/early-booking' },
          { labelKey: 'mega.offers.solo', href: '/offers/solo' },
          { labelKey: 'mega.offers.additionalGuests', href: '/offers/additional-guests' },
          { labelKey: 'mega.offers.grandJourneys', href: '/offers/grand-journeys' },
          { labelKey: 'mega.offers.giftOfSharing', href: '/offers/gift-of-sharing' },
        ],
      },
      {
        headingKey: 'mega.offers.specialFaresHeading',
        links: [
          { labelKey: 'mega.offers.lastMinute', href: '/offers/last-minute' },
        ],
      },
    ],
  },
];

/**
 * Footer link columns. Every internal link resolves to a real route (no 404s):
 * regions → /destinations/:region, ships → /ships/:code, plus /find-your-journey,
 * /about, /faq, /contact, /legal/*. `#cookies` re-opens the consent banner.
 * Social links are external. Unbuilt-page columns (Professional Spaces, Manage
 * Reservation, Awards, etc.) were removed until those pages exist.
 */
export const footerColumns = [
  {
    titleKey: 'nav.destinations',
    links: [
      { labelKey: 'mega.destinations.regions.mediterranean', href: '/destinations/mediterranean' },
      { labelKey: 'mega.destinations.regions.caribbean', href: '/destinations/caribbean' },
      { labelKey: 'mega.destinations.regions.northernEurope', href: '/destinations/northern-europe' },
      { labelKey: 'mega.destinations.regions.asia', href: '/destinations/asia' },
      { labelKey: 'nav.findAJourney', href: '/find-your-journey' },
      { labelKey: 'mega.destinations.allDestinations', href: '/destinations' },
    ],
  },
  {
    titleKey: 'nav.ships',
    links: [
      { labelKey: 'mega.ships.exploraI', href: '/ships/explora-i' },
      { labelKey: 'mega.ships.exploraII', href: '/ships/explora-ii' },
      { labelKey: 'mega.ships.exploraIII', href: '/ships/explora-iii' },
      { labelKey: 'mega.ships.exploraIV', href: '/ships/explora-iv' },
      // EXPLORA V/VI hidden until launch — see src/data/shipVisibility.ts
    ],
  },
  {
    titleKey: 'footer.about.title',
    links: [
      { labelKey: 'footer.about.story', href: '/about' },
      { labelKey: 'footer.planYourJourneys.faqs', href: '/faq' },
      { labelKey: 'nav.contact', href: '/contact' },
    ],
  },
  {
    titleKey: 'footer.legal.title',
    links: [
      { labelKey: 'footer.legal.cookies', href: '#cookies' },
      { labelKey: 'footer.legal.privacy', href: '/legal/privacy' },
      { labelKey: 'footer.legal.terms', href: '/legal/terms' },
      { labelKey: 'footer.legal.codeOfConduct', href: '/legal/code-of-conduct' },
    ],
  },
  {
    titleKey: 'footer.social.title',
    links: [
      { labelKey: 'footer.social.instagram', href: 'https://instagram.com/explorajourneys', external: true },
      { labelKey: 'footer.social.facebook', href: 'https://facebook.com/Explorajourneysofficial', external: true },
      { labelKey: 'footer.social.tiktok', href: 'https://tiktok.com/@explorajourneys', external: true },
      { labelKey: 'footer.social.youtube', href: 'https://youtube.com/@explorajourneys', external: true },
      { labelKey: 'footer.social.x', href: 'https://x.com/explorajourneys', external: true },
      { labelKey: 'footer.social.linkedin', href: 'https://linkedin.com/company/explora-journeys', external: true },
    ],
  },
];

/** The 6 ships in fleet order (for use in Header/Footer/Home fleet section). */
export const ships = [
  { code: 'explora-i', labelKey: 'mega.ships.exploraI', shipCd: 'EP01' as const, asset: 'explora/placeholder/ship-i' },
  { code: 'explora-ii', labelKey: 'mega.ships.exploraII', shipCd: 'EP02' as const, asset: 'explora/placeholder/ship-ii' },
  { code: 'explora-iii', labelKey: 'mega.ships.exploraIII', shipCd: 'EP03' as const, asset: 'explora/placeholder/ship-iii' },
  { code: 'explora-iv', labelKey: 'mega.ships.exploraIV', shipCd: 'EP04' as const, asset: 'explora/placeholder/ship-iv' },
  { code: 'explora-v', labelKey: 'mega.ships.exploraV', shipCd: 'EP05' as const, asset: 'explora/placeholder/ship-v' },
  { code: 'explora-vi', labelKey: 'mega.ships.exploraVI', shipCd: 'EP06' as const, asset: 'explora/placeholder/ship-vi', comingSoon: true },
];

/** The fleet minus any ship hidden until launch — use this for customer-facing lists. */
export const visibleShips = ships.filter((s) => !HIDDEN_SHIP_CODES.includes(s.code));
