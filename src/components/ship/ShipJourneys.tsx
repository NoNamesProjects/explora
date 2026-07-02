import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, type JourneyCard as JourneyCardData, type JourneyFacets } from '@/lib/api';
import { JourneyCard } from '@/components/journey/JourneyCard';
import { JourneyPagination } from '@/components/journey/JourneyPagination';
import { ShipJourneyFilters } from '@/components/ship/ShipJourneyFilters';
import { REGIONS, narrowOptions } from '@/components/journey/filterOptions';

const PAGE_SIZE = 6; // 3 across × 2 rows

export interface ShipJourneysProps {
  /** Feed ship code, e.g. "EP01". */
  shipCd: string;
  /** Display name, e.g. "EXPLORA I" — used in the heading + the deep link. */
  shipName: string;
}

/**
 * "Sail with EXPLORA X" — a dark navy band on the ship-detail page listing the
 * journeys that sail on THIS ship. A cream Where/When filter bar floats on the
 * band, the shared Find-a-Journey cards (cream — they pop on navy) sit in a 3×2
 * grid, inline pagination pages through the ship's journeys, and a "View all
 * journeys" CTA deep-links to Find-a-Journey with the ship (+ any chosen
 * filters) preselected. Data via api.journeys.search / .facets.
 */
export function ShipJourneys({ shipCd, shipName }: ShipJourneysProps) {
  const { t } = useTranslation();
  const [region, setRegion] = useState('');
  const [month, setMonth] = useState('');
  const [page, setPage] = useState(1);
  const [journeys, setJourneys] = useState<JourneyCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [facets, setFacets] = useState<JourneyFacets | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // Journeys for this ship + current filters (page resets to 1 when a filter changes).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.journeys
      .search({ ship: shipCd, region: region || undefined, month: month || undefined, page, pageSize: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setJourneys(res.journeys);
        setTotal(res.total);
      })
      .catch(() => {
        if (cancelled) return;
        setJourneys([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [shipCd, region, month, page]);

  // Narrow the Where/When options to what's available for THIS ship + selections.
  useEffect(() => {
    let cancelled = false;
    api.journeys
      .facets({ ship: shipCd, region: region || undefined, month: month || undefined })
      .then((f) => { if (!cancelled) setFacets(f); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [shipCd, region, month]);

  const regionOptions = useMemo(() => {
    const all = REGIONS.map((r) => ({
      value: r.value,
      label: r.value ? t(r.labelKey) : t('filters.allDestinations', { defaultValue: 'All destinations' }),
    }));
    return narrowOptions(all, facets?.regions, region);
  }, [t, facets, region]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const viewMoreHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set('ship', shipCd);
    if (region) params.set('region', region);
    if (month) params.set('month', month);
    return `/find-your-journey?${params.toString()}`;
  }, [shipCd, region, month]);

  const onRegion = (v: string) => { setRegion(v); setPage(1); };
  const onMonth = (v: string) => { setMonth(v); setPage(1); };

  // Page change scrolls the band's top into view (the section has scroll-mt-32, so it
  // lands below the fixed header) — otherwise paging leaves you stuck at the bottom.
  const goToPage = (p: number) => {
    setPage(p);
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section
      ref={sectionRef}
      id="journeys"
      className="relative overflow-hidden bg-ink py-section-y text-cream scroll-mt-32"
    >
      {/* Cinematic dark layers — same family as the specifications / guide bands. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ backgroundImage: 'radial-gradient(ellipse at 25% 0%, rgba(115,133,159,0.4) 0%, transparent 60%)' }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grain opacity-20 mix-blend-overlay" />

      <div className="relative container">
        <div className="mx-auto max-w-2xl text-center mb-10 md:mb-12">
          <div className="eyebrow text-cream/60 mb-4">{t('ship.journeys.eyebrow')}</div>
          <h2 className="font-serif text-display md:text-hero-xl leading-tight text-cream text-balance">
            {t('ship.journeys.heading', { name: shipName })}
          </h2>
          {!loading && total > 0 && (
            <p className="mt-4 text-[0.7rem] uppercase tracking-[0.18em] text-cream/60">
              {t('ship.journeys.count', { count: total, defaultValue: '{{count}} journeys' })}
            </p>
          )}
        </div>

        <ShipJourneyFilters
          region={region}
          month={month}
          onRegionChange={onRegion}
          onMonthChange={onMonth}
          regionOptions={regionOptions}
          availableMonths={facets?.months}
          whereLabel={t('hero.search.whereLabel')}
          whenLabel={t('hero.search.whenLabel')}
          anyMonthLabel={t('ship.journeys.anyMonth', { defaultValue: 'Any month' })}
        />

        <div className="mt-10 md:mt-12">
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="aspect-[16/10] rounded-card bg-cream/5 animate-pulse" />
              ))}
            </div>
          ) : journeys.length === 0 ? (
            <p className="py-10 text-center text-lg italic text-cream/70">{t('ship.journeys.empty')}</p>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {journeys.map((j, i) => (
                  <JourneyCard key={j.journeyId} card={j} index={i} />
                ))}
              </div>
              {totalPages > 1 && (
                <JourneyPagination
                  page={page}
                  totalPages={totalPages}
                  onChange={goToPage}
                  tone="cream"
                  label={t('find.pagination.label', { defaultValue: 'Pagination' })}
                  prevLabel={t('aria.previousSlide', { defaultValue: 'Previous' })}
                  nextLabel={t('aria.nextSlide', { defaultValue: 'Next' })}
                />
              )}
            </>
          )}
        </div>

        {/* View all journeys → Find-a-Journey with this ship (+ filters) preselected. */}
        <div className="mt-12 md:mt-14 text-center">
          <Link to={viewMoreHref} className="btn-ghost-light inline-flex items-center gap-2">
            {t('ship.journeys.viewAll')}
            <span aria-hidden>›</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
