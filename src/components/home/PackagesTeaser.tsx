import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, type JourneyCard as JourneyCardData } from '@/lib/api';
import { JourneyCard } from '@/components/journey/JourneyCard';

/**
 * Small "packages" teaser for the home page: the next few sailings pulled live
 * from /api/journeys, rendered with the shared <JourneyCard>, plus a single
 * "view all" button through to the full Find-a-Journey page.
 */
export function PackagesTeaser() {
  const { t } = useTranslation();
  const [cards, setCards] = useState<JourneyCardData[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.journeys
      .search({ pageSize: 3 })
      .then((r) => { if (!cancelled) setCards(r.journeys); })
      .catch(() => { if (!cancelled) setCards([]); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      {cards === null ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-80 bg-cream-200 animate-pulse" />
          ))}
        </div>
      ) : cards.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((j, i) => (
            <JourneyCard key={j.journeyId} card={j} index={i} />
          ))}
        </div>
      ) : null}

      <div className="text-center mt-12">
        <Link to="/find-your-journey" className="btn-primary">
          {t('home.packages.viewAll')}
        </Link>
      </div>
    </div>
  );
}
