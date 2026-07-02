import { useTranslation } from 'react-i18next';
import { ShipsGrid } from '@/components/ships/ShipsGrid';
import { visibleShips } from '@/data/megaMenu';
import { shipCountWord } from '@/lib/shipCount';

/**
 * Home "Our Fleet" section — the "{N} ships, one philosophy" heading above the
 * shared fleet grid (ShipsGrid). The count word tracks how many vessels are
 * actually visible, so it stays accurate as ships are hidden/launched. The grid
 * markup is shared with the /ships fleet index page.
 */
export function ShipCarousel() {
  const { t, i18n } = useTranslation();
  const count = shipCountWord(visibleShips.length, i18n.language);

  return (
    <div>
      {/* Heading */}
      <div className="mb-8 md:mb-12 max-w-2xl">
        <div className="eyebrow mb-3">{t('home.fleet.eyebrow')}</div>
        <h2 className="font-serif text-display-sm md:text-display leading-[1.05] text-ink text-balance">
          {t('home.fleet.titleLead', { word: count })}{' '}
          <em className="not-italic font-medium">{t('home.fleet.title')}</em>
        </h2>
      </div>

      <ShipsGrid />
    </div>
  );
}
