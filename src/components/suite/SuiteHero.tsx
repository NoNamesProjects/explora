import { Fragment } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { imageUrl } from '@/lib/image';

export interface SuiteHeroProps {
  /** Tier key — informational (kept for parity with the data contract). */
  tierKey: string;
  /** Display name, e.g. "Owner's Residence" (or "Our Suites" on the overview). */
  label: string;
  /** Real cabin photo path or a placeholder id — passed straight to imageUrl(). */
  heroPhoto: string;
  /** Short original tagline. */
  tagline: string;
  /** Suite size in m², or null (overview hero passes null). */
  sqm: number | null;
  /** Berths the suite sleeps, or null. */
  berths: number | null;
}

/**
 * SuiteHero — a full-bleed ink stage with a slow-zooming cabin photo, an airy
 * cinematic vignette + grain, and bottom-pinned cream content. The suite name
 * reads as a large serif NAMEPLATE with a soft gold feel and a short gold
 * hairline beneath, echoing ShipHeroCinematic's lockup but quieter. A refined
 * uppercase spec row (m² · "Sleeps {n}" · "Ocean-front") sits below, with thin
 * dividers and null specs omitted.
 *
 * Carries NO scroll-spy id — it sits above the sticky sub-nav (`#overview`
 * belongs to the section below). Reused by the overview page with null specs.
 * Every hook is called at the top before any return; motion is gated on
 * useReducedMotion().
 */
export function SuiteHero({ tierKey, label, heroPhoto, tagline, sqm, berths }: SuiteHeroProps) {
  void tierKey;
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const heroSrc = imageUrl(heroPhoto, { w: 1920, h: 1080, fit: 'cover' });

  const specs: string[] = [];
  if (sqm != null) specs.push(`${sqm} m²`);
  if (berths != null) specs.push(t('suiteIndex.spec.sleeps', { count: berths, defaultValue: 'Sleeps {{count}}' }));
  if (sqm != null || berths != null) specs.push(t('suiteIndex.spec.oceanFront', { defaultValue: 'Ocean-front' }));

  const ease = [0.22, 1, 0.36, 1] as const;
  const rise = reduceMotion ? 0 : 16;

  return (
    <section className="relative min-h-[78vh] flex items-end overflow-hidden bg-ink">
      <img
        src={heroSrc}
        alt={t('suiteIndex.heroImageAlt', { label, defaultValue: '{{label}} suite aboard' })}
        className={`absolute inset-0 h-full w-full object-cover scale-105 ${
          reduceMotion ? '' : 'animate-slow-zoom'
        }`}
        loading="eager"
      />

      {/* Cinematic vignette — airy at top, weighted at the bottom for legibility. */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-ink/30 via-ink/5 to-ink/85 pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-grain opacity-20 mix-blend-overlay pointer-events-none"
        aria-hidden
      />

      <div className="relative container pb-16 pt-32 md:pb-20 text-cream">
        <Breadcrumb
          variant="light"
          items={[
            { label: t('suiteIndex.breadcrumbHome', { defaultValue: 'Home' }), href: '/' },
            { label: t('suiteIndex.breadcrumbSuites', { defaultValue: 'Our Suites' }), href: '/suites/overview' },
            { label },
          ]}
          className="mb-8"
        />

        <motion.div
          initial={{ opacity: 0, y: rise }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
          className="eyebrow text-cream/70 mb-5"
        >
          {t('suiteIndex.heroEyebrow', { defaultValue: 'Our Suites' })}
        </motion.div>

        {/* Nameplate — the suite name as a large serif lockup with a soft gold
            warmth, and a short gold hairline beneath. */}
        <motion.h1
          initial={{ opacity: 0, y: rise }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 0.06 }}
          className="font-serif font-normal max-w-3xl text-cream text-balance"
          style={{ fontSize: 'clamp(2.5rem, 6vw, 4.75rem)', lineHeight: 1.04 }}
        >
          {label}
        </motion.h1>
        <motion.span
          aria-hidden
          initial={{ opacity: 0, scaleX: reduceMotion ? 1 : 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.8, ease, delay: 0.18 }}
          className="mt-6 block h-px w-24 origin-left bg-accent-goldSoft/80"
        />

        {tagline && (
          <motion.p
            initial={{ opacity: 0, y: rise }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease, delay: 0.22 }}
            className="mt-6 max-w-2xl font-serif text-cream/85 text-lg md:text-xl leading-relaxed text-pretty"
          >
            {tagline}
          </motion.p>
        )}

        {specs.length > 0 && (
          <motion.dl
            initial={{ opacity: 0, y: rise }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease, delay: 0.3 }}
            className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3 text-cream/90"
          >
            {specs.map((item, i) => (
              <Fragment key={item}>
                {i > 0 && <span aria-hidden className="hidden sm:inline-block h-3.5 w-px bg-cream/25" />}
                <dd className="m-0 whitespace-nowrap text-xs md:text-sm font-medium uppercase tracking-[0.18em]">
                  {item}
                </dd>
              </Fragment>
            ))}
          </motion.dl>
        )}
      </div>
    </section>
  );
}
