import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin/api';
import type { CatalogHealth } from '@/lib/admin/types';
import { StatCard } from '@/components/admin/ui/StatCard';
import { ErrorState } from '@/components/admin/ui/ErrorState';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { relativeTime } from '@/lib/admin/format';

export function HealthPanel() {
  const [h, setH] = useState<CatalogHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setLoading(true);
    setFailed(false);
    adminApi.catalog.health().then((r) => setH(r.health)).catch(() => setFailed(true)).finally(() => setLoading(false));
  }, [attempt]);

  if (failed) return <ErrorState message="Could not load catalog health." onRetry={() => setAttempt((n) => n + 1)} />;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard label="Active journeys" value={h?.journeysActive ?? '—'} loading={loading} sub={h ? `${h.journeysTotal} total` : undefined} />
      <StatCard label="Fares" value={h?.faresTotal ?? '—'} loading={loading} />
      <StatCard label="Ships" value={h?.shipsTotal ?? '—'} loading={loading} />
      <StatCard label="Ports" value={h?.portsTotal ?? '—'} loading={loading} />
      <StatCard
        label="Ghosts"
        value={h?.journeysSoftDeleted ?? '—'}
        loading={loading}
        tone={h && h.aboutToPurge > 0 ? 'warn' : 'neutral'}
        sub={h && h.aboutToPurge > 0 ? `${h.aboutToPurge} purging soon` : 'soft-deleted'}
      />
      <StatCard
        label="Last refresh"
        value={h?.lastRun ? <StatusBadge kind="ingest" value={h.lastRun.status} /> : '—'}
        loading={loading}
        sub={h?.journeysFresh ? relativeTime(h.journeysFresh) : undefined}
      />
    </div>
  );
}
