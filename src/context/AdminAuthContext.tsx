import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { adminApi, ADMIN_UNAUTHORIZED } from '@/lib/admin/api';
import type { AdminUser } from '@/lib/admin/types';

type Status = 'loading' | 'authed' | 'anon';

interface AdminAuthValue {
  user: AdminUser | null;
  status: Status;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AdminAuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    let alive = true;
    adminApi.auth
      .me()
      .then((r) => { if (alive) { setUser(r.user); setStatus('authed'); } })
      .catch(() => { if (alive) { setUser(null); setStatus('anon'); } });
    return () => { alive = false; };
  }, []);

  // Any admin fetch that 401s anywhere flips us to anon → RequireAuth redirects.
  useEffect(() => {
    const onUnauthorized = () => { setUser(null); setStatus('anon'); };
    window.addEventListener(ADMIN_UNAUTHORIZED, onUnauthorized);
    return () => window.removeEventListener(ADMIN_UNAUTHORIZED, onUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await adminApi.auth.login(email, password);
    setUser(r.user);
    setStatus('authed');
  }, []);

  const logout = useCallback(async () => {
    try { await adminApi.auth.logout(); } catch { /* ignore */ }
    setUser(null);
    setStatus('anon');
  }, []);

  return (
    <Ctx.Provider value={{ user, status, isAdmin: user?.role === 'admin', login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAdminAuth(): AdminAuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return v;
}
