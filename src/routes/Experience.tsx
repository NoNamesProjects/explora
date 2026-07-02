import { Link, Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { VenueCarousel } from '@/components/ship/VenueCarousel';
import { SuiteTierCarousel } from '@/components/ship/SuiteTierCarousel';
import { imageUrl } from '@/lib/image';
import { getShipAssets } from '@/lib/shipAssets';
import { EXPERIENCES, isExperienceTopic } from '@/data/experiences';

interface Tier { key: string; name: string; tagline: string }

export default function Experience() {
  const { topic } = useParams();
  const { t } = useTranslation();

  if (!isExperienceTopic(topic)) return <Navigate to="/" replace />;

  const cfg = EXPERIENCES[topic];
  const k = (s: string) => t(`${cfg.i18nKey}.${s}`);

  const tiers = (t('ship.tiers', { returnObjects: true }) as Tier[]) ?? [];
  const cabins = getShipAssets('explora-i').cabins;

  return (
    <>
      {/* ═══════════════════ HERO ═══════════════════════════════════════ */}
      <section className="relative min-h-[62vh] flex items-end overflow-hidden bg-ink">
        <img
          src={imageUrl(cfg.heroImage, { w: 1920, h: 1080, fit: 'cover' })}
          alt=""
          className="absolute inset-0 h-full w-full object-cover animate-slow-zoom"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-ink/30 via-ink/5 to-ink/85"
          aria-hidden
        />
        <div className="absolute inset-0 bg-grain opacity-60 mix-blend-soft-light" aria-hidden />
        <div className="relative container pb-20 pt-32 text-cream">
          <Breadcrumb
            variant="light"
            items={[
              { label: t('experience.breadcrumbHome'), href: '/' },
              { label: k('eyebrow') },
            ]}
            className="mb-8"
          />
          <div className="eyebrow text-cream/70 mb-5">{k('eyebrow')}</div>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif text-hero-xl font-medium leading-[1.02] max-w-3xl"
          >
            {k('heroTitleLead')}{' '}
            <em className="font-serif italic font-normal">{k('heroTitleHighlight')}</em>
          </motion.h1>
        </div>
      </section>

      {/* ═══════════════════ INTRO ═══════════════════════════════════════ */}
      <section className="py-section-y-sm bg-cream">
        <div className="container max-w-editorial text-center">
          <p className="font-serif text-2xl md:text-3xl text-ink-soft leading-relaxed text-balance">
            {k('intro')}
          </p>
        </div>
      </section>

      {/* ═══════════════════ FEATURE BLOCKS ═════════════════════════════ */}
      {cfg.features.map((f, i) => (
        <section
          key={f.copyKey}
          className={
            i % 2
              ? 'py-section-y bg-cream-soft border-y border-cream-300/60'
              : 'py-section-y bg-cream'
          }
        >
          <div className="container grid gap-10 lg:gap-16 md:grid-cols-2 items-center max-w-page">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className={`aspect-[4/3] overflow-hidden bg-cream-200 ${i % 2 ? 'md:order-2' : ''}`}
            >
              <img
                src={imageUrl(f.image, { w: 1040, h: 780, fit: 'cover' })}
                alt=""
                className="h-full w-full object-cover"
                loading={i === 0 ? 'eager' : 'lazy'}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.07 }}
              className={i % 2 ? 'md:order-1' : ''}
            >
              <h2 className="font-serif text-display mb-5 text-ink">
                {t(`${f.copyKey}.heading`)}
              </h2>
              <p className="text-ink-600 text-lg leading-relaxed max-w-prose text-pretty">
                {t(`${f.copyKey}.body`)}
              </p>
            </motion.div>
          </div>
        </section>
      ))}

      {/* ═══════════════════ GALLERY ════════════════════════════════════ */}
      <section className="py-section-y bg-cream">
        <div className="container">
          <SectionHeading
            eyebrow={k('eyebrow')}
            highlight={k('galleryHeading')}
            align="center"
            className="mb-12"
          />
        </div>
        {topic === 'suites' ? (
          <div className="container">
            <SuiteTierCarousel tiers={tiers} cabins={cabins} />
          </div>
        ) : (
          <VenueCarousel venues={cfg.gallery} />
        )}
      </section>

      {/* ═══════════════════ CTA ════════════════════════════════════════ */}
      <section className="py-section-y bg-ink text-cream relative overflow-hidden">
        <div className="absolute inset-0 bg-grain opacity-50 mix-blend-soft-light" aria-hidden />
        <div className="relative container max-w-editorial text-center">
          <h2 className="font-serif text-display font-medium leading-tight text-balance">
            {k('ctaLead')}{' '}
            <em className="font-serif italic font-normal">{k('ctaHighlight')}</em>
          </h2>
          <p className="text-cream/80 max-w-prose mx-auto mt-6 text-lg leading-relaxed text-pretty">
            {k('ctaBody')}
          </p>
          <div className="flex flex-wrap gap-4 justify-center items-center mt-10">
            <Link to={cfg.ctaHref} className="btn-ghost-light">
              {k('ctaPrimary')}
            </Link>
            <Link to={cfg.secondaryCtaHref} className="link-underline text-cream">
              {k('ctaSecondary')}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
