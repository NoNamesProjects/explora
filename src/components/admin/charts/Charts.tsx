import { useId } from 'react';
import { useTranslation } from 'react-i18next';

export interface Point { label: string; value: number }
export interface Slice { label: string; value: number; color: string }

function SrTable({ caption, rows }: { caption: string; rows: Array<[string, string | number]> }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <tbody>{rows.map(([k, v], i) => <tr key={i}><th scope="row">{k}</th><td>{v}</td></tr>)}</tbody>
    </table>
  );
}

/** Area line chart for a time series. */
export function LineChart({ points, height = 160, format = (n: number) => String(n) }: { points: Point[]; height?: number; format?: (n: number) => string }) {
  const { t } = useTranslation();
  const gid = useId();
  if (points.length === 0) return <p className="py-8 text-center text-sm text-ink-500">{t('admin.insights.charts.noDataWindow', { defaultValue: 'No data in this window.' })}</p>;
  const W = 600, H = height, pad = 8;
  const max = Math.max(1, ...points.map((p) => p.value));
  const stepX = points.length > 1 ? (W - pad * 2) / (points.length - 1) : 0;
  const x = (i: number) => pad + i * stepX;
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2);
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L ${x(points.length - 1).toFixed(1)} ${H - pad} L ${x(0).toFixed(1)} ${H - pad} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={t('admin.insights.charts.bookingsOverTime', { defaultValue: 'Bookings over time' })} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`g-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#96845E" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#96845E" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#g-${gid})`} />
        <path d={line} fill="none" stroke="#0C2340" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between text-[0.65rem] text-ink-400">
        <span>{points[0].label}</span>
        <span>{t('admin.insights.charts.peak', { defaultValue: 'peak' })} {format(max)}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
      <SrTable caption={t('admin.insights.charts.bookingsOverTime', { defaultValue: 'Bookings over time' })} rows={points.map((p) => [p.label, p.value])} />
    </div>
  );
}

/** Horizontal bars — good for labelled categories (top journeys). */
export function BarChart({ points, format = (n: number) => String(n) }: { points: Point[]; format?: (n: number) => string }) {
  const { t } = useTranslation();
  if (points.length === 0) return <p className="py-8 text-center text-sm text-ink-500">{t('admin.insights.charts.noData', { defaultValue: 'No data.' })}</p>;
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <div>
      <ul className="space-y-2">
        {points.map((p, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <span className="w-40 shrink-0 truncate text-ink-600" title={p.label}>{p.label}</span>
            <span className="relative h-5 flex-1 rounded bg-cream-200">
              <span className="absolute inset-y-0 left-0 rounded bg-accent-gold/70" style={{ width: `${(p.value / max) * 100}%` }} />
            </span>
            <span className="w-12 shrink-0 text-right tabular-nums text-ink">{format(p.value)}</span>
          </li>
        ))}
      </ul>
      <SrTable caption={t('admin.insights.charts.topCategories', { defaultValue: 'Top categories' })} rows={points.map((p) => [p.label, p.value])} />
    </div>
  );
}

/** Donut for a small distribution (booking status). */
export function Donut({ slices }: { slices: Slice[] }) {
  const { t } = useTranslation();
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <p className="py-8 text-center text-sm text-ink-500">{t('admin.insights.charts.noData', { defaultValue: 'No data.' })}</p>;
  const R = 60, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 160 160" className="h-36 w-36 -rotate-90" role="img" aria-label={t('admin.insights.charts.bookingStatusDistribution', { defaultValue: 'Booking status distribution' })}>
        <circle cx="80" cy="80" r={R} fill="none" stroke="#EDE9E4" strokeWidth="18" />
        {slices.map((s, i) => {
          const len = (s.value / total) * C;
          const el = (
            <circle key={i} cx="80" cy="80" r={R} fill="none" stroke={s.color} strokeWidth="18"
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />
          );
          offset += len;
          return el;
        })}
      </svg>
      <ul className="space-y-1.5 text-sm">
        {slices.map((s, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} aria-hidden />
            <span className="text-ink-600">{s.label}</span>
            <span className="ml-auto pl-4 tabular-nums text-ink">{s.value}</span>
          </li>
        ))}
      </ul>
      <SrTable caption={t('admin.insights.charts.bookingStatusDistribution', { defaultValue: 'Booking status distribution' })} rows={slices.map((s) => [s.label, s.value])} />
    </div>
  );
}
