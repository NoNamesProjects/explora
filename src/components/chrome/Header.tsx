import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from './Logo';
import { MegaMenu } from './MegaMenu';
import { UtilityNav } from './UtilityNav';
import { MobileNav } from './MobileNav';

/**
 * Always-cream sticky header. Auto-hides on scroll-down, returns on
 * scroll-up. Hero photography sits below the header (not behind it).
 */
export function Header() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  // On Find a Journey the header stays put so it + the sticky filter bar read as
  // one stable pinned region (no auto-hide gap above the bar).
  const pinned = pathname === '/find-your-journey';
  const [hidden, setHidden] = useState(false);
  const ref = useRef<HTMLElement>(null);

  // Publish the live header height so sticky elements below (the filter bar) can
  // pin flush at its bottom via top-[var(--header-height)] at any breakpoint.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const publish = () => document.documentElement.style.setProperty('--header-height', `${el.offsetHeight}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const goingDown = y > lastY && y > 120;
        setHidden(goingDown);
        lastY = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      ref={ref}
      className={[
        'sticky top-0 z-40 transition-transform duration-500 ease-out-soft',
        hidden && !pinned ? '-translate-y-full' : 'translate-y-0',
        'bg-cream text-accent-gold border-b border-cream-300/60',
      ].join(' ')}
    >
      <div className="container flex items-center gap-6 lg:gap-10 py-4">
        {/* Left cluster */}
        <div className="flex items-center gap-6 lg:gap-8 shrink-0">
          <Logo />
          <Link
            to="/find-your-journey"
            className="hidden md:inline-flex items-center text-[0.7rem] uppercase tracking-[0.18em] font-medium text-accent-gold hover:text-ink transition-colors"
          >
            {t('nav.findAJourney')}
          </Link>
        </div>

        {/* Center — Destinations + Ships only. Find a Journey sits in the left
            cluster; the other panels (Experience, Offers, Collections, Why) are
            parked until those pages exist. */}
        <nav className="hidden lg:flex items-center justify-center flex-1">
          <MegaMenu triggerKeys={['nav.destinations', 'nav.ships']} />
        </nav>

        {/* Right cluster — utility + mobile menu */}
        <div className="ml-auto flex items-center gap-5 shrink-0">
          <UtilityNav />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
