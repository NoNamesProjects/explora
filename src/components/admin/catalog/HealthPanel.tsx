import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/admin/api';
import type { CatalogHealth } from '@/lib/admin/types';
import { StatCard } from '@/components/admin/ui/StatCard';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { ErrorState } from '@/components/admin/ui/ErrorState';
import { relativeTime } from '@/lib/admin/format';

export function HealthPanel() {
  const { t } = useTranslation();
  const [h, setH] = useState<CatalogHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    adminApi.catalog.health().then((r) => setH(r.health)).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (error && !loading) return <ErrorState title={t('admin.catalog.health.errorTitle', { defaultValue: 'Could not load catalog health' })} onRetry={load} />;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard label={t('admin.catalog.health.activeJourneys', { defaultValue: 'Active journeys' })} value={h?.journeysActive ?? '—'} loading={loading} sub={h ? t('admin.catalog.health.totalCount', { defaultValue: '{{count}} total', count: h.journeysTotal }) : undefined} />
      <StatCard label={t('admin.catalog.health.fares', { defaultValue: 'Fares' })} value={h?.faresTotal ?? '—'} loading={loading} />
      <StatCard label={t('admin.catalog.health.ships', { defaultValue: 'Ships' })} value={h?.shipsTotal ?? '—'} loading={loading} />
      <StatCard label={t('admin.catalog.health.ports', { defaultValue: 'Ports' })} value={h?.portsTotal ?? '—'} loading={loading} />
      <StatCard
        label={t('admin.catalog.health.ghosts', { defaultValue: 'Ghosts' })}
        value={h?.journeysSoftDeleted ?? '—'}
        loading={loading}
        tone={h && h.aboutToPurge > 0 ? 'warn' : 'neutral'}
        sub={h && h.aboutToPurge > 0 ? t('admin.catalog.health.purgingSoon', { defaultValue: '{{count}} purging soon', count: h.aboutToPurge }) : t('admin.catalog.health.softDeleted', { defaultValue: 'soft-deleted' })}
      />
      <StatCard
        label={t('admin.catalog.health.lastRefresh', { defaultValue: 'Last refresh' })}
        value={h?.lastRun ? <StatusBadge kind="ingest" value={h.lastRun.status} /> : '—'}
        loading={loading}
        sub={h?.journeysFresh ? relativeTime(h.journeysFresh) : undefined}
      />
    </div>
  );
}
