import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { NewsletterInline } from '@/components/forms/NewsletterInline';

/**
 * Closing subscribe band — section 7 of the redesigned homepage. A warm taupe
 * (cream-300) full-width band with a serif-italic invitation on the left and the
 * shared inline newsletter form on the right. Ink text on #CBC4BC clears ~9:1
 * contrast (AA), so all copy stays ink/ink-700 — no gold for text here. The form
 * itself (underlined input + navy btn-primary Subscribe → POST /api/newsletter)
 * is reused as-is via NewsletterInline's `light` variant.
 */
export function NewsletterBand() {
  const { t } = useTranslation();

  return (
    <section className="bg-cream-300">
      <div className="container py-section-y-sm">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="grid items-center gap-8 md:grid-cols-2 md:gap-12"
        >
          <div className="max-w-prose">
            <h2 className="font-serif text-display-sm leading-tight text-ink text-balance">
              {t('home.newsletterBand.title')}
            </h2>
            <p className="mt-3 text-ink-700 text-[0.95rem]">
              {t('home.newsletterBand.body')}
            </p>
          </div>

          <div className="md:justify-self-end md:w-full md:max-w-md">
            <NewsletterInline variant="light" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
