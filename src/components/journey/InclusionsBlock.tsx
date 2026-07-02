import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

/**
 * "All Journeys Include" — a cream card for the Journey Detail page: a centered
 * gold hairline ornament + eyebrow over a three-column gold-bullet list of the
 * standard inclusions, closed by a muted suite-tier note. Copy is reused
 * verbatim from `home.inclusions.*` (all original) — no new keys added.
 */
export function InclusionsBlock() {
  const { t } = useTranslation();
  const items = t('home.inclusions.items', { returnObjects: true }) as string[];

  return (
    <div className="bg-cream-soft border border-cream-300 rounded-card p-8 md:p-14 shadow-[0_28px_70px_-48px_rgba(12,35,64,0.45)]">
      {/* Centered header */}
      <div className="text-center">
        <span aria-hidden className="mx-auto mb-5 block h-px w-12 bg-accent-gold" />
        <div className="eyebrow">{t('home.inclusions.eyebrow')}</div>
      </div>

      <motion.ul
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="mt-10 grid gap-x-12 gap-y-4 sm:grid-cols-2 md:grid-cols-3 max-w-page mx-auto"
      >
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-ink">
            <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-gold" />
            <span className="text-base md:text-lg leading-snug">{item}</span>
          </li>
        ))}
      </motion.ul>

      <p className="mx-auto mt-10 max-w-prose border-t border-cream-300/60 pt-8 text-center text-base italic text-ink-600">{t('home.inclusions.note')}</p>
    </div>
  );
}
