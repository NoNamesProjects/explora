import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { imageUrl } from '@/lib/image';
import { portImage } from '@/lib/portImages';
import { regionContentBySlug, regionCopy } from '@/data/regions';
import type { DestinationRegion } from '@/data/destinationRegions';

export interface RegionStat {
  total: number;
  nightsMin: number | null;
  nightsMax: number | null;
  priceFrom: number | null;
}

export interface RegionIndexCardProps {
  region: DestinationRegion;
  /** Live per-region figures; `undefined`/`null` while loading or when the fetch failed. */
  stats?: RegionStat | null;
  /** True until the region's figures have resolved (or failed). */
  loading?: boolean;
  /** Position in the overall grid — only used to eager-load the first few images. */
  index?: number;
  /** Extra classes for the outer Link — the atlas mosaic uses this for col/row spans. */
  className?: string;
  /**
   * Aspect ratio the tile keeps on small/medium screens. On `lg` the mosaic gives
   * every cell an explicit height, so the ratio is released with `lg:aspect-auto`
   * and the card simply fills its cell.
   */
  aspectClassName?: string;
}

/** Shared focus recipe — a mist-blue ring floated off the cream page. */
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mist focus-visible:ring-offset-2 focus-visible:ring-offset-cream';

/**
 * RegionIndexCard — an enriched COMPANION tile in the /destinations "Editorial
 * Atlas", set beside each ocean group's cinematic lead feature (RegionFeatureCard).
 * A single photographic tile: a real port photograph beneath an ink scrim, with
 * the region name in serif cream, its evocative tagline in serif-italic, the live
 * stat line and a quiet "Explore region" cue riding the base. The whole card is
 * ONE stretched router <Link> to /destinations/:slug — no nested interactive
 * elements. Stats fill in live as the page resolves them — until then a calm
 * skeleton bar holds the line.
 */
export function RegionIndexCard({
  region,
  stats,
  loading,
  index,
  className = '',
  aspectClassName = 'aspect-[3/4]',
}: RegionIndexCardProps) {
  const { t, i18n } = useTranslation();

  const src = portImage(region.port) ?? imageUrl(region.asset, { w: 800, h: 1000, fit: 'cover' });
  const regionName = t(region.labelKey);
  const rc = regionContentBySlug(region.slug);
  const tagline = rc ? regionCopy(rc, i18n.language).tagline : '';
  const portName = rc?.ports.find((p) => p.code === region.port)?.name;
  const alt = portName ? `${portName} — ${regionName}` : regionName;

  return (
    <Link
      to={`/destinations/${region.slug}`}
      aria-label={regionName}
      className={`group block h-full rounded-card ${FOCUS_RING} ${className}`}
    >
      <article
        className={`relative h-full w-full overflow-hidden rounded-card bg-ink shadow-[0_24px_60px_-44px_rgba(12,35,64,0.6)] transition-all duration-500 ease-out-soft group-hover:-translate-y-1 group-hover:shadow-[0_40px_80px_-44px_rgba(12,35,64,0.75)] motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 ${aspectClassName} lg:aspect-auto`}
      >
        <img
          src={src}
          alt={alt}
          loading={(index ?? 99) < 3 ? 'eager' : 'lazy'}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-out-soft group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        {/* Ink scrim — the contrast floor for the overlaid text (never the photo itself). */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/35 to-transparent"
          aria-hidden
        />

        <div className="absolute inset-x-0 bottom-0 p-6 pt-12 text-cream md:p-7 md:pt-14">
          <span
            aria-hidden
            className="mb-3 block h-px w-10 bg-accent-goldSoft/80 transition-all duration-500 ease-out-soft group-hover:w-16 motion-reduce:transition-none"
          />
          <h3 className="font-serif text-xl md:text-2xl leading-tight text-balance text-cream">
            {regionName}
          </h3>

          {tagline && (
            <p className="mt-1.5 font-serif italic text-base leading-snug text-pretty text-cream/85">
              {tagline}
            </p>
          )}

          <RegionStatLine region={region} stats={stats} loading={loading} />

          <span className="mt-4 inline-flex items-center gap-1.5 text-eyebrow uppercase tracking-eyebrow text-accent-goldSoft transition-colors duration-300 group-hover:text-cream">
            {t('destination.index.cardCta')}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="motion-safe:transition-transform motion-safe:duration-300 group-hover:translate-x-1"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </span>
        </div>
      </article>
    </Link>
  );
}

/**
 * The stat line beneath the region name:
 *  - loading            → a calm skeleton bar
 *  - world-journey      → the curated-voyage label (never a journey count)
 *  - failed region      → nothing (the card still reads as name + photo + CTA)
 *  - otherwise          → "N journeys · X–Y nights · from €P", omitting any null figure
 */
function RegionStatLine({
  region,
  stats,
  loading,
}: Pick<RegionIndexCardProps, 'region' | 'stats' | 'loading'>) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <span
        aria-hidden
        className="mt-3 block h-3 w-32 max-w-[70%] animate-pulse rounded-full bg-cream/25"
      />
    );
  }

  if (region.slug === 'world-journey') {
    return <p className="mt-3 text-sm text-cream/80">{t('destination.index.worldJourneyStat')}</p>;
  }

  if (!stats) return null;

  const parts: string[] = [t('destination.index.stat.journeys', { count: stats.total })];
  if (stats.nightsMin != null && stats.nightsMax != null) {
    parts.push(t('destination.index.stat.nightsRange', { min: stats.nightsMin, max: stats.nightsMax }));
  }
  if (stats.priceFrom != null) {
    parts.push(
      t('destination.index.stat.from', { price: Math.round(stats.priceFrom).toLocaleString() }),
    );
  }

  return <p className="mt-3 text-sm text-cream/80">{parts.join(' · ')}</p>;
}
