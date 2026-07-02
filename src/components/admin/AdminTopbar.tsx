import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { NAV_ITEMS } from './navItems';

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';
}

export function AdminTopbar() {
  const { user, isAdmin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = NAV_ITEMS.filter((i) => !i.adminOnly || isAdmin);

  const onLogout = async () => { await logout(); navigate('/admin/login', { replace: true }); };

  return (
    <header className="sticky top-0 z-30 border-b border-cream-300 bg-cream-soft/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-4 px-5 md:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="rounded p-1.5 text-ink-500 hover:bg-cream-200 lg:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
          </button>
          <span className="font-serif text-base text-ink lg:hidden">Explora Ops</span>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-medium text-cream">
                {initials(user.name)}
              </span>
              <div className="hidden text-right sm:block">
                <div className="text-xs font-medium text-ink">{user.name}</div>
                <span
                  className={`text-[0.65rem] uppercase tracking-eyebrow ${user.role === 'admin' ? 'text-accent-tan' : 'text-ink-500'}`}
                >
                  {user.role}
                </span>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="rounded border border-cream-300 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream-200"
          >
            Sign out
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="flex flex-col gap-0.5 border-t border-cream-300 px-3 py-2 lg:hidden">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded px-3 py-2.5 text-sm ${isActive ? 'bg-cream-200 text-ink' : 'text-ink-600 hover:bg-cream-100'}`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
