/**
 * section_type → React component.
 *
 * This is the frontend half of the contract src/content/sectionTypes.ts declares
 * on the data side: every type in that registry needs an entry here, and adding
 * a NEW type means touching both (a developer task, by design). Adding a new
 * INSTANCE of an existing type touches neither — it's a database write.
 *
 * A type with no renderer is skipped rather than throwing, so a config written
 * by a newer deploy can never white-screen an older client mid-rollout.
 */
import type { ComponentType } from 'react';
import type { PublicSection } from '@/lib/content/useSections';
import {
  HeroSection, RichTextSection, CardsGridSection, ImageBannerSection,
  ChecklistBandSection, CtaBandSection, VideoSection, NewsletterSection,
} from './types/FreeformSections';
import { PackagesTeaserSection, DestinationsRowSection } from './types/StructuralSections';
import {
  ShipHeroSection, ShipTaglineSection, VenueCarouselSection, SpecBandSection,
  SuiteTierSection, DeckPlanSection, ShipLifeOnboardSection, ShipJourneysSection,
  ShipGodmotherSection, RelatedShipsSection,
} from './types/ShipSections';
import { StatBandSection, FleetRegisterSection } from './types/MiscSections';

export type SectionRenderer = ComponentType<{ section: PublicSection }>;

export const SECTION_RENDERERS: Record<string, SectionRenderer> = {
  // freeform
  hero: HeroSection,
  'rich-text': RichTextSection,
  'cards-grid': CardsGridSection,
  'image-banner': ImageBannerSection,
  'checklist-band': ChecklistBandSection,
  'cta-band': CtaBandSection,
  video: VideoSection,
  'newsletter-band': NewsletterSection,
  'stat-band': StatBandSection,
  // structural (live data, chrome-only editing)
  'packages-teaser': PackagesTeaserSection,
  'destinations-row': DestinationsRowSection,
  'fleet-register': FleetRegisterSection,
  // ship pages — entity-bound (content lives on the ship record) + structural
  'ship-hero': ShipHeroSection,
  'ship-tagline': ShipTaglineSection,
  'venue-carousel': VenueCarouselSection,
  'spec-band': SpecBandSection,
  'suite-tier-carousel': SuiteTierSection,
  'deck-plan-switcher': DeckPlanSection,
  'ship-life-onboard': ShipLifeOnboardSection,
  'ship-journeys': ShipJourneysSection,
  'ship-godmother': ShipGodmotherSection,
  'related-ships': RelatedShipsSection,
};

export function hasRenderer(type: string): boolean {
  return Object.prototype.hasOwnProperty.call(SECTION_RENDERERS, type);
}

/** Render an ordered section list. Unknown types are skipped silently. */
export function RenderSections({ sections }: { sections: PublicSection[] }) {
  return (
    <>
      {sections.map((section) => {
        const Renderer = SECTION_RENDERERS[section.sectionType];
        if (!Renderer) return null;
        return <Renderer key={section.id} section={section} />;
      })}
    </>
  );
}
