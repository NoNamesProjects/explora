import type { ReactNode } from 'react';

/**
 * Shared "coming soon" treatment for links/buttons that point at pages or
 * assets the partner hasn't supplied yet. Nothing is deleted — these keep the
 * layout intact but are non-interactive and clearly marked, so the site never
 * 404s or opens the wrong page. See the coming-soon list handed to the partner.
 */

/** A small "Soon" badge appended to a nav item or CTA. */
export function ComingSoonTag({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block text-[0.55rem] uppercase tracking-[0.16em] border border-current rounded-full px-1.5 py-0.5 opacity-60 align-middle ${className}`}
    >
      Soon
    </span>
  );
}

/**
 * A disabled CTA. Reuses the original button class (e.g. `btn-secondary`) so the
 * layout is unchanged — just muted, non-interactive, and tagged "Soon".
 */
export function ComingSoonButton({
  children,
  className = 'btn-secondary',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      title="Coming soon"
      className={`${className} opacity-50 cursor-not-allowed`}
    >
      {children}
      <ComingSoonTag className="ml-2" />
    </button>
  );
}
