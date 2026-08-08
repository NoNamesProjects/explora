import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { RegionIndexCard, type RegionStat } from '@/components/destination/RegionIndexCard';
import { RegionFeatureCard } from '@/components/destination/RegionFeatureCard';
import {
  DESTINATION_REGIONS,
  REGION_GROUPS,
  type DestinationRegion,
} from '@/data/destinationRegions';
import { api } from '@/lib/api';
import { bannerOverride } from '@/lib/content/bannerSrc';

/** Fast region-by-slug lookup for the grouped atlas sections. */
const REGION_BY_SLUG = new Map<string, DestinationRegion>(
  DESTINATION_REGIONS.map((r) => [r.slug, r]),
);

/** Cumulative tile index at which each group starts — so only the very first
 *  few images across the whole page eager-load (the rest stay lazy). */
const GROUP_START_INDEX = REGION_GROUPS.reduce<number[]>((acc, _g, i) => {
  acc[i] = i === 0 ? 0 : acc[i - 1] + REGION_GROUPS[i - 1].slugs.length;
  return acc;
}, []);

type StatsMap = Record<string, RegionStat | null>;

const REVEAL_EASE = [0.22, 1, 0.36, 1] as const;

/** Live-loading predicate shared by the feature + companion tiles. */
function isLoading(slug: string, stats: StatsMap): boolean {
  return slug !== 'world-journey' && !(slug in stats);
}

/**
 * /destinations — the "Editorial Atlas". A calm cream hero, then the eleven
 * regions gathered into four ocean groups. Each group is an ASYMMETRIC MOSAIC:
 * a LARGE photographic lead feature (region name, tagline, trimmed intro, a
 * named-port strip and the live stat line all set as editorial captions over an
 * ink scrim) that spans two columns — and, in the Americas group, two rows —
 * paired with a block of enriched portrait COMPANION tiles. The single grid
 * holds for both a 2-region group (feature + one companion) and the 5-region
 * Americas group (feature + four).
 *
 * Per-region journey counts, night ranges and lead-in fares are fetched live on
 * mount and fill into the feature + tiles as they resolve. Deliberately distinct
 * from the /ships FleetRegister (alternating full-width rows + Roman numerals).
 */
