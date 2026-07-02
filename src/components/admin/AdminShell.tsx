import { Outlet, useLocation } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import { AdminErrorBoundary } from './AdminErrorBoundary';

/** The authed console frame: navy sidebar + sticky topbar + content outlet. */
export function AdminShell() {
  const location = useLocation();
  return (
    <div className="flex min-h-screen bg-cream text-ink">
      <AdminSidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AdminTopbar />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-5 py-6 md:px-8">
          <AdminErrorBoundary key={location.pathname}>
            <Outlet />
          </AdminErrorBoundary>
        </main>
      </div>
    </div>
  );
}
