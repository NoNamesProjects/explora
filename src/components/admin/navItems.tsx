import type { ReactNode } from 'react';

export interface NavItem {
  to: string;
  /** i18n key (admin.nav.*), resolved with t() where the item is rendered. */
  label: string;
  end?: boolean;
  adminOnly?: boolean;
  icon: ReactNode;
}

const I = (d: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d.split('|').map((p, i) => <path key={i} d={p} />)}
  </svg>
);

export const NAV_ITEMS: NavItem[] = [
  { to: '/admin', end: true, label: 'admin.nav.overview', icon: I('M3 12l9-9 9 9|M5 10v10h14V10') },
  { to: '/admin/clients', label: 'admin.nav.clients', icon: I('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2|M9 7a4 4 0 1 0 0 .01|M22 21v-2a4 4 0 0 0-3-3.87') },
  { to: '/admin/catalog', label: 'admin.nav.catalog', icon: I('M4 19.5A2.5 2.5 0 0 1 6.5 17H20|M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z') },
  { to: '/admin/packages', label: 'admin.nav.packages', adminOnly: true, icon: I('M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z|M3.27 6.96 12 12.01l8.73-5.05|M12 22.08V12') },
  { to: '/admin/insights', label: 'admin.nav.insights', icon: I('M3 3v18h18|M7 14l3-3 3 3 4-5') },
  { to: '/admin/pages', label: 'admin.nav.pages', adminOnly: true, icon: I('M3 3h18v6H3z|M3 13h8v8H3z|M15 13h6v8h-6z') },
  { to: '/admin/entities', label: 'admin.nav.entities', adminOnly: true, icon: I('M2 20h20|M4 20V9l8-5 8 5v11|M9 20v-6h6v6') },
  { to: '/admin/content', label: 'admin.nav.content', adminOnly: true, icon: I('M12 20h9|M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z') },
  { to: '/admin/media', label: 'admin.nav.media', adminOnly: true, icon: I('M3 5h18v14H3z|M3 15l5-5 4 4 3-3 6 6') },
  { to: '/admin/subscribers', label: 'admin.nav.subscribers', adminOnly: true, icon: I('M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z|M22 6l-10 7L2 6') },
  { to: '/admin/data', label: 'admin.nav.dataIngest', adminOnly: true, icon: I('M23 4v6h-6|M1 20v-6h6|M3.51 9a9 9 0 0 1 14.85-3.36L23 10|M1 14l4.64 4.36A9 9 0 0 0 20.49 15') },
  { to: '/admin/users', label: 'admin.nav.users', adminOnly: true, icon: I('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|M9 7a4 4 0 1 0 0 .01|M23 21v-2a4 4 0 0 0-3-3.87|M16 3.13a4 4 0 0 1 0 7.75') },
];
