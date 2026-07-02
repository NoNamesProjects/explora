import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { money, dateShort, relativeTime } from '@/lib/admin/format';

export function Overview() {
  const { t } = useTranslation();
  const toast = useToast();
  const { run, phase, busy, start } = useIngestRun((o) => toast.push(o));
  const [health, setHealth] = useState<CatalogHealth | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recent, setRecent] = useState<BookingListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    Promise.allSettled([
      adminApi.catalog.health().then((r) => setHealth(r.health)),
      adminApi.analytics().then((r) => setAnalytics(r.analytics)),
      adminApi.bookings.list({ pageSize: 6 }).then((r) => setRecent(r.items)),
    ])
      .then((results) => { if (results.some((x) => x.status === 'rejected')) setLoadError(true); })
      .finally(() => setLoading(false));
  }, []);

  // Reload the health/analytics/recent cards whenever a price refresh finishes,
  // so the dashboard reflects freshly-ingested data without a full page reload.
  useEffect(() => { load(); }, [load, run?.finishedAt]);

  const cols: Column<BookingListRow>[] = [
    { key: 'ref', header: t('admin.overview.colRef', { defaultValue: 'Ref' }), render: (r) => <span className="font-medium text-ink">{r.ref}</span> },
    { key: 'leadName', header: t('admin.overview.colLead', { defaultValue: 'Lead' }), render: (r) => r.leadName ?? '—' },
    { key: 'total', header: t('admin.overview.colTotal', { defaultValue: 'Total' }), align: 'right', render: (r) => money(r.indicativeTotal, r.currency) },
    { key: 'status', header: t('admin.overview.colStatus', { defaultValue: 'Status' }), render: (r) => <StatusBadge kind="booking" value={r.status} /> },
    { key: 'created', header: t('admin.overview.colCreated', { defaultValue: 'Created' }), align: 'right', render: (r) => <span className="text-xs text-ink-600">{dateShort(r.createdAt)}</span> },
  ];

  const alerts: string[] = [];
  if (run && (run.status === 'failed' || run.status === 'aborted')) {
    alerts.push(t('admin.overview.alertRefresh', {
      defaultValue: 'Last price refresh {{status}}{{notes}}.',
      status: run.status,
      notes: run.notes ? ` — ${run.notes}` : '',
    }));
  }
  if (health && health.aboutToPurge > 0) {
    alerts.push(t('admin.overview.alertPurge', {
      defaultValue: '{{count}} journey(s) missing from recent feeds will be purged soon.',
      count: health.aboutToPurge,
    }));
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[1.75rem] leading-tight text-ink">{t('admin.overview.title', { defaultValue: 'Overview' })}</h1>
          <p className="mt-1 text-sm text-ink-500">{t('admin.overview.subtitle', { defaultValue: 'Live health, recent leads, and a one-click price refresh.' })}</p>
        </div>
        <RoleGate role="admin"><RefreshButton phase={phase} busy={busy} onStart={start} /></RoleGate>
      </div>

      {loadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-red-300 bg-red-50/40 px-4 py-2.5 text-sm text-ink">
          <span>{t('admin.overview.loadError', { defaultValue: 'Some dashboard data couldn’t be loaded.' })}</span>
          <button
            type="button"
            onClick={load}
            className="rounded border border-ink px-3 py-1 text-xs font-medium uppercase tracking-ui text-ink transition-colors hover:bg-ink hover:text-cream-soft"
          >
            {t('admin.overview.retry', { defaultValue: 'Retry' })}
          </button>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className="rounded-card border border-accent-gold/40 bg-accent-gold/10 px-4 py-2.5 text-sm text-accent-tan">{a}</div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label={t('admin.overview.statActiveJourneys', { defaultValue: 'Active journeys' })} value={health?.journeysActive ?? '—'} loading={loading} />
        <StatCard label={t('admin.overview.statFares', { defaultValue: 'Fares' })} value={health?.faresTotal ?? '—'} loading={loading} />
        <StatCard label={t('admin.overview.statRequests', { defaultValue: 'Requests (90d)' })} value={analytics?.totals.requests ?? '—'} loading={loading} sub={analytics ? t('admin.overview.converted', { defaultValue: '{{rate}}% converted', rate: analytics.totals.conversionRate }) : undefined} />
        <StatCard label={t('admin.overview.statDeposits', { defaultValue: 'Deposits (90d)' })} value={analytics ? money(analytics.totals.deposits) : '—'} loading={loading} />
        <StatCard
          label={t('admin.overview.statLastRefresh', { defaultValue: 'Last refresh' })}
          value={run ? <StatusBadge kind="ingest" value={run.status} /> : '—'}
          loading={loading}
          sub={run ? relativeTime(run.startedAt) : undefined}
        />
      </div>

      <Panel title={t('admin.overview.recentLeads', { defaultValue: 'Recent leads' })} actions={<Link to="/admin/clients" className="text-xs text-accent-tan hover:text-ink">{t('admin.overview.viewAll', { defaultValue: 'View all →' })}</Link>}>
        <DataTable columns={cols} rows={recent} getRowId={(r) => r.id} loading={loading} empty={t('admin.overview.noBookings', { defaultValue: 'No bookings yet.' })} />
      </Panel>
    </div>
  );
}
