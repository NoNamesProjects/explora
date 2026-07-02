import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { AdminBootSplash } from './AdminBootSplash';

/** Gate the authed admin subtree: splash while loading, redirect to login when anon. */
export function RequireAuth() {
  const { status } = useAdminAuth();
  const location = useLocation();
  if (status === 'loading') return <AdminBootSplash />;
  if (status === 'anon') return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
