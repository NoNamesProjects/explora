import { useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useBooking } from '@/context/BookingContext';
import { groupSuites, cabinPricing, suiteMaxOccupancy, suiteFitsParty } from '@/lib/bookingUI';
import { clampParty, MAX_GUESTS } from '@/lib/guestRules';
import { SuiteOfferCard } from './SuiteOfferCard';

export function SuiteFareStep() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { journeyId, detail, loading, selection, setSuiteFare, setNav } = useBooking();

  // The party was chosen on step 1 (always defaulted to ≥1 adult); a suite can only be
  // continued with if it sleeps everyone. The guest picks the suite here — nothing is
  // preselected. Guests themselves are captured later, on step 3.
  const party = clampParty(selection, MAX_GUESTS);
  const partySize = party.adults + party.children + party.infants;
  const canContinue =
    !!(selection.suiteCategory && selection.fareCode) &&
    suiteFitsParty(detail, selection.suiteCategory, selection.fareCode, party);

  // Register the wizard nav (rendered in the right-hand summary box).
  useEffect(() => {
    setNav({
      backTo: `/journeys/${journeyId}/book/guests`,
      backLabel: t('booking.fare.back', { defaultValue: 'Back' }),
      nextLabel: t('booking.fare.next', { defaultValue: 'Next' }),
      nextDisabled: !canContinue,
      onNext: () => navigate(`/journeys/${journeyId}/book/details`),
    });
  }, [journeyId, canContinue, navigate, setNav, t]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="h-3 w-16 bg-cream-200 animate-pulse" />
          <div className="h-9 w-72 max-w-full bg-cream-200 animate-pulse" />
        </div>
        <div className="space-y-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-cream-soft border border-cream-300/60 p-6 space-y-4">
              <div className="h-6 w-48 bg-cream-200 animate-pulse" />
              <div className="h-16 w-full bg-cream-200 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const groups = groupSuites(detail);

  // Show only suites that can sleep the whole party — non-fitting suites are hidden
  // entirely (never rendered as disabled cards) so the guest is only ever offered, and
  // quoted, a suite they can actually book for this party.
  const cards = groups
    .filter((g) => suiteFitsParty(detail, g.code, g.fares[0].fare_code, party))
    .map((g) => {
      const occ = suiteMaxOccupancy(detail, g.code, g.fares[0].fare_code);
      const total = cabinPricing(detail, g.code, g.fares[0].fare_code, party)?.total ?? null;
      return { group: g, occ, total };
    });
  const anyFits = cards.length > 0;

  return (
    <div className="space-y-8">
      <header>
        <div className="eyebrow mb-3">{t('booking.fare.step', { defaultValue: 'Step 2' })}</div>
        <h1 className="font-serif text-display-sm text-ink">{t('booking.fare.title', { defaultValue: 'Choose your suite' })}</h1>
      </header>

      {groups.length === 0 ? (
        <div className="py-20 text-center text-ink-600">
          {t('booking.fare.faresBeingFinalised', { defaultValue: 'Fares for this sailing are being finalised.' })}
        </div>
      ) : !anyFits ? (
        <div className="space-y-5 mt-8">
          <div className="border border-cream-300/60 bg-cream-soft p-5 text-sm text-ink-600">
            <Trans
              i18nKey="booking.fare.noFitMessage"
              values={{ count: partySize }}
              defaults="The suites on this sailing sleep fewer than {{count}} guests. <reduceLink>Reduce the number of guests</reduceLink> to continue."
              components={{
                reduceLink: (
                  <Link to={`/journeys/${journeyId}/book/guests`} className="link-underline text-ink" />
                ),
              }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-5 mt-8">
          {cards.map((c) => (
            <SuiteOfferCard
              key={c.group.code}
              group={c.group}
              shipCd={detail!.journey.shipCd}
              selectedSuite={selection.suiteCategory}
              onSelect={setSuiteFare}
              partySize={partySize}
              total={c.total}
              occ={c.occ}
              fits={true}
            />
          ))}
        </div>
      )}

    </div>
  );
}
