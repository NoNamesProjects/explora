import { useIngestRun } from '@/components/admin/data/useIngestRun';
import { RefreshButton } from '@/components/admin/data/RefreshButton';
import { IngestStatusCard } from '@/components/admin/data/IngestStatusCard';
import { IngestHistoryTable } from '@/components/admin/data/IngestHistoryTable';
import { useToast } from '@/components/admin/ui/Toast';

export function DataIngest() {
  const toast = useToast();
  const { run, phase, busy, history, loadingHistory, start } = useIngestRun((o) => toast.push(o));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-ink">Refresh prices</h1>
          <p className="mt-1 text-sm text-ink-500">Pull the latest flatfile prices &amp; itineraries from Explora on demand.</p>
        </div>
        <RefreshButton phase={phase} busy={busy} onStart={start} />
      </div>

      {phase === 'env-missing' && (
        <div className="rounded-card border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          Ingest isn’t configured on this server — the Explora flatfile credentials (EXPLORA_USERNAME / EXPLORA_PASSWORD) are missing.
        </div>
      )}

      <IngestStatusCard run={run} running={phase === 'running'} />

      <div className="rounded-card border border-accent-gold/30 bg-accent-gold/5 px-4 py-3 text-xs text-ink-600">
        <strong className="text-accent-tan">Safety guard:</strong> a refresh that would drop the live catalogue below 70% of the
        current journey count is auto-aborted with no writes — protecting the site from a truncated upstream file. Aborted runs
        appear below with the reason.
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium text-ink">History</h2>
        <IngestHistoryTable runs={history} loading={loadingHistory} />
      </section>
    </div>
  );
}
