import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { api, type JourneyCard as JourneyCardData, type JourneyFacets } from '@/lib/api';
import { JourneyCard } from '@/components/journey/JourneyCard';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { imageUrl } from '@/lib/image';
import { regionContentBySlug, regionCopy, GENERIC_COPY } from '@/data/regions';
import { deriveRegionStats, type RegionStats } from '@/lib/regionStats';
import { RegionHero } from '@/components/destination/RegionHero';
import { RegionSubNav } from '@/components/destination/RegionSubNav';
import { RegionStatsBand } from '@/components/destination/RegionStatsBand';
import { RegionAshore } from '@/components/destination/RegionAshore';
import { RegionPorts } from '@/components/destination/RegionPorts';

const ALL_REGIONS = [
  'mediterranean', 'caribbean', 'alaska', 'asia', 'northernEurope',
  'transatlantic', 'arabian', 'southAmerica', 'pacificCoast', 'canadaNewEngland', 'worldJourney',
] as const;

const REGION_SLUG_TO_KEY: Record<string, typeof ALL_REGIONS[number]> = {
  'mediterranean': 'mediterranean',
  'caribbean': 'caribbean',
  'alaska': 'alaska',
  'asia': 'asia',
  'northern-europe': 'northernEurope',
  'transatlantic': 'transatlantic',
  'arabian': 'arabian',
  'south-america': 'southAmerica',
  'pacific-coast': 'pacificCoast',
  'canada-new-england': 'canadaNewEngland',
  'world-journey': 'worldJourney',
};

const REGION_KEY_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(REGION_SLUG_TO_KEY).map(([slug, key]) => [key, slug]),
);

const EMPTY_STATS: RegionStats = {
  count: 0, ships: [], ports: [], nightsMin: null, nightsMax: null, priceFrom: null, months: [],
};

const SAILINGS_PREVIEW = 6;

/**
 * Destination region page (/destinations/:region) — a single smooth-scrolling
 * editorial narrative (no tabs): hero + stat strip → sticky scroll-spy sub-nav →
 * overview → real sailings grid → ashore feature blocks → ports rail → CTA →
 * other regions. One journeys fetch feeds BOTH the derived stats and the
 * sailings preview. Per-region copy + ports come from src/data/regions.ts.
 */
