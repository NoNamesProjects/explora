import { useTranslation } from 'react-i18next';
import { BOOKING_STATUS } from '@/lib/admin/status';
import { INGEST_STATUS } from '@/lib/admin/status';
import type { BookingStatus, IngestStatus } from '@/lib/admin/types';

export function StatusBadge({ kind, value }: { kind: 'booking' | 'ingest'; value: string }) {
  const { t } = useTranslation();
  const map = kind === 'booking' ? BOOKING_STATUS : INGEST_STATUS;
  const entry = (map as Record<string, { label: string; classes: string }>)[value] ?? {
    label: value,
    classes: 'bg-cream-300/60 text-ink-500 border-cream-400/60',
  };
  const pulse = kind === 'ingest' && value === 'running';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${entry.classes}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${pulse ? 'animate-pulse motion-reduce:animate-none' : ''}`} aria-hidden />
      {t(`admin.status.${kind}.${value}`, { defaultValue: entry.label })}
    </span>
  );
}

export type { BookingStatus, IngestStatus };
