import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { imageUrl } from '@/lib/image';
import { ParallaxMedia } from '@/components/ship/ParallaxMedia';
import { suiteFeatures, suiteInclusions } from '@/data/suiteDetails';

export interface SuiteFeaturesProps {
  tierName: string;
  /** Factual overview sentence(s) for this suite. */
  overview: string;
  /** Optional accent chips (per-tier highlights); pass [] to omit. */
  highlights: string[];
  sqm: number | null;
  berths: number | null;
  /** A real cabin photo for the right column. */
  photo: string;
}

/**
 * "In every suite" — the inclusions section. A light, airy, editorial two-column
 * layout: the per-tier overview, a serif spec row (m² / berths), optional accent
 * highlights, the shared fleet feature list and inclusion chips on the left; a tall
 * parallax cabin photograph on the right. Section id `#features`. Stays cream-soft —
 * never a dark band. The feature/inclusion sets are shared across tiers (imported
 * from suiteDetails); the overview + specs are per-tier.
 */
export function SuiteFeatures({ tierName, overview, highlights, sqm, berths, photo }: SuiteFeaturesProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const fade = (delay = 0) => ({
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 },
    whileInView: reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const, delay },
  });

  // A refined spec row: each figure gets serif presence with a small uppercase
  // label beneath. Only render the entries we actually have.
  const specs = [
    sqm != null
      ? { figure: `${sqm}`, unit: 'm²', label: t('suiteIndex.spec.sizeLabel', { defaultValue: 'Living space' }) }
      : null,
    berths != null
      ? {
          figure: `${berths}`,
          unit: '',
          label: t('suiteIndex.spec.sleeps', { count: berths, defaultValue: 'Sleeps {{count}}' }),
        }
      : null,
  ].filter(Boolean) as { figure: string; unit: string; label: string }[];

  return (
    <section id="features" className="bg-cream-soft bg-grain border-y border-cream-300/60 py-section-y">
      <div className="container">
        <div className="grid items-center gap-12 md:gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          {/* LEFT — copy, specs, feature list, inclusion chips */}
          <motion.div {...fade()}>
            <div className="eyebrow mb-5 text-accent-tan">
              {t('suiteIndex.features.eyebrow', { defaultValue: 'In every suite' })}
            </div>

            <h2 className="font-serif mb-7 text-balance text-display font-medium leading-[1.04] text-ink">
              {t('suiteIndex.features.headingLead', { name: tierName, defaultValue: 'The {{name}},' })}{' '}
              <em className="font-serif font-normal italic text-ink-soft">
                {t('suiteIndex.features.headingEmphasis', { defaultValue: 'in detail' })}
              </em>
            </h2>

            <p className="max-w-prose text-pretty text-[1.05rem] leading-relaxed text-ink-600">{overview}</p>

            {/* Spec row — serif figures over small uppercase labels, divided */}
            {specs.length > 0 && (
              <dl className="mt-9 flex flex-wrap items-stretch gap-x-10 gap-y-6 border-t border-cream-300/70 pt-8">
                {specs.map((s, i) => (
                  <div
                    key={s.label}
                    className={
                      'flex flex-col' +
                      (i > 0 ? ' border-cream-300/70 pl-10 sm:border-l' : '')
                    }
                  >
                    <dd className="font-serif text-3xl leading-none text-ink sm:text-[2.1rem]">
                      {s.figure}
                      {s.unit && <span className="ml-1 text-xl not-italic text-accent-tan sm:text-2xl">{s.unit}</span>}
                    </dd>
                    <dt className="mt-2.5 text-[0.68rem] uppercase tracking-[0.18em] text-ink-500">{s.label}</dt>
                  </div>
                ))}
              </dl>
            )}

            {/* Per-tier highlights — gold-bordered chips */}
            {highlights.length > 0 && (
              <div className="mt-9 flex flex-wrap gap-2.5">
                {highlights.map((h) => (
                  <span
                    key={h}
                    className="rounded-full border border-accent-gold/50 px-3.5 py-1.5 text-[0.7rem] uppercase tracking-[0.12em] text-accent-tan"
                  >
                    {h}
                  </span>
                ))}
              </div>
            )}

            {/* Shared fleet feature list — gold-dot bullets, airy rows */}
            <ul className="mt-10 max-w-prose">
              {suiteFeatures().map((item) => (
                <li
                  key={item}
                  className="flex gap-3.5 border-b border-cream-300/50 py-3.5 text-ink first:border-t first:border-cream-300/50"
                >
                  <span aria-hidden className="mt-[0.6rem] h-1 w-1 shrink-0 rounded-full bg-accent-gold" />
                  <span className="text-[1rem] leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>

            {/* Shared inclusion chips */}
            <div className="mt-7 flex flex-wrap gap-2.5">
              {suiteInclusions().map((inc) => (
                <span
                  key={inc}
                  className="rounded-full bg-cream-200 px-3.5 py-1.5 text-[0.7rem] uppercase tracking-[0.12em] text-ink-600"
                >
                  {inc}
                </span>
              ))}
            </div>
          </motion.div>

          {/* RIGHT — tall parallax cabin photograph */}
          <motion.div {...fade(0.1)}>
            <ParallaxMedia
              src={imageUrl(photo, { w: 880, h: 1100, fit: 'cover' })}
              alt={t('suiteIndex.features.photoAlt', {
                name: tierName,
                defaultValue: 'Inside a {{name}} suite',
              })}
              className="aspect-[4/5] rounded-card bg-cream-200 shadow-[0_30px_70px_-40px_rgba(12,35,64,0.45)]"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
