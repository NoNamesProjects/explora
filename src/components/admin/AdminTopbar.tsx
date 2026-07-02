import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { NAV_ITEMS } from './navItems';

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';
}

/** Segmented EN｜ΕΛ toggle — flips the whole console (and the public site) locale. */
function LangToggle() {
  const { i18n } = useTranslation();
  const active = i18n.language?.startsWith('el') ? 'el' : 'en';
  return (
    <div className="flex items-center rounded-full border border-cream-300 p-0.5 text-[0.7rem] font-medium">
      {(['en', 'el'] as const).map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => { if (active !== lng) void i18n.changeLanguage(lng); }}
          aria-pressed={active === lng}
          className={`rounded-full px-2.5 py-1 uppercase tracking-ui transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
            active === lng ? 'bg-ink text-cream' : 'text-ink-500 hover:text-ink'
          }`}
        >
          {lng === 'en' ? 'EN' : 'ΕΛ'}
        </button>
      ))}
    </div>
  );
}

export function AdminTopbar() {
  const { t } = useTranslation();
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
            className="rounded p-1.5 text-ink-500 hover:bg-cream-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink lg:hidden"
            aria-label={t('admin.chrome.toggleMenu', { defaultValue: 'Toggle menu' })}
            aria-expanded={mobileOpen}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
          </button>
          <span className="font-serif text-base text-ink lg:hidden">{t('admin.chrome.opsTitle', { defaultValue: 'Explora Ops' })}</span>
        </div>

        <div className="flex items-center gap-3">
          <LangToggle />
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
                  {t(`admin.chrome.role_${user.role}`, { defaultValue: user.role })}
                </span>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="rounded border border-cream-300 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            {t('admin.chrome.signOut', { defaultValue: 'Sign out' })}
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
              <span>{t(item.label)}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
