import type { ReactNode } from 'react';

/** A flat content card — the console's base surface. */
export function Panel({
  title, actions, children, className = '', bodyClassName = '',
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`rounded-card border border-cream-300 bg-cream-soft ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-4 border-b border-cream-300 px-5 py-3.5">
          {title && <h2 className="text-sm font-medium text-ink">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
