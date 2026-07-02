import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '@/lib/admin/api';
import type { Analytics, BookingListRow, CatalogHealth } from '@/lib/admin/types';
import { StatCard } from '@/components/admin/ui/StatCard';
import { Panel } from '@/components/admin/ui/Panel';
import { DataTable, type Column } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { RoleGate } from '@/components/admin/RequireRole';
import { useIngestRun } from '@/components/admin/data/useIngestRun';
import { RefreshButton } from '@/components/admin/data/RefreshButton';
import { useToast } from '@/components/admin/ui/Toast';
import { ErrorState } from '@/components/admin/ui/ErrorState';
import { money, dateShort, relativeTime } from '@/lib/admin/format';

export function Overview() {
  const toast = useToast();
  const { run, phase, busy, start } = useIngestRun((o) => toast.push(o));
  const [health, setHealth] = useState<CatalogHealth | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recent, setRecent] = useState<BookingListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setLoading(true);
    setFailed(false);
    Promise.allSettled([
      adminApi.catalog.health().then((r) => setHealth(r.health)),
      adminApi.analytics().then((r) => setAnalytics(r.analytics)),
      adminApi.bookings.list({ pageSize: 6 }).then((r) => setRecent(r.items)),
    ]).then((results) => {
      // Total outage → a real error surface; partial failures keep their '—'.
      if (results.every((r) => r.status === 'rejected')) setFailed(true);
    }).finally(() => setLoading(false));
  }, [attempt]);

  const cols: Column<BookingListRow>[] = [
    { key: 'ref', header: 'Ref', render: (r) => <span className="font-medium text-ink">{r.ref}</span> },
    { key: 'leadName', header: 'Lead', render: (r) => r.leadName ?? '—' },
    { key: 'total', header: 'Total', align: 'right', render: (r) => money(r.indicativeTotal, r.currency) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge kind="booking" value={r.status} /> },
    { key: 'created', header: 'Created', align: 'right', render: (r) => <span className="text-xs text-ink-600">{dateShort(r.createdAt)}</span> },
  ];

  const alerts: string[] = [];
  if (run && (run.status === 'failed' || run.status === 'aborted')) {
    alerts.push(`Last price refresh ${run.status}${run.notes ? ` — ${run.notes}` : ''}.`);
  }
  if (health && health.aboutToPurge > 0) {
    alerts.push(`${health.aboutToPurge} journey(s) missing from recent feeds will be purged soon.`);
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-ink">Overview</h1>
          <p className="mt-1 text-sm text-ink-500">Live health, recent leads, and a one-click price refresh.</p>
        </div>
        <RoleGate role="admin"><RefreshButton phase={phase} busy={busy} onStart={start} /></RoleGate>
      </div>

      {failed && <ErrorState message="Could not load the overview." onRetry={() => setAttempt((n) => n + 1)} />}

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className="rounded-card border border-accent-gold/40 bg-accent-gold/10 px-4 py-2.5 text-sm text-accent-tan">{a}</div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Active journeys" value={health?.journeysActive ?? '—'} loading={loading} />
        <StatCard label="Fares" value={health?.faresTotal ?? '—'} loading={loading} />
        <StatCard label="Requests (90d)" value={analytics?.totals.requests ?? '—'} loading={loading} sub={analytics ? `${analytics.totals.conversionRate}% converted` : undefined} />
        <StatCard label="Deposits (90d)" value={analytics ? money(analytics.totals.deposits) : '—'} loading={loading} />
        <StatCard
          label="Last refresh"
          value={run ? <StatusBadge kind="ingest" value={run.status} /> : '—'}
          loading={loading}
          sub={run ? relativeTime(run.startedAt) : undefined}
        />
      </div>

      <Panel title="Recent leads" actions={<Link to="/admin/clients" className="text-xs text-accent-tan hover:text-ink">View all →</Link>}>
        <DataTable columns={cols} rows={recent} getRowId={(r) => r.id} loading={loading} empty="No bookings yet." />
      </Panel>
    </div>
  );
}
