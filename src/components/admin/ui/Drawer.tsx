import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

/** A right-anchored sheet built on Radix Dialog (controlled). */
export function Drawer({
  open, onOpenChange, title, subtitle, children, footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[1px] motion-safe:animate-[fade_160ms_ease-out] motion-reduce:animate-none" />
        <Dialog.Content
          className="fixed right-0 top-0 z-50 flex h-full w-[min(40rem,96vw)] flex-col bg-cream shadow-2xl
                     motion-safe:animate-[slideInRight_180ms_cubic-bezier(0.22,1,0.36,1)] focus:outline-none"
        >
          <header className="flex items-start justify-between gap-4 border-b border-cream-300 px-6 py-4">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-base font-medium text-ink">{title}</Dialog.Title>
              {subtitle && <div className="mt-0.5 text-xs text-ink-500">{subtitle}</div>}
            </div>
            <Dialog.Close
              className="rounded p-1.5 text-ink-500 transition-colors hover:bg-cream-200 hover:text-ink
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </Dialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && <footer className="border-t border-cream-300 bg-cream-soft px-6 py-3.5">{footer}</footer>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
