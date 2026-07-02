import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/admin/api';
import type { ContactRow } from '@/lib/admin/types';
import { dateShort } from '@/lib/admin/format';
import { DataTable, type Column } from '@/components/admin/ui/DataTable';
import { Pagination } from '@/components/admin/ui/Pagination';
import { Toolbar, SearchInput } from '@/components/admin/ui/Toolbar';
import { useToast } from '@/components/admin/ui/Toast';

const PAGE_SIZE = 25;

export function ContactsTab() {
  const { t } = useTranslation();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    adminApi.contacts
      .list({ q: debouncedQ || undefined, page, pageSize: PAGE_SIZE })
      .then((r) => { if (alive) { setRows(r.items); setTotal(r.total); } })
      .catch(() => { if (alive) toast.push({ tone: 'error', message: t('admin.clients.contacts.loadError', { defaultValue: 'Could not load contacts.' }) }); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [debouncedQ, page, toast, t]);

  const columns: Column<ContactRow>[] = useMemo(() => [
    { key: 'name', header: t('admin.clients.contacts.columns.name', { defaultValue: 'Name' }), render: (r) => <span className="font-medium text-ink">{r.name}</span> },
    { key: 'email', header: t('admin.clients.contacts.columns.email', { defaultValue: 'Email' }), render: (r) => <span className="text-ink-600">{r.email}</span> },
    { key: 'phone', header: t('admin.clients.contacts.columns.phone', { defaultValue: 'Phone' }), render: (r) => <span className="text-ink-600">{r.phone ?? '—'}</span> },
    { key: 'message', header: t('admin.clients.contacts.columns.message', { defaultValue: 'Message' }), render: (r) => <span className="line-clamp-2 max-w-md text-ink-600">{r.message}</span> },
    { key: 'createdAt', header: t('admin.clients.contacts.columns.received', { defaultValue: 'Received' }), align: 'right', render: (r) => <span className="text-xs text-ink-600">{dateShort(r.createdAt)}</span> },
  ], [t]);

  return (
    <div>
      <Toolbar
        right={
          <a
            href={adminApi.contacts.exportUrl({ q: debouncedQ || undefined })}
            className="rounded border border-cream-300 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream-200"
          >
            {t('admin.clients.contacts.exportCsv', { defaultValue: 'Export CSV' })}
          </a>
        }
      >
        <SearchInput value={q} onChange={setQ} placeholder={t('admin.clients.contacts.searchPlaceholder', { defaultValue: 'Search name or email…' })} />
        <span className="text-xs text-ink-500 tabular-nums">{loading ? '…' : t('admin.clients.contacts.resultCount', { defaultValue: '{{count}} results', count: total })}</span>
      </Toolbar>

      <DataTable columns={columns} rows={rows} getRowId={(r) => r.id} loading={loading} empty={t('admin.clients.contacts.empty', { defaultValue: 'No contact enquiries match.' })} />
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
    </div>
  );
}
