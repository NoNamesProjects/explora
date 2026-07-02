import type { ReactNode } from 'react';

/** Sticky filter bar wrapper: controls on the left, count/actions on the right. */
export function Toolbar({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-cream-300 bg-cream-soft px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

export function SearchInput({
  value, onChange, placeholder = 'Search…', ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel ?? (typeof placeholder === 'string' ? placeholder.replace(/…$/, '') : 'Search')}
      className="h-9 w-56 rounded border border-cream-300 bg-white px-3 text-sm text-ink placeholder:text-ink-400
                 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
    />
  );
}

export function SelectInput({
  value, onChange, options, ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  ariaLabel?: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded border border-cream-300 bg-white px-2.5 text-sm text-ink focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
