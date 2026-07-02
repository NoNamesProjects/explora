import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { imageUrl } from '@/lib/image';

interface Offer { key: string; title: string; body: string }

/**
 * Featured offers teaser — surfaces the real fare/offer families present in the
 * data (reuses the existing `home.latestOffers` copy). Each card routes into
 * Find-a-Journey rather than a non-existent /offers/* detail page (data-honest).
 */
export function OffersTeaser() {
  const { t } = useTranslation();
  const offers = (t('home.latestOffers.items', { returnObjects: true }) as Offer[]) ?? [];

  return (
    <section className="py-section-y bg-ink text-cream">
      <div className="container">
        <SectionHeading
          eyebrow={t('home.latestOffers.eyebrow')}
          titleLead={t('home.latestOffers.titleLead')}
          highlight={t('home.latestOffers.titleHighlight')}
          variant="light"
          className="mb-12 md:mb-14"
        />

        <div className="grid gap-6 md:grid-cols-3">
          {offers.map((o, i) => (
            <motion.div
              key={o.key}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: i * 0.07 }}
            >
              <Link
                to="/find-your-journey"
                className="group flex h-full flex-col overflow-hidden border border-cream/15 bg-ink-soft/40 transition-colors hover:border-cream/40"
              >
                <div className="aspect-[16/10] overflow-hidden bg-ink-soft">
                  <img
                    src={imageUrl(`explora/placeholder/offer-${o.key}`, { w: 720, h: 450, fit: 'cover' })}
                    alt=""
                    className="h-full w-full object-cover opacity-85 transition-transform duration-[1400ms] ease-out-soft group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="flex flex-1 flex-col p-7">
                  <h3 className="font-serif text-2xl leading-snug text-cream">{o.title}</h3>
                  <p className="mt-3 flex-1 text-[0.9rem] leading-relaxed text-cream/75">{o.body}</p>
                  <span className="mt-6 inline-flex items-center gap-1.5 text-eyebrow uppercase tracking-eyebrow text-accent-goldSoft group-hover:text-cream transition-colors">
                    {t('home.latestOffers.discoverCta')}
                    <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
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
