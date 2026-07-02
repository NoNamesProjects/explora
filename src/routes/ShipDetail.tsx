import { useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShipHeroCinematic } from '@/components/ship/ShipHeroCinematic';
import { SpecificationsBand } from '@/components/ship/SpecificationsBand';
import { ParallaxMedia } from '@/components/ship/ParallaxMedia';
import { LifeOnboardGrid } from '@/components/ship/LifeOnboardGrid';
import { ShipJourneys } from '@/components/ship/ShipJourneys';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { VenueCarousel } from '@/components/ship/VenueCarousel';
import { DeckSwitcher } from '@/components/ship/DeckSwitcher';
import { SuiteTierCarousel } from '@/components/ship/SuiteTierCarousel';
import { StickySubNav, type SubNavSection } from '@/components/ship/StickySubNav';
import { ComingSoonButton } from '@/components/ui/ComingSoon';
import { getShipAssets } from '@/lib/shipAssets';
import { getShipFacts } from '@/data/shipFacts';
import { ships } from '@/data/megaMenu';
import { isShipHidden } from '@/data/shipVisibility';

interface Stat { value: string; label: string }
interface Tier { key: string; name: string; tagline: string }

const LIFE_LINKS = [
  { key: 'dining', href: '/life-on-explora/dining' },
  { key: 'lounging', href: '/life-on-explora/lounging' },
  { key: 'wellness', href: '/life-on-explora/wellness' },
  { key: 'entertainment', href: '/life-on-explora/entertainment' },
  { key: 'shopping', href: '/life-on-explora/shopping' },
] as const;

/**
 * Route guard: ships hidden until launch (EXPLORA V/VI) have no public detail page,
 * so a direct visit to /ships/explora-v|vi bounces to the fleet index. Keeping this
 * in a thin wrapper (only `useParams`) means the inner component's hook order is
 * never affected when navigating between ship codes.
 */
export default function ShipDetail() {
  const { code = 'explora-i' } = useParams();
  if (isShipHidden(code)) return <Navigate to="/ships" replace />;
  return <ShipDetailInner />;
}

