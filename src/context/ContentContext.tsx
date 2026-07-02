/**
 * Public content overlay provider. Fetches the sparse published-override bundle
 * once at boot and merges it over the code defaults (i18n copy → i18next;
 * structured data + media → the content store). Then polls a cheap version
 * endpoint on focus / route change so a client "Publish" shows up live with no
 * redeploy and no reload. Mirrors AdminAuthContext's boot-fetch shape.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import i18n, { applyI18nOverlay } from '@/i18n';
import { loadContentStores, getContentVersion } from '@/lib/content/store';
import type { ContentBundle } from '@/lib/content/types';

interface ContentValue {
  ready: boolean;
  version: number;
  refresh: () => void;
}

const Ctx = createContext<ContentValue>({ ready: true, version: 0, refresh: () => {} });

function applyBundle(bundle: ContentBundle): void {
  applyI18nOverlay(bundle.i18n);
  loadContentStores(bundle);
}

export function ContentProvider({ children }: { children: ReactNode }) {
  // If the server inlined window.__CONTENT__, i18n.ts already applied the copy
  // overlay synchronously; seed the data/media stores from it too → zero flash.
  const bootRef = useRef(false);
  if (!bootRef.current) {
    bootRef.current = true;
    const boot = (window as unknown as { __CONTENT__?: ContentBundle }).__CONTENT__;
    if (boot) loadContentStores(boot);
  }

  const [ready, setReady] = useState<boolean>(() => !!(window as unknown as { __CONTENT__?: unknown }).__CONTENT__);
  const [version, setVersion] = useState<number>(() => getContentVersion());
  const location = useLocation();

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/content', { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const bundle = (await res.json()) as ContentBundle & { ok?: boolean };
      if (bundle && bundle.ok !== false) {
        applyBundle(bundle);
        setVersion(bundle.version ?? 0);
      }
    } catch {
      /* keep defaults */
    } finally {
      setReady(true);
    }
  }, []);

  // Boot fetch (freshens the inlined snapshot; the sole load path on Vercel/static).
  useEffect(() => {
    void load();
  }, [load]);

  // Live invalidation: cheap version check on focus + route change.
  const checkVersion = useCallback(async () => {
    try {
      const res = await fetch('/api/content/version', { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const { version: v } = (await res.json()) as { version: number };
      if (typeof v === 'number' && v !== getContentVersion()) void load();
    } catch {
      /* ignore */
    }
  }, [load]);

  useEffect(() => {
    const onFocus = () => void checkVersion();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [checkVersion]);

  useEffect(() => {
    void checkVersion();
    // re-check whenever the route changes
  }, [location.pathname, checkVersion]);

  const refresh = useCallback(() => void load(), [load]);

  return <Ctx.Provider value={{ ready, version, refresh }}>{children}</Ctx.Provider>;
}

export function useContent(): ContentValue {
  return useContext(Ctx);
}

// re-export the i18n overlay applier so admin preview can reuse it if needed.
export { applyI18nOverlay, i18n };
