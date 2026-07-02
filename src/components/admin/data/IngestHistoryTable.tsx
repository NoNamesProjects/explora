import type { IngestRun } from '@/lib/admin/types';
import { DataTable, type Column } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { dateTime, durationBetween } from '@/lib/admin/format';

const columns: Column<IngestRun>[] = [
  { key: 'startedAt', header: 'Started', render: (r) => <span className="text-xs text-ink-600">{dateTime(r.startedAt)}</span> },
  { key: 'status', header: 'Status', render: (r) => <StatusBadge kind="ingest" value={r.status} /> },
  { key: 'journeyCount', header: 'Journeys', align: 'right', render: (r) => r.journeyCount },
  { key: 'fareCount', header: 'Fares', align: 'right', render: (r) => r.fareCount },
  { key: 'duration', header: 'Duration', align: 'right', render: (r) => durationBetween(r.startedAt, r.finishedAt) },
  { key: 'notes', header: 'Notes', render: (r) => <span className="line-clamp-1 max-w-xs text-xs text-ink-500">{r.notes ?? ''}</span> },
];

export function IngestHistoryTable({ runs, loading }: { runs: IngestRun[]; loading: boolean }) {
  return <DataTable columns={columns} rows={runs} getRowId={(r) => r.runId} loading={loading} empty="No refreshes recorded yet." />;
}
