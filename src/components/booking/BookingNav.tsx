import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * Shared step footer: a Back link (left) + the step's primary action(s) on the
 * right. Renders fine inside a <form> (Back is a router Link, not a submit).
 */
export function BookingNav({
  backTo,
  backLabel,
  children,
}: {
  backTo: string;
  backLabel?: string;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-4 pt-6 mt-10 border-t border-cream-300/60">
      <Link to={backTo} className="btn-secondary inline-flex items-center gap-1.5">
        <span aria-hidden>‹</span>
        <span>{backLabel ?? t('booking.nav.back', { defaultValue: 'Back' })}</span>
      </Link>
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}
