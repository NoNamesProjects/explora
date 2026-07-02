import { Fragment, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { type SuiteGroup, suiteBerths } from '@/lib/bookingUI';
import { cabinImagesForSuite } from '@/lib/shipAssets';
import { suiteFeatures, suiteInclusions, suiteOverview, suiteSqm } from '@/data/suiteDetails';

type Tab = 'overview' | 'features' | 'inclusions';
const TAB_IDS: Tab[] = ['overview', 'features', 'inclusions'];

/**
 * Shared two-pane body for the suite modal — used by BOTH the booking
 * `SuiteDetailModal` (party + total + Select footer) and the journey-page
 * `SuitePreviewModal` ("Reserve this journey" footer).
 *
 * "Film-Still" treatment: the LEFT pane is a full-bleed cinematic suite
 * photograph (carousel) with a bottom ink scrim over which the suite NAME is set
 * in upright Cormorant + a hairline-divided spec strip (m² · Sleeps N · Ocean-front)
 * — the Explora suite-hero pattern (see SuiteHero) brought inside the dialog, so
 * the photo names itself. The RIGHT pane is a quiet cream rail: the
 * Overview/Full Details/Inclusions tabs + a caller-supplied sticky footer.
 *
 * Render this INSIDE a `<Dialog.Content className="… grid md:grid-cols-[1.4fr_1fr]">`.
 * Owns only its gallery/tab state; the Dialog.Root/Trigger/Content belong to the
 * wrapper so each context controls its own open + footer.
 */
export function SuiteDetailContent({
  group,
  shipCd,
  footer,
  description,
}: {
  group: SuiteGroup;
  shipCd: string;
  footer: ReactNode;
  description: string;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const tabLabels: Record<Tab, string> = {
    overview: t('booking.suiteModal.tabOverview', { defaultValue: 'Overview' }),
    features: t('booking.suiteModal.tabFullDetails', { defaultValue: 'Full Details' }),
    inclusions: t('booking.suiteModal.tabInclusions', { defaultValue: 'Inclusions' }),
  };

  const imgs = cabinImagesForSuite(shipCd, group.code);
  const hasCarousel = imgs.length > 1;
  // Modulo keeps the index in range as it wraps in either direction.
  const wrapped = ((index % imgs.length) + imgs.length) % imgs.length;
  const current = imgs[wrapped];
  const go = (delta: number) => setIndex((i) => i + delta);

  // Spec strip — mirrors SuiteHero: m² (when known) · Sleeps N · Ocean-front.
  // The m² cell drops out when SQM_BY_TIER has no figure (no hollow plate).
  const sqm = suiteSqm(group.code);
  const berths = suiteBerths(group.code);
  const specs: string[] = [];
  if (sqm != null) specs.push(`${sqm} m²`);
  specs.push(t('suiteIndex.spec.sleeps', { count: berths, defaultValue: 'Sleeps {{count}}' }));
  specs.push(t('suiteIndex.spec.oceanFront', { defaultValue: 'Ocean-front' }));

  return (
    <>
      <Dialog.Title className="sr-only">{group.name}</Dialog.Title>
      <Dialog.Description className="sr-only">{description}</Dialog.Description>

      {/* ── LEFT — film-still: full-bleed photo, scrim, overlaid title + specs ── */}
      <div className="group relative aspect-[3/4] shrink-0 overflow-hidden bg-ink md:aspect-auto md:h-full">
        <motion.img
          key={current}
          src={current}
          alt={group.name}
          loading="lazy"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.015 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Ink scrim — the contrast floor for the overlaid title (never the photo). */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent" aria-hidden="true" />

        {hasCarousel && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={t('booking.suiteModal.prevPhoto', { defaultValue: 'Previous photo' })}
              className="absolute left-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-ink/45 text-cream opacity-0 transition-opacity ease-out-soft focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream group-hover:opacity-100 md:h-9 md:w-9"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="m15 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={t('booking.suiteModal.nextPhoto', { defaultValue: 'Next photo' })}
              className="absolute right-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-ink/45 text-cream opacity-0 transition-opacity ease-out-soft focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream group-hover:opacity-100 md:h-9 md:w-9"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        )}

        {/* Bottom overlay — its own dense gradient guarantees the title/dot contrast
            floor regardless of the photo; dots (interactive) sit above the title. */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 bg-gradient-to-t from-ink/85 via-ink/40 to-transparent p-6 pt-16 md:p-7 md:pt-20">
          {hasCarousel && (
            <div className="flex items-center gap-1.5">
              {imgs.map((_, i) => {
                const active = i === wrapped;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={t('booking.suiteModal.viewPhoto', { number: i + 1, defaultValue: 'View photo {{number}}' })}
                    aria-current={active}
                    className="grid h-9 w-8 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream"
                  >
                    <span
                      className={[
                        'block h-1.5 rounded-full transition-all ease-out-soft',
                        active ? 'w-5 bg-cream' : 'w-1.5 bg-cream/65',
                      ].join(' ')}
                    />
                  </button>
                );
              })}
            </div>
          )}

          <div className="text-cream">
            <div className="eyebrow text-cream/85" aria-hidden="true">{t('booking.suiteModal.eyebrow', { defaultValue: 'Suite' })}</div>
            {/* Visible name is decorative — Dialog.Title already announces it. */}
            <h2 aria-hidden="true" className="mt-2 font-serif text-3xl leading-[1.05] text-balance md:text-[2.75rem]">
              {group.name}
            </h2>
            <span aria-hidden="true" className="mt-4 block h-px w-12 bg-accent-goldSoft/80" />
            <dl className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.7rem] uppercase tracking-eyebrow text-cream/80">
              {specs.map((item, i) => (
                <Fragment key={item}>
                  {i > 0 && <span aria-hidden="true" className="h-3.5 w-px bg-cream/30" />}
                  <dd className="m-0 whitespace-nowrap font-medium">{item}</dd>
                </Fragment>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* ── RIGHT — quiet cream rail: tabs, content, caller footer ── */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-cream p-6 md:p-8">
        <Dialog.Close
          aria-label={t('booking.suiteModal.close', { defaultValue: 'Close' })}
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full text-ink-600 transition-colors ease-out-soft hover:bg-cream-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Dialog.Close>

        {/* Tab row */}
        <div className="flex items-center gap-5 border-b border-cream-300/60 pr-12">
          {TAB_IDS.map((tabId) => {
            const isActive = tabId === activeTab;
            return (
              <button
                key={tabId}
                type="button"
                onClick={() => setActiveTab(tabId)}
                aria-pressed={isActive}
                className={[
                  'relative -mb-px rounded-sm pb-3 text-[0.7rem] uppercase tracking-eyebrow transition-colors ease-out-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink',
                  isActive
                    ? 'border-b-2 border-ink text-ink'
                    : 'border-b-2 border-transparent text-ink-600 hover:text-ink',
                ].join(' ')}
              >
                {tabLabels[tabId]}
              </button>
            );
          })}
        </div>

        {/* Tab content — gentle fade on swap (reduced-motion safe). */}
        <div key={activeTab} className="mt-6 flex-1 animate-fade-up motion-reduce:animate-none">
          {activeTab === 'overview' && (
            <p className="text-ink-600 leading-relaxed">{suiteOverview(group.name)}</p>
          )}

          {activeTab === 'features' && (
            <>
              <h3 className="font-serif text-lg text-ink">{t('booking.suiteModal.suiteFeatures', { defaultValue: 'Suite Features' })}</h3>
              <ul className="mt-3 space-y-2.5">
                {suiteFeatures().map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-ink-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-gold" aria-hidden="true" />
                    <span className="leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {activeTab === 'inclusions' && (
            <>
              <h3 className="font-serif text-lg text-ink">{t('booking.suiteModal.inclusions', { defaultValue: 'Inclusions' })}</h3>
              <div className="mt-3 space-y-2.5">
                {suiteInclusions().map((item) => (
                  <div key={item} className="flex items-start gap-2.5 text-ink-600">
                    <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-accent-gold" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="m5 12 5 5 9-11" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Caller-supplied sticky bottom bar (booking: party/total/Select — browse: Reserve CTA). */}
        {footer}
      </div>
    </>
  );
}
