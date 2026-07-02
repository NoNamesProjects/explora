import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'explora.promoBar.dismissedAt';

/** Thin dismissible offer strip above the header. Italic-serif lede + sans tail. */
export function PromoBar() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    // Re-show after 7 days.
    if (!dismissed || Date.now() - Number(dismissed) > 7 * 24 * 60 * 60 * 1000) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="bg-cream-strong text-ink relative border-b border-cream-300/40">
      <div className="container flex items-center justify-center gap-3 py-2 text-[0.72rem]">
        <Link
          to="/find-your-journey"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity underline underline-offset-4 decoration-1"
        >
          <span className="font-serif text-ink">
            {t('promo.invitationLede')}
          </span>
          <span aria-hidden className="opacity-50 no-underline">·</span>
          <span className="uppercase tracking-[0.12em] text-ink">
            {t('promo.invitationTail')}
          </span>
        </Link>
        <button
          type="button"
          aria-label={t('common.close')}
          className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity text-base leading-none text-ink"
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, String(Date.now()));
            setVisible(false);
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
