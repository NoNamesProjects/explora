import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * A rotating headline phrase. Supports either:
 *   - Legacy shape: { lead, highlight, tail } — one italic span (highlight),
 *     flanked by upright text. Kept for older callers.
 *   - V3 shape: { pre?, italic1, mid?, italic2?, post? } — TWO italic spans
 *     flanking an upright middle (matches the live brand campaign structure).
 *
 * Partner authors approved phrases in src/locales/{en,el}.json — this
 * component never hardcodes brand campaign copy.
 */
export type RotatingPhrase =
  | { lead: string; highlight?: string; tail?: string }
  | { pre?: string; italic1: string; mid?: string; italic2?: string; post?: string };

interface RotatingHeadlineProps {
  phrases: ReadonlyArray<RotatingPhrase>;
  intervalMs?: number;
  className?: string;
}

function Italic({ children }: { children: React.ReactNode }) {
  return <em className="font-serif italic font-normal">{children}</em>;
}

function renderPhrase(p: RotatingPhrase) {
  // V3 shape — two italic spans + upright middle
  if ('italic1' in p) {
    return (
      <>
        {p.pre ? <>{p.pre} </> : null}
        <Italic>{p.italic1}</Italic>
        {p.mid ? <> {p.mid}</> : null}
        {p.italic2 ? <> <Italic>{p.italic2}</Italic></> : null}
        {p.post ? <> {p.post}</> : null}
      </>
    );
  }
  // Legacy shape — single italic span (highlight)
  return (
    <>
      {p.lead}
      {p.highlight ? <> <Italic>{p.highlight}</Italic></> : null}
      {p.tail ? <> {p.tail}</> : null}
    </>
  );
}

export function RotatingHeadline({
  phrases,
  intervalMs = 5200,
  className = '',
}: RotatingHeadlineProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (phrases.length <= 1) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % phrases.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [phrases.length, intervalMs]);

  const current = phrases[index];
  if (!current) return null;

  return (
    <h1
      className={`font-serif text-hero-2xl font-medium text-balance ${className}`}
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="block"
        >
          {renderPhrase(current)}
        </motion.span>
      </AnimatePresence>
    </h1>
  );
}
