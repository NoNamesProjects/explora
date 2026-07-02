import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export interface ShipHeroCinematicProps {
  heroImage: string;
  numeral: string;
  shipName: string;
  status: 'in-service' | 'launching' | 'coming-soon';
  launchYear: number | null;
}

/**
 * ShipHeroCinematic — a parallax, scroll-scrubbing version of the ship detail
 * hero. Same content / i18n keys / breadcrumb / status pill / scroll hint as
 * the original static hero, with three scroll-driven motions layered on:
 *   1. background image drifts DOWN slower than the scroll (parallax),
 *   2. the monumental numeral rises and fades as it leaves the viewport.
 *
 * Every hook is called unconditionally at the top, before any early return,
 * to keep the React/Framer hook order stable. All scroll-driven transforms
 * are still CALLED when reduced-motion is on — only the applied style value is
 * gated to `undefined`, so the render is fully static for those users.
 */
export function ShipHeroCinematic({
  heroImage,
  numeral,
  shipName,
  status,
  launchYear,
}: ShipHeroCinematicProps) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  // Parallax drift on the background image (centred ±, so no edge ever shows).
  const imageY = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);
  // The monumental numeral rises and fades as the hero scrolls out of view.
  const numeralY = useTransform(scrollYProgress, [0, 0.9], ['0%', '-45%']);
  const numeralOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[88vh] flex items-end overflow-hidden bg-ink"
    >
      {/* Background image — parallax (translateY) on the wrapper, slow-zoom (scale)
          on the <img>, so the two transforms never fight. The image has vertical
          headroom (h-[120%] / -top-[10%]) so the centred drift never reveals an edge. */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <motion.div className="absolute inset-0" style={{ y: reduce ? undefined : imageY }}>
          <img
            src={heroImage}
            alt={`${shipName} at sea`}
            loading="eager"
            className={`absolute inset-x-0 -top-[10%] h-[120%] w-full object-cover ${
              reduce ? '' : 'animate-slow-zoom'
            }`}
          />
        </motion.div>
      </div>

      {/* Cinematic vignette — light at top, heavy at bottom for legibility. */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-ink/30 via-ink/5 to-ink/85 pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-grain opacity-20 mix-blend-overlay pointer-events-none"
        aria-hidden
      />

      <div className="relative container pb-24 md:pb-32 pt-32 text-cream">
        <Breadcrumb
          variant="light"
          items={[
            { label: t('ship.breadcrumbHome'), href: '/' },
            { label: t('ship.breadcrumbShips'), href: '/ships' },
            { label: shipName },
          ]}
          className="mb-10 opacity-90"
        />

        {status !== 'in-service' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="inline-block mb-6 border border-cream/50 px-4 py-1.5 text-[0.65rem] uppercase tracking-[0.22em] text-cream"
          >
            {status === 'launching'
              ? `Launching ${launchYear ?? ''}`
              : t('mega.ships.comingSoon')}
          </motion.div>
        )}

        {/* Nameplate — the FULL ship name as one big editorial lockup: the EXPLORA
            wordmark + the Roman numeral as a warm italic-serif accent, parted by a
            thin gold rule, with a hairline beneath. It is the real <h1>, and it
            scrubs/fades with the hero on scroll. */}
        <motion.div
          style={{
            y: reduce ? undefined : numeralY,
            opacity: reduce ? undefined : numeralOpacity,
          }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif flex flex-wrap items-baseline gap-x-4 gap-y-1 md:gap-x-6 text-cream text-hero-2xl font-medium leading-[0.95] text-balance"
          >
            <span className="tracking-[0.05em]">EXPLORA</span>
            <span aria-hidden className="hidden self-center h-[0.7em] w-px shrink-0 bg-accent-goldSoft/70 sm:block" />
            <span className="font-serif italic font-normal tracking-tight text-accent-goldSoft">
              {numeral}
            </span>
          </motion.h1>
          <span aria-hidden className="mt-6 block h-px w-24 md:w-32 bg-accent-goldSoft/90" />
        </motion.div>

        {status === 'in-service' && launchYear && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-6 text-cream/75 text-sm tracking-[0.18em] uppercase"
          >
            In service since {launchYear}
          </motion.div>
        )}
      </div>

      {/* Scroll hint */}
      <a
        href="#venues"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 px-4 py-2 text-cream/85 text-[0.62rem] uppercase tracking-[0.32em] transition-colors hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mist rounded-card"
      >
        <span>{t('cta.exploreShip')}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          aria-hidden
          className="animate-soft-bounce"
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </section>
  );
}
