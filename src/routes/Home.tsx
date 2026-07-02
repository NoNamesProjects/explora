import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { SearchWidget } from '@/components/hero/SearchWidget';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { PackagesTeaser } from '@/components/home/PackagesTeaser';
import { HomeVideo } from '@/components/home/HomeVideo';
import { DestinationsRow } from '@/components/home/DestinationsRow';
import { LifeOnboard } from '@/components/home/LifeOnboard';
import { AllJourneysInclude } from '@/components/home/AllJourneysInclude';
import { NewsletterBand } from '@/components/home/NewsletterBand';
import { imageUrl } from '@/lib/image';
import { bannerOverride } from '@/lib/content/bannerSrc';
import { RichText } from '@/components/content/RichText';

/**
 * Home: hero + package search, featured voyages, a video, destinations,
 * life onboard, the fleet, journey inclusions, and a newsletter band.
 */
export default function Home() {
  const { t } = useTranslation();

  return (
    <>
      {/* ── Hero banner + package search ──────────────────────────────── */}
      <section className="relative h-[calc(100vh-80px)] min-h-[600px] max-h-[880px] overflow-hidden bg-ink">
        <img
          src={imageUrl(bannerOverride('home.hero') ?? '/photos/banner/astern-pool.webp', { w: 1920, h: 1200, fit: 'cover' })}
          alt=""
          className="absolute inset-0 w-full h-full object-cover animate-slow-zoom"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/15 via-transparent to-ink/55 pointer-events-none" aria-hidden />
        <div className="absolute inset-0 bg-grain opacity-15 mix-blend-overlay pointer-events-none" aria-hidden />

        <div className="absolute inset-0 flex flex-col items-center justify-end pb-28 md:pb-32 px-5 text-cream text-center">
          {/* Hero tagline as a single elegant upright Cormorant-Garamond line over a
              soft text-shadow halo (legible on the bright pool photo), closed by a
              center-growing gold hairline. Sits above the floating search widget. */}
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
            className="max-w-4xl mx-auto font-serif font-normal leading-[1.14] tracking-normal text-balance text-4xl sm:text-5xl md:text-6xl text-cream [text-shadow:0_2px_18px_rgba(12,35,64,0.45)]"
          >
            <RichText tKey="hero.tagline" />
          </motion.h1>
          <motion.span
            aria-hidden
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 1 }}
            className="mt-6 h-px w-12 origin-center bg-accent-goldSoft shadow-[0_1px_4px_rgba(12,35,64,0.45)]"
          />
        </div>
      </section>

      {/* ── Journey search — floats across the hero/cream seam ────────── */}
      <div className="relative z-20 -mt-6 md:-mt-7 px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.75 }}
          className="max-w-6xl mx-auto"
        >
          <SearchWidget />
        </motion.div>
      </div>

      {/* ── Packages teaser ───────────────────────────────────────────── */}
      <section className="py-section-y bg-cream">
        <div className="container">
          <SectionHeading
            eyebrow={t('home.packages.eyebrow')}
            titleLead={t('home.packages.titleLead')}
            highlight={t('home.packages.title')}
            highlightRichKey="home.packages.title"
            align="center"
            className="mb-5"
          />
          <p className="text-ink-600 text-center max-w-prose mx-auto mb-12 md:mb-14">
            {t('home.packages.intro')}
          </p>
          <PackagesTeaser />
        </div>
      </section>

      {/* ── Video ─────────────────────────────────────────────────────── */}
      <HomeVideo />

      {/* ── Destinations row ──────────────────────────────────────────── */}
      <DestinationsRow />

      {/* ── Life onboard ──────────────────────────────────────────────── */}
      <LifeOnboard />

      {/* ── All journeys include ──────────────────────────────────────── */}
      <AllJourneysInclude />

      {/* ── Newsletter band ───────────────────────────────────────────── */}
      <NewsletterBand />
    </>
  );
}
