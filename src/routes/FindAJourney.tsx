import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import {
  api,
  ApiError,
  type JourneyCard as JourneyCardData,
  type JourneySearchParams,
  type JourneyFacets,
  type JourneySort,
} from '@/lib/api';
import { JourneyCard } from '@/components/journey/JourneyCard';
import { JourneyPagination } from '@/components/journey/JourneyPagination';
import { FilterSelect, MonthPicker, PinIcon, AnchorIcon, ShipIcon, SortIcon } from '@/components/journey/FilterControls';
import { REGIONS, SHIP_OPTIONS, SORT_OPTIONS, DEFAULT_SORT, narrowOptions } from '@/components/journey/filterOptions';
import { RangeSlider } from '@/components/ui/RangeSlider';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export default function FindAJourney() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: JourneySearchParams = useMemo(() => {
    const num = (k: string) => {
      const v = searchParams.get(k);
      return v != null && v !== '' ? Number(v) : undefined;
    };
    return {
      region: searchParams.get('region') ?? undefined,
      ship: searchParams.get('ship') ?? undefined,
      month: searchParams.get('month') ?? undefined,
      departurePort: searchParams.get('departurePort') ?? undefined,
      minNights: num('minNights'),
      maxNights: num('maxNights'),
      minPrice: num('minPrice'),
      maxPrice: num('maxPrice'),
      sort: (searchParams.get('sort') as JourneySort | null) ?? DEFAULT_SORT,
      page: num('page') ?? 1,
      pageSize: 24,
    };
  }, [searchParams]);

  const [data, setData] = useState<{ journeys: JourneyCardData[]; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facets, setFacets] = useState<JourneyFacets | null>(null);

  // FACETED filter options + slider bounds — refetched whenever a selection
  // changes, so each field narrows to what's available for the current choices.
  useEffect(() => {
    let cancelled = false;
    api.journeys
      .facets({
        region: filters.region || undefined,
        ship: filters.ship || undefined,
        month: filters.month || undefined,
        departurePort: filters.departurePort || undefined,
      })
      .then((f) => { if (!cancelled) setFacets(f); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [filters.region, filters.ship, filters.month, filters.departurePort]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.journeys.search(filters)
      .then((res) => {
        if (cancelled) return;
        setData({ journeys: res.journeys, total: res.total });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 503) {
          setError(t('find.error.loading', { defaultValue: 'Sailings are loading for the first time — check back shortly.' }));
        } else {
          setError(t('find.error.generic', { defaultValue: 'Could not load sailings. Try refreshing the page.' }));
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filters]);

  const portOptions = useMemo(
    () => [
      { value: '', label: t('filters.anyPort', { defaultValue: 'Any port' }) },
      ...(facets?.embarkPorts ?? []).map((p) => ({ value: p.code, label: p.name })),
    ],
    [t, facets],
  );
  const regionOptions = useMemo(() => {
    const all = REGIONS.map((r) => ({
      value: r.value,
      label: r.value ? t(r.labelKey) : t('filters.allDestinations', { defaultValue: 'All destinations' }),
    }));
    return narrowOptions(all, facets?.regions, filters.region ?? '');
  }, [t, facets, filters.region]);
  const shipOptions = useMemo(
    () => narrowOptions(
      SHIP_OPTIONS.map((s) => (s.value === '' ? { ...s, label: t('filters.anyShip', { defaultValue: 'Any ship' }) } : s)),
      facets?.ships,
      filters.ship ?? '',
    ),
    [t, facets, filters.ship],
  );
  const sortOptions = useMemo(
    () => SORT_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
    [t],
  );

  // Slider bounds — fall back to sensible defaults until facets resolve.
  const nightsMin = facets?.nightsMin ?? 1;
  const nightsMax = facets?.nightsMax ?? 30;
  const priceMin = facets?.priceMin ?? 0;
  const priceMax = facets?.priceMax ?? 50000;
  const nightsValue: [number, number] = [filters.minNights ?? nightsMin, filters.maxNights ?? nightsMax];
  const priceValue: [number, number] = [filters.minPrice ?? priceMin, filters.maxPrice ?? priceMax];

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page'); // any filter change returns to page 1
    setSearchParams(next, { replace: true });
  };

  // Set/clear a pair of range params — omit a bound when it equals the slider
  // edge, so a full-range slider doesn't filter out (e.g.) price-less sailings.
  const updateRange = (
    minKey: string,
    maxKey: string,
    [lo, hi]: [number, number],
    boundLo: number,
    boundHi: number,
  ) => {
    const next = new URLSearchParams(searchParams);
    if (lo <= boundLo) next.delete(minKey); else next.set(minKey, String(lo));
    if (hi >= boundHi) next.delete(maxKey); else next.set(maxKey, String(hi));
    next.delete('page'); // any filter change returns to page 1
    setSearchParams(next, { replace: true });
  };

  const reset = () => setSearchParams({}, { replace: true });

  // ── Pagination ────────────────────────────────────────────────────────────
  const pageSize = filters.pageSize ?? 24;
  const currentPage = filters.page ?? 1;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;
  const resultsRef = useRef<HTMLDivElement>(null);

  const goToPage = (p: number) => {
    const clamped = Math.min(Math.max(1, p), totalPages);
    const next = new URLSearchParams(searchParams);
    if (clamped <= 1) next.delete('page');
    else next.set('page', String(clamped));
    setSearchParams(next, { replace: false });
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      {/* Page header */}
      <section className="bg-cream pt-32 pb-12 md:pb-16 border-b border-cream-300/60">
        <div className="container">
          <Breadcrumb
            items={[
              { label: t('ship.breadcrumbHome'), href: '/' },
              { label: t('nav.findAJourney') },
            ]}
            className="mb-8"
          />
          <h1 className="font-serif text-hero-xl font-medium leading-[1.05] max-w-3xl mb-6">
            <Trans
              i18nKey="find.title"
              defaults="Find a <em>journey</em>"
              components={{ em: <em className="font-serif italic font-normal" /> }}
            />
          </h1>
          <p className="max-w-prose text-ink-600 text-lg">
            {t('find.subtitle', { defaultValue: 'Filter by destination, ship, departure, port, length or price — every sailing across the fleet, refreshed daily.' })}
          </p>
        </div>
      </section>

      {/* Filter bar */}
      <section className="sticky top-[var(--header-height)] z-20 bg-cream border-b border-cream-300/50 py-4">
        <div className="container space-y-3">
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <FilterSelect label={t('filters.destination', { defaultValue: 'Destination' })} icon={<PinIcon />} value={filters.region ?? ''} onChange={(v) => update('region', v)}
              options={regionOptions} />
            <MonthPicker label={t('filters.departureMonth', { defaultValue: 'Departure month' })} value={filters.month ?? ''} onChange={(v) => update('month', v)} availableMonths={facets?.months} anyLabel={t('filters.anyMonth', { defaultValue: 'Any month' })} />
            <FilterSelect label={t('filters.departurePort', { defaultValue: 'Departure port' })} icon={<AnchorIcon />} value={filters.departurePort ?? ''} onChange={(v) => update('departurePort', v)} options={portOptions} />
            <FilterSelect label={t('filters.ship', { defaultValue: 'Ship' })} icon={<ShipIcon />} value={filters.ship ?? ''} onChange={(v) => update('ship', v)} options={shipOptions} />
            <FilterSelect label={t('filters.sortBy', { defaultValue: 'Sort by' })} icon={<SortIcon />} value={filters.sort ?? DEFAULT_SORT} onChange={(v) => update('sort', v === DEFAULT_SORT ? '' : v)} options={sortOptions} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] items-end">
            <RangeSlider
              label={t('filters.lengthNights', { defaultValue: 'Length (nights)' })}
              min={nightsMin} max={nightsMax} step={1}
              value={nightsValue}
              onCommit={(v) => updateRange('minNights', 'maxNights', v, nightsMin, nightsMax)}
            />
            <RangeSlider
              label={t('filters.priceFrom', { defaultValue: 'Price from (€)' })}
              min={priceMin} max={priceMax} step={500}
              value={priceValue}
              format={(v) => `€${Math.round(v).toLocaleString(i18n.language || undefined)}`}
              onCommit={(v) => updateRange('minPrice', 'maxPrice', v, priceMin, priceMax)}
            />
            <div className="flex items-stretch sm:col-span-2 lg:col-span-1">
              <button
                type="button"
                onClick={reset}
                className="w-full px-5 py-3 text-[0.7rem] uppercase tracking-[0.16em] font-medium text-ink-600 hover:text-ink border border-cream-300/70 hover:border-ink transition-colors"
              >
                {t('filters.reset', { defaultValue: 'Reset' })}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section ref={resultsRef} className="py-section-y bg-cream scroll-mt-44">
        <div className="container">
          {loading && <ResultsSkeleton />}
          {!loading && error && (
            <p className="text-center text-ink-600 max-w-prose mx-auto">{error}</p>
          )}
          {!loading && !error && data && (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 mb-10">
                <SectionHeading
                  eyebrow={t('find.results.eyebrow', { defaultValue: 'Sailings' })}
                  titleLead={t('find.results.showing', { defaultValue: 'Showing' })}
                  highlight={`${data.total}`}
                  titleTail={data.total === 1
                    ? t('find.results.sailing', { defaultValue: 'sailing' })
                    : t('find.results.sailings', { defaultValue: 'sailings' })}
                  size="display-sm"
                />
                {data.total > 0 && (
                  <span className="text-sm text-ink-600">
                    {t('find.results.range', {
                      from: (currentPage - 1) * pageSize + 1,
                      to: Math.min(currentPage * pageSize, data.total),
                      total: data.total,
                      defaultValue: 'Showing {{from}}–{{to}} of {{total}}',
                    })}
                  </span>
                )}
              </div>

              {data.journeys.length === 0 ? (
                <p className="text-center text-ink-600 max-w-prose mx-auto py-section-y">
                  {t('find.empty', { defaultValue: 'No sailings match these filters. Try widening the date range, price or another destination.' })}
                </p>
              ) : (
                <>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {data.journeys.map((j, i) => (
                      <JourneyCard key={j.journeyId} card={j} index={i} />
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <JourneyPagination
                      page={currentPage}
                      totalPages={totalPages}
                      onChange={goToPage}
                      label={t('find.pagination.label', { defaultValue: 'Pagination' })}
                      prevLabel={t('aria.previousSlide')}
                      nextLabel={t('aria.nextSlide')}
                    />
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-cream-200 h-80 animate-pulse" />
      ))}
    </div>
  );
}

// Pagination + paginationRange now live in @/components/journey/JourneyPagination
// (shared with the ship-detail "Sail with this ship" section).
