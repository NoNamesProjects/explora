// Locale-aware formatters for the admin console. Dates/money follow the active
// i18next language; relative-time words come from the admin.common.* catalog.
// These are called during render, and react-i18next repaints on languageChanged,
// so each render re-formats in the current language.
import i18n from '@/i18n';

const numLocale = () => (i18n.language?.startsWith('el') ? 'el-GR' : 'en-IE');
const dateLocale = () => (i18n.language?.startsWith('el') ? 'el-GR' : 'en-GB');

export function money(value: number | null | undefined, currency = 'EUR'): string {
  if (value == null) return '—';
  return new Intl.NumberFormat(numLocale(), { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

export function dateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(dateLocale(), { day: '2-digit', month: 'short', year: 'numeric' });
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString(dateLocale(), { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return i18n.t('admin.common.never', { defaultValue: 'never' });
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const s = Math.round((Date.now() - then) / 1000);
  if (s < 60) return i18n.t('admin.common.justNow', { defaultValue: 'just now' });
  const m = Math.round(s / 60);
  if (m < 60) return i18n.t('admin.common.minutesAgo', { count: m, defaultValue: '{{count}}m ago' });
  const h = Math.round(m / 60);
  if (h < 24) return i18n.t('admin.common.hoursAgo', { count: h, defaultValue: '{{count}}h ago' });
  const d = Math.round(h / 24);
  if (d < 30) return i18n.t('admin.common.daysAgo', { count: d, defaultValue: '{{count}}d ago' });
  return dateShort(iso);
}

export function durationMs(ms: number | null | undefined): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

export function durationBetween(startIso: string, endIso: string | null): string {
  if (!endIso) return '—';
  return durationMs(new Date(endIso).getTime() - new Date(startIso).getTime());
}

export interface PartyGuest { type?: 'adult' | 'child' | 'infant' }
export function party(guests: PartyGuest[] | undefined, guestCount?: number): string {
  if (!guests || !guests.length) return guestCount ? `${guestCount}` : '—';
  const a = guests.filter((g) => (g.type ?? 'adult') === 'adult').length;
  const c = guests.filter((g) => g.type === 'child').length;
  const i = guests.filter((g) => g.type === 'infant').length;
  return [a && `${a}A`, c && `${c}C`, i && `${i}I`].filter(Boolean).join('·') || `${guests.length}`;
}
