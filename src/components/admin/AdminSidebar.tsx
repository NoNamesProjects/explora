import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { NAV_ITEMS } from './navItems';

export function AdminSidebar() {
  const { t } = useTranslation();
  const { isAdmin } = useAdminAuth();
  const items = NAV_ITEMS.filter((i) => !i.adminOnly || isAdmin);
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-ink-900 text-cream/75 lg:flex">
      <div className="px-6 py-5">
        <div className="font-serif text-lg leading-none text-cream">Explora</div>
        <div className="mt-1 text-eyebrow uppercase tracking-eyebrow text-cream/45">{t('admin.chrome.operations', { defaultValue: 'Operations' })}</div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-r border-l-2 px-4 py-2.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-gold ${
                isActive
                  ? 'border-accent-gold bg-white/5 text-cream'
                  : 'border-transparent text-cream/70 hover:bg-white/5 hover:text-cream'
              }`
            }
          >
            {item.icon}
            <span>{t(item.label)}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
