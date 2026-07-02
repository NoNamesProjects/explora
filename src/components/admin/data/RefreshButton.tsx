import { useTranslation } from 'react-i18next';
import type { IngestPhase } from './useIngestRun';
import { Spinner } from '@/components/admin/ui/Spinner';

const REFRESH_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

export function RefreshButton({ phase, busy, onStart }: { phase: IngestPhase; busy: boolean; onStart: () => void }) {
  const { t } = useTranslation();
  const label =
    phase === 'starting' ? t('admin.dataIngest.button.starting', { defaultValue: 'Starting…' })
      : phase === 'running' ? t('admin.dataIngest.button.refreshing', { defaultValue: 'Refreshing…' })
      : t('admin.dataIngest.button.refresh', { defaultValue: 'Refresh prices now' });
  return (
    <button type="button" onClick={onStart} disabled={busy} className="btn-primary inline-flex items-center gap-2 disabled:opacity-60">
      {busy ? <Spinner className="text-cream" /> : REFRESH_ICON}
      {label}
    </button>
  );
}
