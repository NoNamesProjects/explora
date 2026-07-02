import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type SuiteGroup, formatEUR } from '@/lib/bookingUI';
import { cabinImagesForSuite } from '@/lib/shipAssets';
import { suiteSqm } from '@/data/suiteDetails';
import { SuiteDetailModal } from './SuiteDetailModal';

/**
 * One suite card on the "Choose your suite" step — a horizontal card: a photo
 * carousel on the left, the suite name, a "View Details" trigger that opens the
 * suite detail modal, the cheapest per-guest "from" price, and a navy "View
 * Options" button on the right. The
 * suite step only renders suites the party fits (non-fitting ones are filtered
 * out upstream); the `fits`/`occ` props remain as a defensive fallback. Selecting
 * adds a navy outline (the card itself never turns navy).
 *
 * No struck-through "was"/original price — no discount data exists, so only the
 * real per-guest price (group.from) is shown. The m²/size above View Details
 * comes from suiteSqm() (factual public Explora specs; omitted when unknown).
 */
export function SuiteOfferCard({
  group,
  shipCd,
  selectedSuite,
  onSelect,
  partySize,
  total,
  occ: _occ,
  fits,
}: {
  group: SuiteGroup;
  shipCd: string;
  selectedSuite?: string;
  onSelect: (suiteCode: string, fareCode: string) => void;
  partySize: number;
  total: number | null;
  occ: number;
  fits: boolean;
}) {
  // Hooks first, always unconditional.
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  // A suite the party can't fit is never treated as selected, even if a deep link
  // preselected it — it renders as a disabled card the guest must pick away from.
  const isSelected = selectedSuite === group.code && fits;
  // groupSuites() sorts fares cheapest-first, so fares[0] is the auto-accepted offer.
  const fare = group.fares[0];

  // Suite size (m²) — factual public Explora spec; omitted when unknown.
  const sqm = suiteSqm(group.code);

  const imgs = cabinImagesForSuite(shipCd, group.code);
  const hasCarousel = imgs.length > 1;
  // Modulo keeps the index in range as it wraps in either direction.
  const current = imgs[((index % imgs.length) + imgs.length) % imgs.length];
  const go = (delta: number) => setIndex((i) => i + delta);

  return (
    <div
      className={[
        'bg-cream-soft border rounded-card overflow-hidden md:flex transition-colors ease-out-soft',
        isSelected ? 'border-ink ring-1 ring-ink' : 'border-cream-300/60',
      ].join(' ')}
    >
      {/* LEFT — photo carousel */}
      <div className="md:w-[46%] relative aspect-[4/3] md:aspect-auto bg-cream-200 overflow-hidden group">
        <img
          src={current}
          alt={group.name}
          loading="lazy"
          className="h-full w-full object-cover"
        />

        {hasCarousel && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={t('booking.suiteCard.prevPhoto', { defaultValue: 'Previous photo' })}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 grid place-items-center rounded-full bg-ink/45 text-cream opacity-0 group-hover:opacity-100 transition-opacity ease-out-soft focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="m15 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={t('booking.suiteCard.nextPhoto', { defaultValue: 'Next photo' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 grid place-items-center rounded-full bg-ink/45 text-cream opacity-0 group-hover:opacity-100 transition-opacity ease-out-soft focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
              {imgs.map((_, i) => {
                const active = i === (((index % imgs.length) + imgs.length) % imgs.length);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={t('booking.suiteCard.viewPhoto', { number: i + 1, defaultValue: 'View photo {{number}}' })}
                    aria-current={active}
                    className={[
                      'h-1.5 rounded-full transition-all ease-out-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream',
                      active ? 'w-4 bg-cream' : 'w-1.5 bg-cream/50',
                    ].join(' ')}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* RIGHT — details */}
      <div className="flex-1 p-6 md:p-7 flex flex-col">
        <div className="eyebrow">{t('booking.suiteCard.eyebrow', { defaultValue: 'Suite' })}</div>
        <h2 className="font-serif text-2xl md:text-3xl text-ink mt-1">{group.name}</h2>

        {sqm != null && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-sm text-ink-600">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
            {sqm} m²
          </div>
        )}

        <div className="mt-3">
          <SuiteDetailModal
            group={group}
            shipCd={shipCd}
            total={total}
            partySize={partySize}
            onSelect={onSelect}
            selected={isSelected}
          />
        </div>

        {/* Price + select pinned to the bottom. */}
        <div className="mt-auto pt-5">
          <div className="text-[0.62rem] tracking-[0.18em] uppercase text-ink-600">{t('booking.suiteCard.from', { defaultValue: 'From' })}</div>
          <div className="mt-1">
            <span className="font-sans font-bold tabular-nums text-3xl text-ink">{formatEUR(group.from)}</span>{' '}
            <span className="text-sm text-ink-600">{t('booking.suiteCard.perGuest', { defaultValue: 'per guest' })}</span>
          </div>

          <button
            type="button"
            onClick={() => onSelect(group.code, fare.fare_code)}
            disabled={!fits}
            aria-pressed={isSelected}
            aria-label={
              isSelected
                ? t('booking.suiteCard.suiteSelectedAria', { name: group.name, defaultValue: '{{name}} selected' })
                : t('booking.suiteCard.viewOptionsAria', { name: group.name, defaultValue: 'View options for {{name}}' })
            }
            className="btn-primary w-full justify-center mt-5 disabled:opacity-40"
          >
            {isSelected ? (
              <span className="inline-flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="m5 12 5 5 9-11" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t('booking.suiteCard.selected', { defaultValue: 'Selected' })}
              </span>
            ) : (
              t('booking.suiteCard.viewOptions', { defaultValue: 'View Options' })
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
