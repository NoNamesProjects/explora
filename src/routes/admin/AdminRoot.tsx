import { Route, Routes } from 'react-router-dom';
import { AdminAuthProvider } from '@/context/AdminAuthContext';
import { ToastProvider } from '@/components/admin/ui/Toast';
import { RequireAuth } from '@/components/admin/RequireAuth';
import { RequireRole } from '@/components/admin/RequireRole';
import { AdminShell } from '@/components/admin/AdminShell';
import { AdminLogin } from './AdminLogin';
import { Overview } from './Overview';
import { Clients } from './Clients';
import { Catalog } from './Catalog';
import { Insights } from './Insights';
import { DataIngest } from './DataIngest';
import { Users } from './Users';
import { Content } from './Content';
import { Pages } from './Pages';
import { Entities } from './Entities';
import { Media } from './Media';
import { Subscribers } from './Subscribers';
import { AdminNotFound } from './AdminNotFound';

/** The entire /admin/* area — one lazy chunk; the public bundle never imports it. */
export default function AdminRoot() {
  return (
    <AdminAuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="login" element={<AdminLogin />} />
          <Route element={<RequireAuth />}>
            <Route element={<AdminShell />}>
              <Route index element={<Overview />} />
              <Route path="clients" element={<Clients />} />
              <Route path="catalog" element={<Catalog />} />
              <Route path="insights" element={<Insights />} />
              <Route element={<RequireRole role="admin" />}>
                <Route path="pages" element={<Pages />} />
                <Route path="entities" element={<Entities />} />
                <Route path="content" element={<Content />} />
                <Route path="media" element={<Media />} />
                <Route path="subscribers" element={<Subscribers />} />
                <Route path="data" element={<DataIngest />} />
                <Route path="users" element={<Users />} />
              </Route>
              <Route path="*" element={<AdminNotFound />} />
            </Route>
          </Route>
        </Routes>
      </ToastProvider>
    </AdminAuthProvider>
  );
}
