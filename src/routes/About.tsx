import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { imageUrl } from '@/lib/image';

/**
 * About — a presentable, original, partner-replaceable narrative. Brand-neutral
 * factual framing (authorised partner, all-suite ultra-luxury fleet); the
 * partner swaps in approved brand copy when ready (see the IP boundary).
 */
export default function About() {
  const { t } = useTranslation();
  const values = (t('about.values', { returnObjects: true }) as { title: string; body: string }[]) ?? [];

  return (
    <div className="bg-cream">
      {/* Hero */}
      <section className="relative h-[46vh] min-h-[320px] max-h-[520px] overflow-hidden bg-ink">
        <img
          src={imageUrl('explora/placeholder/hero-amber-interior', { w: 1920, h: 1000, fit: 'cover' })}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-80"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-ink/10" aria-hidden />
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 px-5 text-center text-cream">
          <div className="text-eyebrow uppercase tracking-eyebrow text-cream/75 mb-3">{t('about.eyebrow')}</div>
          <h1 className="font-serif text-3xl md:text-5xl leading-tight">{t('about.title')}</h1>
        </div>
      </section>

      {/* Lede */}
      <section className="container py-section-y max-w-editorial">
        <p className="font-serif text-2xl md:text-3xl leading-snug text-ink text-balance">
          {t('about.lede')}
        </p>
        <div className="mt-8 space-y-6 max-w-prose text-ink-600 leading-relaxed">
          {(t('about.body', { returnObjects: true }) as string[]).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="bg-cream-soft border-y border-cream-300/60">
        <div className="container py-section-y">
          <SectionHeading
            eyebrow={t('about.valuesEyebrow')}
            titleLead={t('about.valuesTitleLead')}
            highlight={t('about.valuesTitleHighlight')}
            className="mb-12"
          />
          <ul className="grid gap-px bg-cream-300/60 border border-cream-300/60 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="bg-cream p-8"
              >
                <div className="font-serif text-2xl text-ink mb-2">{v.title}</div>
                <p className="text-ink-600 leading-relaxed text-[0.95rem]">{v.body}</p>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-section-y text-center">
        <p className="font-serif text-2xl text-ink mb-6">{t('about.ctaTitle')}</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/find-your-journey" className="btn-primary">{t('about.ctaBrowse')}</Link>
          <Link to="/contact" className="btn-secondary">{t('about.ctaContact')}</Link>
        </div>
      </section>
    </div>
  );
}
