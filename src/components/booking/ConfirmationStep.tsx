import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, type BookingRequestRecord } from '@/lib/api';
import { suiteLabel, fareLabel, formatEUR } from '@/lib/bookingUI';
import { useBooking } from '@/context/BookingContext';

/**
 * Final step of the booking wizard. Fetches the persisted booking request by
 * its reference and presents a premium confirmation. Clears the wizard
 * session once on mount so a fresh flow starts clean.
 */
export function ConfirmationStep() {
  const { t } = useTranslation();
  const { ref } = useParams<{ ref: string }>();
  const { reset } = useBooking();
  const [booking, setBooking] = useState<BookingRequestRecord | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Clear the wizard session exactly once on mount — the request is now
  // persisted server-side, so the in-flight selection is no longer needed.
  // `reset` isn't referentially stable (the context value isn't memoized),
  // so we hold it in a ref and fire from a mount-only effect.
  const resetRef = useRef(reset);
  resetRef.current = reset;
  useEffect(() => {
    resetRef.current();
  }, []);

  useEffect(() => {
    if (!ref) {
      setError(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    api.bookings
      .get(ref)
      .then((res) => { if (!cancelled) setBooking(res.booking); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ref]);

  if (loading) {
    return (
      <div className="container py-section-y max-w-editorial">
        <div className="mx-auto h-16 w-16 rounded-full bg-cream-200 animate-pulse mb-8" />
        <div className="h-12 bg-cream-200 animate-pulse w-2/3 mx-auto mb-6" />
        <div className="h-6 bg-cream-200 animate-pulse w-1/3 mx-auto" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container py-section-y text-center max-w-editorial">
        <h1 className="font-serif text-display mb-6 leading-tight">
          {t('booking.confirmation.notFoundTitle', { defaultValue: "We couldn't find that request" })}
        </h1>
        <p className="text-ink-600 mb-10 max-w-prose mx-auto text-lg">
          {t('booking.confirmation.notFoundBody', { defaultValue: 'The booking reference may be incorrect or the request is no longer available.' })}
        </p>
        <Link to="/find-your-journey" className="btn-secondary">{t('booking.confirmation.browseMore', { defaultValue: 'Browse more journeys' })}</Link>
      </div>
    );
  }

  const depositPaid = booking.status === 'deposit_paid';

  return (
    <div className="container py-section-y max-w-editorial">
      <div className="text-center">
        {/* Circular check badge */}
        <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-ink text-cream">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7"
            aria-hidden="true"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="eyebrow mb-4">{t('booking.confirmation.eyebrow', { defaultValue: 'Booking request' })}</div>
        <h1 className="font-serif text-display mb-10 leading-tight">{t('booking.confirmation.thankYou', { defaultValue: 'Thank you' })}</h1>

        {/* Reference */}
        <div className="mb-3 text-eyebrow uppercase tracking-eyebrow text-ink-600">{t('booking.confirmation.reference', { defaultValue: 'Reference' })}</div>
        <div className="font-serif text-3xl tracking-wide text-ink">{booking.ref}</div>

        {/* Status line */}
        <p className="mt-6 text-lg text-ink-600">
          {depositPaid
            ? t('booking.confirmation.depositReceived', { amount: formatEUR(booking.depositAmount), defaultValue: 'Deposit received — {{amount}} paid' })
            : t('booking.confirmation.requestSent', { defaultValue: 'Request sent' })}
        </p>
      </div>

      {/* Summary card */}
      <div className="mt-12 bg-cream-soft border border-cream-300/60 p-6 md:p-8">
        <div className="eyebrow mb-6">{t('booking.confirmation.yourSelection', { defaultValue: 'Your selection' })}</div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
          <SummaryRow label={t('booking.confirmation.suite', { defaultValue: 'Suite' })} value={suiteLabel(booking.suiteCategory ?? '')} />
          <SummaryRow label={t('booking.confirmation.fare', { defaultValue: 'Fare' })} value={fareLabel(booking.fareCode ?? '')} />
          <SummaryRow label={t('booking.confirmation.guests', { defaultValue: 'Guests' })} value={String(booking.guestCount)} />
          <SummaryRow label={t('booking.confirmation.indicativeTotal', { defaultValue: 'Indicative total' })} value={formatEUR(booking.indicativeTotal)} />
          <SummaryRow label={t('booking.confirmation.deposit', { defaultValue: 'Deposit' })} value={formatEUR(booking.depositAmount)} />
        </dl>
      </div>

      {/* Reassurance */}
      <p className="mt-10 text-center text-ink-600 max-w-prose mx-auto text-lg text-pretty">
        {t('booking.confirmation.reassurance', { defaultValue: "Our cruise team will confirm availability and the final price, then arrange the balance. You'll hear from us shortly." })}
      </p>

      {/* Actions */}
      <div className="mt-12 flex flex-col items-center gap-6">
        <Link to="/find-your-journey" className="btn-secondary">{t('booking.confirmation.browseMore', { defaultValue: 'Browse more journeys' })}</Link>
        <Link to="/" className="link-underline">{t('booking.confirmation.returnHome', { defaultValue: 'Return home' })}</Link>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-cream-300/60 pb-3 sm:border-0 sm:pb-0">
      <dt className="text-eyebrow uppercase tracking-eyebrow text-ink-600">{label}</dt>
      <dd className="text-base text-ink text-right">{value}</dd>
    </div>
  );
}
