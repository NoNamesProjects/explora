const DOTS = '…';

/** Visible page list with ellipses, e.g. [1,2,3,4,5,'…',32] near the start. */
function paginationRange(current: number, total: number, siblings = 1): (number | string)[] {
  const totalNumbers = siblings * 2 + 5; // first + last + current + 2·siblings + 2 dots
  if (total <= totalNumbers) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, total);
  const showLeftDots = left > 2;
  const showRightDots = right < total - 1;
  const edgeCount = 3 + siblings * 2;

  if (!showLeftDots && showRightDots) {
    return [...Array.from({ length: edgeCount }, (_, i) => i + 1), DOTS, total];
  }
  if (showLeftDots && !showRightDots) {
    const start = total - edgeCount + 1;
    return [1, DOTS, ...Array.from({ length: edgeCount }, (_, i) => start + i)];
  }
  return [1, DOTS, ...Array.from({ length: right - left + 1 }, (_, i) => left + i), DOTS, total];
}

type Tone = 'ink' | 'cream';

const TONES: Record<Tone, { idle: string; active: string; dots: string; disabledHover: string }> = {
  ink: {
    idle: 'border-cream-300/70 text-ink hover:border-ink',
    active: 'bg-ink text-cream border-ink font-medium',
    dots: 'text-ink-600',
    // Full literal (not assembled) so Tailwind's JIT emits the class.
    disabledHover: 'disabled:hover:border-cream-300/70',
  },
  cream: {
    idle: 'border-cream/30 text-cream hover:border-cream',
    active: 'bg-cream text-ink border-cream font-medium',
    dots: 'text-cream/55',
    disabledHover: 'disabled:hover:border-cream/30',
  },
};

export interface JourneyPaginationProps {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
  label: string;
  prevLabel: string;
  nextLabel: string;
  tone?: Tone;
}

export function JourneyPagination({
  page, totalPages, onChange, label, prevLabel, nextLabel, tone = 'ink',
}: JourneyPaginationProps) {
  const t = TONES[tone];
  const cell = 'min-w-[2.75rem] h-11 inline-flex items-center justify-center px-2 text-sm border transition-colors';
  const chev = `${cell} ${t.idle} disabled:opacity-40 disabled:cursor-not-allowed ${t.disabledHover}`;
  return (
    <nav aria-label={label} className="mt-14 md:mt-16 flex flex-wrap items-center justify-center gap-2">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label={prevLabel} className={chev}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {paginationRange(page, totalPages, 1).map((p, i) =>
        typeof p === 'string' ? (
          <span key={`dots-${i}`} className={`min-w-[2.75rem] h-11 inline-flex items-center justify-center ${t.dots} select-none`}>{p}</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={[cell, p === page ? t.active : t.idle].join(' ')}
          >
            {p}
          </button>
        ),
      )}

      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label={nextLabel} className={chev}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </nav>
  );
}
