import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/admin/api';
import type { Diagnostics } from '@/lib/admin/types';
import { HealthChip } from '@/components/admin/ui/HealthChip';
import { ErrorState } from '@/components/admin/ui/ErrorState';

export function DiagnosticsPanel() {
  const { t } = useTranslation();
  const [d, setD] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const LABELS: Record<string, string> = {
    database: t('admin.insights.diagnostics.database', { defaultValue: 'Database' }),
    exploraFlatfile: t('admin.insights.diagnostics.exploraFlatfile', { defaultValue: 'Explora flatfile (Okta)' }),
    paypal: t('admin.insights.diagnostics.paypal', { defaultValue: 'PayPal' }),
    resend: t('admin.insights.diagnostics.resend', { defaultValue: 'Email (Resend)' }),
    bookingNotify: t('admin.insights.diagnostics.bookingNotify', { defaultValue: 'Booking notifications' }),
    cronSecret: t('admin.insights.diagnostics.cronSecret', { defaultValue: 'Cron secret' }),
    adminSessions: t('admin.insights.diagnostics.adminSessions', { defaultValue: 'Admin sessions' }),
  };

  function detail(c: { configured: boolean; reachable?: boolean; mode?: string; driver?: string }): string {
    if (!c.configured) return t('admin.insights.diagnostics.notConfigured', { defaultValue: 'Not configured' });
    const bits: string[] = [];
    if (c.driver) bits.push(c.driver);
    if (c.mode) bits.push(c.mode);
    if (c.reachable === false) return t('admin.insights.diagnostics.unreachable', { defaultValue: 'Configured · UNREACHABLE' });
    if (c.reachable === true) bits.push(t('admin.insights.diagnostics.reachable', { defaultValue: 'reachable' }));
    return bits.length ? bits.join(' · ') : t('admin.insights.diagnostics.configured', { defaultValue: 'Configured' });
  }

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    adminApi.diagnostics().then((r) => setD(r.diagnostics)).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-card bg-cream-200" />)}</div>;
  }

  if (error) return <ErrorState title={t('admin.insights.diagnostics.loadError', { defaultValue: 'Could not load diagnostics' })} onRetry={load} />;

  const entries = Object.entries(d?.checks ?? {});
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(([key, c]) => (
          <HealthChip key={key} label={LABELS[key] ?? key} ok={c.configured && c.reachable !== false} detail={detail(c)} />
        ))}
      </div>
      <p className="mt-3 text-[0.7rem] text-ink-400">{t('admin.insights.diagnostics.footer', { defaultValue: 'Presence & mode only — secret values are never read or shown.' })}</p>
    </div>
  );
}
