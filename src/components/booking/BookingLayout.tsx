import { useParams, Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookingProvider, useBooking } from '@/context/BookingContext';
import { BookingProgress } from './BookingProgress';
import { PackagePanel } from './PackagePanel';

function currentStep(pathname: string): number {
  if (pathname.includes('/confirmation')) return 5;
  if (pathname.endsWith('/review')) return 4;
  if (pathname.endsWith('/details')) return 3;
  if (pathname.endsWith('/suite')) return 2;
  return 1; // /guests (and the index redirect) is the first step
}

function Shell() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const step = currentStep(pathname);
  const { journeyId } = useBooking();
  return (
    <div className="bg-cream min-h-screen">
      <section className="pt-28 pb-7 border-b border-cream-300/60">
        <div className="container flex items-center justify-between gap-4">
          <Link to={`/journeys/${journeyId}`} className="link-underline text-ink-600 inline-flex items-baseline gap-1.5">
            <span aria-hidden>‹</span><span>{t('booking.layout.backToJourney', { defaultValue: 'Back to journey' })}</span>
          </Link>
          {step < 5 && <BookingProgress current={step} />}
        </div>
      </section>
      <section className="py-section-y">
        <div className="container grid gap-10 lg:gap-14 lg:grid-cols-[1.7fr,1fr] items-start max-w-page">
          <div className="min-w-0"><Outlet /></div>
          {step < 5 && <PackagePanel step={step} />}
        </div>
      </section>
    </div>
  );
}

export function BookingLayout() {
  const { id = '' } = useParams();
  return (
    <BookingProvider journeyId={id}>
      <Shell />
    </BookingProvider>
  );
}
