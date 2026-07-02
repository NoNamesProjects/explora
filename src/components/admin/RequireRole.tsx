import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '@/context/AdminAuthContext';
import type { AdminRole } from '@/lib/admin/types';

/** Route-level role gate (server still enforces; this is UX). admin satisfies any role. */
export function RequireRole({ role }: { role: AdminRole }) {
  const { user } = useAdminAuth();
  const ok = user && (user.role === 'admin' || user.role === role);
  if (!ok) return <Navigate to="/admin" replace />;
  return <Outlet />;
}

/** Inline gate for actions/sections (e.g. hide the Refresh button for agents). */
export function RoleGate({ role, children }: { role: AdminRole; children: React.ReactNode }) {
  const { user } = useAdminAuth();
  const ok = user && (user.role === 'admin' || user.role === role);
  return ok ? <>{children}</> : null;
}
