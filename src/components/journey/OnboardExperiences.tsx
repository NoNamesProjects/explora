import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import * as Tabs from '@radix-ui/react-tabs';
import { SectionHeading } from '@/components/ui/SectionHeading';
import {
  ONBOARD_CATEGORIES,
  CATEGORY_LABEL_KEY,
  getOnboardExperiences,
  type OnboardCategory,
  type OnboardItem,
} from '@/data/onboardExperiences';

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

interface OnboardExperiencesProps {
  shipCd: string | null | undefined;
}

/**
 * Tabbed showcase of a ship's real onboard venues, grouped by category
 * (Dining / Lounging / Ocean Wellness / Shopping). Each tab renders an
 * arrow-controlled scroll-snap carousel of photo cards (pattern lifted from
 * SuiteTierCarousel). Tabs are only rendered for categories that have at least
 * one venue on this ship; the whole section returns null if there are none.
 */
export function OnboardExperiences({ shipCd }: OnboardExperiencesProps) {
  const { t } = useTranslation();
  const byCategory = getOnboardExperiences(shipCd);
  const tabs = ONBOARD_CATEGORIES.filter((c) => (byCategory[c]?.length ?? 0) > 0);

  if (!tabs.length) return null;

  return (
    <section className="py-section-y bg-cream border-t border-cream-300/60">
      <div className="container max-w-page">
        <SectionHeading
          eyebrow={t('onboard.eyebrow')}
          highlight={t('onboard.heading')}
          align="left"
          className="mb-10"
        />

        <Tabs.Root defaultValue={tabs[0]}>
          <Tabs.List className="flex flex-wrap gap-2 md:gap-3 mb-10 border-b border-cream-300 pb-5">
            {tabs.map((cat) => (
              <Tabs.Trigger
                key={cat}
                value={cat}
                className="pill text-ink-600 hover:text-ink hover:border-ink/40 data-[state=active]:bg-ink data-[state=active]:text-cream data-[state=active]:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mist focus-visible:ring-offset-2 focus-visible:ring-offset-cream transition-colors"
              >
                {t(CATEGORY_LABEL_KEY[cat])}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {tabs.map((cat) => (
            <Tabs.Content key={cat} value={cat} className="focus:outline-none">
              <OnboardCarousel items={byCategory[cat]!} category={cat} />
            </Tabs.Content>
          ))}
        </Tabs.Root>
      </div>
    </section>
  );
}

interface OnboardCarouselProps {
  items: OnboardItem[];
  category: OnboardCategory;
}

function OnboardCarousel({ items, category }: OnboardCarouselProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [progress, setProgress] = useState(0);

  const single = items.length === 1;

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
  }, [items.length]);

  // Reset to the start whenever the active category changes.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = 0;
  }, [category]);

  const scrollByPage = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div>
      {/* Arrow controls — top-right (hidden when only one card) */}
      {!single && (
        <div className="flex items-center justify-end gap-3 mb-8 md:mb-10">
          <CarouselArrow
            dir="prev"
            disabled={atStart}
            onClick={() => scrollByPage(-1)}
            label={t('aria.previousSlide', { defaultValue: 'Previous' })}
          />
          <CarouselArrow
            dir="next"
            disabled={atEnd}
            onClick={() => scrollByPage(1)}
            label={t('aria.nextSlide', { defaultValue: 'Next' })}
          />
        </div>
      )}

      {/* Cards row */}
      <div
        ref={scrollRef}
        className={
          single
            ? ''
            : 'overflow-x-auto snap-x snap-mandatory scroll-smooth -mx-6 md:-mx-8 lg:mx-0 [&::-webkit-scrollbar]:hidden'
        }
      >
        <div className={single ? 'flex' : 'flex gap-5 md:gap-6 px-6 md:px-8 lg:px-0'}>
          {items.map((v, i) => (
            <motion.article
              key={v.key}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: Math.min(i * 0.04, 0.3) }}
              className={
                single
                  ? 'w-full max-w-md'
                  : 'snap-start shrink-0 w-[78vw] sm:w-[48vw] md:w-[34vw] lg:w-[calc((100%-2*1.5rem)/3)]'
              }
            >
              <div className="group">
                <div className="aspect-[4/3] overflow-hidden bg-cream-200 mb-4">
                  <img
                    src={v.src}
                    alt={v.name}
                    className="h-full w-full object-cover transition-transform duration-[1400ms] ease-out-soft group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <h3 className="font-serif text-xl md:text-2xl leading-tight text-ink mb-2">
                  {v.name}
                </h3>
                <p className="text-ink-600 text-sm text-pretty max-w-[40ch]">
                  {t(v.descKey, { defaultValue: '' })}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>

      {/* Progress bar (hidden when only one card) */}
      {!single && (
        <div className="mt-10 md:mt-12 max-w-md mx-auto">
          <div className="relative h-0.5 rounded-full bg-cream-300/70">
            <div
              className="absolute left-0 top-0 h-0.5 rounded-full bg-accent-gold transition-[width] duration-300 ease-out-soft"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}
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
