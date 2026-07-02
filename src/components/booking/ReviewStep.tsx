import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { useBooking } from '@/context/BookingContext';
import { api } from '@/lib/api';
import { suiteLabel, fareLabel, formatEUR, fare2A, cabinPricing, suiteMaxOccupancy } from '@/lib/bookingUI';
import { clampParty } from '@/lib/guestRules';
import { paypalEnabled } from '@/lib/paypalClient';

/**
 * Step 4 — review the selection, add a note, consent, then send the booking
 * request (no online payment). The request row is created server-side as a
 * pending booking; the guest is taken straight to the confirmation screen.
 */
export function ReviewStep() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { journeyId, detail, selection, setMessage, setRequest, setNav } = useBooking();

  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refState = useRef<{ ref: string; depositAmount: number | null } | null>(null);
  const reserveRef = useRef<() => void>(() => {});

  // Guard: must have guests (step 3) then a suite + fare (step 2). Bounce to whichever
  // is missing, latest-first so the guest lands on the earliest unfinished step.
  useEffect(() => {
    if (selection.guests.length === 0) {
      navigate(`/journeys/${journeyId}/book/details`, { replace: true });
    } else if (!selection.suiteCategory || !selection.fareCode) {
      navigate(`/journeys/${journeyId}/book/suite`, { replace: true });
    }
  }, [selection, journeyId, navigate]);

  const fare = detail?.fares.find(
    (f) => f.suite_category === selection.suiteCategory && f.fare_code === selection.fareCode && f.currency === 'EUR',
  );
  const maxOcc = suiteMaxOccupancy(detail, selection.suiteCategory, selection.fareCode);
  const party = clampParty(selection, maxOcc);
  const pricing = cabinPricing(detail, selection.suiteCategory, selection.fareCode, party);
  const total = pricing?.total ?? null;
  const items = fare?.items ?? [];
  const lead = selection.guests[0];

  async function ensureRequest(): Promise<{ ref: string; depositAmount: number | null }> {
    if (refState.current) {
      return refState.current;
    }
    // Always quote the party the selected suite can actually sleep, and send only that
    // many guest rows, so the charge and the booking record can never disagree.
    const headcount = party.adults + party.children + party.infants;
    const res = await api.bookings.request({
      journeyId,
      suiteCategory: selection.suiteCategory as string,
      fareCode: selection.fareCode as string,
      guestCount: headcount,
      adults: party.adults,
      children: party.children,
      infants: party.infants,
      guests: selection.guests.slice(0, headcount),
      message: selection.message,
    });
    refState.current = { ref: res.ref, depositAmount: res.depositAmount };
    setRequest(res);
    return { ref: res.ref, depositAmount: res.depositAmount };
  }

  async function handleReserve() {
    setError(null);
    setSubmitting(true);
    try {
      const r = await ensureRequest();
      // No online payment — the request is recorded as pending; go straight to confirmation.
      navigate(`/journeys/${journeyId}/book/confirmation/${r.ref}`);
    } catch {
      setError(t('booking.review.errorSubmit', { defaultValue: 'Sorry — we couldn’t submit your request just now. Please try again.' }));
    } finally {
      setSubmitting(false);
    }
  }
  reserveRef.current = handleReserve;

  // Register the wizard nav (rendered in the right summary box).
  useEffect(() => {
    setNav({
      backTo: `/journeys/${journeyId}/book/details`,
      nextLabel: submitting
        ? t('booking.review.submitting', { defaultValue: 'Submitting…' })
        : t('booking.review.requestToBook', { defaultValue: 'Request to book' }),
      nextDisabled: !consent || submitting,
      onNext: () => reserveRef.current(),
    });
  }, [journeyId, consent, submitting, setNav, t]);

  if (!detail) {
    return <div className="h-64 bg-cream-200 animate-pulse" />;
  }

  return (
    <div>
      <div className="eyebrow mb-3">{t('booking.review.eyebrow', { defaultValue: 'Step 4' })}</div>
      <h1 className="font-serif text-display-sm text-ink mb-8">{t('booking.review.title', { defaultValue: 'Review & reserve' })}</h1>

      {/* Selection summary */}
      <div className="bg-cream-soft border border-cream-300/60 p-6 md:p-7 mb-6">
        <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-ink-600 mb-1">{t('booking.review.suite', { defaultValue: 'Suite' })}</div>
            <div className="font-serif text-lg text-ink">{suiteLabel(selection.suiteCategory as string)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-ink-600 mb-1">{t('booking.review.fare', { defaultValue: 'Fare' })}</div>
            <div className="text-ink">{fareLabel(selection.fareCode as string)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-ink-600 mb-1">{t('booking.review.guests', { defaultValue: 'Guests' })}</div>
            <div className="text-ink">{selection.guestCount}{lead ? ` · ${lead.firstName} ${lead.lastName}` : ''}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-ink-600 mb-1">{t('booking.review.perPersonFare', { defaultValue: 'Per-person fare' })}</div>
            <div className="text-ink">{formatEUR(fare ? fare2A(fare.prices) : null)}</div>
          </div>
        </div>
        {items.length > 0 && (
          <div className="mt-5 pt-5 border-t border-cream-300/60 flex flex-wrap gap-2">
            {items.slice(0, 8).map((it) => (
              <span key={it} className="text-[0.6rem] uppercase tracking-[0.16em] text-ink-600 border border-cream-300/70 rounded-full px-3 py-1">{it}</span>
            ))}
          </div>
        )}
        {pricing && (
          <dl className="mt-5 pt-5 border-t border-cream-300/60 space-y-2 text-sm">
            {pricing.byType.adults.count > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-600">{pricing.solo
                  ? t('booking.review.adultSolo', { defaultValue: 'Adult · solo' })
                  : t('booking.review.adultsCount', { count: pricing.byType.adults.count, defaultValue: 'Adults · {{count}}' })}</dt>
                <dd className="text-ink tabular-nums">{formatEUR(pricing.byType.adults.total)}</dd>
              </div>
            )}
            {pricing.byType.children.count > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-600">{t('booking.review.childrenCount', { count: pricing.byType.children.count, defaultValue: 'Children · {{count}}' })}</dt>
                <dd className="text-ink tabular-nums">{formatEUR(pricing.byType.children.total)}</dd>
              </div>
            )}
            {pricing.byType.infants.count > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-600">{t('booking.review.infantsCount', { count: pricing.byType.infants.count, defaultValue: 'Infants · {{count}}' })}</dt>
                <dd className="text-ink tabular-nums">{pricing.byType.infants.total > 0 ? formatEUR(pricing.byType.infants.total) : t('booking.review.free', { defaultValue: 'Free' })}</dd>
              </div>
            )}
          </dl>
        )}
        <div className="mt-4 pt-4 border-t border-cream-300/60 flex items-end justify-between">
          <span className="text-xs uppercase tracking-[0.16em] text-ink-600">{pricing?.solo
            ? t('booking.review.soloFare', { defaultValue: 'Solo fare' })
            : t('booking.review.indicativeTotal', { defaultValue: 'Indicative total' })}</span>
          <span className="font-sans font-bold tabular-nums text-2xl text-ink">{formatEUR(total)}</span>
        </div>
      </div>

      {/* Message */}
      <div className="mb-6">
        <label htmlFor="booking-message" className="block text-[0.6rem] uppercase tracking-[0.18em] text-ink-600 mb-2">
          {t('booking.review.messageLabel', { defaultValue: 'Anything we should know?' })} <span className="text-ink-500 normal-case tracking-normal">{t('booking.review.optional', { defaultValue: '(optional)' })}</span>
        </label>
        <textarea
          id="booking-message"
          rows={4}
          defaultValue={selection.message ?? ''}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('booking.review.messagePlaceholder', { defaultValue: 'Special occasions, dietary needs, accessibility, preferred dates…' })}
          className="w-full resize-none rounded-card bg-cream border border-cream-300/70 px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-400 transition-colors focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink/15"
        />
      </div>

      <label className="flex items-start gap-3 mb-6 text-sm text-ink-600">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 accent-[#0C2340]" />
        <span>
          {paypalEnabled()
            ? t('booking.review.consentWithDeposit', { defaultValue: 'I understand this is a reservation request — availability and the final price are confirmed by the Explora team, and a refundable deposit secures my place. I agree to the booking terms.' })
            : t('booking.review.consent', { defaultValue: 'I understand this is a reservation request — availability and the final price are confirmed by the Explora team. I agree to the booking terms.' })}
        </span>
      </label>
      {error && <p className="text-sm text-red-700 mb-4">{error}</p>}
      <p className="text-xs text-ink-600">
        <Trans
          i18nKey="booking.review.helper"
          defaults="No live availability is taken from this request; our team confirms within 24 hours. Use the <cta>Request to book</cta> button on the right to continue."
          components={{ cta: <strong className="text-ink" /> }}
        />
      </p>
    </div>
  );
}
