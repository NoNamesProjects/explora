import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Link } from 'react-router-dom';
import { useBooking } from '@/context/BookingContext';
import { destinationImage } from '@/lib/portImages';
import { shipImageForCode, cabinImageForSuite } from '@/lib/shipAssets';
import { getShipFacts } from '@/data/shipFacts';
import {
  suiteLabel,
  fareLabel,
  formatEUR,
  cabinPricing,
  suiteMaxOccupancy,
} from '@/lib/bookingUI';
import { clampParty } from '@/lib/guestRules';
import type { JourneyDay } from '@/lib/api';

/**
 * Persistent right-hand "package" rail for every booking step. A rich, sticky
 * recap of the journey being booked: the route + price summary box (with the
 * step's Back/Next nav, driven by the `nav` context state), an analytical
 * day-by-day destination list, the ship, and — from the details step on — the
 * chosen suite. Built entirely from useBooking(); every `detail` access is
 * null-guarded since the journey loads asynchronously.
 *
 * Price discipline mirrors the funnel: step 1 (guests) shows NO price; from
 * step 2 a price only appears once a suite + fare is actually selected.
 */

// Feed ship code (e.g. "EP01") → ship-facts asset slug. SHIP_CD_TO_CODE isn't
// exported from shipAssets, so resolve the EPNN → explora-<roman> slug here
// (null-safe, same pairing used across the site); the image helpers take the
// raw feed shipCd directly and need no mapping.
const SHIP_ROMAN = ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'] as const;
function shipCdToSlug(cd: string | null | undefined): string {
  if (!cd) return 'explora-i';
  const n = parseInt(String(cd).replace(/\D/g, ''), 10);
  return Number.isFinite(n) && n >= 1 ? `explora-${SHIP_ROMAN[n] ?? n}` : 'explora-i';
}

/** "2 adults · 1 child · 1 infant" from the selected party (singular/plural aware). */
function partyLabel(t: TFunction, adults: number, children: number, infants: number): string {
  const segs = [
    adults > 0
      ? t('booking.package.adults', {
          count: adults,
          defaultValue_one: '{{count}} adult',
          defaultValue_other: '{{count}} adults',
          defaultValue: '{{count}} adults',
        })
      : null,
    children > 0
      ? t('booking.package.children', {
          count: children,
          defaultValue_one: '{{count}} child',
          defaultValue_other: '{{count}} children',
          defaultValue: '{{count}} children',
        })
      : null,
    infants > 0
      ? t('booking.package.infants', {
          count: infants,
          defaultValue_one: '{{count}} infant',
          defaultValue_other: '{{count}} infants',
          defaultValue: '{{count}} infants',
        })
      : null,
  ].filter(Boolean);
  return segs.length ? segs.join('  ·  ') : '—';
}

function formatSailingDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Factual amenity taxonomy shared by every Explora suite — surfaced on the
 * suite step before a suite is chosen, then hidden once one is. Icons are
 * simple inline line-SVGs (no external assets); see AmenityIcon below.
 */
type AmenityIconName =
  | 'seaView'
  | 'windows'
  | 'lounge'
  | 'minibar'
  | 'terrace'
  | 'heatedFloor';

const SUITE_AMENITIES: { labelKey: string; labelEn: string; icon: AmenityIconName }[] = [
  { labelKey: 'booking.package.amenitySeaView', labelEn: 'Sea View', icon: 'seaView' },
  { labelKey: 'booking.package.amenityWindows', labelEn: 'Floor-to-ceiling Windows', icon: 'windows' },
  { labelKey: 'booking.package.amenityLounge', labelEn: 'Lounge Area', icon: 'lounge' },
  { labelKey: 'booking.package.amenityMinibar', labelEn: 'Private refrigerated minibar', icon: 'minibar' },
  { labelKey: 'booking.package.amenityTerrace', labelEn: 'Private sun terrace', icon: 'terrace' },
  { labelKey: 'booking.package.amenityHeatedFloor', labelEn: 'Heated bathroom floors', icon: 'heatedFloor' },
];

