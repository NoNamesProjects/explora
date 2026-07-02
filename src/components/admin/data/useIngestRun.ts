import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api';
import { adminApi } from '@/lib/admin/api';
import type { IngestRun } from '@/lib/admin/types';

export type IngestPhase = 'idle' | 'starting' | 'running' | 'env-missing';
type Outcome = { tone: 'success' | 'error' | 'info'; message: string };

const POLL_MS = 2500;
const POLL_CAP_MS = 5 * 60_000;

export function useIngestRun(onOutcome?: (o: Outcome) => void) {
  const [run, setRun] = useState<IngestRun | null>(null);
  const [phase, setPhase] = useState<IngestPhase>('idle');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [history, setHistory] = useState<IngestRun[]>([]);
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef(0);

  // Callers pass inline callbacks; a ref keeps tick/beginPolling identity
  // stable so the init effect runs once, not on every render.
  const outcomeRef = useRef(onOutcome);
  useEffect(() => { outcomeRef.current = onOutcome; });

  const stop = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  }, []);

  const refreshHistory = useCallback(() => {
    adminApi.ingest.history(25).then((r) => setHistory(r.runs)).catch(() => {}).finally(() => setLoadingHistory(false));
  }, []);

  const tick = useCallback(async () => {
    try {
      const { run } = await adminApi.ingest.status();
      setRun(run);
      if (run?.status === 'running' && Date.now() - startedAt.current < POLL_CAP_MS) {
        setPhase('running');
        return;
      }
      stop();
      inFlight.current = false;
      setPhase('idle');
      refreshHistory();
      if (run?.status === 'ok') {
        outcomeRef.current?.({ tone: 'success', message: `Refreshed · ${run.journeyCount} journeys, ${run.fareCount} fares.` });
      } else if (run?.status === 'aborted') {
        outcomeRef.current?.({ tone: 'info', message: `Aborted (safety guard): ${run.notes ?? 'no writes applied.'}` });
      } else if (run?.status === 'failed') {
        outcomeRef.current?.({ tone: 'error', message: `Refresh failed: ${run.notes ?? 'see logs.'}` });
      }
    } catch { /* transient; keep polling */ }
  }, [refreshHistory, stop]);

  const beginPolling = useCallback(() => {
    stop();
    startedAt.current = Date.now();
    timer.current = setInterval(tick, POLL_MS);
  }, [stop, tick]);

  // Initial load: latest run + history; resume polling if one is already running.
  useEffect(() => {
    let alive = true;
    adminApi.ingest.status().then(({ run }) => {
      if (!alive) return;
      setRun(run);
      if (run?.status === 'running') { inFlight.current = true; setPhase('running'); beginPolling(); }
    }).catch(() => {});
    refreshHistory();
    return () => { alive = false; stop(); };
  }, [beginPolling, refreshHistory, stop]);

  const start = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPhase('starting');
    try {
      const r = await adminApi.ingest.run();
      if (r.mode === 'sync') {
        // Vercel path returned the finished result synchronously.
        await tick();
      } else {
        setPhase('running');
        beginPolling();
      }
    } catch (e) {
      inFlight.current = false;
      if (e instanceof ApiError && e.status === 409) { setPhase('running'); beginPolling(); inFlight.current = true; return; }
      if (e instanceof ApiError && e.status === 503) { setPhase('env-missing'); return; }
      setPhase('idle');
      outcomeRef.current?.({ tone: 'error', message: e instanceof ApiError ? `Could not start: ${e.message}` : 'Could not start the refresh.' });
    }
  }, [beginPolling, tick]);

  const busy = phase === 'starting' || phase === 'running';
  return { run, phase, busy, history, loadingHistory, start };
}
