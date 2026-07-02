import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { imageUrl } from '@/lib/image';
import { portImage } from '@/lib/portImages';
import { regionContentBySlug, regionCopy } from '@/data/regions';
import type { DestinationRegion } from '@/data/destinationRegions';
import type { RegionStat } from './RegionIndexCard';

/** Shared focus recipe — a mist-blue ring floated off the cream page. */
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mist focus-visible:ring-offset-2 focus-visible:ring-offset-cream';

/** How many named ports the editorial strip lists before it stops. */
const MAX_PORTS = 5;

export interface RegionFeatureCardProps {
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
   * Aspect ratio the feature keeps on small/medium screens. On `lg` the mosaic
   * gives the feature an explicit spanned height, so the ratio is released with
   * `lg:aspect-auto` and it fills its cell.
   */
  aspectClassName?: string;
}

/**
 * RegionFeatureCard — the LEAD FEATURE of an ocean group in the /destinations
 * "Editorial Atlas": a large photographic tile that anchors the asymmetric
 * mosaic. Beneath an ink scrim it stacks the region name (serif display), its
 * tagline (serif-italic), a trimmed intro, a NAMED-PORT strip and the live STAT
 * line — the last two read as editorial captions. The whole tile is ONE stretched
 * router <Link> to /destinations/:slug, with no nested interactive elements.
 */
export function RegionFeatureCard({
  region,
  stats,
  loading,
  index,
  className = '',
  aspectClassName = 'aspect-[4/5] sm:aspect-[16/10]',
}: RegionFeatureCardProps) {
  const { t, i18n } = useTranslation();

  const rc = regionContentBySlug(region.slug);
  const copy = rc ? regionCopy(rc, i18n.language) : null;
  const regionName = t(region.labelKey);

  const src = portImage(region.port) ?? imageUrl(region.asset, { w: 1400, h: 1000, fit: 'cover' });
  const portNames = rc ? rc.ports.slice(0, MAX_PORTS).map((p) => p.name) : [];
  const portName = rc?.ports.find((p) => p.code === region.port)?.name;
  const alt = portName ? `${portName} — ${regionName}` : regionName;

  return (
    <Link
      to={`/destinations/${region.slug}`}
      aria-label={regionName}
      className={`group block h-full rounded-card ${FOCUS_RING} ${className}`}
    >
      <article
        className={`relative h-full w-full overflow-hidden rounded-card bg-ink shadow-[0_28px_70px_-44px_rgba(12,35,64,0.65)] transition-all duration-500 ease-out-soft group-hover:-translate-y-1 group-hover:shadow-[0_48px_90px_-44px_rgba(12,35,64,0.8)] motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 ${aspectClassName} lg:aspect-auto`}
      >
        <img
          src={src}
          alt={alt}
          loading={(index ?? 99) < 3 ? 'eager' : 'lazy'}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-out-soft group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        {/* Ink scrim — the contrast floor for the overlaid text (never the photo itself). */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/35 to-transparent"
          aria-hidden
        />

        <div className="absolute inset-x-0 bottom-0 p-7 pt-12 text-cream md:p-9 md:pt-16 lg:p-10 lg:pt-16">
          <span
            aria-hidden
            className="mb-4 block h-px w-12 bg-accent-goldSoft/80 transition-all duration-500 ease-out-soft group-hover:w-20 motion-reduce:transition-none"
          />

          <h3 className="font-serif font-normal text-display-sm leading-[1.05] text-balance text-cream lg:text-display">
            {regionName}
          </h3>

          {copy?.tagline && (
            <p className="mt-2 font-serif italic text-lg leading-snug text-pretty text-cream/90 md:text-xl">
              {copy.tagline}
            </p>
          )}

          {copy?.intro && (
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-pretty text-cream/75 line-clamp-2">
              {copy.intro}
            </p>
          )}

          {portNames.length > 0 && (
            <>
              <span
                aria-hidden
                className="mt-6 mb-4 block h-px w-full max-w-xl bg-cream/15"
              />
              <p className="text-eyebrow uppercase tracking-eyebrow text-accent-goldSoft/90">
                {portNames.join(' · ')}
              </p>
            </>
          )}

          <FeatureStatLine region={region} stats={stats} loading={loading} />

          <span className="mt-6 inline-flex items-center gap-2 text-eyebrow uppercase tracking-eyebrow text-cream">
            <span className="relative">
              {t('destination.index.cardCta')}
              <span
                aria-hidden
                className="absolute -bottom-1 left-0 block h-px w-full origin-left scale-x-[0.28] bg-accent-goldSoft transition-transform duration-500 ease-out-soft group-hover:scale-x-100 motion-reduce:transition-none"
              />
            </span>
            <svg
              width="15"
              height="15"
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
 * The feature's live stat caption — the larger sibling of the companion tile's
 * stat line:
 *  - loading        → a calm skeleton bar
 *  - world-journey  → the curated-voyage label (never a journey count)
 *  - failed region  → nothing
 *  - otherwise      → "N journeys · X–Y nights · from €P", omitting any null figure
 */
function FeatureStatLine({
  region,
  stats,
  loading,
}: Pick<RegionFeatureCardProps, 'region' | 'stats' | 'loading'>) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <span
        aria-hidden
        className="mt-4 block h-3.5 w-52 max-w-[75%] animate-pulse rounded-full bg-cream/25"
      />
    );
  }

  if (region.slug === 'world-journey') {
    return <p className="mt-4 text-sm text-cream/90">{t('destination.index.worldJourneyStat')}</p>;
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

  return <p className="mt-4 text-sm font-medium tracking-wide text-cream/90">{parts.join(' · ')}</p>;
}
