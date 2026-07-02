import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { visibleShips } from '@/data/megaMenu';
import { getShipAssets } from '@/lib/shipAssets';
import { getShipFacts } from '@/data/shipFacts';
import { imageUrl } from '@/lib/image';

/**
 * Shared fleet grid — the available vessels as editorial photo-top cards (real ship
 * photo, ship name, a factual status line, and an "explore the ship" link).
 * Used by both the home "Our Fleet" section and the /ships fleet index page so
 * the card language stays identical in one place. Ships not yet launched are
 * excluded via `visibleShips` (see src/data/shipVisibility.ts).
 */

function shipImage(code: string, fallbackAsset: string): string {
  try {
    return getShipAssets(code).hero;
  } catch {
    return imageUrl(fallbackAsset, { w: 920, h: 575, fit: 'cover' });
  }
}

export function ShipsGrid({ className = '' }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <div className={['grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:gap-10', className].join(' ')}>
      {visibleShips.map((s, i) => {
        const facts = getShipFacts(s.code);
        const statusText =
          facts.status === 'in-service'
            ? t('home.fleet.status.inService', { year: facts.launchYear })
            : facts.status === 'launching'
              ? t('home.fleet.status.launching', { year: facts.launchYear })
              : t('home.fleet.status.comingSoon');
        const comingSoon = facts.status === 'coming-soon';

        return (
          <motion.div
            key={s.code}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
          >
            <Link
              to={`/ships/${s.code}`}
              className="group block h-full bg-cream-soft border border-cream-300/60 transition-all duration-500 ease-out-soft hover:-translate-y-1 hover:border-ink/40 hover:shadow-[0_30px_60px_-32px_rgba(12,35,64,0.45)]"
            >
              <div className="aspect-[16/10] overflow-hidden bg-cream-200 relative">
                <img
                  src={shipImage(s.code, s.asset)}
                  alt={t(s.labelKey)}
                  className="h-full w-full object-cover transition-transform duration-[1600ms] ease-out-soft group-hover:scale-[1.06]"
                  loading="lazy"
                />
                {/* Soft bottom scrim for depth under the image. */}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-ink/15 via-transparent to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-100"
                  aria-hidden
                />
                {comingSoon && (
                  <div className="absolute top-4 left-4 text-[0.6rem] uppercase tracking-[0.2em] px-3 py-1 bg-cream/95 text-ink rounded-full">
                    {t('mega.ships.comingSoon')}
                  </div>
                )}
              </div>
              <div className="p-6 md:p-7 lg:p-8">
                <h3 className="font-serif text-2xl md:text-3xl lg:text-4xl leading-tight text-ink transition-colors duration-300 group-hover:text-accent-tan">
                  {t(s.labelKey)}
                </h3>
                <div className="mt-2.5 text-eyebrow uppercase tracking-eyebrow text-ink-600">
                  {statusText}
                </div>
                <div className="mt-5 link-underline text-accent-gold inline-flex items-baseline gap-1.5">
                  <span>{t('home.fleet.viewShip')}</span>
                  <span aria-hidden className="transition-transform duration-300 ease-out-soft group-hover:translate-x-1">
                    ›
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
