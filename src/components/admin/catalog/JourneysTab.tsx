import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/admin/api';
import type { CatalogJourneyRow } from '@/lib/admin/types';
import { dateShort } from '@/lib/admin/format';
import { DataTable, type Column } from '@/components/admin/ui/DataTable';
import { ErrorState } from '@/components/admin/ui/ErrorState';
import { Pagination } from '@/components/admin/ui/Pagination';
import { Toolbar, SearchInput, SelectInput } from '@/components/admin/ui/Toolbar';
import { JourneyInspector } from './JourneyInspector';

const PAGE_SIZE = 25;

export function JourneysTab() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [available, setAvailable] = useState('true');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<CatalogJourneyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<CatalogJourneyRow | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    adminApi.catalog
      .journeys({ q: debouncedQ || undefined, available, page, pageSize: PAGE_SIZE })
      .then((r) => { if (alive) { setRows(r.items); setTotal(r.total); } })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [debouncedQ, available, page, reloadKey]);

  const columns: Column<CatalogJourneyRow>[] = useMemo(() => [
    { key: 'journeyId', header: t('admin.catalog.journeys.columns.journey', { defaultValue: 'Journey' }), render: (r) => (
      <div><div className="font-medium text-ink">{r.itinDesc ?? r.journeyId}</div><div className="text-xs text-ink-500">{r.journeyId}</div></div>
    ) },
    { key: 'shipName', header: t('admin.catalog.journeys.columns.ship', { defaultValue: 'Ship' }), render: (r) => <span className="text-ink-600">{r.shipName ?? r.shipCd}</span> },
    { key: 'region', header: t('admin.catalog.journeys.columns.region', { defaultValue: 'Region' }), render: (r) => <span className="text-xs text-ink-600">{r.region ?? '—'}</span> },
    { key: 'sailingDate', header: t('admin.catalog.journeys.columns.sails', { defaultValue: 'Sails' }), render: (r) => <span className="text-xs text-ink-600">{dateShort(r.sailingDate)}</span> },
    { key: 'nights', header: t('admin.catalog.journeys.columns.nights', { defaultValue: 'Nights' }), align: 'right', render: (r) => r.nights },
    { key: 'fareCount', header: t('admin.catalog.journeys.columns.fares', { defaultValue: 'Fares' }), align: 'right', render: (r) => r.fareCount },
    { key: 'isAvailable', header: t('admin.catalog.journeys.columns.status', { defaultValue: 'Status' }), render: (r) => r.isAvailable
      ? <span className="text-xs text-accent-patina">{t('admin.catalog.journeys.live', { defaultValue: 'Live' })}</span>
      : <span className="text-xs text-accent-tan">{t('admin.catalog.journeys.ghost', { defaultValue: 'Ghost' })} ×{r.consecutiveMissing}</span> },
  ], [t]);

  return (
    <div>
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder={t('admin.catalog.journeys.searchPlaceholder', { defaultValue: 'Search journey, ship…' })} />
        <SelectInput
          ariaLabel={t('admin.catalog.journeys.availability', { defaultValue: 'Availability' })}
          value={available}
          onChange={(v) => { setAvailable(v); setPage(1); }}
          options={[{ value: 'true', label: t('admin.catalog.journeys.filter.liveOnly', { defaultValue: 'Live only' }) }, { value: 'false', label: t('admin.catalog.journeys.filter.ghostsOnly', { defaultValue: 'Ghosts only' }) }, { value: '', label: t('admin.catalog.journeys.filter.all', { defaultValue: 'All' }) }]}
        />
        <span className="text-xs text-ink-500 tabular-nums">{loading ? '…' : t('admin.catalog.journeys.count', { defaultValue: '{{count}} journeys', count: total })}</span>
      </Toolbar>
      {error && !loading ? (
        <ErrorState title={t('admin.catalog.journeys.errorTitle', { defaultValue: 'Could not load journeys' })} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : (
        <>
          <DataTable columns={columns} rows={rows} getRowId={(r) => r.journeyId} onRowClick={(r) => setSelected(r)} loading={loading} empty={t('admin.catalog.journeys.empty', { defaultValue: 'No journeys match.' })} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
        </>
      )}
      <JourneyInspector journey={selected} open={selected != null} onClose={() => setSelected(null)} />
    </div>
  );
}
