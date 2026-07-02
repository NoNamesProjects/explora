import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useBooking } from '@/context/BookingContext';
import {
  MAX_GUESTS,
  ADULTS_MIN, ADULTS_MAX, CHILDREN_MIN, CHILDREN_MAX, INFANTS_MIN, INFANTS_MAX,
  ADULT_BAND, CHILD_BAND, INFANT_BAND, clampParty,
} from '@/lib/guestRules';

const EASE = [0.22, 1, 0.36, 1] as const;

/** One editorial guest tile: a large serif count between a − / + pair. */
function GuestCard({
  label,
  band,
  value,
  index,
  canDecrease,
  canIncrease,
  onChange,
}: {
  label: string;
  band: string;
  value: number;
  index: number;
  canDecrease: boolean;
  canIncrease: boolean;
  onChange: (next: number) => void;
}) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const active = value > 0;
  const btn =
    'w-11 h-11 inline-flex items-center justify-center text-2xl leading-none border transition-colors ease-out-soft ' +
    'border-cream-300/70 text-ink hover:bg-ink hover:text-cream hover:border-ink ' +
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink ' +
    'disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-ink disabled:hover:border-cream-300/70';

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: index * 0.08 }}
      className={[
        'relative flex flex-col items-center text-center bg-cream-soft border p-7 md:p-8 transition-colors ease-out-soft',
        active ? 'border-ink' : 'border-cream-300/60',
      ].join(' ')}
    >
      {/* Gold hairline accent on filled tiles. */}
      <span
        aria-hidden
        className={[
          'absolute inset-x-0 top-0 h-px bg-accent-gold transition-opacity duration-500 ease-out-soft',
          active ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />

      <div className="eyebrow">{label}</div>

      <div className="my-5 h-16 flex items-center justify-center" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={reduce ? false : { opacity: 0, scale: 0.6, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: -6 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="block font-serif text-5xl md:text-6xl leading-none text-ink tabular-nums"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className={btn}
          disabled={!canDecrease}
          onClick={() => onChange(value - 1)}
          aria-label={t('booking.passengers.fewer', { label: label.toLowerCase(), defaultValue: 'Fewer {{label}}' })}
        >
          −
        </button>
        <button
          type="button"
          className={btn}
          disabled={!canIncrease}
          onClick={() => onChange(value + 1)}
          aria-label={t('booking.passengers.more', { label: label.toLowerCase(), defaultValue: 'More {{label}}' })}
        >
          +
        </button>
      </div>

      <div className="mt-5 text-xs text-ink-600">{band}</div>
    </motion.div>
  );
}

/**
 * Step 1 of the booking funnel ("guests" route) — the editorial "how many people"
 * screen. Pure occupancy: adults/children/infants steppers within the shared guest
 * rules (≥1 adult, per-category caps, ≤MAX_GUESTS total). No prices appear here;
 * fares are revealed on the suite step. Writes the party into the booking context
 * and registers the wizard nav (Back to journey · Next → suite) in the summary rail.
 */
export function PassengersStep() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { journeyId, selection, setParty, setNav } = useBooking();

  const party = clampParty(selection, MAX_GUESTS);
  const total = party.adults + party.children + party.infants;
  const atMaxTotal = total >= MAX_GUESTS;

  // Register the wizard nav (rendered in the right-hand summary rail). Always
  // enabled — a valid party (≥1 adult) is guaranteed by clampParty.
  useEffect(() => {
    setNav({
      backTo: `/journeys/${journeyId}`,
      backLabel: t('booking.layout.backToJourney', { defaultValue: 'Back to journey' }),
      nextLabel: t('booking.nav.next', { defaultValue: 'Next' }),
      nextDisabled: false,
      onNext: () => navigate(`/journeys/${journeyId}/book/suite`),
    });
  }, [journeyId, navigate, setNav, t]);

  return (
    <div>
      <header>
        <div className="eyebrow mb-3">{t('booking.passengers.eyebrow', { defaultValue: 'Step 1' })}</div>
        <h1 className="font-serif text-display-sm text-ink">{t('booking.passengers.title', { defaultValue: 'Who is travelling' })}</h1>
        <p className="mt-3 text-sm text-ink-600 max-w-prose">
          {t('booking.passengers.intro', { defaultValue: 'Choose how many guests will share the suite. You can refine the details and pick your suite next.' })}
        </p>
      </header>

      <div role="group" aria-label={t('booking.passengers.groupAriaLabel', { defaultValue: 'Number of guests' })} className="mt-8 grid gap-4 sm:grid-cols-3">
        <GuestCard
          label={t('booking.passengers.adults', { defaultValue: 'Adults' })}
          band={ADULT_BAND}
          value={party.adults}
          index={0}
          canDecrease={party.adults > ADULTS_MIN}
          canIncrease={party.adults < ADULTS_MAX && !atMaxTotal}
          onChange={(adults) => setParty({ ...party, adults })}
        />
        <GuestCard
          label={t('booking.passengers.children', { defaultValue: 'Children' })}
          band={CHILD_BAND}
          value={party.children}
          index={1}
          canDecrease={party.children > CHILDREN_MIN}
          canIncrease={party.children < CHILDREN_MAX && !atMaxTotal}
          onChange={(children) => setParty({ ...party, children })}
        />
        <GuestCard
          label={t('booking.passengers.infants', { defaultValue: 'Infants' })}
          band={INFANT_BAND}
          value={party.infants}
          index={2}
          canDecrease={party.infants > INFANTS_MIN}
          canIncrease={party.infants < INFANTS_MAX && !atMaxTotal}
          onChange={(infants) => setParty({ ...party, infants })}
        />
      </div>

      <p className="mt-6 text-sm text-ink-600">
        <span className="text-ink">{total}</span> {t('booking.passengers.guestCountLabel', { count: total, defaultValue_one: 'guest', defaultValue_other: 'guests', defaultValue: 'guests' })}
        <span className="mx-2 text-cream-300">·</span>
        {t('booking.passengers.perSuite', { max: MAX_GUESTS, defaultValue: 'up to {{max}} per suite' })}
      </p>
    </div>
  );
}
