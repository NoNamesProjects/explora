import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { imageUrl } from '@/lib/image';

interface LifeItem {
  key: string;
  title: string;
  body: string;
}

/**
 * Section 5 — "Life on board". A single large editorial heading over three
 * premium portrait cards (suites / dining / wellness) that open the real
 * `/experience/:topic` detail pages. Copy is reused from the parked
 * `home.lifeOnboard.*` i18n subtree (`eyebrow` doubles as the big heading;
 * `exploreCta` the per-card affordance). Each card's imagery is keyed off
 * MEDIA, with a placeholder-ladder fallback for any future item whose photo
 * isn't on disk yet.
 */

const MEDIA: Record<string, { src: string; to: string }> = {
  suites: {
    src: '/photos/Explora_1/Cabins/Serenity_Residences/SERENITY-RESIDENCE-7.webp',
    to: '/experience/suites',
  },
  dining: {
    src: '/photos/explora_3/onboard/Dining-21.webp',
    to: '/experience/dining',
  },
  wellness: {
    src: '/photos/explora_2/Onboard/OCEAN-WELLNESS-SPA-7.webp',
    to: '/experience/wellness',
  },
};

export function LifeOnboard() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const items = (t('home.lifeOnboard.items', { returnObjects: true }) as LifeItem[]) ?? [];

  return (
    <section className="py-section-y bg-cream-soft border-t border-cream-300/50">
      <div className="container">
        <header className="max-w-editorial mb-14 md:mb-20">
          <h2 className="font-serif text-hero-xl leading-tight text-ink text-balance">
            {t('home.lifeOnboard.eyebrow')}
          </h2>
        </header>

        <div className="grid gap-8 md:grid-cols-3">
          {items.map((it, i) => {
            const media = MEDIA[it.key];
            const src = media?.src ?? `explora/placeholder/life-${it.key}`;
            const to = media?.to ?? `/experience/${it.key}`;

            return (
              <motion.div
                key={it.key}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
              >
                <Link
                  to={to}
                  aria-label={t('home.lifeOnboard.exploreCta', { subject: it.title })}
                  className="group relative block overflow-hidden rounded-card bg-ink ring-1 ring-cream-300/50 shadow-[0_8px_30px_-18px_rgba(12,35,64,0.35)] transition-[transform,box-shadow] duration-500 ease-out-soft hover:-translate-y-1.5 hover:shadow-[0_28px_60px_-28px_rgba(12,35,64,0.55)] focus-visible:-translate-y-1.5"
                >
                  <div className="aspect-[3/4] overflow-hidden bg-cream-200">
                    <img
                      src={imageUrl(src, { w: 760, h: 1013, fit: 'cover' })}
                      alt={it.title}
                      className="h-full w-full object-cover transition-transform duration-[1600ms] ease-out-soft group-hover:scale-[1.07]"
                      loading="lazy"
                    />
                  </div>

                  {/* Editorial caption plate — navy wash anchors the type to the foot. */}
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/35 to-transparent"
                    aria-hidden="true"
                  />

                  <div className="absolute inset-x-0 bottom-0 p-7 md:p-8 text-cream">
                    <h3 className="font-serif text-3xl leading-tight text-cream">
                      {it.title}
                    </h3>
                    <p className="mt-2.5 max-w-[26ch] text-[0.95rem] leading-relaxed text-cream/80">
                      {it.body}
                    </p>
                    <span className="mt-6 inline-flex items-center gap-2.5 text-eyebrow uppercase tracking-eyebrow text-cream">
                      {t('home.lifeOnboard.exploreCta', { subject: it.title })}
                      <svg
                        viewBox="0 0 24 24"
                        className="h-[1.05em] w-[1.05em] text-accent-gold transition-transform duration-500 ease-out-soft group-hover:translate-x-1.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        aria-hidden="true"
                      >
                        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
