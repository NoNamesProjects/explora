import { FilterSelect, MonthPicker } from '@/components/journey/FilterControls';

// Small inline icons mirrored from SearchWidget / FilterControls (18px line).
const ic = 'h-[18px] w-[18px] shrink-0';
const S = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const PinIcon = () => (
  <svg viewBox="0 0 24 24" className={ic} {...S}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);

export interface ShipJourneyFiltersProps {
  region: string;
  month: string;
  onRegionChange: (v: string) => void;
  onMonthChange: (v: string) => void;
  regionOptions: { value: string; label: string }[];
  availableMonths?: string[];
  whereLabel: string;
  whenLabel: string;
  anyMonthLabel: string;
}

/**
 * Compact, CONTROLLED "Where / When" filter bar for the ship-detail journeys
 * section. A cream floating panel that sits on a dark navy band — the panel
 * itself is cream so the ink-styled FilterSelect / MonthPicker render correctly.
 * Purely presentational: the parent passes already-narrowed options (no fetching).
 */
export function ShipJourneyFilters({
  region,
  month,
  onRegionChange,
  onMonthChange,
  regionOptions,
  availableMonths,
  whereLabel,
  whenLabel,
  anyMonthLabel,
}: ShipJourneyFiltersProps) {
  return (
    <div className="mx-auto max-w-3xl rounded-card bg-cream-soft border border-cream-300/60 text-ink shadow-[0_34px_80px_-48px_rgba(12,35,64,0.6)]">
      {/* Unified console: two borderless fields parted by a hairline divider. */}
      <div className="flex flex-col divide-y divide-cream-300/70 sm:flex-row sm:divide-x sm:divide-y-0">
        <div className="flex-1 p-1.5 md:p-2">
          <FilterSelect
            label={whereLabel}
            icon={<PinIcon />}
            value={region}
            options={regionOptions}
            onChange={onRegionChange}
            className="!border-transparent !bg-transparent !shadow-none"
          />
        </div>
        <div className="flex-1 p-1.5 md:p-2">
          <MonthPicker
            label={whenLabel}
            value={month}
            onChange={onMonthChange}
            availableMonths={availableMonths}
            anyLabel={anyMonthLabel}
            className="!border-transparent !bg-transparent !shadow-none"
          />
        </div>
      </div>
    </div>
  );
}
