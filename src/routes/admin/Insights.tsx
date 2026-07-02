import { AnalyticsSection } from '@/components/admin/insights/AnalyticsSection';
import { DiagnosticsPanel } from '@/components/admin/insights/DiagnosticsPanel';
import { RoleGate } from '@/components/admin/RequireRole';

export function Insights() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-medium text-ink">Insights</h1>
        <p className="mt-1 text-sm text-ink-500">Booking analytics over the last 90 days.</p>
      </div>

      <AnalyticsSection />

      <RoleGate role="admin">
        <section>
          <h2 className="mb-3 text-sm font-medium text-ink">System diagnostics</h2>
          <DiagnosticsPanel />
        </section>
      </RoleGate>
    </div>
  );
}
