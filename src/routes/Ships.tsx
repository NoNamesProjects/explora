import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { FleetRegister } from '@/components/ships/FleetRegister';
import { visibleShips } from '@/data/megaMenu';
import { shipCountWord } from '@/lib/shipCount';
import { bannerOverride } from '@/lib/content/bannerSrc';
import { PageSections } from '@/components/sections/PageSections';

interface Stat { value: string; label: string }

/**
 * /ships — the fleet index. A hero, a short intro, then the shared ShipsGrid
 * showing the available vessels (each links to its detail page). Ships not yet
 * launched are hidden via src/data/shipVisibility.ts. Reached from the header
 * SHIPS trigger and its "View all ships" link, and from the ship-detail breadcrumb.
 */
/**
 * The fleet index, assembled from admin-managed sections (page_key
 * 'ships-index'), falling back to the original layout until it's seeded.
 */
export default function Ships() {
  return <PageSections page="ships-index" fallback={<LegacyShips />} />;
}

/** The pre-page-builder fleet index, verbatim. */
function LegacyShips() {
  const { t, i18n } = useTranslation();
  const reduce = useReducedMotion();
  const heroImage = bannerOverride('ships.hero') ?? '/photos/banner/explora-ii-aerial.webp';
  const count = shipCountWord(visibleShips.length, i18n.language);
  const stats = (t('ship.stats', { returnObjects: true }) as Stat[]) ?? [];

  return (
    <>
      {/* ═══════════════════ HERO ═══════════════════════════════════════ */}
      <section className="relative min-h-[68vh] md:min-h-[74vh] flex items-end overflow-hidden bg-ink">
        {/* Banner — fades in on load + slow-zooms (both gated for reduced motion). */}
        <motion.div
          aria-hidden
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className={['absolute inset-0 bg-cover bg-center', reduce ? '' : 'animate-slow-zoom'].join(' ')}
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        {/* Cinematic vignette — keeps the lower-left text legible over the sunset. */}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/45 via-ink/15 to-ink/85 pointer-events-none" aria-hidden />
        <div className="absolute inset-0 bg-grain opacity-[0.12] mix-blend-overlay pointer-events-none" aria-hidden />
        {/* Bottom melt — the image dissolves into the navy intro band below. */}
        <div className="absolute inset-x-0 bottom-0 h-24 md:h-32 bg-gradient-to-b from-transparent to-ink pointer-events-none" aria-hidden />

        <div className="relative container pb-28 md:pb-40 pt-32 text-cream [text-shadow:0_1px_14px_rgba(12,35,64,0.5)]">
          <Breadcrumb
            variant="light"
            items={[
              { label: t('ship.breadcrumbHome'), href: '/' },
              { label: t('ship.breadcrumbShips') },
            ]}
            className="mb-8 opacity-90"
          />
          <div className="eyebrow mb-4 text-cream/80">{t('shipsIndex.eyebrow')}</div>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif font-medium leading-[1.0] text-balance max-w-3xl text-cream text-[clamp(2.75rem,6.2vw,5.5rem)]"
          >
            {t('shipsIndex.titleLead')}{' '}
            <em className="font-serif italic font-normal text-accent-goldSoft">{t('shipsIndex.title')}</em>
          </motion.h1>
          <span aria-hidden className="mt-7 block h-px w-24 bg-accent-goldSoft/80" />
        </div>
      </section>

      {/* ═══════════════════ INTRO — navy statement band ════════════════ */}
      <section className="relative overflow-hidden pt-14 md:pt-20 pb-16 md:pb-24 bg-ink text-cream">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-grain opacity-[0.12] mix-blend-overlay" />
        <div className="relative container max-w-editorial text-center">
          <p className="font-serif text-2xl md:text-3xl text-cream/85 leading-relaxed text-balance">
            {t('shipsIndex.intro', { word: count })}
          </p>
        </div>
      </section>

      {/* ═══════════════════ SHARED FLEET HIGHLIGHTS ═════════════════════ */}
      {stats.length > 0 && (
        <section className="py-section-y-sm bg-cream-soft border-y border-cream-300/60">
          <div className="container">
            <div className="eyebrow text-center mb-10 md:mb-12">{t('ship.statsHeading')}</div>
            <dl className="grid grid-cols-2 md:grid-cols-5 max-w-page mx-auto divide-y md:divide-y-0 md:divide-x divide-cream-300/60">
              {stats.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
                  className="text-center py-8 md:py-3 px-4"
                >
                  <dt className="font-serif text-5xl md:text-6xl text-ink leading-none mb-3 tracking-tight">
                    {s.value}
                  </dt>
                  <dd className="text-eyebrow uppercase tracking-eyebrow text-ink-600 text-balance">
                    {s.label}
                  </dd>
                </motion.div>
              ))}
            </dl>
          </div>
        </section>
      )}

      {/* ═══════════════════ FLEET REGISTER ═════════════════════════════ */}
      <section className="py-section-y bg-cream">
        <div className="container max-w-page">
          <FleetRegister />
        </div>
      </section>
    </>
  );
}
