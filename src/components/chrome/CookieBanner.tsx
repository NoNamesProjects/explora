import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const KEY = 'explora:cookies';
/** Footer "Cookies" link dispatches this to re-open the banner. */
export const OPEN_COOKIES_EVENT = 'explora:open-cookies';

/**
 * GDPR cookie-consent banner. localStorage-gated (shows once until a choice is
 * made); the footer "Cookies" link re-opens it via a window event.
 * Reskinned to Explora tokens from the Pame_Costa pattern.
 */
export function CookieBanner() {
  const { t } = useTranslation();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShown(true);
    } catch { /* private mode — show once per session */ setShown(true); }
    const reopen = () => setShown(true);
    window.addEventListener(OPEN_COOKIES_EVENT, reopen);
    return () => window.removeEventListener(OPEN_COOKIES_EVENT, reopen);
  }, []);

  if (!shown) return null;

  const choose = (v: 'accepted' | 'declined') => {
    try { localStorage.setItem(KEY, v); } catch { /* ignore */ }
    setShown(false);
  };

  return (
    <div
      role="dialog"
      aria-label={t('cookies.title')}
      className="fixed left-4 right-4 bottom-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-50 mx-auto max-w-[680px] bg-cream border border-cream-300 shadow-lg p-5 md:p-6 flex flex-col md:flex-row gap-4 md:items-center"
    >
      <div className="flex-1">
        <div className="font-serif text-lg text-ink mb-1">{t('cookies.title')}</div>
        <p className="text-[0.85rem] text-ink-600 leading-relaxed">{t('cookies.body')}</p>
      </div>
      <div className="flex gap-3 shrink-0">
        <button
          type="button"
          onClick={() => choose('declined')}
          className="px-4 py-2.5 text-[0.7rem] uppercase tracking-[0.16em] font-medium border border-ink/30 text-ink hover:bg-ink hover:text-cream transition-colors"
        >
          {t('cookies.decline')}
        </button>
        <button
          type="button"
          onClick={() => choose('accepted')}
          className="px-5 py-2.5 text-[0.7rem] uppercase tracking-[0.16em] font-medium bg-ink text-cream hover:bg-ink-soft transition-colors"
        >
          {t('cookies.accept')}
        </button>
      </div>
    </div>
  );
}
