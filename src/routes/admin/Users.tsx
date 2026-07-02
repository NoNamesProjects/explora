import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/lib/api';
import { adminApi } from '@/lib/admin/api';
import type { AdminRole, AdminUserRow } from '@/lib/admin/types';
import { Panel } from '@/components/admin/ui/Panel';
import { DataTable, type Column } from '@/components/admin/ui/DataTable';
import { Spinner } from '@/components/admin/ui/Spinner';
import { ErrorState } from '@/components/admin/ui/ErrorState';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { useToast } from '@/components/admin/ui/Toast';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { dateShort, relativeTime } from '@/lib/admin/format';

interface NewUser { email: string; name: string; role: AdminRole; password: string }
interface PendingConfirm { title: string; body: string; confirmLabel: string; tone?: 'default' | 'danger'; run: () => void }

export function Users() {
  const { t } = useTranslation();
  const toast = useToast();
  const { user: me } = useAdminAuth();
  const roleLabel = (role: AdminRole) =>
    role === 'admin'
      ? t('admin.users.roleAdmin', { defaultValue: 'admin' })
      : t('admin.users.roleAgent', { defaultValue: 'agent' });
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<NewUser>({ defaultValues: { role: 'agent' } });

  const load = () => {
    setLoading(true);
    setError(false);
    adminApi.users.list().then((r) => setRows(r.items)).catch(() => setError(true)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const onCreate = handleSubmit(async (v) => {
    try {
      await adminApi.users.create({ ...v, email: v.email.trim().toLowerCase() });
      toast.push({ tone: 'success', message: t('admin.users.createdToast', { defaultValue: 'Created {{email}}.', email: v.email }) });
      reset({ email: '', name: '', role: 'agent', password: '' });
      load();
    } catch (e) {
      toast.push({ tone: 'error', message: e instanceof ApiError && e.status === 409 ? t('admin.users.emailExists', { defaultValue: 'That email already exists.' }) : t('admin.users.createFailed', { defaultValue: 'Could not create user.' }) });
    }
  });

  async function applyUpdate(id: number, patch: { role?: AdminRole; disabled?: boolean }, successMsg: string) {
    try {
      await adminApi.users.update(id, patch);
      toast.push({ tone: 'success', message: successMsg });
      load();
    } catch (e) {
      toast.push({ tone: 'error', message: e instanceof ApiError && e.status === 409 ? t('admin.users.lastAdmin', { defaultValue: 'Cannot remove the last admin.' }) : t('admin.users.updateFailed', { defaultValue: 'Update failed.' }) });
    }
  }

  function onRoleChange(u: AdminUserRow, role: AdminRole) {
    if (role === u.role) return;
    setConfirm({
      title: t('admin.users.changeRoleTitle', { defaultValue: 'Change {{email}} to {{role}}?', email: u.email, role: roleLabel(role) }),
      body: role === 'admin'
        ? t('admin.users.roleAdminBody', { defaultValue: 'Admins can manage everything — users, content, data and settings.' })
        : t('admin.users.roleAgentBody', { defaultValue: 'Agents can see clients, catalog and insights only.' }),
      confirmLabel: t('admin.users.makeRole', { defaultValue: 'Make {{role}}', role: roleLabel(role) }),
      run: () => applyUpdate(u.id, { role }, t('admin.users.roleChangedToast', { defaultValue: '{{email}} is now {{role}}.', email: u.email, role: roleLabel(role) })),
    });
  }

  function onToggleDisabled(u: AdminUserRow) {
    if (u.disabled) {
      void applyUpdate(u.id, { disabled: false }, t('admin.users.reEnabledToast', { defaultValue: '{{email}} re-enabled.', email: u.email }));
      return;
    }
    setConfirm({
      title: t('admin.users.disableTitle', { defaultValue: 'Disable {{email}}?', email: u.email }),
      body: t('admin.users.disableBody', { defaultValue: 'They will be signed out immediately and blocked from signing in until re-enabled.' }),
      confirmLabel: t('admin.users.disable', { defaultValue: 'Disable' }),
      tone: 'danger',
      run: () => applyUpdate(u.id, { disabled: true }, t('admin.users.disabledToast', { defaultValue: '{{email}} disabled.', email: u.email })),
    });
  }

  const cols: Column<AdminUserRow>[] = [
    { key: 'email', header: t('admin.users.email', { defaultValue: 'Email' }), render: (r) => (
      <span className="font-medium text-ink">{r.email}{me?.id === r.id && <span className="ml-2 text-[0.65rem] uppercase tracking-eyebrow text-ink-400">{t('admin.users.you', { defaultValue: 'you' })}</span>}</span>
    ) },
    { key: 'name', header: t('admin.users.name', { defaultValue: 'Name' }), render: (r) => r.name },
    { key: 'role', header: t('admin.users.role', { defaultValue: 'Role' }), render: (r) => (
      <select
        value={r.role}
        aria-label={t('admin.users.roleAriaLabel', { defaultValue: 'Role for {{email}}', email: r.email })}
        onChange={(e) => onRoleChange(r, e.target.value as AdminRole)}
        className="rounded border border-cream-300 bg-white px-2 py-1 text-xs focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
      >
        <option value="admin">{t('admin.users.roleAdmin', { defaultValue: 'admin' })}</option>
        <option value="agent">{t('admin.users.roleAgent', { defaultValue: 'agent' })}</option>
      </select>
    ) },
    { key: 'lastLoginAt', header: t('admin.users.lastLogin', { defaultValue: 'Last login' }), render: (r) => <span className="text-xs text-ink-600">{r.lastLoginAt ? relativeTime(r.lastLoginAt) : t('admin.users.never', { defaultValue: 'never' })}</span> },
    { key: 'createdAt', header: t('admin.users.created', { defaultValue: 'Created' }), render: (r) => <span className="text-xs text-ink-600">{dateShort(r.createdAt)}</span> },
    { key: 'status', header: t('admin.users.status', { defaultValue: 'Status' }), align: 'right', render: (r) => (
      <button
        type="button"
        onClick={() => onToggleDisabled(r)}
        className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ink ${
          r.disabled ? 'border-red-300 text-red-600 hover:bg-red-50' : 'border-cream-300 text-ink hover:bg-cream-200'
        }`}
      >
        {r.disabled ? t('admin.users.disabledEnable', { defaultValue: 'Disabled — enable' }) : t('admin.users.activeDisable', { defaultValue: 'Active — disable' })}
      </button>
    ) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-[1.75rem] leading-tight text-ink">{t('admin.users.title', { defaultValue: 'Users' })}</h1>
        <p className="mt-1 text-sm text-ink-500">{t('admin.users.subtitle', { defaultValue: 'Operator accounts. Admins manage everything; agents see clients, catalog and insights.' })}</p>
      </div>

      <Panel title={t('admin.users.addUserPanel', { defaultValue: 'Add a user' })}>
        <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <label className="block"><span className="text-eyebrow uppercase tracking-eyebrow text-ink-500">{t('admin.users.email', { defaultValue: 'Email' })}</span>
            <input type="email" required {...register('email', { required: true })} className="mt-1 h-9 w-full rounded border border-cream-300 bg-white px-2.5 text-sm focus:border-ink focus:outline-none" /></label>
          <label className="block"><span className="text-eyebrow uppercase tracking-eyebrow text-ink-500">{t('admin.users.name', { defaultValue: 'Name' })}</span>
            <input type="text" required {...register('name', { required: true })} className="mt-1 h-9 w-full rounded border border-cream-300 bg-white px-2.5 text-sm focus:border-ink focus:outline-none" /></label>
          <label className="block"><span className="text-eyebrow uppercase tracking-eyebrow text-ink-500">{t('admin.users.role', { defaultValue: 'Role' })}</span>
            <select {...register('role')} className="mt-1 h-9 w-full rounded border border-cream-300 bg-white px-2 text-sm focus:border-ink focus:outline-none"><option value="agent">{t('admin.users.roleAgent', { defaultValue: 'agent' })}</option><option value="admin">{t('admin.users.roleAdmin', { defaultValue: 'admin' })}</option></select></label>
          <label className="block"><span className="text-eyebrow uppercase tracking-eyebrow text-ink-500">{t('admin.users.passwordLabel', { defaultValue: 'Password (min 8)' })}</span>
            <input type="text" required minLength={8} {...register('password', { required: true, minLength: 8 })} className="mt-1 h-9 w-full rounded border border-cream-300 bg-white px-2.5 text-sm focus:border-ink focus:outline-none" /></label>
          <button type="submit" disabled={isSubmitting} aria-label={t('admin.users.addUser', { defaultValue: 'Add user' })} className="btn-primary h-9 py-0 disabled:opacity-60">{isSubmitting ? <Spinner className="text-cream" /> : t('admin.users.addUser', { defaultValue: 'Add user' })}</button>
        </form>
      </Panel>

      {error && !loading ? (
        <ErrorState title={t('admin.users.loadError', { defaultValue: 'Could not load users' })} onRetry={load} />
      ) : (
        <DataTable columns={cols} rows={rows} getRowId={(r) => r.id} loading={loading} empty={t('admin.users.empty', { defaultValue: 'No users.' })} />
      )}

      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(o) => { if (!o) setConfirm(null); }}
          title={confirm.title}
          body={confirm.body}
          confirmLabel={confirm.confirmLabel}
          tone={confirm.tone}
          onConfirm={() => { const run = confirm.run; setConfirm(null); run(); }}
        />
      )}
    </div>
  );
}
