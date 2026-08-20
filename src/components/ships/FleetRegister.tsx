import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { visibleShips } from '@/data/megaMenu';
import { getShipAssets } from '@/lib/shipAssets';
import { getShipFacts } from '@/data/shipFacts';

/**
 * /ships fleet register — the visible vessels as a chronological sequence of
 * alternating full-width editorial rows threaded by a gold "year rail" (the same
 * route-line language as the journey itinerary). Each row pairs a cinematic ship
 * photo with an oversized italic-serif Roman numeral (the page's one signature
 * element), the launch status, and a glimpse of that ship's REAL onboard venues
 * — so every entry carries distinct content rather than an identical status line.
 *
 * Deliberately distinct from the home page's compact `ShipsGrid` (which stays as
 * is). Ships not yet launched (EXPLORA V/VI) are excluded via `visibleShips`.
 */
export function FleetRegister() {
  const { t } = useTranslation();

  return (
    <div className="relative">
      {visibleShips.map((s, i) => {
        const facts = getShipFacts(s.code);
        const assets = getShipAssets(s.code);
        const isFirst = i === 0;
        const isLast = i === visibleShips.length - 1;
        const imageRight = i % 2 === 1; // alternate sides down the register

        const statusText =
          facts.status === 'in-service'
            ? t('home.fleet.status.inService', { year: facts.launchYear })
            : facts.status === 'launching'
              ? t('home.fleet.status.launching', { year: facts.launchYear })
              : t('home.fleet.status.comingSoon');

        const venues = assets.onboard.slice(0, 3).map((v) => v.name);
        const yearLabel = facts.launchYear ? String(facts.launchYear) : '—';

        return (
          <motion.div
            key={s.code}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative grid grid-cols-[2.25rem,1fr] md:grid-cols-[5.5rem,1fr] gap-4 md:gap-8"
          >
            {/* ── YEAR RAIL — a gold thread marking the fleet chronology ── */}
            <div className="relative" aria-hidden>
              {!isFirst && (
                <span className="absolute left-1/2 top-0 h-1/2 w-0 -translate-x-1/2 border-l border-accent-gold/35" />
              )}
              {!isLast && (
                <span className="absolute bottom-0 left-1/2 top-1/2 w-0 -translate-x-1/2 border-l border-accent-gold/35" />
              )}
              <span className="absolute left-1/2 top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent-gold/70 bg-cream shadow-[0_2px_8px_-3px_rgba(12,35,64,0.4)]" />
              <span className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-[2.6rem] font-serif text-lg text-accent-tan md:block">
                {yearLabel}
              </span>
            </div>

            {/* ── SHIP ROW ── */}
            <Link
              to={`/ships/${s.code}`}
              aria-label={facts.name}
              className="group block rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mist focus-visible:ring-offset-4 focus-visible:ring-offset-cream"
            >
              <div className="grid items-center gap-7 py-8 md:grid-cols-2 md:gap-12 md:py-14">
                {/* Photo */}
                <div className={['relative overflow-hidden rounded-card bg-cream-200', imageRight ? 'md:order-2' : ''].join(' ')}>
                  <div className="aspect-[4/3] md:aspect-[5/4]">
                    <img
                      src={assets.hero}
                      alt={facts.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-[1600ms] ease-out-soft group-hover:scale-[1.05]"
                    />
                  </div>
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-ink/25 via-transparent to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-100"
                    aria-hidden
                  />
                </div>

                {/* Identity — the oversized numeral is the signature */}
                <div className={imageRight ? 'md:order-1' : ''}>
                  <div className="eyebrow mb-3 text-accent-tan" aria-hidden>
                    Explora
                  </div>
                  <h3 className="leading-none">
                    <span
                      aria-hidden
                      className="block font-serif tracking-tight text-ink text-[clamp(3.75rem,9vw,7.5rem)] leading-[0.82] transition-colors duration-500 group-hover:text-accent-tan"
                    >
                      {facts.numeral}
                    </span>
                    <span className="sr-only">{facts.name}</span>
                  </h3>

                  <div className="mb-7 mt-5 h-px w-16 bg-accent-gold/60" aria-hidden />

                  <div className="eyebrow text-ink-600">{statusText}</div>

                  {venues.length > 0 && (
                    <div className="mt-6">
                      <div className="mb-2 text-[0.6rem] uppercase tracking-[0.18em] text-ink-500">
                        {t('ship.venueCarousel.eyebrow')}
                      </div>
                      <p className="font-serif text-lg leading-snug text-ink-soft md:text-xl">
                        {venues.join('  ·  ')}
                      </p>
                    </div>
                  )}

                  <div className="mt-8 inline-flex items-baseline gap-1.5 text-accent-goldText link-underline">
                    <span>{t('home.fleet.viewShip')}</span>
                    <span aria-hidden className="transition-transform duration-300 ease-out-soft group-hover:translate-x-1">
                      ›
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
