import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FilterSelect,
  MonthPicker,
  PinIcon,
  AnchorIcon,
  ShipIcon,
  SortIcon,
} from '@/components/journey/FilterControls';
import { REGIONS, SHIP_OPTIONS, SORT_OPTIONS, DEFAULT_SORT, narrowOptions } from '@/components/journey/filterOptions';
import { RangeSlider } from '@/components/ui/RangeSlider';
import { api, type JourneyFacets, type JourneySort } from '@/lib/api';

const SEARCH = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

interface SearchWidgetProps {
  className?: string;
}

/**
 * Hero journey search — the full Find-a-Journey filter bar (Destination ·
 * Departure month · Departure port · Ship · Sort by, plus Length + Price range
 * sliders), held in local state and submitted as query params to
 * /find-your-journey, where the same controls pick the values back up.
 */
export function SearchWidget({ className = '' }: SearchWidgetProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [region, setRegion] = useState('');
  const [month, setMonth] = useState('');
  const [port, setPort] = useState('');
  const [ship, setShip] = useState('');
  const [sort, setSort] = useState<JourneySort>(DEFAULT_SORT);
  // null ⇒ untouched (full range); a pair ⇒ user-committed bounds.
  const [nights, setNights] = useState<[number, number] | null>(null);
  const [price, setPrice] = useState<[number, number] | null>(null);

  // FACETED options + slider bounds — refetched whenever a selection changes, so
  // every other field narrows to what's actually available for the current choice.
  const [facets, setFacets] = useState<JourneyFacets | null>(null);
  useEffect(() => {
    let cancelled = false;
    api.journeys
      .facets({
        region: region || undefined,
        ship: ship || undefined,
        month: month || undefined,
        departurePort: port || undefined,
      })
      .then((f) => { if (!cancelled) setFacets(f); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [region, ship, month, port]);

  const regionOptions = useMemo(() => {
    const all = REGIONS.map((r) => ({
      value: r.value,
      label: r.value ? t(r.labelKey) : t('filters.allDestinations', { defaultValue: 'All destinations' }),
    }));
    return narrowOptions(all, facets?.regions, region);
  }, [t, facets, region]);
  const shipOptions = useMemo(
    () => narrowOptions(
      SHIP_OPTIONS.map((s) => (s.value === '' ? { ...s, label: t('filters.anyShip', { defaultValue: 'Any ship' }) } : s)),
      facets?.ships,
      ship,
    ),
    [t, facets, ship],
  );
  const portOptions = useMemo(
    () => [
      { value: '', label: t('filters.anyPort', { defaultValue: 'Any port' }) },
      ...(facets?.embarkPorts ?? []).map((p) => ({ value: p.code, label: p.name })),
    ],
    [t, facets],
  );
  const sortOptions = useMemo(
    () => SORT_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
    [t],
  );

  const nightsMin = facets?.nightsMin ?? 1;
  const nightsMax = facets?.nightsMax ?? 30;
  const priceMin = facets?.priceMin ?? 0;
  const priceMax = facets?.priceMax ?? 50000;
  const nightsValue: [number, number] = nights ?? [nightsMin, nightsMax];
  const priceValue: [number, number] = price ?? [priceMin, priceMax];

  const reset = () => {
    setRegion(''); setMonth(''); setPort(''); setShip('');
    setSort(DEFAULT_SORT); setNights(null); setPrice(null);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (region) params.set('region', region);
    if (month) params.set('month', month);
    if (port) params.set('departurePort', port);
    if (ship) params.set('ship', ship);
    if (sort !== DEFAULT_SORT) params.set('sort', sort);
    // Only carry a bound when it narrows the full range, mirroring Find-a-Journey.
    if (nights) {
      if (nights[0] > nightsMin) params.set('minNights', String(nights[0]));
      if (nights[1] < nightsMax) params.set('maxNights', String(nights[1]));
    }
    if (price) {
      if (price[0] > priceMin) params.set('minPrice', String(price[0]));
      if (price[1] < priceMax) params.set('maxPrice', String(price[1]));
    }
    navigate(`/find-your-journey${params.toString() ? `?${params}` : ''}`);
  };

  return (
    <form
      onSubmit={onSubmit}
      className={`bg-cream/95 backdrop-blur-sm border border-cream-300/60 rounded-card shadow-[0_24px_60px_-30px_rgba(12,35,64,0.6)] p-3.5 md:p-4 text-ink space-y-3 ${className}`}
    >
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <FilterSelect label={t('filters.destination', { defaultValue: 'Destination' })} icon={<PinIcon />} value={region} options={regionOptions} onChange={setRegion} />
        <MonthPicker label={t('filters.departureMonth', { defaultValue: 'Departure month' })} value={month} onChange={setMonth} availableMonths={facets?.months} anyLabel={t('filters.anyMonth', { defaultValue: 'Any month' })} />
        <FilterSelect label={t('filters.departurePort', { defaultValue: 'Departure port' })} icon={<AnchorIcon />} value={port} options={portOptions} onChange={setPort} />
        <FilterSelect label={t('filters.ship', { defaultValue: 'Ship' })} icon={<ShipIcon />} value={ship} options={shipOptions} onChange={setShip} />
        <FilterSelect
          label={t('filters.sortBy', { defaultValue: 'Sort by' })}
          icon={<SortIcon />}
          value={sort}
          options={sortOptions}
          onChange={(v) => setSort(v as JourneySort)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] items-end">
        <RangeSlider
          label={t('filters.lengthNights', { defaultValue: 'Length (nights)' })}
          min={nightsMin} max={nightsMax} step={1}
          value={nightsValue}
          onCommit={(v) => setNights(v)}
        />
        <RangeSlider
          label={t('filters.priceFrom', { defaultValue: 'Price from (€)' })}
          min={priceMin} max={priceMax} step={500}
          value={priceValue}
          format={(v) => `€${Math.round(v).toLocaleString(i18n.language || undefined)}`}
          onCommit={(v) => setPrice(v)}
        />
        <div className="grid grid-cols-2 gap-3 sm:col-span-2 lg:col-span-1">
          <button
            type="button"
            onClick={reset}
            className="px-5 py-3 text-[0.7rem] uppercase tracking-[0.16em] font-medium text-ink-600 hover:text-ink border border-cream-300/70 hover:border-ink transition-colors"
          >
            {t('filters.reset', { defaultValue: 'Reset' })}
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 bg-accent-tan hover:bg-accent-gold text-cream uppercase tracking-[0.14em] text-[0.7rem] font-medium px-6 py-3 transition-colors duration-300"
          >
            {SEARCH}
            {t('hero.search.submit')}
          </button>
        </div>
      </div>
    </form>
  );
}