/** Tiny thin-stroke line icon set for the suite amenities, drawn inline. */
function AmenityIcon({ icon }: { icon: AmenityIconName }) {
  const common = {
    viewBox: '0 0 24 24',
    className: 'h-7 w-7 stroke-current text-ink-600',
    fill: 'none' as const,
    strokeWidth: 1.25,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (icon) {
    case 'seaView': // wave / horizon lines
      return (
        <svg {...common}>
          <path d="M3 9h18" />
          <path d="M3 13c1.6 0 1.6 1.4 3.2 1.4S7.8 13 9.4 13s1.6 1.4 3.2 1.4S14.2 13 15.8 13s1.6 1.4 3.2 1.4" />
          <path d="M3 17.4c1.6 0 1.6 1.4 3.2 1.4s1.6-1.4 3.2-1.4 1.6 1.4 3.2 1.4 1.6-1.4 3.2-1.4 1.6 1.4 3.2 1.4" />
        </svg>
      );
    case 'windows': // window rectangle with a vertical mullion
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="0.5" />
          <path d="M12 4v16" />
        </svg>
      );
    case 'lounge': // sofa
      return (
        <svg {...common}>
          <path d="M5 11V9.5A1.5 1.5 0 0 1 6.5 8h11A1.5 1.5 0 0 1 19 9.5V11" />
          <path d="M4 11.5A1.5 1.5 0 0 1 5.5 13v2h13v-2A1.5 1.5 0 0 1 20 11.5 1.5 1.5 0 0 1 21 13v4H3v-4a1.5 1.5 0 0 1 1-1.5Z" />
          <path d="M6 17v2M18 17v2" />
        </svg>
      );
    case 'minibar': // bottle
      return (
        <svg {...common}>
          <path d="M10 3h4" />
          <path d="M10.5 3v3.2a3 3 0 0 1-.5 1.66L9.2 9A3 3 0 0 0 8.7 10.6V19a2 2 0 0 0 2 2h2.6a2 2 0 0 0 2-2v-8.4a3 3 0 0 0-.5-1.66l-.8-1.14a3 3 0 0 1-.5-1.66V3" />
          <path d="M8.7 13h6.6" />
        </svg>
      );
    case 'terrace': // sun with rays
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
        </svg>
      );
    case 'heatedFloor': // bath tub
      return (
        <svg {...common}>
          <path d="M4 12h16v3a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-3Z" />
          <path d="M5 12V7a2 2 0 0 1 2-2 2 2 0 0 1 2 2" />
          <path d="M8 6.5h2" />
          <path d="M7 18v1.5M17 18v1.5" />
        </svg>
      );
    default:
      return null;
  }
}