function ShipDetailInner() {
  const { code = 'explora-i' } = useParams();
  const { t } = useTranslation();

  const assets = getShipAssets(code);
  const facts = getShipFacts(code);
  const ship = ships.find((s) => s.code === code) ?? ships[0];

  // Shared spec LABELS from the locale; per-ship VALUES from shipFacts override
  // them in order (suites/pools/restaurants/bars/ratio). Ships without
  // specValues (e.g. coming-soon) keep the shared default values.
  const sharedStats = (t('ship.stats', { returnObjects: true }) as Stat[]) ?? [];
  const stats = facts.specValues
    ? sharedStats.map((s, i) => ({ ...s, value: facts.specValues![i] ?? s.value }))
    : sharedStats;
  const tiers = (t('ship.tiers', { returnObjects: true }) as Tier[]) ?? [];
  const facilities = (t('ship.facilities', { returnObjects: true }) as string[]) ?? [];
  const tagline = t('ship.tagline', { returnObjects: true }) as { lead: string; highlight: string; tail?: string };

  // Build the section anchors dynamically — godmother only appears when announced.
  const subNavSections = useMemo<SubNavSection[]>(() => {
    const items: SubNavSection[] = [
      { id: 'venues', label: t('ship.subNav.onBoard', { defaultValue: 'On board' }) },
      { id: 'suites', label: t('ship.subNav.suites', { defaultValue: 'Suites' }) },
      { id: 'decks', label: t('ship.subNav.deckPlans', { defaultValue: 'Deck plans' }) },
      { id: 'life', label: t('ship.subNav.lifeOnBoard', { defaultValue: 'Life on board' }) },
      { id: 'journeys', label: t('ship.subNav.journeys', { defaultValue: 'Journeys' }) },
    ];
    if (facts.godmother.name) items.push({ id: 'godmother', label: t('ship.subNav.godmother', { defaultValue: 'Godmother' }) });
    return items;
  }, [facts.godmother.name, t]);

  return (
    <>
      {/* ═══════════════════ HERO — cinematic parallax ═════════════════ */}
      <ShipHeroCinematic
        heroImage={assets.hero}
        numeral={facts.numeral}
        shipName={facts.name}
        status={facts.status}
        launchYear={facts.launchYear}
      />

      {/* ═══════════════════ STICKY SECTION ANCHOR NAV ═══════════════════ */}
      <StickySubNav sections={subNavSections} />

      {/* ═══════════════════ TAGLINE — dark band ════════════════════════ */}
      <section className="relative overflow-hidden bg-ink py-section-y text-cream">
        <div className="absolute inset-0 bg-grain opacity-20 mix-blend-overlay pointer-events-none" aria-hidden />
        <div
          className="absolute inset-0 opacity-50 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(ellipse at 50% 120%, rgba(115,133,159,0.5) 0%, transparent 60%)' }}
          aria-hidden
        />
        <div className="relative container max-w-editorial text-center">
          <h2 className="font-serif text-display font-medium text-balance leading-tight text-cream">
            {tagline.lead}{' '}
            <em className="font-serif italic font-normal text-accent-goldSoft">{tagline.highlight}</em>
            {tagline.tail ? ` ${tagline.tail}` : ''}
          </h2>
        </div>
      </section>

      {/* ═══════════════════ VENUE CAROUSEL — rises over the dark band ══ */}
      <section id="venues" className="relative z-10 -mt-8 md:-mt-12 rounded-t-[1.75rem] pt-14 md:pt-20 pb-section-y bg-cream scroll-mt-32 shadow-[0_-40px_70px_-50px_rgba(12,35,64,0.6)]">
        <div className="container mb-10">
          <SectionHeading
            eyebrow={t('ship.venueCarousel.eyebrow')}
            titleLead={t('ship.venueCarousel.titleLead', { defaultValue: 'Spaces to' })}
            highlight={t('ship.venueCarousel.highlight', { defaultValue: 'discover' })}
            className="max-w-prose"
          />
        </div>
        <VenueCarousel venues={assets.onboard} />
      </section>

      {/* ═══════════════════ SPECIFICATIONS — dark band ════════════════ */}
      <SpecificationsBand
        stats={stats}
        heading={t('ship.statsHeading')}
        comingSoon={facts.status === 'coming-soon'}
      />

      {/* ═══════════════════ SUITES — rises over the dark band ═════════ */}
      <section id="suites" className="relative z-10 -mt-8 md:-mt-12 rounded-t-[1.75rem] pt-14 md:pt-20 pb-section-y bg-cream scroll-mt-32 shadow-[0_-40px_70px_-50px_rgba(12,35,64,0.6)]">
        <div className="container">
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
          <SuiteTierCarousel tiers={tiers} cabins={assets.cabins} />
        </div>
      </section>

      {/* ═══════════════════ DECK PLANS ══════════════════════════════════ */}
      <section id="decks" className="py-section-y bg-cream-soft border-t border-cream-300/60 scroll-mt-32">
        <div className="container">
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

          <DeckSwitcher decks={assets.decks} />

          {/* Facility legend */}
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
            <ComingSoonButton className="btn-secondary">
              {t('cta.downloadDeckPlans')}
            </ComingSoonButton>
          </div>
        </div>
      </section>

      {/* ═══════════════════ LIFE ON BOARD LINKS ════════════════════════ */}
      <section id="life" className="py-section-y bg-cream scroll-mt-32">
        <div className="container">
          <SectionHeading
            eyebrow={t('home.lifeOnboard.eyebrow')}
            highlight={t('ship.lifeOnboardHeading')}
            align="center"
            className="mb-14"
          />
          <LifeOnboardGrid
            items={LIFE_LINKS.map((item, i) => ({
              key: item.key,
              title: t(`mega.experience.${item.key}` as const),
              descriptor: t(`ship.lifeOnboardCards.${item.key}` as const),
              image: assets.onboard[i % assets.onboard.length]?.src ?? assets.hero,
            }))}
          />
        </div>
      </section>

      {/* ═══════════ JOURNEYS WITH THIS SHIP — dark band ════════════════ */}
      <ShipJourneys shipCd={ship.shipCd} shipName={facts.name} />

      {/* ═══════════════════ GODMOTHER ══════════════════════════════════ */}
      {facts.godmother.name && facts.godmother.bioKey && (
        <section
          id="godmother"
          className="py-section-y bg-cream scroll-mt-32"
        >
          <div className="container grid gap-10 lg:gap-16 md:grid-cols-2 items-center max-w-page">
            <ParallaxMedia
              src={facts.godmother.image ?? assets.exterior[0] ?? assets.hero}
              alt={facts.godmother.name}
              className="aspect-[4/5] rounded-card bg-cream-200 order-2 md:order-1"
            />
            <div className="order-1 md:order-2">
              <div className="eyebrow mb-5">{t('ship.godmother.eyebrow')}</div>
              <h2 className="font-serif text-display md:text-hero-xl leading-[1.05] mb-7 text-balance">
                {facts.godmother.name}
              </h2>
              <p className="text-ink-soft text-pretty mb-8 max-w-prose text-lg leading-relaxed">
                {t(facts.godmother.bioKey)}
              </p>
              <ComingSoonButton className="link-underline">
                {t('ship.godmother.cta')} <span aria-hidden>›</span>
              </ComingSoonButton>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════ KEEP EXPLORING ══════════════════════════════ */}
      <section className="py-section-y bg-cream-soft border-t border-cream-300/60">
        <div className="container">
          <SectionHeading
            eyebrow={t('ship.relatedShipsHeading.eyebrow')}
            highlight={t('ship.relatedShipsHeading.title')}
            align="center"
            className="mb-14"
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ships
              .filter((s) => s.code !== ship.code)
              .slice(0, 3)
              .map((s) => {
                const a = getShipAssets(s.code);
                return (
                  <Link key={s.code} to={`/ships/${s.code}`} className="group block">
                    <div className="aspect-[16/10] overflow-hidden bg-cream-200 mb-5">
                      <img
                        src={a.preview}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-[1400ms] ease-out-soft group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <div className="font-serif text-2xl">{t(s.labelKey)}</div>
                    <div className="mt-2 link-underline">{t('common.discover')}</div>
                  </Link>
                );
              })}
          </div>
        </div>
      </section>
    </>
  );
}
