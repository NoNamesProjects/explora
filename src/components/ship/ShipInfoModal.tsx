import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import * as Dialog from '@radix-ui/react-dialog';
import { getShipFacts } from '@/data/shipFacts';
import { getShipAssets } from '@/lib/shipAssets';
import { DeckSwitcher } from '@/components/ship/DeckSwitcher';

/**
 * ShipInfoModal — a condensed "ship page in a popup", opened from the journey
 * detail "Explore the ship" button. It is SPECIFIC to one ship: everything is
 * resolved from `shipSlug` (e.g. "explora-iii") through the same data layer the
 * full ship page uses — getShipFacts (name / numeral / status / launchYear /
 * per-ship specValues) and getShipAssets (hero + deck plans).
 *
 * Layout: an editorial single-column mini-page — a wide ship hero with the name
 * overlaid (Ken-Burns drift on open), then the five headline spec stats and the
 * interactive deck-plan switcher. Opens with a cinematic rise-and-scale.
 *
 * Mirrors the Radix dialog pattern of SuitePreviewModal (the trigger is passed
 * as `children` and wrapped by Dialog.Trigger asChild). The centering transform
 * lives on the Dialog.Content shell; the entrance animation lives on the inner
 * card, so the two transforms never fight. No new imagery — only the ship's own
 * on-disk photos via getShipAssets.
 */
export function ShipInfoModal({
  shipSlug,
  children,
}: {
  shipSlug: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const facts = getShipFacts(shipSlug);
  const assets = getShipAssets(shipSlug);

  // Five headline specs: shared LABELS from the locale, per-ship VALUES from
  // shipFacts override them in order (same merge as ShipDetail).
  const sharedStats = (t('ship.stats', { returnObjects: true }) as { value: string; label: string }[]) ?? [];
  const stats = facts.specValues
    ? sharedStats.map((s, i) => ({ ...s, value: facts.specValues![i] ?? s.value }))
    : sharedStats;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-md animate-fade-up motion-reduce:animate-none" />
        {/* Shell owns the centering transform only. */}
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[96vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 focus:outline-none">
          {/* Inner card owns the cinematic entrance (its transform is independent). */}
          <div className="flex max-h-[88vh] flex-col overflow-hidden rounded-card bg-cream shadow-2xl animate-cinematic-in motion-reduce:animate-none">
            {/* Screen-reader title/description — the visible name in the hero is aria-hidden. */}
            <Dialog.Title className="sr-only">{facts.name}</Dialog.Title>
            <Dialog.Description className="sr-only">
              {t('ship.modal.description', {
                name: facts.name,
                defaultValue: 'Key facts and onboard spaces for {{name}}.',
              })}
            </Dialog.Description>

            {/* ── HERO — slim ship banner + overlaid nameplate ── */}
            <div className="relative shrink-0 bg-ink">
              <div className="h-44 w-full overflow-hidden md:h-56">
                <img
                  src={assets.hero}
                  alt={`${facts.name} at sea`}
                  className="h-full w-full object-cover animate-slow-zoom motion-reduce:animate-none"
                />
              </div>
              {/* Legibility scrim. */}
              <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent" aria-hidden />

              {facts.status !== 'in-service' && (
                <div className="absolute left-5 top-5 z-10 inline-block border border-cream/50 bg-ink/60 px-3 py-1 text-[0.6rem] uppercase tracking-[0.2em] text-cream backdrop-blur-sm">
                  {facts.status === 'launching'
                    ? t('ship.modal.launching', { year: facts.launchYear ?? '', defaultValue: 'Launching {{year}}' })
                    : t('mega.ships.comingSoon')}
                </div>
              )}

              {/* Overlaid nameplate (decorative — Dialog.Title announces the name). */}
              <div className="absolute inset-x-0 bottom-0 p-5 md:p-7 text-cream" aria-hidden>
                <div className="eyebrow mb-1.5 text-cream/80">{t('journey.nav.ship', { defaultValue: 'Ship' })}</div>
                <div className="font-serif flex items-baseline gap-x-3 font-medium leading-[0.95] text-display-sm md:text-display">
                  <span className="tracking-[0.04em]">EXPLORA</span>
                  <span className="font-serif font-normal text-accent-goldSoft">{facts.numeral}</span>
                </div>
                <span className="mt-3 block h-px w-16 bg-accent-goldSoft/90" />
              </div>

              <Dialog.Close
                aria-label={t('ship.modal.close', { defaultValue: 'Close' })}
                className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-ink/45 text-cream backdrop-blur-sm transition-colors ease-out-soft hover:bg-ink/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Dialog.Close>
            </div>

            {/* ── BODY ── */}
            <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
              {/* Five headline specs */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-5 border-b border-cream-300/70 pb-5 sm:grid-cols-5">
                {stats.map((s, i) => (
                  <div key={i} className="text-center sm:text-left">
                    <dt className="font-serif text-3xl leading-none text-ink md:text-4xl">{s.value}</dt>
                    <dd className="mt-2 text-eyebrow uppercase tracking-eyebrow text-accent-tan text-balance">{s.label}</dd>
                  </div>
                ))}
              </dl>

              {/* Deck plans — compact, with a cursor zoom loupe to read the details */}
              {assets.decks.length > 0 && (
                <div className="mt-6">
                  <div className="eyebrow mb-4 text-ink-500">{t('ship.subNav.deckPlans', { defaultValue: 'Deck plans' })}</div>
                  <DeckSwitcher decks={assets.decks} compact magnify />
                </div>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
