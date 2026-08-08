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
import { PageSections } from '@/components/sections/PageSections';
import { imageUrl } from '@/lib/image';
import { bannerOverride } from '@/lib/content/bannerSrc';
import { RichText } from '@/components/content/RichText';

/**
 * Home is now assembled from admin-managed sections (page_sections, page_key
 * 'home') — the client can reorder, hide, delete and add sections from
 * /admin/pages without a deploy.
 *
 * `LegacyHome` below is the original hardcoded composition, kept as the
 * fallback: it renders whenever the CMS returns no sections (seed not run, DB
 * unreachable, or a deliberate rollback). That's what makes this migration
 * reversible rather than a one-way door. Once the seeded sections have been
 * live and stable for a while, this fallback can be deleted.
 */
export default function Home() {
  return <PageSections page="home" fallback={<LegacyHome />} />;
}

/** The pre-page-builder Home, verbatim. See the note above before removing. */
function LegacyHome() {
  const { t } = useTranslation();

  return (
    <>
      {/* ── Hero banner + package search ──────────────────────────────── */}
      <section className="relative h-[calc(100vh-80px)] min-h-[480px] max-h-[620px] overflow-hidden bg-ink">
        <img
          src={imageUrl(bannerOverride('home.hero') ?? '/photos/banner/astern-pool.webp', { w: 1920, h: 1200, fit: 'cover' })}
          alt=""
          className="absolute inset-0 w-full h-full object-cover animate-slow-zoom"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/15 via-transparent to-ink/55 pointer-events-none" aria-hidden />
        <div className="absolute inset-0 bg-grain opacity-15 mix-blend-overlay pointer-events-none" aria-hidden />

        <div className="absolute inset-0 flex flex-col items-center justify-end pb-16 md:pb-20 px-5 text-cream text-center">
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
      <div className="relative z-20 -mt-9 md:-mt-11 px-5">
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

      <HomeVideo />
      <DestinationsRow />
      <LifeOnboard />
      <AllJourneysInclude />
      <NewsletterBand />
    </>
  );
}
