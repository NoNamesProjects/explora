import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/admin/api';
import type { CatalogJourneyRow } from '@/lib/admin/types';
import { dateShort } from '@/lib/admin/format';
import { DataTable, type Column } from '@/components/admin/ui/DataTable';
import { Pagination } from '@/components/admin/ui/Pagination';
import { Toolbar, SearchInput, SelectInput } from '@/components/admin/ui/Toolbar';
import { JourneyInspector } from './JourneyInspector';

const PAGE_SIZE = 25;

export function JourneysTab() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [available, setAvailable] = useState('true');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<CatalogJourneyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CatalogJourneyRow | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    adminApi.catalog
      .journeys({ q: debouncedQ || undefined, available, page, pageSize: PAGE_SIZE })
      .then((r) => { if (alive) { setRows(r.items); setTotal(r.total); } })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [debouncedQ, available, page]);

  const columns: Column<CatalogJourneyRow>[] = useMemo(() => [
    { key: 'journeyId', header: 'Journey', render: (r) => (
      <div><div className="font-medium text-ink">{r.itinDesc ?? r.journeyId}</div><div className="text-xs text-ink-500">{r.journeyId}</div></div>
    ) },
    { key: 'shipName', header: 'Ship', render: (r) => <span className="text-ink-600">{r.shipName ?? r.shipCd}</span> },
    { key: 'region', header: 'Region', render: (r) => <span className="text-xs text-ink-600">{r.region ?? '—'}</span> },
    { key: 'sailingDate', header: 'Sails', render: (r) => <span className="text-xs text-ink-600">{dateShort(r.sailingDate)}</span> },
    { key: 'nights', header: 'Nights', align: 'right', render: (r) => r.nights },
    { key: 'fareCount', header: 'Fares', align: 'right', render: (r) => r.fareCount },
    { key: 'isAvailable', header: 'Status', render: (r) => r.isAvailable
      ? <span className="text-xs text-accent-patina">Live</span>
      : <span className="text-xs text-accent-tan">Ghost ×{r.consecutiveMissing}</span> },
  ], []);

  return (
    <div>
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search journey, ship…" />
        <SelectInput
          ariaLabel="Availability"
          value={available}
          onChange={(v) => { setAvailable(v); setPage(1); }}
          options={[{ value: 'true', label: 'Live only' }, { value: 'false', label: 'Ghosts only' }, { value: '', label: 'All' }]}
        />
        <span className="text-xs text-ink-500 tabular-nums">{loading ? '…' : `${total} journeys`}</span>
      </Toolbar>
      <DataTable columns={columns} rows={rows} getRowId={(r) => r.journeyId} onRowClick={(r) => setSelected(r)} loading={loading} empty="No journeys match." />
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
      <JourneyInspector journey={selected} open={selected != null} onClose={() => setSelected(null)} />
    </div>
  );
}
