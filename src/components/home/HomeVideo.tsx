import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';

const VIDEO_ID = 'Zi5FES_5OSc';
/** The video's OWN thumbnail, so the frame reads as the film itself (not an
 *  unrelated photo). maxres isn't generated for every upload → fall back to hq. */
const POSTER = `https://i.ytimg.com/vi/${VIDEO_ID}/maxresdefault.jpg`;

/**
 * Home video section — a click-to-play YouTube facade. We render only a poster
 * + play button until the user clicks; the heavy `<iframe>` (and YouTube's
 * cookies/JS) mount on demand. The click gesture is also what lets `autoplay=1`
 * actually start without being blocked, so the iframe must NOT be pre-mounted.
 * Uses the privacy-respecting `youtube-nocookie.com` embed domain.
 *
 * Layout: the heading is held to a narrow prose measure and centered, while the
 * cinematic video frame spans a generous `max-w-wide` (1440) so it reads as a
 * featured film block rather than a thumbnail.
 */
export function HomeVideo() {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [playing, setPlaying] = useState(false);

  return (
    <section className="py-section-y bg-cream">
      {/* Heading stays narrow + centered for an editorial measure. */}
      <div className="container">
        <div className="mx-auto max-w-prose text-center">
          <div className="eyebrow mb-3">{t('home.video.eyebrow')}</div>
          <h2 className="font-serif text-display leading-[1.05] text-ink text-balance">
            {t('home.video.title')}
          </h2>
        </div>
      </div>

      {/* Video frame spans wide for a generous, cinematic presentation. */}
      <div className="mx-auto mt-12 w-full max-w-wide px-6 md:mt-14 md:px-8 lg:px-12">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="relative aspect-video w-full overflow-hidden rounded-card bg-ink shadow-xl ring-1 ring-ink/10"
        >
          {playing ? (
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`}
              title={t('home.video.title')}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : (
            <button
              type="button"
              aria-label={t('home.video.playAria')}
              onClick={() => setPlaying(true)}
              className="group absolute inset-0 h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
            >
              <img
                src={POSTER}
                onError={(e) => {
                  if (!e.currentTarget.src.endsWith('hqdefault.jpg'))
                    e.currentTarget.src = `https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`;
                }}
                alt=""
                className="h-full w-full object-cover transition-transform duration-[1400ms] ease-out-soft group-hover:scale-[1.04]"
                loading="lazy"
              />
              <span
                aria-hidden
                className="absolute inset-0 bg-ink/25 transition-colors duration-500 group-hover:bg-ink/35"
              />
              <span
                aria-hidden
                className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-cream/90 shadow-lg ring-1 ring-ink/10 transition-transform duration-300 ease-out-soft group-hover:scale-110"
              >
                <svg viewBox="0 0 24 24" className="ml-1 h-10 w-10 fill-ink" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </button>
          )}
        </motion.div>
      </div>
    </section>
  );
}
