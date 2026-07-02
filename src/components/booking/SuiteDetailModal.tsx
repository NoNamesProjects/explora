import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as Dialog from '@radix-ui/react-dialog';
import { type SuiteGroup, formatEUR } from '@/lib/bookingUI';
import { SuiteDetailContent } from './SuiteDetailContent';

/**
 * Suite DETAIL modal (booking flow) — opens from the card's "View Details" link
 * as a two-pane Radix dialog (no page navigation). The shared body lives in
 * `SuiteDetailContent`; this wrapper owns the controlled `open` state, the
 * "View Details" trigger, and the booking footer (party + total + a navy
 * "Select" button that both fires onSelect and closes the dialog).
 */
export function SuiteDetailModal({
  group,
  shipCd,
  total,
  partySize,
  onSelect,
  selected,
}: {
  group: SuiteGroup;
  shipCd: string;
  total: number | null;
  partySize: number;
  onSelect: (suiteCode: string, fareCode: string) => void;
  selected: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const guestLabel = t('booking.suiteModal.guestCount', {
    count: partySize,
    defaultValue_one: '{{count}} guest',
    defaultValue_other: '{{count}} guests',
    defaultValue: '{{count}} guests',
  });

  const handleSelect = () => {
    onSelect(group.code, group.fares[0].fare_code);
    setOpen(false);
  };

  const footer = (
    <div className="sticky bottom-0 mt-6 -mx-6 -mb-6 flex items-center justify-between gap-4 border-t border-cream-300/60 bg-cream px-6 pb-6 pt-4 md:-mx-8 md:-mb-8 md:px-8 md:pb-8">
      <div className="text-sm text-ink-600">
        {guestLabel}
        {' · '}
        <span className="text-ink">{t('booking.suiteModal.total', { price: formatEUR(total), defaultValue: 'Total {{price}}' })}</span>
      </div>
      <button
        type="button"
        onClick={handleSelect}
        aria-pressed={selected}
        className="btn-primary justify-center"
      >
        {selected ? (
          <span className="inline-flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="m5 12 5 5 9-11" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('booking.suiteModal.selected', { defaultValue: 'Selected' })}
          </span>
        ) : (
          t('booking.suiteModal.select', { defaultValue: 'Select' })
        )}
      </button>
    </div>
  );

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className="link-underline text-ink-600 mt-3 w-fit">
          {t('booking.suiteModal.viewDetails', { defaultValue: 'View Details' })}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm animate-fade-up motion-reduce:animate-none" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[96vw] max-w-6xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-card bg-cream shadow-2xl md:grid md:h-[70vh] md:grid-cols-[1.4fr_1fr]">
          <SuiteDetailContent
            group={group}
            shipCd={shipCd}
            footer={footer}
            description={t('booking.suiteModal.dialogDescription', {
              name: group.name,
              defaultValue:
                'Photos, features and inclusions for the {{name}}, with the total for your party and a button to select it.',
            })}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
