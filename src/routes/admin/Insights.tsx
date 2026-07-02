import { useTranslation } from 'react-i18next';
import { AnalyticsSection } from '@/components/admin/insights/AnalyticsSection';
import { DiagnosticsPanel } from '@/components/admin/insights/DiagnosticsPanel';
import { RoleGate } from '@/components/admin/RequireRole';

export function Insights() {
  const { t } = useTranslation();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-[1.75rem] leading-tight text-ink">{t('admin.insights.title', { defaultValue: 'Insights' })}</h1>
        <p className="mt-1 text-sm text-ink-500">{t('admin.insights.subtitle', { defaultValue: 'Booking analytics over the last 90 days.' })}</p>
      </div>

      <AnalyticsSection />

      <RoleGate role="admin">
        <section>
          <h2 className="mb-3 text-sm font-medium text-ink">{t('admin.insights.systemDiagnostics', { defaultValue: 'System diagnostics' })}</h2>
          <DiagnosticsPanel />
        </section>
      </RoleGate>
    </div>
  );
}
