import { useEffect, useState } from 'react';
import type { IngestRun } from '@/lib/admin/types';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { dateTime, durationBetween, relativeTime } from '@/lib/admin/format';

export function IngestStatusCard({ run, running }: { run: IngestRun | null; running: boolean }) {
  // live elapsed timer while running
  const [, force] = useState(0);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  if (!run) {
    return (
      <div className="rounded-card border border-cream-300 bg-cream-soft p-5 text-sm text-ink-500">
        No refresh has run yet.
      </div>
    );
  }

  const elapsed = running
    ? `${Math.round((Date.now() - new Date(run.startedAt).getTime()) / 1000)}s elapsed`
    : durationBetween(run.startedAt, run.finishedAt);

  return (
    <div className="rounded-card border border-cream-300 bg-cream-soft p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-ink">Latest refresh</h3>
        <StatusBadge kind="ingest" value={run.status} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
        <div><div className="text-eyebrow uppercase tracking-eyebrow text-ink-500">Journeys</div><div className="mt-0.5 tabular-nums text-ink">{run.journeyCount}</div></div>
        <div><div className="text-eyebrow uppercase tracking-eyebrow text-ink-500">Fares</div><div className="mt-0.5 tabular-nums text-ink">{run.fareCount}</div></div>
        <div><div className="text-eyebrow uppercase tracking-eyebrow text-ink-500">Duration</div><div className="mt-0.5 tabular-nums text-ink">{elapsed}</div></div>
        <div><div className="text-eyebrow uppercase tracking-eyebrow text-ink-500">When</div><div className="mt-0.5 text-ink">{relativeTime(run.startedAt)}</div></div>
      </div>
      {run.notes && (
        <p className={`mt-4 rounded border px-3 py-2 text-xs ${
          run.status === 'failed' ? 'border-red-300 bg-red-50 text-red-700'
          : run.status === 'aborted' ? 'border-accent-gold/40 bg-accent-gold/10 text-accent-tan'
          : 'border-cream-300 bg-white text-ink-600'
        }`}>{run.notes}</p>
      )}
      <p className="mt-3 text-[0.7rem] text-ink-400">Started {dateTime(run.startedAt)}{run.finishedAt ? ` · finished ${dateTime(run.finishedAt)}` : ''}</p>
    </div>
  );
}
