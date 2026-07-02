import { useEffect, useState } from 'react';

export interface SubNavSection {
  id: string;
  label: string;
}

interface StickySubNavProps {
  sections: ReadonlyArray<SubNavSection>;
}

/**
 * Thin sticky strip that pins below the main cream header once the user
 * scrolls past the hero. Click an anchor → smooth-scroll to that section.
 * Active section highlighted via IntersectionObserver.
 */
export function StickySubNav({ sections }: StickySubNavProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);

  // Reveal after the hero scrolls away. The bar is FIXED (not sticky) so it
  // never occupies flow space — otherwise an invisible ~56px strip would sit
  // between the dark hero and the dark tagline. Mirror the site header's
  // auto-hide so the bar pins flush to the top when the header slides up.
  useEffect(() => {
    let ticking = false;
    let lastY = window.scrollY;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setVisible(y > window.innerHeight * 0.6);
        setHeaderHidden(y > lastY && y > 120);
        lastY = y;
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Track which section is in view
  useEffect(() => {
    const elements = sections
      .map((s) => document.getElementById(s.id))
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
  }, [sections]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const headerOffset = 140; // page header + this sub-nav
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <div
      style={{ top: headerHidden ? 0 : 'var(--header-height, 80px)' }}
      className={[
        'fixed inset-x-0 z-30',
        'bg-cream/95 backdrop-blur-md border-b border-cream-300 shadow-[0_10px_30px_-24px_rgba(12,35,64,0.5)]',
        'transition-[top,opacity,transform] duration-500 ease-out-soft',
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 -translate-y-3 pointer-events-none',
      ].join(' ')}
      aria-hidden={!visible}
    >
      <nav className="container">
        <div className="flex items-center gap-6 md:gap-9 lg:gap-12 overflow-x-auto py-4 [&::-webkit-scrollbar]:hidden">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => handleClick(e, s.id)}
              className={[
                'whitespace-nowrap text-[0.7rem] uppercase tracking-[0.16em] font-medium transition-colors duration-300 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mist focus-visible:ring-offset-2 focus-visible:ring-offset-cream',
                activeId === s.id
                  ? 'text-ink relative after:absolute after:left-0 after:right-0 after:-bottom-[18px] after:h-0.5 after:bg-accent-gold'
                  : 'text-ink-600 hover:text-ink',
              ].join(' ')}
            >
              {s.label}
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}
