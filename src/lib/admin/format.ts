// Small, locale-fixed formatters for the (English-only) admin console.

const EUR = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export function money(value: number | null | undefined, currency = 'EUR'): string {
  if (value == null) return '—';
  if (currency === 'EUR') return EUR.format(value);
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

export function dateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const s = Math.round((Date.now() - then) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
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
