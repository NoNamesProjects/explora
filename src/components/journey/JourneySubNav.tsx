import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { SubNavSection } from '@/components/ship/StickySubNav';

export interface JourneySummaryField {
  label: string;
  value: string;
}

export interface JourneySubNavProps {
  sections: SubNavSection[];
  fields: JourneySummaryField[];
  priceFrom?: string | null;
  reserveHref: string;
}

/**
 * Sticky header for the journey detail page. Two stacked rows:
 *  - ROW 1 (navy detail bar): appears only AFTER the hero scrolls away,
 *    animating open/closed via `scrolled`.
 *  - ROW 2 (cream sub-nav): ALWAYS visible, pins under the hero, scroll-spy
 *    + smooth-scroll anchors lifted from StickySubNav.
 */
export function JourneySubNav({
  sections,
  fields,
  priceFrom,
  reserveHref,
}: JourneySubNavProps) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Reveal the navy detail bar once the hero is mostly scrolled away, and mirror
  // the site Header's auto-hide so this bar pins FLUSH to the very top when the
  // header slides away on scroll-down (and tucks back under it on scroll-up) —
  // no empty gap above the bar.
  useEffect(() => {
    let ticking = false;
    let lastY = window.scrollY;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > window.innerHeight * 0.7);
        setHeaderHidden(y > lastY && y > 120);
        lastY = y;
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Track which section is currently in view for the active underline.
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
    // 80 = fixed site header; + measured sticky stack height so the target
    // never hides under the navy bar.
    const offset = 80 + (wrapperRef.current?.offsetHeight ?? 56);
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <div
      ref={wrapperRef}
      className="sticky z-30 transition-[top] duration-500 ease-out-soft"
      style={{ top: headerHidden ? 0 : 'var(--header-height, 80px)' }}
    >
      {/* ROW 1 — navy detail bar (above the sub-nav) */}
      <div
        className={[
          'transition-all duration-500 ease-out-soft',
          scrolled
            ? 'opacity-100 max-h-24'
            : 'max-h-0 opacity-0 pointer-events-none overflow-hidden',
        ].join(' ')}
        aria-hidden={!scrolled}
      >
        <div className="bg-ink text-cream">
          <div className="container flex items-center justify-between gap-6 py-3">
            {/* LEFT — summary fields */}
            <div className="flex flex-wrap items-center gap-x-7 gap-y-1 overflow-x-auto [&::-webkit-scrollbar]:hidden">
              {fields.map((f) => (
                <div key={f.label} className="leading-tight">
                  <span className="block text-[0.6rem] uppercase tracking-[0.18em] text-cream/60">
                    {f.label}
                  </span>
                  <span className="text-sm text-cream whitespace-nowrap">
                    {f.value}
                  </span>
                </div>
              ))}
            </div>

            {/* RIGHT — price + reserve */}
            <div className="shrink-0 flex items-center gap-5">
              {priceFrom ? (
                <div className="text-right leading-tight">
                  <span className="block text-[0.6rem] uppercase tracking-[0.18em] text-cream/60">
                    {t('journey.subnav.from', { defaultValue: 'from' })}
                  </span>
                  <span className="font-serif text-lg text-cream">
                    {priceFrom}
                  </span>
                </div>
              ) : null}
              <Link
                to={reserveHref}
                className="btn-ghost-light !py-2.5 !px-5 text-[0.62rem]"
              >
                {t('journey.subnav.reserve', { defaultValue: 'Reserve this journey' })}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2 — cream sub-nav (always visible) */}
      <div className="bg-cream/98 backdrop-blur-md border-b border-cream-300 shadow-[0_10px_30px_-24px_rgba(12,35,64,0.5)]">
        <nav className="container" aria-label={t('journey.subnav.sectionsAria', { defaultValue: 'Journey sections' })}>
          <div className="flex items-center gap-6 md:gap-9 lg:gap-12 overflow-x-auto py-4 [&::-webkit-scrollbar]:hidden">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={(e) => handleClick(e, s.id)}
                className={[
                  'whitespace-nowrap text-[0.7rem] uppercase tracking-[0.16em] font-medium transition-colors duration-300',
                  activeId === s.id
                    ? 'text-ink relative after:absolute after:left-0 after:right-0 after:-bottom-4 after:h-0.5 after:bg-accent-gold'
                    : 'text-ink-600 hover:text-ink',
                ].join(' ')}
              >
                {s.label}
              </a>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
