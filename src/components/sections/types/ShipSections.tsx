/**
 * Entity-bound + structural renderers for the SHIP pages.
 *
 * Every one is a thin adapter: it reshapes the current entity's `fields` into
 * the props the EXISTING ship component already takes, and renders it unchanged.
 * The complex interactive widgets (venue carousel, deck switcher, suite-tier
 * carousel) keep their bespoke behaviour — what the admin gains is the ability
 * to reorder / hide / remove them and to own the photos and copy inside them.
 * That boundary is deliberate: freeform layout for simple content, config-only
 * for real interactions.
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShipHeroCinematic } from '@/components/ship/ShipHeroCinematic';
import { SpecificationsBand } from '@/components/ship/SpecificationsBand';
import { VenueCarousel } from '@/components/ship/VenueCarousel';
import { DeckSwitcher } from '@/components/ship/DeckSwitcher';
import { SuiteTierCarousel } from '@/components/ship/SuiteTierCarousel';
import { LifeOnboardGrid } from '@/components/ship/LifeOnboardGrid';
import { ShipJourneys } from '@/components/ship/ShipJourneys';
import { ParallaxMedia } from '@/components/ship/ParallaxMedia';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ComingSoonButton } from '@/components/ui/ComingSoon';
import { RichText } from '@/components/content/RichText';
import { useSectionReader } from '@/lib/content/sectionRead';
import { useEntityReader } from '@/lib/content/entityRead';
import { useCurrentEntity, useEntityName, useEntityList } from '@/lib/content/useEntity';
import { entityName } from '@/content/entityTypes';
import type { PublicSection } from '@/lib/content/useSections';
import { SectionHead, SectionShell } from '../SectionShell';

interface Stat { value: string; label: string }

/** A ship's five spec values, in the order of the shared `ship.stats` labels. */
const SPEC_KEYS = ['specSuites', 'specPools', 'specRestaurants', 'specBars', 'specRatio'] as const;

// ── Hero ─────────────────────────────────────────────────────────────────────

export function ShipHeroSection({ section }: { section: PublicSection }) {
  const entity = useCurrentEntity();
  const r = useEntityReader(entity);
  const s = useSectionReader(section);
  const name = useEntityName();
  if (!entity) return null;

  return (
    <ShipHeroCinematic
      // The section can override the hero photo; otherwise the ship's own.
      heroImage={s.image('image')?.src ?? r.image('heroImage')?.src ?? ''}
      numeral={r.text('numeral')}
      shipName={name}
      status={(r.text('status', 'in-service') as 'in-service' | 'launching' | 'coming-soon')}
      launchYear={r.number('launchYear')}
    />
  );
}

// ── Tagline band ─────────────────────────────────────────────────────────────

export function ShipTaglineSection({ section }: { section: PublicSection }) {
  const { t } = useTranslation();
  const entity = useCurrentEntity();
  const r = useEntityReader(entity);
  const s = useSectionReader(section);

  // Priority: this section's own copy → the ship's override → the shared fleet
  // tagline that every ship has used until now.
  const own = s.rich('heading') ?? r.rich('tagline');
  const shared = t('ship.tagline', { returnObjects: true }) as { lead: string; highlight: string; tail?: string };

  return (
    <section id={section.slug} className="relative overflow-hidden bg-ink py-section-y text-cream">
      <div className="absolute inset-0 bg-grain opacity-20 mix-blend-overlay pointer-events-none" aria-hidden />
      <div
        className="absolute inset-0 opacity-50 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(ellipse at 50% 120%, rgba(115,133,159,0.5) 0%, transparent 60%)' }}
        aria-hidden
      />
      <div className="relative container max-w-editorial text-center">
        <h2 className="font-serif text-display font-medium text-balance leading-tight text-cream">
          {own ? (
            <RichText value={own} />
          ) : (
            <>
              {shared?.lead}{' '}
              <em className="font-serif italic font-normal text-accent-goldSoft">{shared?.highlight}</em>
              {shared?.tail ? ` ${shared.tail}` : ''}
            </>
          )}
        </h2>
      </div>
    </section>
  );
}

