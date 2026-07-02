import type { ReactNode } from 'react';

export function EmptyState({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-cream-300 px-6 py-14 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {body && <p className="max-w-sm text-xs text-ink-500">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
