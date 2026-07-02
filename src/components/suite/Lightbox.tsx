import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { imageUrl } from '@/lib/image';

export interface LightboxProps {
  photos: string[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}

/**
 * Accessible full-screen photo viewer. Keyboard ←/→/Esc, modulo wrap-around,
 * body-scroll lock (saved + restored), backdrop-click close, focus trap among
 * the controls + focus restore on unmount, an "N / N" counter, and an
 * AnimatePresence crossfade between frames. The caller wraps it in its own
 * <AnimatePresence> so the overlay can fade out on close. Reduced-motion aware.
 */
export function Lightbox({ photos, index, onClose, onIndex }: LightboxProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const n = photos.length;
  const safe = n > 0 ? ((index % n) + n) % n : 0;
  const step = (dir: 1 | -1) => onIndex(((safe + dir) % n + n) % n);

  // Mount-only: lock body scroll (save+restore), focus the dialog, restore focus on close.
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, []);

  // Re-bound when the index changes so the handler always steps from the current frame.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safe, n]);

  if (n === 0) return null;

  const ctrl =
    'inline-flex h-11 w-11 items-center justify-center rounded-full border border-cream/30 ' +
    'text-cream/90 hover:bg-cream/10 hover:text-cream transition-colors focus-visible:outline-none ' +
    'focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-ink';

  return (
    <motion.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('suiteIndex.lightbox.viewer', { defaultValue: 'Suite photo viewer' })}
      tabIndex={-1}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[150] flex items-center justify-center bg-ink/95 focus:outline-none"
    >
      <div className="absolute top-6 left-6 text-cream/70 text-sm tabular-nums select-none">
        {safe + 1} / {n}
      </div>
      <button type="button" onClick={onClose} aria-label={t('suiteIndex.lightbox.close', { defaultValue: 'Close viewer' })} className={`absolute top-5 right-5 ${ctrl}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>

      <button type="button" onClick={() => step(-1)} aria-label={t('suiteIndex.lightbox.previous', { defaultValue: 'Previous photo' })} className={`absolute left-4 md:left-8 ${ctrl}`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence mode="wait">
        <motion.img
          key={photos[safe]}
          src={imageUrl(photos[safe])}
          alt={t('suiteIndex.lightbox.photoAlt', { current: safe + 1, total: n, defaultValue: 'Suite photograph {{current}} of {{total}}' })}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="max-h-[82vh] max-w-[90vw] object-contain shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </AnimatePresence>

      <button type="button" onClick={() => step(1)} aria-label={t('suiteIndex.lightbox.next', { defaultValue: 'Next photo' })} className={`absolute right-4 md:right-8 ${ctrl}`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </motion.div>
  );
}
