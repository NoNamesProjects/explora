import { useTranslation } from 'react-i18next';

const STEP_KEYS = [
  { key: 'booking.progress.guests', en: 'Guests' },
  { key: 'booking.progress.suite', en: 'Suite' },
  { key: 'booking.progress.details', en: 'Details' },
  { key: 'booking.progress.review', en: 'Review' },
] as const;

/** Linear stepper. `current` is 1-based (1=Guests, 2=Suite, 3=Details, 4=Review; 5=done hides it). */
export function BookingProgress({ current }: { current: number }) {
  const { t } = useTranslation();
  return (
    <ol className="flex items-center gap-2 md:gap-3" aria-label={t('booking.progress.ariaLabel', { defaultValue: 'Booking steps' })}>
      {STEP_KEYS.map((step, i) => {
        const label = t(step.key, { defaultValue: step.en });
        const n = i + 1;
        const done = current > n;
        const active = current === n;
        return (
          <li key={step.key} className="flex items-center gap-2 md:gap-3">
            <span
              className={[
                'w-7 h-7 rounded-full inline-flex items-center justify-center text-xs transition-colors',
                done || active ? 'bg-ink text-cream' : 'bg-cream-300 text-ink-600',
              ].join(' ')}
            >
              {done ? '✓' : n}
            </span>
            <span className={['text-[0.65rem] uppercase tracking-[0.18em] hidden sm:inline', active ? 'text-ink' : 'text-ink-600'].join(' ')}>
              {label}
            </span>
            {n < STEP_KEYS.length && <span className="w-6 md:w-10 h-px bg-cream-300" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