export default function Destinations() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [stats, setStats] = useState<StatsMap>({});
  const heroImage = bannerOverride('destinations.hero') ?? '/photos/ports/HRDBV.jpg';

  useEffect(() => {
    let alive = true;
    // World Journey shows a curated label, not a live count — skip its fetch.
    const regions = DESTINATION_REGIONS.filter((r) => r.slug !== 'world-journey');

    const tasks = regions.map(async (r) => {
      try {
        const [searchRes, facetsRes] = await Promise.allSettled([
          api.journeys.search({ region: r.slug, pageSize: 1 }),
          api.journeys.facets({ region: r.slug }),
        ]);
        const total = searchRes.status === 'fulfilled' ? searchRes.value.total : null;
        if (total == null) throw new Error('region search failed');
        const facets = facetsRes.status === 'fulfilled' ? facetsRes.value : null;
        const stat: RegionStat = {
          total,
          nightsMin: facets?.nightsMin ?? null,
          nightsMax: facets?.nightsMax ?? null,
          priceFrom: facets?.priceMin ?? null,
        };
        if (alive) setStats((prev) => ({ ...prev, [r.slug]: stat }));
      } catch {
        // Failed region: record null so the tile stops loading and shows
        // name + photo + CTA without a stat line.
        if (alive) setStats((prev) => ({ ...prev, [r.slug]: null }));
      }
    });

    // Each task already writes its own result into state as it resolves; this
    // just swallows the settled batch so there is no unhandled rejection.
    void Promise.allSettled(tasks);

    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      {/* ═══════════════ HERO / INTRO — full-bleed destination photo ═══════════════ */}
      <section className="relative min-h-[52vh] md:min-h-[60vh] flex items-end overflow-hidden bg-ink">
        <motion.div
          aria-hidden
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className={['absolute inset-0 bg-cover bg-center', reduce ? '' : 'animate-slow-zoom'].join(' ')}
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/20 to-ink/90 pointer-events-none" aria-hidden />
        <div className="absolute inset-0 bg-grain opacity-[0.12] mix-blend-overlay pointer-events-none" aria-hidden />

        <div className="relative container pt-32 pb-12 md:pb-16 text-cream [text-shadow:0_1px_14px_rgba(12,35,64,0.5)]">
          <Breadcrumb
            variant="light"
            items={[{ label: t('nav.home'), href: '/' }, { label: t('nav.destinations') }]}
            className="mb-10 opacity-90"
          />
          <span aria-hidden className="block h-px w-24 bg-accent-goldSoft/70" />
          <div className="eyebrow mt-8 mb-4 text-cream/80">{t('destination.index.eyebrow')}</div>
          <h1 className="font-serif font-normal text-cream text-hero-xl leading-[1.0] tracking-tight text-balance max-w-3xl">
            {t('destination.index.title')}
          </h1>
          <p className="mt-7 max-w-prose text-cream/80 text-lg leading-relaxed text-pretty">
            {t('destination.index.intro')}
          </p>
        </div>
      </section>

      {/* ═══════════════ EDITORIAL ATLAS — four ocean spreads, each an asymmetric mosaic ═══════════════ */}
      {REGION_GROUPS.map((group, gi) => {
        const regions = group.slugs
          .map((slug) => REGION_BY_SLUG.get(slug))
          .filter((r): r is DestinationRegion => Boolean(r));
        if (regions.length === 0) return null;

        const [feature, ...companions] = regions;
        const startIndex = GROUP_START_INDEX[gi];
        const chapter = `0${gi + 1}`;
        const chapterTotal = `0${REGION_GROUPS.length}`;

        // The Americas group (feature + four) needs a taller two-row mosaic; the
        // two-region groups sit on a single wide row.
        const large = companions.length >= 3;
        const gridCls = large
          ? 'mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:mt-14 lg:h-[46rem] lg:grid-cols-4 lg:grid-rows-2'
          : 'mt-10 grid grid-cols-1 gap-5 lg:mt-14 lg:h-[36rem] lg:grid-cols-3';
        const featureSpan = large
          ? 'sm:col-span-2 lg:col-span-2 lg:row-span-2'
          : 'lg:col-span-2';
        const featureAspect = large
          ? 'aspect-[4/5] sm:aspect-[16/10]'
          : 'aspect-[3/4] sm:aspect-[3/2]';
        const companionAspect = large ? 'aspect-[3/4]' : 'aspect-[4/5]';

        return (
          <section
            key={group.labelKey}
            className={['py-section-y-sm', gi % 2 === 0 ? 'bg-cream-soft' : 'bg-cream'].join(' ')}
          >
            <div className="container">
              {/* ── Group masthead: gold hairline + chapter eyebrow + serif title ── */}
              <span aria-hidden className="block h-px w-16 bg-accent-gold/60" />
              <div className="eyebrow mt-6 text-accent-tan">
                {chapter}
                <span aria-hidden className="text-ink-400"> / {chapterTotal}</span>
              </div>
              <h2 className="mt-3 font-serif font-normal text-ink text-display-sm leading-tight text-balance">
                {t(group.labelKey)}
              </h2>

              {/* ── Asymmetric mosaic: lead feature (2 cols / 2 rows) + companion tiles ── */}
              <div className={gridCls}>
                <motion.div
                  className={featureSpan}
                  initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.7, ease: REVEAL_EASE }}
                >
                  <RegionFeatureCard
                    region={feature}
                    stats={stats[feature.slug] ?? null}
                    loading={isLoading(feature.slug, stats)}
                    index={startIndex}
                    aspectClassName={featureAspect}
                  />
                </motion.div>

                {companions.map((region, j) => (
                  <motion.div
                    key={region.slug}
                    className="lg:col-span-1"
                    initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{
                      duration: 0.6,
                      ease: REVEAL_EASE,
                      delay: Math.min(j + 1, 5) * 0.06,
                    }}
                  >
                    <RegionIndexCard
                      region={region}
                      stats={stats[region.slug] ?? null}
                      loading={isLoading(region.slug, stats)}
                      index={startIndex + j + 1}
                      aspectClassName={companionAspect}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* ═══════════════ CLOSING CTA — a quiet route to the journey finder ═══════════════ */}
      <section className="bg-cream py-section-y-sm">
        <div className="container text-center">
          <Link
            to="/find-your-journey"
            className="link-underline text-ink transition-colors duration-300 hover:text-accent-tan"
          >
            {t('destination.index.closingCta')}
          </Link>
        </div>
      </section>
    </>
  );
}
