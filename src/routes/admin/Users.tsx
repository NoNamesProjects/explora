import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/lib/api';
import { adminApi } from '@/lib/admin/api';
import type { AdminRole, AdminUserRow } from '@/lib/admin/types';
import { Panel } from '@/components/admin/ui/Panel';
import { DataTable, type Column } from '@/components/admin/ui/DataTable';
import { Spinner } from '@/components/admin/ui/Spinner';
import { ErrorState } from '@/components/admin/ui/ErrorState';
import { useToast } from '@/components/admin/ui/Toast';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { dateShort, relativeTime } from '@/lib/admin/format';

interface NewUser { email: string; name: string; role: AdminRole; password: string }

export function Users() {
  const toast = useToast();
  const { user: me } = useAdminAuth();
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<NewUser>({ defaultValues: { role: 'agent' } });

  const load = () => {
    setLoading(true);
    setFailed(false);
    adminApi.users.list().then((r) => setRows(r.items)).catch(() => setFailed(true)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const onCreate = handleSubmit(async (v) => {
    try {
      await adminApi.users.create({ ...v, email: v.email.trim().toLowerCase() });
      toast.push({ tone: 'success', message: `Created ${v.email}.` });
      reset({ email: '', name: '', role: 'agent', password: '' });
      load();
    } catch (e) {
      toast.push({ tone: 'error', message: e instanceof ApiError && e.status === 409 ? 'That email already exists.' : 'Could not create user.' });
    }
  });

  async function update(id: number, patch: { role?: AdminRole; disabled?: boolean }) {
    try {
      await adminApi.users.update(id, patch);
      load();
    } catch (e) {
      toast.push({ tone: 'error', message: e instanceof ApiError && e.status === 409 ? 'Cannot remove the last admin.' : 'Update failed.' });
    }
  }

  const cols: Column<AdminUserRow>[] = [
    { key: 'email', header: 'Email', render: (r) => (
      <span className="font-medium text-ink">{r.email}{me?.id === r.id && <span className="ml-2 text-[0.65rem] uppercase tracking-eyebrow text-ink-400">you</span>}</span>
    ) },
    { key: 'name', header: 'Name', render: (r) => r.name },
    { key: 'role', header: 'Role', render: (r) => (
      <select
        value={r.role}
        aria-label={`Role for ${r.email}`}
        onChange={(e) => update(r.id, { role: e.target.value as AdminRole })}
        className="rounded border border-cream-300 bg-white px-2 py-1 text-xs"
      >
        <option value="admin">admin</option>
        <option value="agent">agent</option>
      </select>
    ) },
    { key: 'lastLoginAt', header: 'Last login', render: (r) => <span className="text-xs text-ink-600">{r.lastLoginAt ? relativeTime(r.lastLoginAt) : 'never'}</span> },
    { key: 'createdAt', header: 'Created', render: (r) => <span className="text-xs text-ink-600">{dateShort(r.createdAt)}</span> },
    { key: 'status', header: 'Status', align: 'right', render: (r) => (
      <button
        type="button"
        onClick={() => update(r.id, { disabled: !r.disabled })}
        className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors ${
          r.disabled ? 'border-red-300 text-red-600 hover:bg-red-50' : 'border-cream-300 text-ink hover:bg-cream-200'
        }`}
      >
        {r.disabled ? 'Disabled — enable' : 'Active — disable'}
      </button>
    ) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium text-ink">Users</h1>
        <p className="mt-1 text-sm text-ink-500">Operator accounts. Admins manage everything; agents see clients, catalog and insights.</p>
      </div>

      <Panel title="Add a user">
        <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <label className="block"><span className="text-eyebrow uppercase tracking-eyebrow text-ink-500">Email</span>
            <input type="email" required {...register('email', { required: true })} className="mt-1 h-9 w-full rounded border border-cream-300 bg-white px-2.5 text-sm focus:border-ink focus:outline-none" /></label>
          <label className="block"><span className="text-eyebrow uppercase tracking-eyebrow text-ink-500">Name</span>
            <input type="text" required {...register('name', { required: true })} className="mt-1 h-9 w-full rounded border border-cream-300 bg-white px-2.5 text-sm focus:border-ink focus:outline-none" /></label>
          <label className="block"><span className="text-eyebrow uppercase tracking-eyebrow text-ink-500">Role</span>
            <select {...register('role')} className="mt-1 h-9 w-full rounded border border-cream-300 bg-white px-2 text-sm focus:border-ink focus:outline-none"><option value="agent">agent</option><option value="admin">admin</option></select></label>
          <label className="block"><span className="text-eyebrow uppercase tracking-eyebrow text-ink-500">Password (min 8)</span>
            <input type="text" required minLength={8} {...register('password', { required: true, minLength: 8 })} className="mt-1 h-9 w-full rounded border border-cream-300 bg-white px-2.5 text-sm focus:border-ink focus:outline-none" /></label>
          <button type="submit" disabled={isSubmitting} aria-label="Add user" className="btn-primary h-9 py-0 disabled:opacity-60">{isSubmitting ? <Spinner className="text-cream" /> : 'Add user'}</button>
        </form>
      </Panel>

      {failed
        ? <ErrorState message="Could not load users." onRetry={load} />
        : <DataTable columns={cols} rows={rows} getRowId={(r) => r.id} loading={loading} empty="No users." />}
    </div>
  );
}
