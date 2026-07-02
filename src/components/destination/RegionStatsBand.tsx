import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { RegionStats } from '@/lib/regionStats';

export interface RegionStatsBandProps {
  /** Headline figures derived from the region's sailings. */
  stats: RegionStats;
}

interface Figure {
  /** Stable key, used for React key + i18n traceability. */
  key: string;
  /** Big serif-italic figure. */
  value: string;
  /** Tracked uppercase label. */
  label: string;
}

/**
 * Dark cinematic "At a glance" stat band for a destination region page.
 *
 * Mirrors the ship SpecificationsBand treatment — a navy (`bg-ink`) ground with
 * a radial glow + film-grain overlay, oversized serif-italic figures and tracked
 * uppercase labels — but is driven by the region's derived {@link RegionStats}.
 *
 * Every figure is null-safe: a figure is omitted entirely when its underlying
 * value is null / 0 / empty, so the grid never shows a bogus "0" or blank. When
 * NO figures are available the whole band renders `null`.
 *
 * Self-contained leaf component. Every hook is called unconditionally at the top,
 * before any branching, per the hook-order rule.
 */
export function RegionStatsBand({ stats }: RegionStatsBandProps) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();

  // Gentle whileInView fades are acceptable under reduced-motion; when reduced,
  // collapse the translate so figures simply fade (no movement at all).
  const offset = reduce ? 0 : 16;

  const figures = buildFigures(stats, t);

  if (figures.length === 0) return null;

  // Choose a column count that divides the figures cleanly on desktop.
  const mdCols = figures.length >= 5 ? 'md:grid-cols-5' : 'md:grid-cols-4';

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
        <div className="eyebrow mb-12 text-center text-cream/60 md:mb-16">
          {t('destination.atAGlance', { defaultValue: 'At a glance' })}
        </div>

        <dl
          className={[
            'mx-auto grid max-w-page grid-cols-2',
            mdCols,
            'divide-y divide-cream/15 md:divide-x md:divide-y-0',
          ].join(' ')}
        >
          {figures.map((fig, i) => (
            <motion.div
              key={fig.key}
              initial={{ opacity: 0, y: offset }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
              className="px-4 py-10 text-center md:py-4"
            >
              <dt className="mb-4 font-serif text-5xl leading-none tracking-tight text-cream md:text-6xl">
                {fig.value}
              </dt>
              <dd className="text-eyebrow uppercase tracking-eyebrow text-cream/60 text-balance">
                {fig.label}
              </dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/**
 * Build the displayable figures list, skipping any figure whose source value is
 * null / 0 / empty. Labels are minimal, original and locale-aware via i18next,
 * reusing the existing `destination.facts.*` keys where they already exist.
 */
function buildFigures(
  stats: RegionStats,
  t: ReturnType<typeof useTranslation>['t'],
): Figure[] {
  const figures: Figure[] = [];

  // Sailings — the server's total.
  if (stats.count > 0) {
    figures.push({
      key: 'sailings',
      value: stats.count.toLocaleString(),
      label: t('destination.facts.sailings', { defaultValue: 'Sailings' }),
    });
  }

  // Ships.
  if (stats.ships.length > 0) {
    figures.push({
      key: 'ships',
      value: String(stats.ships.length),
      label: t('destination.facts.shipsCount', { defaultValue: 'Ships' }),
    });
  }

  // Ports of call.
  if (stats.ports.length > 0) {
    figures.push({
      key: 'ports',
      value: String(stats.ports.length),
      label: t('destination.facts.ports', { defaultValue: 'Ports of call' }),
    });
  }

  // Nights — single value, or a range.
  const nights =
    stats.nightsMin != null && stats.nightsMax != null
      ? stats.nightsMin === stats.nightsMax
        ? String(stats.nightsMin)
        : `${stats.nightsMin}–${stats.nightsMax}`
      : null;
  if (nights) {
    figures.push({
      key: 'nights',
      value: nights,
      label: t('destination.facts.nights', { defaultValue: 'Nights' }),
    });
  }

  // Lead-in fare.
  if (stats.priceFrom != null) {
    figures.push({
      key: 'from',
      value: `€${Math.round(stats.priceFrom).toLocaleString()}`,
      label: t('destination.facts.from', { defaultValue: 'From' }),
    });
  }

  return figures;
}
