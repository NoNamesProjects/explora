import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { destinationImage } from '@/lib/portImages';
import type { JourneyCard as JourneyCardData } from '@/lib/api';
import { DestinationsModal } from './DestinationsModal';

/** Region slug → i18n label key (mirrors the REGIONS list in FindAJourney). */
const REGION_LABEL_KEYS: Record<string, string> = {
  mediterranean: 'mega.destinations.regions.mediterranean',
  caribbean: 'mega.destinations.regions.caribbean',
  alaska: 'mega.destinations.regions.alaska',
  asia: 'mega.destinations.regions.asia',
  'northern-europe': 'mega.destinations.regions.northernEurope',
  transatlantic: 'mega.destinations.regions.transatlantic',
  arabian: 'mega.destinations.regions.arabian',
  'south-america': 'mega.destinations.regions.southAmerica',
  'pacific-coast': 'mega.destinations.regions.pacificCoast',
  'canada-new-england': 'mega.destinations.regions.canadaNewEngland',
  'world-journey': 'mega.destinations.regions.worldJourney',
};

/** Show up to this many destinations inline; longer itineraries collapse to a "see all" link. */
const INLINE_CAP = 14;

interface JourneyCardProps {
  card: JourneyCardData;
  /** Position in its grid — drives the staggered entrance delay. */
  index?: number;
}

/**
 * Shared cruise-package card — ship photo on top, route + destinations + "from"
 * price below on cream. Used by the home Featured Voyages, Find-a-Journey results,
 * the destination-region "Our Journeys" tab, and the ship-detail journeys band.
 *
 * The whole card navigates to the journey detail via a "stretched link" (the
 * title <Link> + an `::after` overlay), so the "see all destinations" control can
 * be a real sibling button (z-10 above the overlay) WITHOUT nesting interactives.
 * Hover: slow image zoom, card lift, title tint, sliding price arrow.
 */
export function JourneyCard({ card, index = 0 }: JourneyCardProps) {
  const { t, i18n } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  const fromPort = card.sailingPortName ?? card.sailingPort;
  const toPort = card.terminationPortName ?? card.terminationPort;
  const regionKey = card.region ? REGION_LABEL_KEYS[card.region] : undefined;
  const regionLabel = regionKey ? t(regionKey) : undefined;
  const dateLabel = new Date(card.sailingDate).toLocaleDateString(i18n.language || undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const title =
    fromPort && toPort
      ? `${fromPort} → ${toPort}`
      : card.itinDesc ?? t('journey.card.sailingFallback', { defaultValue: 'Sailing' });
  const shipNights = `${card.shipName ?? card.shipCd} · ${card.nights} nights`;

  // Real destinations only — defensive filter (the API already excludes sea days).
  const destinations = (card.destinations ?? []).filter(
    (d) => d && d.name && d.name.trim().toLowerCase() !== 'at sea',
  );
  const overflow = destinations.length > INLINE_CAP;
  const shown = overflow ? destinations.slice(0, INLINE_CAP) : destinations;

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: Math.min(index * 0.05, 0.4) }}
      className="group relative flex h-full flex-col bg-cream-soft border border-cream-300/60 transition-all duration-300 hover:border-ink/40 hover:shadow-lg hover:-translate-y-0.5"
    >
      {/* Ship photo */}
      <div className="aspect-[16/10] overflow-hidden bg-cream-200 relative">
        {/* Custom packages carry their own hero; feed sailings derive one from
            the embarkation port / region. */}
        <img
          src={card.heroImage || destinationImage(card.sailingPort, card.region)}
          alt={card.sailingPortName ?? card.region ?? t('journey.card.destinationAlt', { defaultValue: 'Destination' })}
          className="h-full w-full object-cover transition-transform duration-[1400ms] ease-out-soft group-hover:scale-[1.06]"
          loading="lazy"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent opacity-70 pointer-events-none"
          aria-hidden
        />
        {regionKey && (
          <span className="absolute top-4 left-4 text-[0.6rem] uppercase tracking-[0.18em] px-3 py-1 bg-cream/90 text-ink rounded-full backdrop-blur-sm">
            {regionLabel}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-6 md:p-7">
        <div className="text-[0.65rem] uppercase tracking-[0.18em] text-ink-600 mb-2">{shipNights}</div>

        {/* Title = the stretched link: its ::after covers the whole card for navigation. */}
        <h3 className="font-serif text-[1.6rem] md:text-[1.75rem] leading-tight text-balance line-clamp-2 text-ink transition-colors group-hover:text-accent-tan">
          <Link
            to={`/journeys/${encodeURIComponent(card.journeyId)}`}
            className="rounded-sm after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            {title}
          </Link>
        </h3>

        {/* Destinations — up to INLINE_CAP; a blue "see all" link opens the popup for longer itineraries. */}
        {destinations.length > 0 && (
          <p className="mt-3 min-h-[2.75rem] text-sm leading-relaxed text-ink-600">
            {shown.map((d) => d.name).join(' · ')}
            {overflow && (
              <>
                {'  '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAll(true);
                  }}
                  className="relative z-10 rounded-sm font-medium text-[#2563eb] transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
                >
                  {t('journey.card.seeAll', {
                    count: destinations.length,
                    defaultValue: 'see all {{count}} destinations',
                  })}
                </button>
              </>
            )}
          </p>
        )}

        {/* Departing date + per-person price, pinned to the bottom */}
        <div className="mt-auto flex items-end justify-between gap-4 pt-5 mt-6 border-t border-cream-300/60">
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-ink-600 mb-1">{t('common.departing')}</div>
            <div className="text-sm">{dateLabel}</div>
          </div>
          {card.lowestPriceEUR != null && (
            <div className="text-right">
              <div className="text-xs uppercase tracking-[0.14em] text-ink-600 mb-1">{t('common.perPerson')}</div>
              <div className="font-sans font-bold tabular-nums text-xl inline-flex items-baseline gap-1.5 text-ink">
                €{Math.round(card.lowestPriceEUR).toLocaleString(i18n.language || undefined)}
                <span
                  aria-hidden
                  className="not-italic text-base text-accent-gold transition-transform duration-300 group-hover:translate-x-1"
                >
                  ›
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {overflow && (
        <DestinationsModal
          open={showAll}
          onOpenChange={setShowAll}
          card={card}
          title={title}
          subtitle={shipNights}
          regionLabel={regionLabel}
          destinations={destinations}
        />
      )}
    </motion.article>
  );
}
