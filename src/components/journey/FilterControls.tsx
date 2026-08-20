import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

/**
 * Brand-styled filter controls for the Find-a-Journey bar — custom popovers that
 * replace native <select> (no OS chrome). A generic listbox (FilterSelect) and a
 * year-grouped month grid (MonthPicker), both built on a shared Dropdown shell
 * with outside-click / Escape close, fade-scale animation, and arrow-key roving.
 */

// ── Icons (18px line) ───────────────────────────────────────────────────────
const ic = 'h-[18px] w-[18px] shrink-0';
const S = { fill: 'none' as const, stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const PinIcon = () => (
  <svg viewBox="0 0 24 24" className={ic} {...S}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="2.6" /></svg>
);
export const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" className={ic} {...S}><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" /></svg>
);
export const AnchorIcon = () => (
  <svg viewBox="0 0 24 24" className={ic} {...S}><circle cx="12" cy="5" r="2" /><path d="M12 7v13M5 13a7 7 0 0 0 14 0M4.5 13H7M17 13h2.5" /></svg>
);
export const ShipIcon = () => (
  <svg viewBox="0 0 24 24" className={ic} {...S}><path d="M3 14l9-3 9 3-2.2 6.2a2 2 0 0 1-1.9 1.3H7.1a2 2 0 0 1-1.9-1.3L3 14Z" /><path d="M12 11V4M8 7h8" /></svg>
);
export const SortIcon = () => (
  <svg viewBox="0 0 24 24" className={ic} {...S}><path d="M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3" /></svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-accent-gold" {...S}><path d="m5 12 4.5 4.5L19 7" /></svg>
);
const Chevron = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 20 20" className={['h-4 w-4 shrink-0 text-ink-500 transition-transform duration-200 ease-out-soft', open ? 'rotate-180' : ''].join(' ')} {...S}>
    <path d="M5 7.5 10 12.5 15 7.5" />
  </svg>
);

export interface Option { value: string; label: string }

