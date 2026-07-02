import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { imageUrl } from '@/lib/image';

/**
 * "All Journeys Include" — the inclusions section: a centered serif heading over
 * a two-column band that pairs the standard-inclusions list (gold-bullet rows
 * with hairline dividers, plus a muted suite-tier note) with a warm in-suite
 * dining photo. Copy lives in i18n (`home.inclusions.*`, all original).
 */
export function AllJourneysInclude() {
  const { t } = useTranslation();
  const items = t('home.inclusions.items', { returnObjects: true }) as string[];

  return (
    <section className="py-section-y bg-cream">
      <div className="container">
        {/* Centered header */}
        <div className="text-center mb-12 md:mb-16">
          <span aria-hidden className="mx-auto mb-5 block h-px w-12 bg-accent-gold/60" />
          <div className="eyebrow">{t('home.inclusions.eyebrow')}</div>
          <h2 className="font-serif mt-3 font-medium text-display leading-tight text-balance text-ink mx-auto max-w-prose">
            {t('home.inclusions.titleLead')}{' '}
            <em className="font-serif italic font-normal">{t('home.inclusions.title')}</em>
          </h2>
        </div>

        <div className="grid items-center gap-10 md:gap-14 lg:grid-cols-2">
          {/* LEFT — inclusions list */}
          <motion.ul
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-prose"
          >
            {items.map((item) => (
              <li key={item} className="flex gap-3.5 border-b border-cream-300/50 py-3.5 text-ink">
                <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-gold" />
                <span className="text-lg md:text-xl">{item}</span>
              </li>
            ))}
            <li className="pt-4 text-base italic text-ink-600">{t('home.inclusions.note')}</li>
          </motion.ul>

          {/* RIGHT — warm photo */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            className="aspect-[4/5] overflow-hidden bg-cream-200"
          >
            <img
              src={imageUrl('/photos/explora_5/Onboard/In-Suite-Dining.webp', { w: 760, h: 950, fit: 'cover' })}
              alt={t('home.inclusions.photoAlt')}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