export function PackagePanel({ step }: { step: number }) {
  const { t, i18n } = useTranslation();
  const { detail, selection, nav } = useBooking();
  const [destOpen, setDestOpen] = useState(true);

  const journey = detail?.journey ?? null;
  const ship = detail?.ship ?? null;
  const days: JourneyDay[] = detail?.days ?? [];

  const fromName = journey?.sailingPortName || journey?.sailingPort || null;
  const toName = journey?.terminationPortName || journey?.terminationPort || null;

  const party = clampParty(
    selection,
    suiteMaxOccupancy(detail, selection.suiteCategory, selection.fareCode),
  );

  // A suite + fare must both be chosen before any price is shown (step >= 2).
  const hasSuite = !!(selection.suiteCategory && selection.fareCode);
  const indicativeTotal =
    hasSuite
      ? cabinPricing(detail, selection.suiteCategory, selection.fareCode, party)?.total ?? null
      : null;
  const showPrice = step >= 2 && hasSuite;

  const shipSlug = shipCdToSlug(journey?.shipCd);
  const shipFacts = getShipFacts(shipSlug);
  const shipName = ship?.ship_name ?? shipFacts.name;
  const shipFactLine = shipFacts.launchYear
    ? t('booking.package.shipLaunched', {
        name: shipFacts.name,
        year: shipFacts.launchYear,
        defaultValue: '{{name}} · Launched {{year}}',
      })
    : shipFacts.name;

  const nightsLabel = journey
    ? t('booking.package.nights', {
        count: journey.nights,
        defaultValue_one: '{{count}} night',
        defaultValue_other: '{{count}} nights',
        defaultValue: '{{count}} nights',
      })
    : null;

  // The journey-line: "Ship · N nights · 12 May 2026".
  const journeyMeta = journey
    ? [shipName, nightsLabel, formatSailingDate(journey.sailingDate, i18n.language)].filter(Boolean).join('  ·  ')
    : null;

  const showNext = nav.showNext !== false && !!nav.onNext;

  return (
    <aside className="lg:sticky lg:top-28 space-y-6">
      {/* ─────────────── 1. Your journey + price + nav ─────────────── */}
      <div className="bg-cream-soft border border-cream-300/60 p-6 md:p-7">
        <div className="eyebrow mb-3">{t('booking.package.yourJourney', { defaultValue: 'Your journey' })}</div>

        {journey ? (
          <>
            <div className="font-serif text-2xl leading-tight text-ink text-balance">
              {fromName && toName ? (
                <>
                  {fromName} <span className="text-ink-600">{t('booking.package.to', { defaultValue: 'to' })}</span> {toName}
                </>
              ) : (
                journey.itinDesc ?? t('booking.package.yourSailing', { defaultValue: 'Your sailing' })
              )}
            </div>
            {journeyMeta && <div className="mt-2 text-sm text-ink-600">{journeyMeta}</div>}
          </>
        ) : (
          <>
            <div className="h-7 w-3/4 bg-cream-200 animate-pulse" />
            <div className="mt-3 h-4 w-1/2 bg-cream-200 animate-pulse" />
          </>
        )}

        <div className="my-5 h-px bg-cream-300/70" aria-hidden />

        {/* Guests row */}
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-[0.6rem] uppercase tracking-[0.2em] text-ink-600">{t('booking.package.guests', { defaultValue: 'Guests' })}</span>
          <span className="text-sm text-ink">
            {partyLabel(t, selection.adults ?? 0, selection.children ?? 0, selection.infants ?? 0)}
          </span>
        </div>

        {/* Price line — never on step 1; only once a suite is chosen thereafter. */}
        {showPrice && (
          <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-cream-300/60 pt-4">
            <span className="text-[0.6rem] uppercase tracking-[0.2em] text-ink-600">{t('booking.package.indicativeTotal', { defaultValue: 'Indicative total' })}</span>
            <span className="font-sans font-bold tabular-nums text-2xl leading-none text-ink">
              {formatEUR(indicativeTotal)}
            </span>
          </div>
        )}

        {/* Step nav — Back link + primary Next, from the nav context state. */}
        {(nav.backTo || showNext) && (
          <div className="mt-6 flex items-center justify-between gap-4 border-t border-cream-300/60 pt-6">
            {nav.backTo ? (
              <Link to={nav.backTo} className="link-underline text-ink-600 inline-flex items-center gap-1.5">
                <span aria-hidden>‹</span>
                <span>{nav.backLabel ?? t('booking.package.back', { defaultValue: 'Back' })}</span>
              </Link>
            ) : (
              <span />
            )}
            {showNext && (
              <button
                type="button"
                onClick={nav.onNext}
                disabled={nav.nextDisabled}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {nav.nextLabel ?? t('booking.package.next', { defaultValue: 'Next' })}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─────────────── All Suites Include (suite step, pre-selection) ─────────────── */}
      {step === 2 && !hasSuite && (
        <div className="bg-cream-soft border border-cream-300/60 p-6 md:p-7">
          <div className="eyebrow">{t('booking.package.allSuitesInclude', { defaultValue: 'All Suites Include' })}</div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-4 mt-5">
            {SUITE_AMENITIES.map((a) => (
              <div key={a.labelKey} className="flex items-center gap-3">
                <span className="shrink-0 rounded-full border border-cream-300 p-1.5">
                  <AmenityIcon icon={a.icon} />
                </span>
                <span className="text-sm text-ink leading-snug">{t(a.labelKey, { defaultValue: a.labelEn })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────── 2. Your destinations (collapsible) ─────────────── */}
      {days.length > 0 && journey && (
        <div className="bg-cream-soft border border-cream-300/60 p-6 md:p-7">
          <button
            type="button"
            onClick={() => setDestOpen((o) => !o)}
            aria-expanded={destOpen}
            className="flex w-full items-baseline justify-between gap-3"
          >
            <span className="eyebrow">{t('booking.package.yourDestinations', { defaultValue: 'Your destinations' })}</span>
            <span className="inline-flex items-baseline gap-2.5">
              {nightsLabel && (
                <span className="text-[0.6rem] uppercase tracking-[0.2em] text-ink-600">{nightsLabel}</span>
              )}
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className={`h-4 w-4 self-center text-ink-600 transition-transform ${destOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          </button>
          {destOpen && (
            <ol
              className={[
                'mt-5 space-y-3',
                days.length > 6 ? 'max-h-[22rem] overflow-y-auto pr-2 -mr-2' : '',
                '[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full',
                '[&::-webkit-scrollbar-thumb]:bg-cream-300 [&::-webkit-scrollbar-track]:bg-transparent',
              ].join(' ')}
            >
              {days.map((d, i) => (
                <DayRow key={`${d.dayNumber}-${i}`} day={d} region={journey.region} />
              ))}
            </ol>
          )}
        </div>
      )}

      {/* ─────────────── 3. Your ship ─────────────── */}
      {journey && (
        <div className="bg-cream-soft border border-cream-300/60 p-6 md:p-7">
          <div className="eyebrow mb-4">{t('booking.package.yourShip', { defaultValue: 'Your ship' })}</div>
          <div className="flex items-center gap-4">
            <div className="h-16 w-24 shrink-0 overflow-hidden rounded-card bg-cream-200">
              <img
                src={shipImageForCode(journey.shipCd, 'preview')}
                alt={shipName}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="font-serif text-xl leading-tight text-ink truncate">{shipName}</div>
              <div className="mt-1 text-[0.65rem] uppercase tracking-[0.16em] text-ink-600">
                {shipFactLine}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────── 4. Your suite (from the details step on) ─────────────── */}
      {step >= 3 && journey && hasSuite && selection.suiteCategory && (
        <div className="bg-cream-soft border border-cream-300/60 p-6 md:p-7">
          <div className="eyebrow mb-4">{t('booking.package.yourSuite', { defaultValue: 'Your suite' })}</div>
          <div className="flex items-center gap-4">
            <div className="h-16 w-24 shrink-0 overflow-hidden rounded-card bg-cream-200">
              <img
                src={cabinImageForSuite(journey.shipCd, selection.suiteCategory)}
                alt={suiteLabel(selection.suiteCategory)}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="font-serif text-xl leading-tight text-ink">
                {suiteLabel(selection.suiteCategory)}
              </div>
              {selection.fareCode && (
                <div className="mt-1 text-[0.65rem] uppercase tracking-[0.16em] text-ink-600">
                  {fareLabel(selection.fareCode)}
                </div>
              )}
            </div>
          </div>
          {indicativeTotal != null && (
            <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-cream-300/60 pt-4">
              <span className="text-[0.6rem] uppercase tracking-[0.2em] text-ink-600">{t('booking.package.indicativeTotal', { defaultValue: 'Indicative total' })}</span>
              <span className="font-sans font-bold tabular-nums text-xl leading-none text-ink">
                {formatEUR(indicativeTotal)}
              </span>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

/** One analytical day row: thumbnail · "Day NN" · port + country · times · overnight. */
function DayRow({ day, region }: { day: JourneyDay; region: string | null }) {
  const { t } = useTranslation();
  const atSea = !day.portCd || (day.portName ?? '').trim().toLowerCase() === 'at sea';
  const atSeaLabel = t('booking.package.atSea', { defaultValue: 'At Sea' });
  const name = atSea ? atSeaLabel : day.portName ?? day.portCd ?? atSeaLabel;
  const numeral = String(day.dayNumber).padStart(2, '0');
  const hasTimes = !!(day.arrivalTime || day.departureTime);

  return (
    <li className="flex items-center gap-3">
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-card bg-cream-200">
        <img
          src={destinationImage(day.portCd, region)}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-xs text-ink-600 shrink-0">
            {t('booking.package.day', { numeral, defaultValue: 'Day {{numeral}}' })}
          </span>
          {day.overnight && (
            <span className="text-[0.55rem] uppercase tracking-[0.18em] text-accent-gold shrink-0">
              {t('booking.package.overnight', { defaultValue: '· Overnight' })}
            </span>
          )}
        </div>
        <div className="text-sm text-ink leading-tight truncate">
          {name}
          {!atSea && day.country && <span className="text-ink-600">, {day.country}</span>}
        </div>
      </div>
      {hasTimes && (
        <div className="shrink-0 text-right font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-600 tabular-nums">
          {day.arrivalTime && (
            <div>
              <span className="text-ink-600/70 mr-1">{t('booking.package.arrive', { defaultValue: 'Arr' })}</span>
              {day.arrivalTime}
            </div>
          )}
          {day.departureTime && (
            <div>
              <span className="text-ink-600/70 mr-1">{t('booking.package.depart', { defaultValue: 'Dep' })}</span>
              {day.departureTime}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
