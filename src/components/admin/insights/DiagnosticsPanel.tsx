import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin/api';
import type { Diagnostics } from '@/lib/admin/types';
import { HealthChip } from '@/components/admin/ui/HealthChip';
import { ErrorState } from '@/components/admin/ui/ErrorState';

const LABELS: Record<string, string> = {
  database: 'Database',
  exploraFlatfile: 'Explora flatfile (Okta)',
  paypal: 'PayPal',
  resend: 'Email (Resend)',
  bookingNotify: 'Booking notifications',
  cronSecret: 'Cron secret',
  adminSessions: 'Admin sessions',
};

function detail(c: { configured: boolean; reachable?: boolean; mode?: string; driver?: string }): string {
  if (!c.configured) return 'Not configured';
  const bits: string[] = [];
  if (c.driver) bits.push(c.driver);
  if (c.mode) bits.push(c.mode);
  if (c.reachable === false) return 'Configured · UNREACHABLE';
  if (c.reachable === true) bits.push('reachable');
  return bits.length ? bits.join(' · ') : 'Configured';
}

export function DiagnosticsPanel() {
  const [d, setD] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setLoading(true);
    setFailed(false);
    adminApi.diagnostics().then((r) => setD(r.diagnostics)).catch(() => setFailed(true)).finally(() => setLoading(false));
  }, [attempt]);

  if (loading) {
    return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-card bg-cream-200" />)}</div>;
  }

  if (failed) return <ErrorState message="Could not load diagnostics." onRetry={() => setAttempt((n) => n + 1)} />;

  const entries = Object.entries(d?.checks ?? {});
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(([key, c]) => (
          <HealthChip key={key} label={LABELS[key] ?? key} ok={c.configured && c.reachable !== false} detail={detail(c)} />
        ))}
      </div>
      <p className="mt-3 text-[0.7rem] text-ink-400">Presence &amp; mode only — secret values are never read or shown.</p>
    </div>
  );
}
