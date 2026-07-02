import { Component, type ReactNode } from 'react';

/**
 * Catches render-time throws in any admin page so a single broken screen shows a
 * recoverable message instead of white-screening the whole console. AdminShell
 * keys it by pathname, so navigating to another section resets it automatically.
 */
export class AdminErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[admin] render error:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="font-serif text-2xl text-ink">Something went wrong</p>
          <p className="max-w-md text-sm text-ink-500">
            This screen hit an unexpected error. Reloading usually clears it — if it keeps happening, let the team know.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 h-9 rounded border border-ink px-4 text-xs font-medium uppercase tracking-ui text-ink
                       transition-colors hover:bg-ink hover:text-cream-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
