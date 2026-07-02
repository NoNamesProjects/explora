import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Shown when a loader fails — so a failed request reads as an *error with a way
 * back*, not as a misleading "empty" state. Mirrors EmptyState's shape but with
 * an alert tone and a retry action. Title/body/retry fall back to localized
 * defaults when a caller doesn't pass its own.
 */
export function ErrorState({
  title,
  body,
  onRetry,
  retryLabel,
}: {
  title?: string;
  body?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const { t } = useTranslation();
  const heading = title ?? t('admin.common.errorTitle', { defaultValue: 'Could not load this' });
  const desc = body ?? t('admin.common.errorBody', { defaultValue: 'Something went wrong reaching the server. Please try again.' });
  const retry = retryLabel ?? t('admin.common.tryAgain', { defaultValue: 'Try again' });
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-red-300 bg-red-50/40 px-6 py-14 text-center"
    >
      <p className="text-sm font-medium text-ink">{heading}</p>
      {desc && <p className="max-w-sm text-xs text-ink-500">{desc}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 h-9 rounded border border-ink px-4 text-xs font-medium uppercase tracking-ui text-ink
                     transition-colors hover:bg-ink hover:text-cream-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-1"
        >
          {retry}
        </button>
      )}
    </div>
  );
}
