import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin/api';
import { DataTable, type Column } from '@/components/admin/ui/DataTable';
import { ErrorState } from '@/components/admin/ui/ErrorState';

type Rec = Record<string, unknown>;

function useList(loader: () => Promise<{ items: Rec[] }>) {
  const [rows, setRows] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    loader()
      .then((r) => { if (alive) setRows(r.items); })
      .catch(() => { if (alive) setFailed(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);
  return { rows, loading, failed, retry: () => setAttempt((n) => n + 1) };
}

const shipCols: Column<Rec>[] = [
  { key: 'ship_cd', header: 'Code', render: (r) => <span className="font-medium text-ink">{String(r.ship_cd)}</span> },
  { key: 'ship_name', header: 'Name', render: (r) => String(r.ship_name) },
  { key: 'launch_year', header: 'Launched', render: (r) => (r.launch_year ? String(r.launch_year) : '—') },
  { key: 'decks', header: 'Decks', align: 'right', render: (r) => (r.decks ?? '—') as number },
  { key: 'capacity', header: 'Capacity', align: 'right', render: (r) => (r.capacity ?? '—') as number },
  { key: 'active_journeys', header: 'Active journeys', align: 'right', render: (r) => (r.active_journeys ?? 0) as number },
];

const portCols: Column<Rec>[] = [
  { key: 'port_cd', header: 'Code', render: (r) => <span className="font-medium text-ink">{String(r.port_cd)}</span> },
  { key: 'port_name', header: 'Name', render: (r) => String(r.port_name) },
  { key: 'country', header: 'Country', render: (r) => (r.country ? String(r.country) : '—') },
  { key: 'timezone', header: 'Timezone', render: (r) => (r.timezone ? String(r.timezone) : '—') },
];

export function ShipsTab() {
  const { rows, loading, failed, retry } = useList(adminApi.catalog.ships);
  if (failed) return <ErrorState message="Could not load ships." onRetry={retry} />;
  return <DataTable columns={shipCols} rows={rows} getRowId={(r) => String(r.ship_cd)} loading={loading} empty="No ships." />;
}

export function PortsTab() {
  const { rows, loading, failed, retry } = useList(adminApi.catalog.ports);
  if (failed) return <ErrorState message="Could not load ports." onRetry={retry} />;
  return <DataTable columns={portCols} rows={rows} getRowId={(r) => String(r.port_cd)} loading={loading} empty="No ports." />;
}
