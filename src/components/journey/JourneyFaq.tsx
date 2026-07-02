import { useTranslation } from 'react-i18next';
import * as Accordion from '@radix-ui/react-accordion';
import * as Tabs from '@radix-ui/react-tabs';
import { SectionHeading } from '@/components/ui/SectionHeading';

type FaqItem = { q: string; a: string[] };
type FaqGroup = { title: string; items: FaqItem[] };

/**
 * Booking / Documentation / Currency FAQ shown on the journey detail page, under
 * Onboard experiences. Content lives in i18n under `journey.faq` (EN + EL).
 *
 * "Tabbed ledger": the three categories become locale-stable Radix pill tabs
 * (index values) so only one focused list shows at a time, turning a 35-row wall
 * into a short printed index. Each tab body is a numbered Radix accordion with
 * serif index numerals and a quiet +/- morph toggle.
 */
export function JourneyFaq() {
  const { t } = useTranslation();
  const groups = (t('journey.faq.groups', { returnObjects: true }) as FaqGroup[]) ?? [];
  if (!Array.isArray(groups) || groups.length === 0) return null;

  return (
    <section className="py-section-y bg-cream-soft border-t border-cream-300/60">
      <div className="container max-w-page">
        <SectionHeading
          eyebrow={t('journey.faq.eyebrow')}
          highlight={t('journey.faq.heading')}
          align="left"
          className="mb-8"
        />

        <Tabs.Root defaultValue="0">
          <Tabs.List className="flex flex-wrap gap-2 md:gap-3 mb-8 border-b border-cream-300 pb-5">
            {groups.map((group, gi) => (
              <Tabs.Trigger
                key={gi}
                value={String(gi)}
                className="group pill text-ink-600 transition-colors data-[state=inactive]:hover:bg-transparent data-[state=inactive]:hover:text-ink data-[state=inactive]:hover:border-ink/40 data-[state=active]:bg-ink data-[state=active]:text-cream data-[state=active]:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mist focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
              >
                <span>{group.title}</span>
                <span
                  aria-hidden
                  className="tabular-nums text-ink-400 transition-colors group-data-[state=active]:text-cream/60"
                >
                  {group.items.length}
                </span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {groups.map((group, gi) => (
            <Tabs.Content
              key={gi}
              value={String(gi)}
              className="max-w-editorial rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mist focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
            >
              <Accordion.Root
                type="single"
                collapsible
                className="divide-y divide-cream-300/70 border-t border-cream-300/70"
              >
                {group.items.map((item, i) => (
                  <Accordion.Item key={i} value={`g${gi}-q${i}`}>
                    <Accordion.Header>
                      <Accordion.Trigger className="group flex w-full items-start gap-4 md:gap-6 py-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mist focus-visible:ring-offset-2 focus-visible:ring-offset-cream">
                        <span
                          aria-hidden
                          className="mt-0.5 font-serif tabular-nums text-accent-gold/80 w-8 shrink-0"
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="flex-1 font-serif text-lg md:text-xl leading-snug text-ink group-hover:text-accent-patina group-data-[state=open]:text-accent-tan transition-colors">
                          {item.q}
                        </span>
                        <span
                          aria-hidden
                          className="relative mt-2 h-3 w-3 shrink-0 text-ink-400 group-hover:text-accent-patina transition-colors"
                        >
                          <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current" />
                          <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-current transition-transform duration-300 ease-out-soft group-data-[state=open]:scale-y-0" />
                        </span>
                      </Accordion.Trigger>
                    </Accordion.Header>
                    <Accordion.Content className="overflow-hidden data-[state=open]:animate-fade-up">
                      <div className="pl-12 md:pl-14 pb-6 pr-8 space-y-3 text-ink-600 leading-relaxed max-w-prose">
                        {item.a.map((para, pi) => (
                          <p key={pi}>{para}</p>
                        ))}
                      </div>
                    </Accordion.Content>
                  </Accordion.Item>
                ))}
              </Accordion.Root>
            </Tabs.Content>
          ))}
        </Tabs.Root>
      </div>
    </section>
  );
}
