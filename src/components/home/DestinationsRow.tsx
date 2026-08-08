import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { imageUrl } from '@/lib/image';
import { portImage } from '@/lib/portImages';
import { DESTINATION_REGIONS } from '@/data/destinationRegions';
import { RichText } from '@/components/content/RichText';
import type { RichDoc } from '@/lib/content/types';

function Chevron({ direction }: { direction: 'prev' | 'next' }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === 'prev' ? <polyline points="15 6 9 12 15 18" /> : <polyline points="9 6 15 12 9 18" />}
    </svg>
  );
}

/**
 * "Our Destinations" home section — a clean editorial row of ALL eleven region
 * cards (portrait image + label underneath, matching the brand layout) that link
 * through to the existing /destinations/:region pages. Because there are eleven,
 * the row is a native CSS scroll-snap carousel (the house pattern — see
 * VenueCarousel) driven by two circular arrow buttons in the header; the
 * arrow disabled-state tracks the live scroll extremes via an onScroll handler.
 * Imagery prefers a real harvested port photo, else falls back through the
 * placeholder ladder so the section stays honest before brand photography lands.
 * The region list itself lives in src/data/destinationRegions.ts (shared with
 * the /destinations Atlas index page).
 *
 * Chrome (heading / intro / link label / background) is OPTIONAL-overridable so
 * the same component serves both the legacy hardcoded Home and an admin-managed
 * `destinations-row` section. Unset props fall back to the i18n defaults, so
 * nothing changes for callers that pass nothing.
 */
interface DestinationsRowProps {
  id?: string;
  tone?: string;
  heading?: RichDoc | string;
  intro?: string;
  ctaLabel?: string;
}

export function DestinationsRow({ id, tone, heading, intro, ctaLabel }: DestinationsRowProps = {}) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateExtremes = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft >= max - 4);
  }, []);

  useEffect(() => {
    updateExtremes();
    window.addEventListener('resize', updateExtremes);
    return () => window.removeEventListener('resize', updateExtremes);
  }, [updateExtremes]);

  const scrollByCard = useCallback((dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    // Scroll by roughly one card + gap; the first child width is the truth.
    const first = el.firstElementChild as HTMLElement | null;
    const gap = 24;
    const step = first ? first.offsetWidth + gap : Math.round(el.clientWidth * 0.85);
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  }, []);

  return (
    <section id={id} className={`py-section-y ${tone === 'cream-soft' ? 'bg-cream-soft' : tone === 'ink' ? 'bg-ink' : 'bg-cream'}`}>
      <div className="container">
        {/* Header row: editorial heading + intro on the left, arrows top-right */}
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between md:gap-12">
          <div className="max-w-editorial">
            <h2 className="font-serif text-display leading-[1.05] text-ink text-balance">
              {heading ? <RichText value={heading} /> : t('home.destinations.ourTitle')}
            </h2>
            <p className="mt-5 max-w-prose text-ink-600">
              {intro || t('home.destinations.ourIntro')}
            </p>
            <Link
              to="/destinations"
              className="group mt-6 link-underline text-accent-gold inline-flex items-baseline gap-1.5"
            >
              <span>{ctaLabel || t('home.destinations.viewAll')}</span>
              <span aria-hidden className="transition-transform duration-300 ease-out-soft group-hover:translate-x-1">
                ›
              </span>
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => scrollByCard(-1)}
              disabled={atStart}
              aria-disabled={atStart}
              aria-label={t('nav.destinations') + ' — previous'}
              className="group flex h-11 w-11 items-center justify-center rounded-full border border-ink/25 text-ink transition-colors duration-300 ease-out-soft hover:border-ink hover:bg-ink hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink/25 disabled:hover:bg-transparent disabled:hover:text-ink"
            >
              <span className="motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out-soft group-hover:-translate-x-0.5 group-disabled:translate-x-0">
                <Chevron direction="prev" />
              </span>
            </button>
            <button
              type="button"
              onClick={() => scrollByCard(1)}
              disabled={atEnd}
              aria-disabled={atEnd}
              aria-label={t('nav.destinations') + ' — next'}
              className="group flex h-11 w-11 items-center justify-center rounded-full border border-ink/25 text-ink transition-colors duration-300 ease-out-soft hover:border-ink hover:bg-ink hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink/25 disabled:hover:bg-transparent disabled:hover:text-ink"
            >
              <span className="motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out-soft group-hover:translate-x-0.5 group-disabled:translate-x-0">
                <Chevron direction="next" />
              </span>
            </button>
          </div>
        </div>

        {/* Carousel: native scroll-snap, bled to the container edges like VenueCarousel.
            Clean editorial card — sharp portrait image, region label UNDERNEATH. */}
        <div
          ref={trackRef}
          onScroll={updateExtremes}
          className="mt-12 flex gap-5 overflow-x-auto scroll-smooth pb-2 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden md:mt-14 md:gap-6 -mx-6 px-6 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12"
        >
          {DESTINATION_REGIONS.map((r, i) => (
            <motion.div
              key={r.slug}
              initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: Math.min(i, 5) * 0.05 }}
              className="shrink-0 snap-start w-[78vw] sm:w-[48vw] md:w-[38vw] lg:w-[28vw] xl:w-[22vw]"
            >
              <Link
                to={`/destinations/${r.slug}`}
                className="group block transition-transform duration-500 ease-out-soft hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-card bg-ink shadow-[0_24px_60px_-44px_rgba(12,35,64,0.6)] transition-shadow duration-500 ease-out-soft group-hover:shadow-[0_40px_80px_-44px_rgba(12,35,64,0.75)]">
                  <img
                    src={portImage(r.port) ?? imageUrl(r.asset, { w: 720, h: 960, fit: 'cover' })}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-out-soft group-hover:scale-[1.06] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    loading={i < 4 ? 'eager' : 'lazy'}
                  />
                  {/* Ink scrim — the contrast floor for the overlaid label (never the photo). */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/35 to-transparent" aria-hidden />

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 via-ink/45 to-transparent p-6 pt-12 text-cream md:p-7 md:pt-14">
                    <span aria-hidden className="mb-3 block h-px w-10 bg-accent-goldSoft/80" />
                    <h3 className="font-serif text-xl md:text-2xl leading-tight text-balance line-clamp-3">
                      {t(r.labelKey)}
                    </h3>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-eyebrow uppercase tracking-eyebrow text-accent-goldSoft transition-colors duration-300 group-hover:text-cream">
                      {t('common.explore')}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="motion-safe:transition-transform motion-safe:duration-300 group-hover:translate-x-1">
                        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