// ── Shared shell ─────────────────────────────────────────────────────────────
function Dropdown({
  label, icon, displayValue, active, align = 'stretch', panelWidth, className = '', children,
}: {
  label: string;
  icon: ReactNode;
  displayValue: string;
  active: boolean;
  align?: 'stretch' | 'left';
  panelWidth?: string;
  className?: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const closeAndFocus = () => { setOpen(false); triggerRef.current?.focus(); };

  // Outside-click + Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAndFocus(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  // Focus the selected (or first) option when the panel opens.
  useEffect(() => {
    if (!open) return;
    const els = Array.from(panelRef.current?.querySelectorAll<HTMLButtonElement>('[data-opt]') ?? []);
    (els.find((e) => e.dataset.selected === 'true') ?? els[0])?.focus();
  }, [open]);

  // Arrow-key roving across option buttons.
  const onPanelKey = (e: ReactKeyboardEvent) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const els = Array.from(panelRef.current?.querySelectorAll<HTMLButtonElement>('[data-opt]') ?? []);
    if (!els.length) return;
    e.preventDefault();
    const i = els.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === 'ArrowDown' ? Math.min(i + 1, els.length - 1)
      : e.key === 'ArrowUp' ? Math.max(i - 1, 0)
      : e.key === 'Home' ? 0 : els.length - 1;
    els[next]?.focus();
  };

  return (
    <div ref={rootRef} className={['relative', open ? 'z-30' : 'z-10'].join(' ')}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={[
          'group w-full flex items-center gap-2.5 text-left bg-cream px-3.5 py-2.5 border transition-all duration-200 ease-out-soft',
          open ? 'border-ink shadow-sm' : active ? 'border-ink/45' : 'border-cream-300/70 hover:border-ink/40',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mist focus-visible:ring-offset-1 focus-visible:ring-offset-cream',
          className,
        ].join(' ')}
      >
        <span className={['transition-colors', open || active ? 'text-accent-goldText' : 'text-ink-500 group-hover:text-ink'].join(' ')}>
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="text-[0.58rem] uppercase tracking-[0.18em] text-ink-500">{label}</span>
            {active && <span className="h-1 w-1 rounded-full bg-accent-gold" aria-hidden />}
          </span>
          <span className={['block text-sm truncate mt-0.5', active ? 'text-ink font-medium' : 'text-ink-600'].join(' ')}>
            {displayValue}
          </span>
        </span>
        <Chevron open={open} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            onKeyDown={onPanelKey}
            initial={{ opacity: 0, y: -6, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.985 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: 'top' }}
            role="dialog"
            aria-label={label}
            className={[
              'absolute top-full mt-2 bg-cream border border-ink/12 shadow-xl rounded-card overflow-hidden',
              align === 'left' ? 'left-0' : 'left-0 right-0',
              panelWidth ?? '',
            ].join(' ')}
          >
            {children(closeAndFocus)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Listbox select (destination / port / ship / sort) ────────────────────────
export function FilterSelect({
  label, icon, value, options, onChange, className,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  className?: string;
}) {
  const neutral = options[0]?.value ?? '';
  const active = value !== neutral;
  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <Dropdown label={label} icon={icon} displayValue={selected?.label ?? ''} active={active} className={className}>
      {(close) => (
        <ul role="listbox" aria-label={label} className="max-h-[18rem] overflow-auto py-1.5">
          {options.map((o) => {
            const isSel = o.value === value;
            return (
              <li key={o.value} role="option" aria-selected={isSel}>
                <button
                  data-opt
                  data-selected={isSel}
                  type="button"
                  onClick={() => { onChange(o.value); close(); }}
                  className={[
                    'w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-left transition-colors',
                    'focus-visible:outline-none focus-visible:bg-cream-200',
                    isSel ? 'text-ink font-medium bg-cream-200/60' : 'text-ink-600 hover:bg-cream-200/70 hover:text-ink',
                  ].join(' ')}
                >
                  <span className="truncate">{o.label}</span>
                  {isSel && <CheckIcon />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Dropdown>
  );
}

// ── Month grid picker ────────────────────────────────────────────────────────
interface MonthItem { value: string; year: number; short: string; long: string }

function buildMonths(count: number, locale: string | undefined): MonthItem[] {
  const out: MonthItem[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    out.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      year: d.getFullYear(),
      short: d.toLocaleDateString(locale, { month: 'short' }),
      long: d.toLocaleDateString(locale, { month: 'long' }),
    });
  }
  return out;
}

export function MonthPicker({
  label, value, onChange, count = 18, className, anyLabel = 'Any month', availableMonths,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  count?: number;
  className?: string;
  anyLabel?: string;
  /** When provided, months not in this set are shown disabled (faceted narrowing). */
  availableMonths?: string[];
}) {
  const { t, i18n } = useTranslation();
  const items = buildMonths(count, i18n.language);
  const allowed = availableMonths ? new Set(availableMonths) : null;
  const active = value !== '';
  const selected = items.find((m) => m.value === value);
  const display = selected ? `${selected.long} ${selected.year}` : anyLabel;

  // Preserve chronological year order.
  const years: number[] = [];
  for (const m of items) if (!years.includes(m.year)) years.push(m.year);

  return (
    <Dropdown label={label} icon={<CalendarIcon />} displayValue={display} active={active} align="left" panelWidth="w-[min(20rem,86vw)]" className={className}>
      {(close) => (
        <div className="p-3">
          <button
            data-opt
            data-selected={value === ''}
            type="button"
            onClick={() => { onChange(''); close(); }}
            className={[
              'w-full text-left px-3 py-2 text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mist',
              value === '' ? 'border-ink bg-ink text-cream' : 'border-cream-300/70 text-ink-600 hover:border-ink/40 hover:text-ink',
            ].join(' ')}
          >
            {anyLabel}
          </button>

          {years.map((year) => (
            <div key={year} className="mt-3">
              <div className="px-1 pb-1.5 text-[0.58rem] uppercase tracking-[0.18em] text-ink-500">{year}</div>
              <div className="grid grid-cols-3 gap-1.5">
                {items.filter((m) => m.year === year).map((m) => {
                  const isSel = m.value === value;
                  // Unavailable for the current selection (but keep the chosen one usable).
                  const disabled = allowed != null && !allowed.has(m.value) && !isSel;
                  return (
                    <button
                      key={m.value}
                      data-opt={disabled ? undefined : true}
                      data-selected={isSel}
                      type="button"
                      disabled={disabled}
                      aria-disabled={disabled}
                      title={disabled ? t('filters.month.unavailable', { defaultValue: 'No sailings for this selection' }) : undefined}
                      onClick={() => { if (!disabled) { onChange(m.value); close(); } }}
                      className={[
                        'px-2 py-2 text-sm text-center border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mist',
                        isSel ? 'border-ink bg-ink text-cream font-medium'
                          : disabled ? 'border-cream-300/40 text-ink-400/50 line-through cursor-not-allowed'
                          : 'border-cream-300/60 text-ink-600 hover:border-ink/50 hover:text-ink',
                      ].join(' ')}
                    >
                      {m.short}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Dropdown>
  );
}
