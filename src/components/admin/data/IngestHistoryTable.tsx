import { useTranslation } from 'react-i18next';
import type { IngestRun } from '@/lib/admin/types';
import { DataTable, type Column } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { dateTime, durationBetween } from '@/lib/admin/format';

export function IngestHistoryTable({ runs, loading }: { runs: IngestRun[]; loading: boolean }) {
  const { t } = useTranslation();
  const columns: Column<IngestRun>[] = [
    { key: 'startedAt', header: t('admin.dataIngest.columns.started', { defaultValue: 'Started' }), render: (r) => <span className="text-xs text-ink-600">{dateTime(r.startedAt)}</span> },
    { key: 'status', header: t('admin.dataIngest.columns.status', { defaultValue: 'Status' }), render: (r) => <StatusBadge kind="ingest" value={r.status} /> },
    { key: 'journeyCount', header: t('admin.dataIngest.columns.journeys', { defaultValue: 'Journeys' }), align: 'right', render: (r) => r.journeyCount },
    { key: 'fareCount', header: t('admin.dataIngest.columns.fares', { defaultValue: 'Fares' }), align: 'right', render: (r) => r.fareCount },
    { key: 'duration', header: t('admin.dataIngest.columns.duration', { defaultValue: 'Duration' }), align: 'right', render: (r) => durationBetween(r.startedAt, r.finishedAt) },
    { key: 'notes', header: t('admin.dataIngest.columns.notes', { defaultValue: 'Notes' }), render: (r) => <span className="line-clamp-1 max-w-xs text-xs text-ink-500">{r.notes ?? ''}</span> },
  ];
  return <DataTable columns={columns} rows={runs} getRowId={(r) => r.runId} loading={loading} empty={t('admin.dataIngest.noHistory', { defaultValue: 'No refreshes recorded yet.' })} />;
}