/** The "rises over the dark band above" treatment used by venues + suites. */
const RISER =
  'relative z-10 -mt-8 md:-mt-12 rounded-t-[1.75rem] pt-14 md:pt-20 pb-section-y bg-cream scroll-mt-32 shadow-[0_-40px_70px_-50px_rgba(12,35,64,0.6)]';

// ── Venue carousel ───────────────────────────────────────────────────────────

export function VenueCarouselSection({ section }: { section: PublicSection }) {
  const { t } = useTranslation();
  const entity = useCurrentEntity();
  const r = useEntityReader(entity);
  const s = useSectionReader(section);

  const venues = r.items('onboardVenues')
    .map((v, i) => ({
      key: `venue-${i}`,
      name: typeof v.name === 'string' ? v.name : '',
      src: (v.image as { src?: string } | undefined)?.src ?? '',
    }))
    .filter((v) => v.src);
  if (!venues.length) return null;

  return (
    <section id={section.slug} className={RISER}>
      <div className="container mb-10">
        {s.has('heading') ? (
          <SectionHead eyebrow={s.text('eyebrow')} heading={s.rich('heading')} align="left" className="max-w-prose" />
        ) : (
          <SectionHeading
            eyebrow={t('ship.venueCarousel.eyebrow')}
            titleLead={t('ship.venueCarousel.titleLead', { defaultValue: 'Spaces to' })}
            highlight={t('ship.venueCarousel.highlight', { defaultValue: 'discover' })}
            className="max-w-prose"
          />
        )}
      </div>
      <VenueCarousel venues={venues} />
    </section>
  );
}

// ── Specifications band ──────────────────────────────────────────────────────

export function SpecBandSection({ section }: { section: PublicSection }) {
  const { t } = useTranslation();
  const entity = useCurrentEntity();
  const r = useEntityReader(entity);
  const s = useSectionReader(section);

  // Labels stay shared + translated; the VALUES come from the ship record.
  const shared = (t('ship.stats', { returnObjects: true }) as Stat[]) ?? [];
  const stats = shared.map((stat, i) => {
    const own = r.text(SPEC_KEYS[i] ?? '');
    return own ? { ...stat, value: own } : stat;
  });

  return (
    <div id={section.slug}>
      <SpecificationsBand
        stats={stats}
        heading={s.text('eyebrow') || t('ship.statsHeading')}
        comingSoon={r.text('status') === 'coming-soon'}
      />
    </div>
  );
}

// ── Suite tiers ──────────────────────────────────────────────────────────────

export function SuiteTierSection({ section }: { section: PublicSection }) {
  const { t } = useTranslation();
  const entity = useCurrentEntity();
  const r = useEntityReader(entity);
  const s = useSectionReader(section);

  const rows = r.items('suiteTiers');
  const tiers = rows.map((row) => ({
    key: typeof row.tierKey === 'string' ? row.tierKey : '',
    name: typeof row.name === 'string' ? row.name : '',
    tagline: typeof row.tagline === 'string' ? row.tagline : '',
  }));
  const cabins: Record<string, string[]> = {};
  for (const row of rows) {
    const key = typeof row.tierKey === 'string' ? row.tierKey : '';
    if (!key) continue;
    const photos = Array.isArray(row.photos) ? (row.photos as Array<{ image?: { src?: string } }>) : [];
    cabins[key] = photos.map((p) => p.image?.src ?? '').filter(Boolean);
  }
  if (!tiers.length) return null;

  return (
    <section id={section.slug} className={RISER}>
      <div className="container">
        {s.has('heading') ? (
          <SectionHead eyebrow={s.text('eyebrow')} heading={s.rich('heading')} intro={s.text('intro')} align="center" className="mb-14" />
        ) : (
          <>
            <SectionHeading
              eyebrow={t('ship.suitesHeading.eyebrow')}
              titleLead={t('ship.suitesHeading.lead')}
              highlight={t('ship.suitesHeading.highlight')}
              titleTail={t('ship.suitesHeading.tail')}
              align="center"
              className="mb-6"
            />
            <p className="text-center text-ink-600 text-pretty max-w-prose mx-auto mb-14 md:mb-16 text-lg">
              {t('ship.suitesIntro')}
            </p>
          </>
        )}
        <SuiteTierCarousel tiers={tiers} cabins={cabins} />
      </div>
    </section>
  );
}

