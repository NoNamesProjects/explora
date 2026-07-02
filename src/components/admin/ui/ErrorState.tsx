/** Inline failed-to-load surface with a retry — the error sibling of EmptyState. */
export function ErrorState({ message = 'Could not load this data.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-2 rounded-card border border-red-200 bg-red-50/50 px-6 py-10 text-center">
      <p className="text-sm font-medium text-ink">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex h-8 items-center rounded border border-cream-300 bg-cream-soft px-3 text-xs text-ink transition-colors hover:bg-cream-200"
        >
          Try again
        </button>
      )}
    </div>
  );
}
