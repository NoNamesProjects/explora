import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { suiteOverview, suiteFeatures } from '@/data/suiteDetails';
import { SUITE_TIERS, suiteTier, tierGallery, tierHero, suiteTierFromSlug } from '@/lib/suiteGallery';
import { suiteCopy, overviewCopy } from '@/data/suiteContent';
import { SuiteHero } from '@/components/suite/SuiteHero';
import { SuiteGallery } from '@/components/suite/SuiteGallery';
import { SuiteFeatures } from '@/components/suite/SuiteFeatures';
import { SuiteTierCarousel } from '@/components/ship/SuiteTierCarousel';
import { RegionSubNav } from '@/components/destination/RegionSubNav';
import { SectionHeading } from '@/components/ui/SectionHeading';

/**
 * Suite pages. One route, two modes:
 *   /suites/<tierKey>   → a gallery-led per-tier page (11 real, photographed tiers)
 *   /suites/overview    → the suite collection overview (also the fallback for any
 *                         unknown slug). The mega-menu links here.
 * All real content (photos, specs, copy) is derived in src/lib/suiteGallery.ts +
 * src/data/suiteContent.ts; this route only composes it.
 */
export default function SuiteCategory() {
  const { category } = useParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const tier = suiteTierFromSlug(category);

  // Shared inputs for the SuiteTierCarousel (overview = all 11; per-tier = the others).
  const carouselTiers = SUITE_TIERS.map((t) => ({
    key: t.key,
    name: t.label,
    tagline: suiteCopy(t.key, lang).tagline,
  }));
  const carouselCabins = Object.fromEntries(SUITE_TIERS.map((t) => [t.key, tierGallery(t.key)]));

  // ── OVERVIEW PAGE ──────────────────────────────────────────────────────
  if (!tier) {
    const ov = overviewCopy(lang);
    return (
      <>
        <SuiteHero tierKey="overview" label={t('suiteIndex.overview.heroLabel', { defaultValue: 'Our Suites' })} heroPhoto={tierHero('owners')} tagline={ov.tagline} sqm={null} berths={null} />

        <section className="py-section-y-sm bg-cream">
          <div className="container max-w-editorial text-center">
            <p className="font-serif text-2xl md:text-3xl text-ink-soft leading-relaxed text-balance">
              {ov.intro}
            </p>
          </div>
        </section>

        <section className="py-section-y bg-cream-soft border-y border-cream-300/60">
          <div className="container">
            <SectionHeading
              eyebrow={t('suiteIndex.collection.eyebrow', { defaultValue: 'The collection' })}
              titleLead={t('suiteIndex.collection.titleLead', { defaultValue: 'Eleven ways to' })}
              highlight={t('suiteIndex.collection.highlight', { defaultValue: 'live at sea' })}
              align="center"
              className="mb-12"
            />
            <SuiteTierCarousel tiers={carouselTiers} cabins={carouselCabins} />
          </div>
        </section>

        <AllSuitesInclude />
        <SuiteCta />
      </>
    );
  }

  // ── PER-TIER PAGE ──────────────────────────────────────────────────────
  const { label, sqm, berths } = suiteTier(tier);
  const copy = suiteCopy(tier, lang);
  const gallery = tierGallery(tier);
  const heroPhoto = tierHero(tier);
  const featurePhoto = gallery[1] ?? gallery[0] ?? heroPhoto;
  const otherTiers = carouselTiers.filter((t) => t.key !== tier);

  return (
    <>
      <SuiteHero tierKey={tier} label={label} heroPhoto={heroPhoto} tagline={copy.tagline} sqm={sqm} berths={berths} />

      <RegionSubNav
        ariaLabel={t('suiteIndex.subNav.ariaLabel', { defaultValue: 'Suite sections' })}
        links={[
          { id: 'overview', label: t('suiteIndex.subNav.overview', { defaultValue: 'Overview' }) },
          { id: 'gallery', label: t('suiteIndex.subNav.gallery', { defaultValue: 'Gallery' }) },
          { id: 'features', label: t('suiteIndex.subNav.features', { defaultValue: 'Suite features' }) },
          { id: 'suites', label: t('suiteIndex.subNav.otherSuites', { defaultValue: 'Other suites' }) },
        ]}
      />

      {/* ── #overview — airy editorial intro ─────────────────────────────── */}
      <section id="overview" className="py-section-y bg-cream scroll-mt-32">
        <div className="container max-w-editorial text-center">
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif text-ink-soft leading-relaxed text-balance text-[clamp(1.6rem,3.2vw,2.6rem)]"
          >
            {copy.blurb}
          </motion.p>
          {copy.highlights.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-eyebrow uppercase tracking-eyebrow text-accent-tan"
            >
              {copy.highlights.map((h, i) => (
                <span key={h} className="flex items-center gap-5">
                  {i > 0 && <span aria-hidden className="h-1 w-1 rounded-full bg-accent-gold/55" />}
                  <span>{h}</span>
                </span>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* ── #gallery ─────────────────────────────────────────────────────── */}
      <SuiteGallery label={label} tierName={label} photos={gallery} />

      {/* ── #features ────────────────────────────────────────────────────── */}
      <SuiteFeatures
        tierName={label}
        overview={suiteOverview(label)}
        highlights={[]}
        sqm={sqm}
        berths={berths}
        photo={featurePhoto}
      />

      {/* ── #suites — other tiers ────────────────────────────────────────── */}
      <section id="suites" className="py-section-y bg-cream-soft border-y border-cream-300/60">
        <div className="container">
          <SectionHeading
            eyebrow={t('suiteIndex.otherSuites.eyebrow', { defaultValue: 'Explore more' })}
            titleLead={t('suiteIndex.otherSuites.titleLead', { defaultValue: 'Other' })}
            highlight={t('suiteIndex.otherSuites.highlight', { defaultValue: 'suites' })}
            align="center"
            className="mb-12"
          />
          <SuiteTierCarousel tiers={otherTiers} cabins={carouselCabins} />
        </div>
      </section>

      <SuiteCta />
    </>
  );
}

/** Shared "All suites include" band (the fleet-wide feature set). */
function AllSuitesInclude() {
  const { t } = useTranslation();
  return (
    <section className="py-section-y bg-cream">
      <div className="container max-w-editorial">
        <div className="text-center mb-10 md:mb-12">
          <span aria-hidden className="mx-auto mb-5 block h-px w-12 bg-accent-gold/60" />
          <div className="eyebrow">{t('suiteIndex.include.eyebrow', { defaultValue: 'In every suite' })}</div>
          <h2 className="font-serif mt-3 font-medium text-display leading-tight text-balance text-ink mx-auto max-w-prose">
            {t('suiteIndex.include.headingLead', { defaultValue: 'All suites' })}{' '}
            <em className="font-serif italic font-normal">{t('suiteIndex.include.headingEmphasis', { defaultValue: 'include' })}</em>
          </h2>
        </div>
        <ul className="grid gap-x-12 gap-y-3.5 sm:grid-cols-2">
          {suiteFeatures().map((item) => (
            <li key={item} className="flex gap-3 border-b border-cream-300/50 py-3 text-ink">
              <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent-gold" />
              <span className="text-[0.98rem]">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Shared closing CTA band. */
function SuiteCta() {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden bg-ink text-cream py-section-y">
      <div className="absolute inset-0 bg-grain opacity-25 mix-blend-overlay pointer-events-none" aria-hidden />
      <div className="relative container max-w-editorial text-center">
        <div className="eyebrow text-cream/70 mb-4">{t('suiteIndex.cta.eyebrow', { defaultValue: 'Your home at sea awaits' })}</div>
        <h2 className="font-serif text-display leading-tight text-balance mb-5">{t('suiteIndex.cta.heading', { defaultValue: 'Find a journey' })}</h2>
        <p className="text-cream/80 max-w-prose mx-auto mb-9">
          {t('suiteIndex.cta.body', { defaultValue: 'Browse every sailing across the fleet, or let a journey specialist match a suite to your voyage.' })}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-5">
          <Link to="/find-your-journey" className="btn-ghost-light">{t('suiteIndex.cta.viewJourneys', { defaultValue: 'View the journeys' })}</Link>
          <Link to="/contact" className="text-cream/90 underline underline-offset-4 decoration-1 hover:text-cream transition-colors">
            {t('suiteIndex.cta.speakSpecialist', { defaultValue: 'Speak to a specialist' })}
          </Link>
        </div>
      </div>
    </section>
  );
}
