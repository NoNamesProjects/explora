import { useTranslation } from 'react-i18next';
import * as Accordion from '@radix-ui/react-accordion';
import { SectionHeading } from '@/components/ui/SectionHeading';

interface QA { q: string; a: string }

const CHEVRON = (
  <svg
    width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
    className="shrink-0 transition-transform duration-300 group-data-[state=open]:rotate-180" aria-hidden
  >
    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** FAQ — original, partner-replaceable Q&A in a Radix accordion. */
export default function FAQ() {
  const { t } = useTranslation();
  const items = (t('faq.items', { returnObjects: true }) as QA[]) ?? [];

  return (
    <div className="bg-cream">
      <section className="border-b border-cream-300/60 bg-cream-soft">
        <div className="container py-section-y max-w-editorial text-center">
          <SectionHeading
            eyebrow={t('faq.eyebrow')}
            titleLead={t('faq.titleLead')}
            highlight={t('faq.titleHighlight')}
            align="center"
            className="mb-5"
          />
          <p className="text-ink-600 max-w-prose mx-auto">{t('faq.intro')}</p>
        </div>
      </section>

      <div className="container py-section-y max-w-editorial">
        <Accordion.Root type="single" collapsible className="divide-y divide-cream-300/70 border-y border-cream-300/70">
          {items.map((item, i) => (
            <Accordion.Item key={i} value={`q-${i}`}>
              <Accordion.Header>
                <Accordion.Trigger className="group flex w-full items-center justify-between gap-6 py-6 text-left text-ink hover:text-accent-patina transition-colors">
                  <span className="font-serif text-xl md:text-2xl leading-snug">{item.q}</span>
                  {CHEVRON}
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden data-[state=open]:animate-fade-up">
                <p className="pb-7 pr-8 text-ink-600 leading-relaxed max-w-prose">{item.a}</p>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>

        <div className="mt-12 text-center">
          <p className="text-ink-600 mb-4">{t('faq.stillHelp')}</p>
          <a href="/contact" className="btn-primary">{t('faq.contactCta')}</a>
        </div>
      </div>
    </div>
  );
}
