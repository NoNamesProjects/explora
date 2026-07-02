import type { ReactNode } from 'react';

type Tone = 'neutral' | 'good' | 'warn' | 'bad';
const TONE: Record<Tone, string> = {
  neutral: 'text-ink',
  good: 'text-accent-patina',
  warn: 'text-accent-tan',
  bad: 'text-red-600',
};

export function StatCard({
  label, value, sub, tone = 'neutral', loading = false,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  loading?: boolean;
}) {
  return (
    <div className="rounded-card border border-cream-300 bg-cream-soft p-5">
      <div className="text-eyebrow uppercase tracking-eyebrow text-ink-500">{label}</div>
      {loading ? (
        <div className="mt-3 h-7 w-20 animate-pulse rounded bg-cream-300" />
      ) : (
        <div className={`mt-2 text-2xl font-medium tabular-nums ${TONE[tone]}`}>{value}</div>
      )}
      {sub && !loading && <div className="mt-1 text-xs text-ink-500">{sub}</div>}
    </div>
  );
}
