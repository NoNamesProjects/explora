import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { adminApi } from '@/lib/admin/api';
import { DataTable, type Column } from '@/components/admin/ui/DataTable';
import { ErrorState } from '@/components/admin/ui/ErrorState';

type Rec = Record<string, unknown>;

function useList(loader: () => Promise<{ items: Rec[] }>) {
  const [rows, setRows] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    loader().then((r) => { if (alive) setRows(r.items); }).catch(() => { if (alive) setError(true); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);
  return { rows, loading, error, retry: () => setReloadKey((k) => k + 1) };
}

function makeShipCols(t: TFunction): Column<Rec>[] {
  return [
    { key: 'ship_cd', header: t('admin.catalog.ships.columns.code', { defaultValue: 'Code' }), render: (r) => <span className="font-medium text-ink">{String(r.ship_cd)}</span> },
    { key: 'ship_name', header: t('admin.catalog.ships.columns.name', { defaultValue: 'Name' }), render: (r) => String(r.ship_name) },
    { key: 'launch_year', header: t('admin.catalog.ships.columns.launched', { defaultValue: 'Launched' }), render: (r) => (r.launch_year ? String(r.launch_year) : '—') },
    { key: 'decks', header: t('admin.catalog.ships.columns.decks', { defaultValue: 'Decks' }), align: 'right', render: (r) => (r.decks ?? '—') as number },
    { key: 'capacity', header: t('admin.catalog.ships.columns.capacity', { defaultValue: 'Capacity' }), align: 'right', render: (r) => (r.capacity ?? '—') as number },
    { key: 'active_journeys', header: t('admin.catalog.ships.columns.activeJourneys', { defaultValue: 'Active journeys' }), align: 'right', render: (r) => (r.active_journeys ?? 0) as number },
  ];
}

function makePortCols(t: TFunction): Column<Rec>[] {
  return [
    { key: 'port_cd', header: t('admin.catalog.ports.columns.code', { defaultValue: 'Code' }), render: (r) => <span className="font-medium text-ink">{String(r.port_cd)}</span> },
    { key: 'port_name', header: t('admin.catalog.ports.columns.name', { defaultValue: 'Name' }), render: (r) => String(r.port_name) },
    { key: 'country', header: t('admin.catalog.ports.columns.country', { defaultValue: 'Country' }), render: (r) => (r.country ? String(r.country) : '—') },
    { key: 'timezone', header: t('admin.catalog.ports.columns.timezone', { defaultValue: 'Timezone' }), render: (r) => (r.timezone ? String(r.timezone) : '—') },
  ];
}

export function ShipsTab() {
  const { t } = useTranslation();
  const { rows, loading, error, retry } = useList(adminApi.catalog.ships);
  const shipCols = useMemo(() => makeShipCols(t), [t]);
  if (error && !loading) return <ErrorState title={t('admin.catalog.ships.errorTitle', { defaultValue: 'Could not load ships' })} onRetry={retry} />;
  return <DataTable columns={shipCols} rows={rows} getRowId={(r) => String(r.ship_cd)} loading={loading} empty={t('admin.catalog.ships.empty', { defaultValue: 'No ships.' })} />;
}

export function PortsTab() {
  const { t } = useTranslation();
  const { rows, loading, error, retry } = useList(adminApi.catalog.ports);
  const portCols = useMemo(() => makePortCols(t), [t]);
  if (error && !loading) return <ErrorState title={t('admin.catalog.ports.errorTitle', { defaultValue: 'Could not load ports' })} onRetry={retry} />;
  return <DataTable columns={portCols} rows={rows} getRowId={(r) => String(r.port_cd)} loading={loading} empty={t('admin.catalog.ports.empty', { defaultValue: 'No ports.' })} />;
}
