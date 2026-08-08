/**
 * Two small renderers that didn't belong with the freeform or ship sets:
 * a generic statistics band, and the ships-index fleet register.
 */
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FleetRegister } from '@/components/ships/FleetRegister';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { useSectionReader } from '@/lib/content/sectionRead';
import type { PublicSection } from '@/lib/content/useSections';
import { SectionShell, SectionHead, isDarkTone } from '../SectionShell';

export function StatBandSection({ section }: { section: PublicSection }) {
  const r = useSectionReader(section);
  const tone = r.select('tone', 'cream-soft');
  const dark = isDarkTone(tone);
  const stats = r.cards('stats');
  if (!stats.length) return null;

  return (
    <SectionShell id={section.slug} tone={tone} spacing="sm" className={dark ? '' : 'border-y border-cream-300/60'}>
      {r.has('eyebrow') && (
        <div className={`eyebrow text-center mb-10 md:mb-12 ${dark ? 'text-cream/70' : ''}`}>{r.text('eyebrow')}</div>
      )}
      <dl className={`grid grid-cols-2 max-w-page mx-auto divide-y md:divide-y-0 md:divide-x ${
        dark ? 'divide-cream/15' : 'divide-cream-300/60'
      } md:grid-cols-${Math.min(stats.length, 5)}`}>
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
            className="text-center py-8 md:py-3 px-4"
          >
            <dt className={`font-serif text-5xl md:text-6xl leading-none mb-3 tracking-tight ${dark ? 'text-cream' : 'text-ink'}`}>
              {s.text('value')}
            </dt>
            <dd className={`text-eyebrow uppercase tracking-eyebrow text-balance ${dark ? 'text-cream/70' : 'text-ink-600'}`}>
              {s.text('label')}
            </dd>
          </motion.div>
        ))}
      </dl>
    </SectionShell>
  );
}

export function FleetRegisterSection({ section }: { section: PublicSection }) {
  const { t } = useTranslation();
  const r = useSectionReader(section);
  return (
    <SectionShell id={section.slug} tone={r.select('tone', 'cream')}>
      <div className="max-w-page mx-auto">
        {r.has('heading') ? (
          <SectionHead eyebrow={r.text('eyebrow')} heading={r.rich('heading')} align="center" className="mb-14" />
        ) : r.has('eyebrow') ? (
          <SectionHeading eyebrow={r.text('eyebrow')} highlight={t('shipsIndex.title')} align="center" className="mb-14" />
        ) : null}
        <FleetRegister />
      </div>
    </SectionShell>
  );
}
