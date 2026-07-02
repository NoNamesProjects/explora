import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface RegionSubNavLink {
  id: string;
  label: string;
}

export interface RegionSubNavProps {
  /**
   * The four section anchors, in order. Defaults to the localized originals so
   * the page can drop the component in without wiring; pass custom labels
   * (ids must stay #overview/#sailings/#ashore/#ports) to override.
   */
  links?: ReadonlyArray<RegionSubNavLink>;
  /** Accessible name for the nav landmark. */
  ariaLabel?: string;
}

/**
 * Sticky scroll-spy sub-nav for the destination region page. Pins beneath the
 * auto-hiding site Header: its `top` switches between var(--header-height)
 * (header visible) and 0 (header hidden) so the bar tucks flush to the top with
 * no gap — mirroring JourneySubNav / the site Header's hide behaviour.
 *
 * The active link is tracked with an IntersectionObserver over the four section
 * ids and styled with the gold accent + an underline. Clicking smooth-scrolls
 * to the section, offsetting for the header + this bar's measured height.
 */
export function RegionSubNav({
  links,
  ariaLabel,
}: RegionSubNavProps) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [headerHidden, setHeaderHidden] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const resolvedLinks: ReadonlyArray<RegionSubNavLink> = links ?? [
    { id: 'overview', label: t('destination.subnav.overview', { defaultValue: 'Overview' }) },
    { id: 'sailings', label: t('destination.subnav.sailings', { defaultValue: 'Sailings' }) },
    { id: 'ashore', label: t('destination.subnav.ashore', { defaultValue: 'Ashore' }) },
    { id: 'ports', label: t('destination.subnav.ports', { defaultValue: 'Ports' }) },
  ];
  const resolvedAriaLabel =
    ariaLabel ?? t('destination.subnav.ariaLabel', { defaultValue: 'Region sections' });

  // Mirror the site Header's auto-hide: when the user scrolls down the header
  // slides away, so this bar pins flush at the very top (top:0); on scroll-up
  // it tucks back under the header (top:var(--header-height)).
  useEffect(() => {
    let ticking = false;
    let lastY = window.scrollY;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setHeaderHidden(y > lastY && y > 120);
        lastY = y;
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Track which section is currently in view for the active accent + underline.
  useEffect(() => {
    const elements = resolvedLinks
      .map((l) => document.getElementById(l.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const inView = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (inView[0]) setActiveId(inView[0].target.id);
      },
      { rootMargin: '-30% 0px -50% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedLinks.map((l) => l.id).join(',')]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    // 80 = fixed site header fallback; + this sticky bar's measured height so
    // the target heading never hides beneath the pinned bar.
    const offset = 80 + (wrapperRef.current?.offsetHeight ?? 56);
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
    setActiveId(id);
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    scrollToSection(id);
  };

  return (
    <div
      ref={wrapperRef}
      className="sticky z-30 transition-[top] duration-500 ease-out-soft"
      style={{ top: headerHidden ? 0 : 'var(--header-height, 80px)' }}
    >
      <div className="bg-cream/96 backdrop-blur-md border-b border-cream-300/60">
        <nav className="container" aria-label={resolvedAriaLabel}>
          <div className="flex items-center gap-6 md:gap-9 lg:gap-12 overflow-x-auto py-4 [&::-webkit-scrollbar]:hidden">
            {resolvedLinks.map((l) => {
              const active = activeId === l.id;
              return (
                <a
                  key={l.id}
                  href={`#${l.id}`}
                  onClick={(e) => handleClick(e, l.id)}
                  aria-current={active ? 'true' : undefined}
                  className={[
                    'whitespace-nowrap text-[0.7rem] uppercase tracking-[0.16em] font-medium',
                    'transition-colors duration-300 rounded-sm',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream',
                    active
                      ? 'text-accent-gold relative after:absolute after:left-0 after:right-0 after:-bottom-[18px] after:h-px after:bg-accent-gold'
                      : 'text-ink-600 hover:text-ink',
                  ].join(' ')}
                >
                  {l.label}
                </a>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
