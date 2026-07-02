import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin/api';
import type { Analytics, BookingStatus } from '@/lib/admin/types';
import { StatCard } from '@/components/admin/ui/StatCard';
import { Panel } from '@/components/admin/ui/Panel';
import { LineChart, Donut, BarChart, type Slice } from '@/components/admin/charts/Charts';
import { BOOKING_STATUS } from '@/lib/admin/status';
import { money } from '@/lib/admin/format';

const STATUS_COLOR: Record<BookingStatus, string> = {
  pending: '#B5A684', deposit_paid: '#73859F', confirmed: '#3D6963', cancelled: '#CBC4BC',
};

export function AnalyticsSection() {
  const [a, setA] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.analytics().then((r) => setA(r.analytics)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const slices: Slice[] = (a?.byStatus ?? []).map((s) => ({
    label: BOOKING_STATUS[s.status]?.label ?? s.status,
    value: s.n,
    color: STATUS_COLOR[s.status] ?? '#CBC4BC',
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Requests (90d)" value={a?.totals.requests ?? '—'} loading={loading} />
        <StatCard label="Converted" value={a?.totals.converted ?? '—'} loading={loading} tone="good" sub={a ? `${a.totals.conversionRate}% rate` : undefined} />
        <StatCard label="Deposits" value={a ? money(a.totals.deposits) : '—'} loading={loading} />
        <StatCard label="Enquiries" value={a?.totals.contacts ?? '—'} loading={loading} />
      </div>

      <Panel title="Bookings over time (90 days)">
        {loading ? <div className="h-40 animate-pulse rounded bg-cream-200" />
          : <LineChart points={(a?.series ?? []).map((p) => ({ label: p.bucket.slice(5), value: p.requests }))} />}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="By status">
          {loading ? <div className="h-36 animate-pulse rounded bg-cream-200" /> : <Donut slices={slices} />}
        </Panel>
        <Panel title="Top journeys">
          {loading ? <div className="h-36 animate-pulse rounded bg-cream-200" />
            : <BarChart points={(a?.topJourneys ?? []).slice(0, 8).map((t) => ({ label: t.itinDesc ?? t.journeyId ?? '—', value: t.n }))} />}
        </Panel>
      </div>
    </div>
  );
}
