import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as Dialog from '@radix-ui/react-dialog';
import { type SuiteGroup } from '@/lib/bookingUI';
import { SuiteDetailContent } from './SuiteDetailContent';

/**
 * Suite PREVIEW modal (journey-detail "Choose your suite"). Same two-pane body
 * as the booking `SuiteDetailModal` — gallery + Overview/Full Details/Inclusions
 * tabs — but a browse footer (a "Reserve this journey" CTA, no party/total/Select
 * since pricing happens inside the booking flow). The whole suite card is the
 * trigger (passed as `children`); clicking opens the popup instead of navigating
 * to a separate suite page.
 */
export function SuitePreviewModal({
  group,
  shipCd,
  reserveHref,
  children,
}: {
  group: SuiteGroup;
  shipCd: string;
  reserveHref: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const footer = (
    <div className="sticky bottom-0 mt-6 -mx-6 -mb-6 flex items-center justify-end gap-4 border-t border-cream-300/60 bg-cream px-6 pb-6 pt-4 md:-mx-8 md:-mb-8 md:px-8 md:pb-8">
      <Link
        to={reserveHref}
        onClick={() => setOpen(false)}
        className="btn-primary justify-center"
      >
        {t('journeyDetail.reserveCta', { defaultValue: 'Reserve this journey' })}
      </Link>
    </div>
  );

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm animate-fade-up motion-reduce:animate-none" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[96vw] max-w-6xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-card bg-cream shadow-2xl md:grid md:h-[70vh] md:grid-cols-[1.4fr_1fr]">
          <SuiteDetailContent
            group={group}
            shipCd={shipCd}
            footer={footer}
            description={t('journeyDetail.suiteDialogDescription', {
              name: group.name,
              defaultValue: 'Photos, features and inclusions for the {{name}}.',
            })}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