export default function DestinationRegion() {
  const { region = 'mediterranean' } = useParams();
  const { t, i18n } = useTranslation();

  const currentKey = REGION_SLUG_TO_KEY[region] ?? 'mediterranean';
  const regionName = t(`mega.destinations.regions.${currentKey}`);
  const content = regionContentBySlug(region);
  const copy = content ? regionCopy(content, i18n.language) : GENERIC_COPY;
  const otherRegions = ALL_REGIONS.filter((k) => k !== currentKey).slice(0, 9);
  const findHref = `/find-your-journey?region=${encodeURIComponent(region)}`;

  // One fetch for the whole region → drives both the stat strip and the sailings grid.
  const [journeys, setJourneys] = useState<JourneyCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [facets, setFacets] = useState<JourneyFacets | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setFacets(null);
    // One page of sailings (pageSize is capped at 60) → preview cards + a stats sample.
    api.journeys.search({ region, pageSize: 60 })
      .then((res) => { if (!cancelled) { setJourneys(res.journeys); setTotal(res.total); } })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    // Region facets → the EXACT, complete set of bookable departure ports (for the
    // clickable ports rail) + exact nights/price bounds. Best-effort.
    api.journeys.facets({ region })
      .then((f) => { if (!cancelled) setFacets(f); })
      .catch(() => { /* rail just stays hidden if facets fail */ });
    return () => { cancelled = true; };
  }, [region]);

  // count/ships/months from the page sample (count is the exact server total);
  // nights range + from-price replaced by the exact region facets bounds when present.
  const sampleStats = loading || error ? EMPTY_STATS : deriveRegionStats(journeys, total);
  const stats: RegionStats = facets
    ? {
        ...sampleStats,
        nightsMin: facets.nightsMin,
        nightsMax: facets.nightsMax,
        priceFrom: facets.priceMin || sampleStats.priceFrom,
      }
    : sampleStats;
  const sailings = journeys.slice(0, SAILINGS_PREVIEW);

  return (
    <>
      <RegionHero
        regionKey={currentKey}
        slug={region}
        label={regionName}
        heroPort={content?.repPort ?? ''}
        tagline={copy.tagline}
      />

      <RegionSubNav />

      {/* ── #overview — airy editorial intro ──────────────────────────── */}
      <section id="overview" className="py-section-y bg-cream scroll-mt-32">
        <div className="container max-w-editorial text-center">
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif text-ink-soft leading-relaxed text-balance text-[clamp(1.6rem,3.2vw,2.6rem)]"
          >
            {copy.intro}
          </motion.p>
        </div>
      </section>

      {/* ── At a glance — dark stat band ──────────────────────────────── */}
      <RegionStatsBand stats={stats} />

      {/* ── #sailings ─────────────────────────────────────────────────── */}
      <section id="sailings" className="py-section-y bg-cream-soft border-y border-cream-300/60">
        <div className="container">
          <SectionHeading
            eyebrow={t('destination.sailings.eyebrow', { defaultValue: 'Sailings' })}
            titleLead={t('destination.sailings.titleLead', { defaultValue: 'Journeys in' })}
            highlight={regionName}
            align="center"
            className="mb-12"
          />

          {loading && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-page mx-auto">
              {Array.from({ length: SAILINGS_PREVIEW }).map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-cream-200 animate-pulse" />
              ))}
            </div>
          )}

          {!loading && error && (
            <p className="text-center text-ink-600 max-w-prose mx-auto">
              {t('destination.sailings.errorState', {
                defaultValue:
                  'Sailings for this region will appear here once the daily ingest has populated the database.',
              })}
            </p>
          )}

          {!loading && !error && sailings.length === 0 && (
            <p className="text-center text-ink-600 max-w-prose mx-auto">
              {t('destination.sailings.emptyState', {
                defaultValue:
                  'No sailings published for this region yet. Check back as the schedule extends.',
              })}
            </p>
          )}

          {!loading && !error && sailings.length > 0 && (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-page mx-auto">
                {sailings.map((j, i) => (
                  <JourneyCard key={j.journeyId} card={j} index={i} />
                ))}
              </div>
              {total > sailings.length && (
                <div className="text-center mt-12">
                  <Link to={findHref} className="btn-secondary">
                    {t('destination.sailings.seeAll', {
                      count: total,
                      countStr: total.toLocaleString(i18n.language),
                      defaultValue: 'See all {{countStr}} sailings',
                    })}
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── #ashore ───────────────────────────────────────────────────── */}
      <RegionAshore label={regionName} slug={region} ashore={copy.ashore} />

      {/* ── #ports ────────────────────────────────────────────────────── */}
      <RegionPorts label={regionName} slug={region} ports={facets?.embarkPorts ?? []} />

      {/* ── CTA band ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-ink text-cream py-section-y">
        <div className="absolute inset-0 bg-grain opacity-25 mix-blend-overlay pointer-events-none" aria-hidden />
        <div className="relative container max-w-editorial text-center">
          <div className="eyebrow text-cream/70 mb-4">
            {t('destination.cta.eyebrow', { defaultValue: 'Plan your voyage' })}
          </div>
          <h2 className="font-serif text-display leading-tight text-balance mb-5">
            {t('destination.cta.title', {
              region: regionName,
              defaultValue: 'Find your {{region}} journey',
            })}
          </h2>
          <p className="text-cream/80 max-w-prose mx-auto mb-9">
            {t('destination.cta.subtitle', {
              defaultValue:
                'Browse every sailing in the region, or let a journey specialist shape the voyage around you.',
            })}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link to={findHref} className="btn-ghost-light">
              {t('destination.cta.viewJourneys', { defaultValue: 'View the journeys' })}
            </Link>
            <Link
              to="/contact"
              className="text-cream/90 underline underline-offset-4 decoration-1 hover:text-cream transition-colors"
            >
              {t('destination.cta.speakToSpecialist', { defaultValue: 'Speak to a specialist' })}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Other destinations ────────────────────────────────────────── */}
      <section className="py-section-y bg-cream-soft border-t border-cream-300/60">
        <div className="container">
          <SectionHeading
            eyebrow={t('destination.otherDestinations.eyebrow')}
            highlight={t('destination.otherDestinations.title')}
            align="center"
            className="mb-12"
          />
          <div className="overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-5 pl-6 pr-6 md:pl-12 md:pr-12">
              {otherRegions.map((key) => {
                const slug = REGION_KEY_TO_SLUG[key];
                return (
                  <Link
                    key={key}
                    to={`/destinations/${slug}`}
                    className="group snap-start shrink-0 w-[70vw] sm:w-[44vw] lg:w-[28vw] xl:w-[22vw]"
                  >
                    <div className="aspect-[3/4] overflow-hidden bg-cream-200 relative">
                      <img
                        src={imageUrl(`explora/placeholder/destination-${slug}`, { w: 600, h: 800, fit: 'cover' })}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-[1400ms] ease-out-soft group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink/50 to-transparent" />
                      <div className="absolute bottom-5 left-5 right-5 text-cream">
                        <div className="font-serif text-xl leading-tight">
                          {t(`mega.destinations.regions.${key}`)}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
