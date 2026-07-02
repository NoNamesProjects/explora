import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { imageUrl } from '@/lib/image';
import { portImage } from '@/lib/portImages';

export interface RegionPortsProps {
  /** Eyebrow label for the section (e.g. region name) — passed via data, never hardcoded. */
  label: string;
  /** Region slug — used for the search link + the photo fallback placeholder. */
  slug: string;
  /**
   * Bookable DEPARTURE ports for this region (the search's only port filter is the
   * embark port), each from the live facets endpoint so it always has sailings.
   * `code` is the embark port code, `name` its factual name.
   */
  ports: Array<{ code: string; name: string }>;
}

/**
 * Departure-ports rail — a horizontal scroll-snap rail of the region's REAL,
 * bookable embark ports (sourced from `/api/journeys?facets=1&region=`). Each card
 * is a Link that navigates to the Find-a-Journey search pre-filtered to that
 * region + departure port (`?region=&departurePort=`), so a tap always lands on
 * actual sailings — never an empty result. Photo comes from the port-image API
 * (`portImage(code)`), falling back to the region placeholder when a port has no
 * harvested photo yet. Renders nothing when there are no ports.
 *
 * Section id is `#ports` (page assembly order: #overview, #sailings, #ashore, #ports).
 */
export function RegionPorts({ label, slug, ports }: RegionPortsProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  if (ports.length === 0) return null;

  return (
    <section id="ports" className="py-section-y bg-cream-soft">
      <div className="container">
        {/* Editorial heading — eyebrow label + serif title + tap hint. */}
        <div className="max-w-editorial">
          <div className="text-eyebrow uppercase tracking-eyebrow mb-4 text-ink-600">
            {label}
          </div>
          <h2 className="font-serif text-display leading-[1.05] text-ink text-balance">
            {t('destination.ports.title', { defaultValue: 'Departure ports' })}
          </h2>
          <p className="mt-4 max-w-prose text-ink-600">
            {t('destination.ports.subtitle', {
              defaultValue:
                'Choose where your journey begins — select a port to see every sailing that departs from it.',
            })}
          </p>
        </div>
      </div>

      {/* Rail: native scroll-snap, bled to the container edges like the house pattern. */}
      <div className="container">
        <div className="mt-12 flex gap-5 overflow-x-auto scroll-smooth pb-2 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden md:mt-14 md:gap-6 -mx-6 px-6 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
          {ports.map((p, i) => (
            <motion.div
              key={p.code}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
              whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: Math.min(i, 5) * 0.05 }}
              className="shrink-0 snap-start w-[70vw] sm:w-[44vw] md:w-[30vw] lg:w-[22vw]"
            >
              <Link
                to={`/find-your-journey?region=${encodeURIComponent(slug)}&departurePort=${encodeURIComponent(p.code)}`}
                aria-label={t('destination.ports.cardAriaLabel', {
                  port: p.name,
                  defaultValue: 'See sailings departing from {{port}}',
                })}
                className="group relative block overflow-hidden bg-cream-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream-soft"
              >
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src={imageUrl(portImage(p.code) ?? `explora/placeholder/destination-${slug}`, { w: 560, h: 720, fit: 'cover' })}
                    alt={p.name}
                    className="h-full w-full object-cover transition-transform duration-[1400ms] ease-out-soft group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    loading={i < 3 ? 'eager' : 'lazy'}
                  />
                </div>
                {/* Bottom scrim + port name + affordance. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-ink/75 via-ink/25 to-transparent"
                />
                <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                  <span className="font-serif text-lg md:text-xl text-cream">{p.name}</span>
                  <span className="mt-1.5 flex items-center gap-1.5 text-eyebrow uppercase tracking-eyebrow text-cream/80 transition-colors duration-300 group-hover:text-cream">
                    {t('destination.ports.viewSailings', { defaultValue: 'View sailings' })}
                    <svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                      className="motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out-soft group-hover:translate-x-1"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
