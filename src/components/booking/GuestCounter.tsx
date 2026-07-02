import { useTranslation } from 'react-i18next';

/**
 * A single occupancy row with a − / value / + stepper (Adults · Children ·
 * Infants), in the Explora brand. `canIncrease` lets the parent enforce a
 * combined total cap on top of the per-category `max`.
 */
export function GuestCounter({
  label,
  ageRange,
  value,
  min,
  max,
  canIncrease = true,
  onChange,
}: {
  label: string;
  ageRange: string;
  value: number;
  min: number;
  max: number;
  canIncrease?: boolean;
  onChange: (value: number) => void;
}) {
  const { t } = useTranslation();
  const btn =
    'w-10 h-10 inline-flex items-center justify-center text-ink text-xl leading-none transition-colors ' +
    'hover:bg-cream-200 disabled:opacity-30 disabled:cursor-not-allowed ' +
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink';
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-cream-300/50 last:border-0">
      <div>
        <div className="text-ink">{label}</div>
        <div className="text-xs text-ink-600 mt-0.5">{ageRange}</div>
      </div>
      <div className="flex items-center bg-cream border border-cream-300/70">
        <button type="button" className={btn} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} aria-label={t('booking.counter.decrease', { label, defaultValue: 'Decrease {{label}}' })}>
          −
        </button>
        <span className="w-10 text-center text-ink tabular-nums" aria-live="polite">{value}</span>
        <button type="button" className={btn} disabled={value >= max || !canIncrease} onClick={() => onChange(value + 1)} aria-label={t('booking.counter.increase', { label, defaultValue: 'Increase {{label}}' })}>
          +
        </button>
      </div>
    </div>
  );
}
