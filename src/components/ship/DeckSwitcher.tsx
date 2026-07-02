import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { DeckPlan } from '@/lib/shipAssets';
import { ImageMagnifier } from '@/components/ship/ImageMagnifier';

interface DeckSwitcherProps {
  decks: ReadonlyArray<DeckPlan>;
  /** Tighter spacing/padding for embedding in a modal. */
  compact?: boolean;
  /** Show a cursor-following zoom loupe over the plan (read tiny cabin numbers). */
  magnify?: boolean;
}

const PREV = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const NEXT = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Interactive deck-plan switcher. Horizontal pill row of deck numbers at
 * the top; large image card below shows the selected plan with prev/next
 * arrows and a deck-label band. Image is rendered at its natural aspect
 * ratio (no forced height) so the layout never leaves dead vertical space.
 *
 * Keyboard: ← / → arrows step through the deck list when the rail is focused.
 */
export function DeckSwitcher({ decks, compact = false, magnify = false }: DeckSwitcherProps) {
  const { t } = useTranslation();
  const [activeIdx, setActiveIdx] = useState(0);
  const active = decks[activeIdx];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.target as HTMLElement)?.closest('[data-deck-rail]')) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, decks.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [decks.length]);

  if (!active) return null;

  return (
    <div className={compact ? 'space-y-4 md:space-y-5' : 'space-y-6 md:space-y-8'}>
      {/* Horizontal deck pill row — pinned across the top */}
      <div
        data-deck-rail
        tabIndex={0}
        role="tablist"
        aria-label={t('ship.deckSwitcher.selectorLabel', { defaultValue: 'Deck selector' })}
        className="overflow-x-auto -mx-6 px-6 md:-mx-0 md:px-0 [&::-webkit-scrollbar]:hidden focus:outline-none"
      >
        <div className="inline-flex gap-2 md:gap-3 min-w-max pb-1">
          {decks.map((d, i) => {
            const isActive = i === activeIdx;
            return (
              <button
                key={d.deck}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={t('ship.deckSwitcher.showDeck', { deck: d.deck, defaultValue: 'Show deck {{deck}} plan' })}
                onClick={() => setActiveIdx(i)}
                className={[
                  'group relative shrink-0 inline-flex items-center gap-2 md:gap-2.5',
                  'px-4 py-2.5 md:px-5 md:py-3 min-w-[88px] md:min-w-[100px]',
                  'border transition-all duration-300 ease-out-soft',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mist focus-visible:ring-offset-2 focus-visible:ring-offset-cream',
                  isActive
                    ? 'bg-ink text-cream border-ink shadow-md'
                    : 'bg-cream text-ink border-cream-300/70 hover:border-ink hover:bg-cream-soft',
                ].join(' ')}
              >
                <span
                  className={[
                    'text-[0.6rem] uppercase tracking-[0.18em] transition-opacity',
                    isActive ? 'opacity-75' : 'opacity-60 group-hover:opacity-100',
                  ].join(' ')}
                >
                  {t('ship.deckSwitcher.deckLabel', { defaultValue: 'Deck' })}
                </span>
                <span className="font-serif text-xl md:text-2xl leading-none">
                  {d.deck}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main image card */}
      <div className="bg-cream border border-cream-300/70 overflow-hidden shadow-[0_24px_60px_-40px_rgba(12,35,64,0.35)]">
        {/* Top bar — deck label + prev/next */}
        <div className="flex items-center justify-between px-5 py-3 md:px-7 md:py-4 border-b border-cream-300/60 bg-cream-soft">
          <div className="flex items-baseline gap-3">
            <div className="text-eyebrow uppercase tracking-eyebrow text-ink-600">{t('ship.deckSwitcher.deckLabel', { defaultValue: 'Deck' })}</div>
            <AnimatePresence mode="wait">
              <motion.div
                key={active.deck}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="font-serif text-3xl md:text-4xl text-ink leading-none"
              >
                {active.deck}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveIdx((i) => Math.max(i - 1, 0))}
              disabled={activeIdx === 0}
              aria-label={t('ship.deckSwitcher.previousDeck', { defaultValue: 'Previous deck' })}
              className="w-9 h-9 inline-flex items-center justify-center rounded-full border border-cream-300/70 text-ink bg-cream hover:bg-ink hover:text-cream hover:border-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-cream disabled:hover:text-ink disabled:hover:border-cream-300/70"
            >
              {PREV}
            </button>
            <button
              type="button"
              onClick={() => setActiveIdx((i) => Math.min(i + 1, decks.length - 1))}
              disabled={activeIdx === decks.length - 1}
              aria-label={t('ship.deckSwitcher.nextDeck', { defaultValue: 'Next deck' })}
              className="w-9 h-9 inline-flex items-center justify-center rounded-full border border-cream-300/70 text-ink bg-cream hover:bg-ink hover:text-cream hover:border-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-cream disabled:hover:text-ink disabled:hover:border-cream-300/70"
            >
              {NEXT}
            </button>
          </div>
        </div>

        {/* Image area — natural aspect ratio, centered, generous breathing room */}
        <div className={compact ? 'px-2 py-3 md:px-5 md:py-5 bg-cream' : 'px-4 py-6 md:px-10 md:py-10 bg-cream'}>
          <AnimatePresence mode="wait">
            <motion.div
              key={active.deck}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {magnify ? (
                <ImageMagnifier
                  src={active.src}
                  alt={t('ship.deckSwitcher.planAlt', { deck: active.deck, defaultValue: 'Deck {{deck}} plan' })}
                  className="block h-auto w-full max-w-5xl cursor-zoom-in"
                />
              ) : (
                <img
                  src={active.src}
                  alt={t('ship.deckSwitcher.planAlt', { deck: active.deck, defaultValue: 'Deck {{deck}} plan' })}
                  className="block h-auto w-full max-w-5xl mx-auto"
                  loading="lazy"
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
