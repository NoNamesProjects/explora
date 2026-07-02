import { useEffect, useState } from 'react';
import * as Slider from '@radix-ui/react-slider';

interface RangeSliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  /** Current committed range, [low, high]. */
  value: [number, number];
  /** Fired on release (Radix onValueCommit) — write to the URL here, not on every drag tick. */
  onCommit: (value: [number, number]) => void;
  /** Format a value for the live label (e.g. €, nights). */
  format?: (v: number) => string;
}

/**
 * Brand-styled dual-thumb range slider (Radix). The label updates live while
 * dragging; the committed value (and any URL write) only fires on release, so
 * dragging never spams the API.
 */
export function RangeSlider({ label, min, max, step = 1, value, onCommit, format = String }: RangeSliderProps) {
  const [local, setLocal] = useState<[number, number]>(value);

  // Resync when the committed value changes externally (reset, facets load).
  useEffect(() => { setLocal(value); }, [value[0], value[1]]);

  const thumb =
    'block w-4 h-4 bg-accent-gold rounded-full shadow-md ring-1 ring-ink/10 transition-transform ' +
    'hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold/60 cursor-grab active:cursor-grabbing';

  return (
    <div className="bg-cream border border-cream-300/70 px-3 py-2">
      <div className="flex items-baseline justify-between mb-2.5 gap-2">
        <span className="text-[0.6rem] uppercase tracking-[0.16em] text-ink-600">{label}</span>
        <span className="text-xs text-ink tabular-nums">{format(local[0])} – {format(local[1])}</span>
      </div>
      <Slider.Root
        className="relative flex items-center select-none touch-none w-full h-4"
        value={local}
        min={min}
        max={max}
        step={step}
        minStepsBetweenThumbs={1}
        onValueChange={(v) => setLocal([v[0], v[1]])}
        onValueCommit={(v) => onCommit([v[0], v[1]])}
        aria-label={label}
      >
        <Slider.Track className="relative grow h-[3px] bg-cream-300 rounded-full">
          <Slider.Range className="absolute h-full bg-ink rounded-full" />
        </Slider.Track>
        <Slider.Thumb className={thumb} aria-label={`${label} minimum`} />
        <Slider.Thumb className={thumb} aria-label={`${label} maximum`} />
      </Slider.Root>
    </div>
  );
}
