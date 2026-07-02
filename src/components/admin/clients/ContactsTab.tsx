import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/admin/api';
import type { ContactRow } from '@/lib/admin/types';
import { dateShort } from '@/lib/admin/format';
import { DataTable, type Column } from '@/components/admin/ui/DataTable';
import { Pagination } from '@/components/admin/ui/Pagination';
import { Toolbar, SearchInput } from '@/components/admin/ui/Toolbar';
import { useToast } from '@/components/admin/ui/Toast';

const PAGE_SIZE = 25;

export function ContactsTab() {
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
      .catch(() => { if (alive) toast.push({ tone: 'error', message: 'Could not load contacts.' }); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [debouncedQ, page, toast]);

  const columns: Column<ContactRow>[] = useMemo(() => [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-ink">{r.name}</span> },
    { key: 'email', header: 'Email', render: (r) => <span className="text-ink-600">{r.email}</span> },
    { key: 'phone', header: 'Phone', render: (r) => <span className="text-ink-600">{r.phone ?? '—'}</span> },
    { key: 'message', header: 'Message', render: (r) => <span className="line-clamp-2 max-w-md text-ink-600">{r.message}</span> },
    { key: 'createdAt', header: 'Received', align: 'right', render: (r) => <span className="text-xs text-ink-600">{dateShort(r.createdAt)}</span> },
  ], []);

  return (
    <div>
      <Toolbar
        right={
          <a
            href={adminApi.contacts.exportUrl({ q: debouncedQ || undefined })}
            className="rounded border border-cream-300 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream-200"
          >
            Export CSV
          </a>
        }
      >
        <SearchInput value={q} onChange={setQ} placeholder="Search name or email…" />
        <span className="text-xs text-ink-500 tabular-nums">{loading ? '…' : `${total} result${total === 1 ? '' : 's'}`}</span>
      </Toolbar>

      <DataTable columns={columns} rows={rows} getRowId={(r) => r.id} loading={loading} empty="No contact enquiries match." />
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
    </div>
  );
}
