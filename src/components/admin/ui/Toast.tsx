import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

type Tone = 'success' | 'error' | 'info';
interface Toast { id: number; tone: Tone; message: string }

interface ToastApi { push: (t: { tone: Tone; message: string }) => void }
const Ctx = createContext<ToastApi | null>(null);

const TONE: Record<Tone, string> = {
  success: 'border-accent-patina/40 bg-cream-soft text-ink',
  error: 'border-red-300 bg-cream-soft text-ink',
  info: 'border-accent-mist/40 bg-cream-soft text-ink',
};
const DOT: Record<Tone, string> = {
  success: 'bg-accent-patina',
  error: 'bg-red-500',
  info: 'bg-accent-mist',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const push = useCallback((t: { tone: Tone; message: string }) => {
    const id = ++seq.current;
    setToasts((prev) => [...prev, { id, ...t }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4500);
  }, []);

  // Stable identity: consumers keep `toast` in effect deps without refetching
  // whenever a toast appears or auto-dismisses.
  const api = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[min(24rem,92vw)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 rounded-card border px-4 py-3 text-sm shadow-2xl
                        motion-safe:animate-fade-up ${TONE[t.tone]}`}
          >
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[t.tone]}`} aria-hidden />
            <span className="leading-snug">{t.message}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast must be used within ToastProvider');
  return v;
}
