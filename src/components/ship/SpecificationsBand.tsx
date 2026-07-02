import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export interface SpecificationsBandProps {
  /** The stats to render — value/label pairs (e.g. tonnage, guests, suites). */
  stats: { value: string; label: string }[];
  /** Eyebrow heading rendered above the stats grid. */
  heading: string;
  /** When the ship is not yet in service: soften the grid + show a caveat note. */
  comingSoon: boolean;
}

/**
 * Dark cinematic "specifications" band.
 *
 * Merges the light Ship Highlights stats strip with the dark sustainability
 * section's treatment: the SAME stats, rendered on a navy (`bg-ink`) ground
 * with a radial glow + film-grain overlay, oversized serif-italic figures and
 * tracked uppercase labels.
 *
 * Self-contained leaf component. Every hook is called unconditionally at the
 * top, before any branching, per the hook-order rule.
 */
export function SpecificationsBand({ stats, heading, comingSoon }: SpecificationsBandProps) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();

  // Gentle whileInView fades are acceptable under reduced-motion; when reduced,
  // collapse the translate so figures simply fade (no movement at all).
  const offset = reduce ? 0 : 16;

  return (
    <section className="relative overflow-hidden bg-ink py-section-y text-cream">
      {/* Decorative radial glow — purely atmospheric. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 50% 0%, rgba(115,133,159,0.45) 0%, transparent 60%)',
        }}
      />
      {/* Film-grain overlay. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grain opacity-20 mix-blend-overlay"
      />

      <div className="relative container">
        <div className="eyebrow mb-12 text-center text-cream/60 md:mb-16">{heading}</div>

        <dl
          className={[
            'mx-auto grid max-w-page grid-cols-2 md:grid-cols-5',
            'divide-y divide-cream/15 md:divide-x md:divide-y-0',
            comingSoon ? 'opacity-75' : '',
          ].join(' ')}
        >
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: offset }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
              className="px-4 py-10 text-center md:py-4"
            >
              <dt className="mb-4 font-serif text-6xl leading-none tracking-tight text-cream md:text-7xl">
                {s.value}
              </dt>
              <dd className="text-eyebrow uppercase tracking-eyebrow text-cream/60 text-balance">
                {s.label}
              </dd>
            </motion.div>
          ))}
        </dl>

        {comingSoon && (
          <p className="mt-10 text-center text-sm italic text-cream/60">
            {t(
              'ship.specsComingSoon',
              'Specifications subject to confirmation closer to launch.',
            )}
          </p>
        )}
      </div>
    </section>
  );
}
