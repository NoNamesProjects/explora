import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/admin/api';
import type { BookingListRow } from '@/lib/admin/types';
import { money, dateShort } from '@/lib/admin/format';
import { BOOKING_STATUS_ORDER, BOOKING_STATUS } from '@/lib/admin/status';
import { DataTable, type Column } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { Pagination } from '@/components/admin/ui/Pagination';
import { Toolbar, SearchInput, SelectInput } from '@/components/admin/ui/Toolbar';
import { BookingDrawer } from './BookingDrawer';
import { useToast } from '@/components/admin/ui/Toast';

const PAGE_SIZE = 25;

export function BookingsTab() {
  const { t } = useTranslation();
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<BookingListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    adminApi.bookings
      .list({ status: status || undefined, q: debouncedQ || undefined, page, pageSize: PAGE_SIZE })
      .then((r) => { if (alive) { setRows(r.items); setTotal(r.total); } })
      .catch(() => { if (alive) toast.push({ tone: 'error', message: t('admin.clients.bookings.loadError', { defaultValue: 'Could not load bookings.' }) }); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [status, debouncedQ, page, reloadKey, toast, t]);

  const columns: Column<BookingListRow>[] = useMemo(() => [
    { key: 'ref', header: t('admin.clients.bookings.columns.ref', { defaultValue: 'Ref' }), render: (r) => <span className="font-medium text-ink">{r.ref}</span> },
    { key: 'lead', header: t('admin.clients.bookings.columns.lead', { defaultValue: 'Lead' }), render: (r) => (
      <div><div className="text-ink">{r.leadName ?? '—'}</div><div className="text-xs text-ink-500">{r.leadEmail ?? ''}</div></div>
    ) },
    { key: 'journeyId', header: t('admin.clients.bookings.columns.journey', { defaultValue: 'Journey' }), render: (r) => <span className="text-xs text-ink-600">{r.journeyId ?? '—'}</span> },
    { key: 'guestCount', header: t('admin.clients.bookings.columns.guests', { defaultValue: 'Guests' }), align: 'right', render: (r) => r.guestCount },
    { key: 'indicativeTotal', header: t('admin.clients.bookings.columns.total', { defaultValue: 'Total' }), align: 'right', render: (r) => money(r.indicativeTotal, r.currency) },
    { key: 'status', header: t('admin.clients.bookings.columns.status', { defaultValue: 'Status' }), render: (r) => <StatusBadge kind="booking" value={r.status} /> },
    { key: 'createdAt', header: t('admin.clients.bookings.columns.created', { defaultValue: 'Created' }), align: 'right', render: (r) => <span className="text-xs text-ink-600">{dateShort(r.createdAt)}</span> },
  ], [t]);

  const statusOptions = [{ value: '', label: t('admin.clients.bookings.allStatuses', { defaultValue: 'All statuses' }) }, ...BOOKING_STATUS_ORDER.map((s) => ({ value: s, label: t(`admin.status.booking.${s}`, { defaultValue: BOOKING_STATUS[s].label }) }))];

  return (
    <div>
      <Toolbar
        right={
          <a
            href={adminApi.bookings.exportUrl({ status: status || undefined, q: debouncedQ || undefined })}
            className="rounded border border-cream-300 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream-200"
          >
            {t('admin.clients.bookings.exportCsv', { defaultValue: 'Export CSV' })}
          </a>
        }
      >
        <SelectInput ariaLabel={t('admin.clients.bookings.filterByStatus', { defaultValue: 'Filter by status' })} value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={statusOptions} />
        <SearchInput value={q} onChange={setQ} placeholder={t('admin.clients.bookings.searchPlaceholder', { defaultValue: 'Search ref, name, email…' })} />
        <span className="text-xs text-ink-500 tabular-nums">{loading ? '…' : t('admin.clients.bookings.resultCount', { defaultValue: '{{count}} results', count: total })}</span>
      </Toolbar>

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        onRowClick={(r) => setOpenId(r.id)}
        loading={loading}
        empty={t('admin.clients.bookings.empty', { defaultValue: 'No bookings match these filters.' })}
      />
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />

      <BookingDrawer
        bookingId={openId}
        open={openId != null}
        onClose={() => setOpenId(null)}
        onChanged={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}