// ── Deck plans ───────────────────────────────────────────────────────────────

export function DeckPlanSection({ section }: { section: PublicSection }) {
  const { t } = useTranslation();
  const entity = useCurrentEntity();
  const r = useEntityReader(entity);
  const s = useSectionReader(section);

  const decks = r.items('deckPlans')
    .map((d) => ({
      deck: Number(typeof d.deck === 'string' ? d.deck : 0),
      src: (d.image as { src?: string } | undefined)?.src ?? '',
    }))
    .filter((d) => d.src && Number.isFinite(d.deck));
  const facilities = (t('ship.facilities', { returnObjects: true }) as string[]) ?? [];
  if (!decks.length) return null;

  return (
    <section id={section.slug} className="py-section-y bg-cream-soft border-t border-cream-300/60 scroll-mt-32">
      <div className="container">
        {s.has('heading') ? (
          <SectionHead eyebrow={s.text('eyebrow')} heading={s.rich('heading')} intro={s.text('intro')} align="center" className="mb-14" />
        ) : (
          <>
            <SectionHeading
              eyebrow={t('ship.deckPlansHeading.eyebrow')}
              titleLead={t('ship.deckPlansHeading.lead')}
              highlight={t('ship.deckPlansHeading.highlight')}
              align="center"
              className="mb-4"
            />
            <p className="text-center text-sm text-ink-600 italic mb-14 max-w-prose mx-auto">
              {t('ship.deckPlansIntro', { hint: t('ship.deckPlansHint'), defaultValue: 'Select a deck to view its plan. {{hint}}' })}
            </p>
          </>
        )}

        <DeckSwitcher decks={decks} />

        <div className="max-w-page mx-auto mt-16">
          <div className="eyebrow mb-6">{t('ship.facilityLegend')}</div>
          <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2 md:grid-cols-3 text-sm">
            {facilities.map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-ink-soft">
                <span className="inline-block w-2 h-2 bg-accent-gold rounded-full shrink-0" aria-hidden />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="text-center mt-14">
          <ComingSoonButton className="btn-secondary">{t('cta.downloadDeckPlans')}</ComingSoonButton>
        </div>
      </div>
    </section>
  );
}

// ── Life on board links ──────────────────────────────────────────────────────

const LIFE_LINKS = ['dining', 'lounging', 'wellness', 'entertainment', 'shopping'] as const;

export function ShipLifeOnboardSection({ section }: { section: PublicSection }) {
  const { t } = useTranslation();
  const entity = useCurrentEntity();
  const r = useEntityReader(entity);
  const s = useSectionReader(section);

  const venueImages = r.items('onboardVenues')
    .map((v) => (v.image as { src?: string } | undefined)?.src ?? '')
    .filter(Boolean);
  const hero = r.image('heroImage')?.src ?? '';
  if (!venueImages.length && !hero) return null;

  return (
    <section id={section.slug} className="py-section-y bg-cream scroll-mt-32">
      <div className="container">
        {s.has('heading') ? (
          <SectionHead eyebrow={s.text('eyebrow')} heading={s.rich('heading')} align="center" className="mb-14" />
        ) : (
          <SectionHeading
            eyebrow={t('home.lifeOnboard.eyebrow')}
            highlight={t('ship.lifeOnboardHeading')}
            align="center"
            className="mb-14"
          />
        )}
        <LifeOnboardGrid
          items={LIFE_LINKS.map((key, i) => ({
            key,
            title: t(`mega.experience.${key}` as const),
            descriptor: t(`ship.lifeOnboardCards.${key}` as const),
            image: venueImages[i % (venueImages.length || 1)] ?? hero,
          }))}
        />
      </div>
    </section>
  );
}

// ── Journeys with this ship (live) ───────────────────────────────────────────

export function ShipJourneysSection({ section }: { section: PublicSection }) {
  const entity = useCurrentEntity();
  const r = useEntityReader(entity);
  const name = useEntityName();
  const shipCd = r.text('shipCd');
  if (!shipCd) return null;
  return (
    <div id={section.slug}>
      <ShipJourneys shipCd={shipCd} shipName={name} />
    </div>
  );
}

// ── Godmother (auto-hides until announced) ───────────────────────────────────

export function ShipGodmotherSection({ section }: { section: PublicSection }) {
  const { t } = useTranslation();
  const entity = useCurrentEntity();
  const r = useEntityReader(entity);
  const s = useSectionReader(section);

  const name = r.text('godmotherName');
  const bio = r.rich('godmotherBio');
  // Same rule the hardcoded page had: no announced godmother → no section.
  if (!name) return null;

  const portrait =
    r.image('godmotherImage')?.src
    ?? (r.items('exteriorPhotos')[0]?.image as { src?: string } | undefined)?.src
    ?? r.image('heroImage')?.src
    ?? '';

  return (
    <section id={section.slug} className="py-section-y bg-cream scroll-mt-32">
      <div className="container grid gap-10 lg:gap-16 md:grid-cols-2 items-center max-w-page">
        <ParallaxMedia src={portrait} alt={name} className="aspect-[4/5] rounded-card bg-cream-200 order-2 md:order-1" />
        <div className="order-1 md:order-2">
          <div className="eyebrow mb-5">{s.text('eyebrow') || t('ship.godmother.eyebrow')}</div>
          <h2 className="font-serif text-display md:text-hero-xl leading-[1.05] mb-7 text-balance">{name}</h2>
          {bio && (
            <div className="text-ink-soft text-pretty mb-8 max-w-prose text-lg leading-relaxed">
              <RichText value={bio} />
            </div>
          )}
          <ComingSoonButton className="link-underline">
            {t('ship.godmother.cta')} <span aria-hidden>›</span>
          </ComingSoonButton>
        </div>
      </div>
    </section>
  );
}

// ── Related ships / the fleet register (both read the entity list) ───────────

export function RelatedShipsSection({ section }: { section: PublicSection }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('el') ? 'el' : 'en';
  const current = useCurrentEntity();
  const s = useSectionReader(section);
  const { items } = useEntityList('ship');

  const others = items.filter((e) => e.slug !== current?.slug).slice(0, 3);
  if (!others.length) return null;

  return (
    <SectionShell id={section.slug} tone={s.select('tone', 'cream-soft')} className="border-t border-cream-300/60">
      {s.has('heading') ? (
        <SectionHead eyebrow={s.text('eyebrow')} heading={s.rich('heading')} align="center" className="mb-14" />
      ) : (
        <SectionHeading
          eyebrow={t('ship.relatedShipsHeading.eyebrow')}
          highlight={t('ship.relatedShipsHeading.title')}
          align="center"
          className="mb-14"
        />
      )}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {others.map((e) => {
          const preview = (e.fields.previewImage as { src?: string } | undefined)?.src
            ?? (e.fields.heroImage as { src?: string } | undefined)?.src ?? '';
          return (
            <Link key={e.slug} to={`/ships/${e.slug}`} className="group block">
              <div className="aspect-[16/10] overflow-hidden bg-cream-200 mb-5">
                {preview && (
                  <img src={preview} alt="" loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-[1400ms] ease-out-soft group-hover:scale-105" />
                )}
              </div>
              <div className="font-serif text-2xl">{entityName(e, locale)}</div>
              <div className="mt-2 link-underline">{t('common.discover')}</div>
            </Link>
          );
        })}
      </div>
    </SectionShell>
  );
}
