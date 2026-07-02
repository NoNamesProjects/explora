import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin/api';
import { DataTable, type Column } from '@/components/admin/ui/DataTable';

type Rec = Record<string, unknown>;

function useList(loader: () => Promise<{ items: Rec[] }>) {
  const [rows, setRows] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    loader().then((r) => { if (alive) setRows(r.items); }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { rows, loading };
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
  const { rows, loading } = useList(adminApi.catalog.ships);
  return <DataTable columns={shipCols} rows={rows} getRowId={(r) => String(r.ship_cd)} loading={loading} empty="No ships." />;
}

export function PortsTab() {
  const { rows, loading } = useList(adminApi.catalog.ports);
  return <DataTable columns={portCols} rows={rows} getRowId={(r) => String(r.port_cd)} loading={loading} empty="No ports." />;
}
