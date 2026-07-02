import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { imageUrl } from '@/lib/image';
import { destinationImage } from '@/lib/portImages';

export interface RegionHeroProps {
  /** Region key (e.g. 'northernEurope') — currently informational; kept for parity with the data contract. */
  regionKey: string;
  /** URL slug used for the region placeholder fallback in destinationImage(). */
  slug: string;
  /** Display label for the region (e.g. "Northern Europe"). */
  label: string;
  /** Representative photographed port code; '' falls back to the region placeholder. */
  heroPort: string;
  /** Short headline tagline (original copy, passed via data). */
  tagline: string;
}

/**
 * RegionHero — a full-bleed destination nameplate. A fixed-height ink stage
 * with a full-bleed slow-zooming photo, a bottom-weighted vignette, a grain
 * overlay, and bottom-pinned cream content: breadcrumb, a "Destinations"
 * eyebrow, the region label as a large gold-warm serif-feel nameplate beneath a
 * short gold hairline, and the tagline in serif italic.
 *
 * The derived headline stats no longer live here — they have moved to a
 * separate dark band below the hero, so this component renders no stat strip.
 *
 * The hero sits ABOVE the sticky sub-nav, so it carries no scroll-spy id
 * (the `#overview` anchor lives in the route's intro section, below the nav).
 */
export function RegionHero({ regionKey, slug, label, heroPort, tagline }: RegionHeroProps) {
  void regionKey;
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const heroSrc = imageUrl(destinationImage(heroPort, slug), { w: 1920, h: 1080, fit: 'cover' });

  return (
    <section className="relative min-h-[78vh] flex items-end overflow-hidden bg-ink">
      <img
        src={heroSrc}
        alt=""
        className={`absolute inset-0 h-full w-full object-cover ${reduceMotion ? '' : 'animate-slow-zoom'}`}
        loading="lazy"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-ink/30 via-ink/5 to-ink/85 pointer-events-none"
        aria-hidden
      />
      <div className="absolute inset-0 bg-grain opacity-20 mix-blend-overlay pointer-events-none" aria-hidden />

      <div className="relative container pb-16 pt-32 md:pb-20 text-cream">
        <Breadcrumb
          variant="light"
          items={[
            { label: t('experience.breadcrumbHome'), href: '/' },
            { label: t('nav.destinations'), href: '/destinations' },
            { label },
          ]}
          className="mb-10 opacity-90"
        />

        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="eyebrow text-accent-goldSoft/90 mb-5"
        >
          {t('nav.destinations')}
        </motion.div>

        {/* Nameplate — the region label as a large, gold-warm serif lockup with a
            short gold hairline beneath it. It is the real <h1>. */}
        <motion.h1
          initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
          className="font-serif font-normal text-cream text-hero-xl leading-[1.0] tracking-tight text-balance max-w-3xl [text-shadow:0_1px_30px_rgba(12,35,64,0.35)]"
        >
          {label}
        </motion.h1>

        <motion.span
          aria-hidden
          initial={{ opacity: 0, scaleX: reduceMotion ? 1 : 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
          className="mt-7 block h-px w-24 origin-left bg-accent-goldSoft/80"
        />

        {tagline && (
          <motion.p
            initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.26 }}
            className="mt-7 max-w-2xl font-serif text-cream/85 text-lg md:text-2xl leading-relaxed text-pretty"
          >
            {tagline}
          </motion.p>
        )}
      </div>
    </section>
  );
}
