import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { TierKey } from '@/lib/shipAssets';

interface Tier {
  key: TierKey | string;
  name: string;
  tagline: string;
}

interface SuiteTierCarouselProps {
  tiers: ReadonlyArray<Tier>;
  cabins: Partial<Record<TierKey, string[]>> | Record<string, string[] | undefined>;
}

const PREV_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const NEXT_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Horizontal scroll-snap carousel of suite tier cards. Replaces the older
 * SuiteTierAccordion. Each card: tall portrait cabin photo + serif title +
 * 2-line description + "Explore more" CTA. Arrow controls top-right, thin
 * progress bar underneath the row showing scroll position.
 *
 * Cards page by one viewport-width per arrow click; `snap-mandatory` lands
 * the row on a card boundary so there's never a partial card.
 */
export function SuiteTierCarousel({ tiers, cabins }: SuiteTierCarouselProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const ratio = max > 0 ? el.scrollLeft / max : 0;
      setAtStart(el.scrollLeft <= 4);
      setAtEnd(el.scrollLeft >= max - 4);
      setProgress(Math.max(0, Math.min(1, ratio)));
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [tiers.length]);

  const scrollByPage = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div>
      {/* Arrow controls — top-right */}
      <div className="flex items-center justify-end gap-3 mb-8 md:mb-10">
        <CarouselArrow
          dir="prev"
          disabled={atStart}
          onClick={() => scrollByPage(-1)}
          label={t('aria.previousSlide')}
        />
        <CarouselArrow
          dir="next"
          disabled={atEnd}
          onClick={() => scrollByPage(1)}
          label={t('aria.nextSlide')}
        />
      </div>

      {/* Cards row */}
      <div
        ref={scrollRef}
        className="overflow-x-auto snap-x snap-mandatory scroll-smooth -mx-6 md:-mx-8 lg:mx-0 [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex gap-5 md:gap-6 px-6 md:px-8 lg:px-0">
          {tiers.map((tier, i) => {
            const photos =
              (cabins as Record<string, string[] | undefined>)[tier.key] ?? [];
            const primary = photos[0];
            return (
              <motion.article
                key={tier.key}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: Math.min(i * 0.04, 0.3) }}
                className="snap-start shrink-0 w-[78vw] sm:w-[48vw] md:w-[34vw] lg:w-[calc((100%-3*1.5rem)/4)]"
              >
                <Link to={`/suites/${tier.key}`} className="group block">
                  <div className="aspect-[3/4] overflow-hidden bg-cream-200 mb-5">
                    {primary ? (
                      <img
                        src={primary}
                        alt={tier.name}
                        className="h-full w-full object-cover transition-transform duration-[1400ms] ease-out-soft group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-cream-200 to-cream-300/60" />
                    )}
                  </div>
                  <h3 className="font-serif text-xl md:text-2xl leading-tight mb-2 text-ink">
                    {tier.name}
                  </h3>
                  <p className="text-ink-600 text-sm text-pretty mb-5 max-w-[34ch]">
                    {tier.tagline}
                  </p>
                  <span className="link-underline text-accent-tan group-hover:text-ink transition-colors duration-300">
                    {t('ship.tierLearnMore')} <span aria-hidden>›</span>
                  </span>
                </Link>
              </motion.article>
            );
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-10 md:mt-12 max-w-md mx-auto">
        <div className="relative h-px bg-cream-300/80">
          <div
            className="absolute left-0 top-0 h-px bg-ink transition-[width] duration-300 ease-out-soft"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

interface CarouselArrowProps {
  dir: 'prev' | 'next';
  disabled: boolean;
  onClick: () => void;
  label: string;
}

function CarouselArrow({ dir, disabled, onClick, label }: CarouselArrowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={[
        'w-11 h-11 md:w-12 md:h-12 inline-flex items-center justify-center rounded-full',
        'bg-cream border-[1.5px] border-ink text-ink shadow-md',
        'transition-all duration-300 ease-out-soft',
        'hover:bg-ink hover:text-cream hover:shadow-lg',
        'disabled:opacity-30 disabled:cursor-not-allowed',
        'disabled:hover:bg-cream disabled:hover:text-ink disabled:hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mist focus-visible:ring-offset-2 focus-visible:ring-offset-cream',
      ].join(' ')}
    >
      {dir === 'prev' ? PREV_ICON : NEXT_ICON}
    </button>
  );
}
