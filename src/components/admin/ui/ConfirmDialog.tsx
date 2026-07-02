import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

export function ConfirmDialog({
  open, onOpenChange, title, body, confirmLabel = 'Confirm', tone = 'default', onConfirm, busy = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  tone?: 'default' | 'danger';
  onConfirm: () => void;
  busy?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[55] bg-ink/40 motion-safe:animate-[fade_140ms_ease-out]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[55] w-[min(28rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-card border border-cream-300 bg-cream p-6 shadow-2xl focus:outline-none">
          <Dialog.Title className="text-base font-medium text-ink">{title}</Dialog.Title>
          {body && <Dialog.Description className="mt-2 text-sm text-ink-500">{body}</Dialog.Description>}
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close className="rounded border border-cream-300 px-4 py-2 text-xs font-medium text-ink transition-colors hover:bg-cream-200">
              Cancel
            </Dialog.Close>
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className={`rounded px-4 py-2 text-xs font-medium text-cream transition-colors disabled:opacity-60 ${
                tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-ink hover:bg-ink-soft'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
