import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { imageUrl } from '@/lib/image';
import { ParallaxMedia } from '@/components/ship/ParallaxMedia';
import { Lightbox } from './Lightbox';

export interface SuiteGalleryProps {
  /** Eyebrow label (the suite name) — passed via data, never hardcoded. */
  label: string;
  /** Suite name woven into the heading. */
  tierName: string;
  /** Real cabin photos (paths passed straight to imageUrl). */
  photos: string[];
}

/**
 * The suite's REAL photo gallery — the star element of the page. An airy,
 * cream, photography-forward showcase: an elegant header, one large featured
 * frame (photos[0]) with subtle parallax drift, then the remaining photos in a
 * refined asymmetric editorial grid. Every tile opens an accessible Lightbox at
 * its real index. Renders nothing when there are no photos. Section id
 * `#gallery` for the page's scroll-spy sub-nav.
 */
export function SuiteGallery({ label, tierName, photos }: SuiteGalleryProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  const featured = photos[0];
  const rest = photos.slice(1);

  const reveal = (delayStep: number) => ({
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 22 },
    whileInView: reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' } as const,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1] as const,
      delay: Math.min(delayStep, 6) * 0.06,
    },
  });

  return (
    <section id="gallery" className="py-section-y bg-cream">
      <div className="container">
        {/* Elegant header */}
        <header className="max-w-editorial mb-10 md:mb-14">
          <div className="text-eyebrow uppercase tracking-eyebrow mb-4 text-ink-600">{label}</div>
          <h2 className="font-serif text-display leading-[1.05] text-ink text-balance">
            {t('suiteIndex.gallery.heading', { name: tierName, defaultValue: 'Inside the {{name}}' })}
          </h2>
          <p className="mt-5 text-eyebrow uppercase tracking-eyebrow text-ink-500 tabular-nums">
            {t('suiteIndex.gallery.count', {
              count: photos.length,
              defaultValue: '{{count}} photographs',
            })}
          </p>
        </header>

        {/* Large featured frame — photos[0], opens the Lightbox at index 0 */}
        <motion.button
          type="button"
          onClick={() => setOpenIndex(0)}
          aria-label={t('suiteIndex.gallery.openPhoto', {
            current: 1,
            total: photos.length,
            defaultValue: 'Open photo {{current}} of {{total}}',
          })}
          {...reveal(0)}
          className="group relative block w-full max-w-page overflow-hidden rounded-card bg-cream-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mist focus-visible:ring-offset-4 focus-visible:ring-offset-cream"
        >
          <ParallaxMedia
            src={imageUrl(featured)}
            alt={t('suiteIndex.gallery.featuredAlt', {
              name: tierName,
              defaultValue: 'The {{name}} suite, featured photograph',
            })}
            className="aspect-[3/2]"
            imgClassName="transition-transform duration-[1400ms] ease-out-soft group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-ink/0 transition-colors duration-500 group-hover:bg-ink/[0.06]"
          />
        </motion.button>

        {/* Remaining photos — a clean masonry so every photo keeps its
            natural aspect and packs without ragged, misaligned rows. */}
        {rest.length > 0 && (
          <div className="mt-4 gap-4 [column-fill:_balance] sm:columns-2 md:mt-6 md:gap-6 lg:columns-3">
            {rest.map((photo, i) => {
              const realIndex = i + 1; // slice offset
              return (
                <motion.button
                  key={photo}
                  type="button"
                  onClick={() => setOpenIndex(realIndex)}
                  aria-label={t('suiteIndex.gallery.openPhoto', {
                    current: realIndex + 1,
                    total: photos.length,
                    defaultValue: 'Open photo {{current}} of {{total}}',
                  })}
                  {...reveal(i + 1)}
                  className="group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-card bg-cream-200 md:mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mist focus-visible:ring-offset-4 focus-visible:ring-offset-cream"
                >
                  <img
                    src={imageUrl(photo)}
                    alt={t('suiteIndex.gallery.tileAlt', {
                      name: tierName,
                      current: realIndex + 1,
                      defaultValue: 'The {{name}} suite, photograph {{current}}',
                    })}
                    className="block h-auto w-full object-cover transition-transform duration-[1400ms] ease-out-soft group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    loading={i < 3 ? 'eager' : 'lazy'}
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-ink/0 transition-colors duration-500 group-hover:bg-ink/10"
                  />
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {openIndex !== null && (
          <Lightbox
            photos={photos}
            index={openIndex}
            onClose={() => setOpenIndex(null)}
            onIndex={setOpenIndex}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
