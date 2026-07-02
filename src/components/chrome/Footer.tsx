import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { footerColumns } from '@/data/megaMenu';
import { Logo } from './Logo';
import { NewsletterInline } from '@/components/forms/NewsletterInline';
import { OPEN_COOKIES_EVENT } from './CookieBanner';

export function Footer() {
  const { t, i18n } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink text-cream">
      {/* Contact + Newsletter band */}
      <div className="container py-16 grid gap-12 md:grid-cols-2 border-b border-cream/15">
        <div>
          <div className="eyebrow text-cream/70 mb-5">{t('contact.title')}</div>
          <ul className="space-y-2.5 text-[0.95rem]">
            <li>
              <a href="mailto:cruises2greece@outlook.com" className="hover:opacity-65 transition-opacity">
                cruises2greece@outlook.com
              </a>
            </li>
            <li className="opacity-70 text-sm">{t('contact.callHours')}</li>
            <li className="pt-2">
              <Link
                to="/contact"
                className="inline-flex items-center px-4 py-2 text-[0.7rem] uppercase tracking-[0.18em] font-medium border border-cream/40 hover:bg-cream hover:text-ink transition-colors"
              >
                {t('contact.sendMessage')}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="eyebrow text-cream/70 mb-5">{t('newsletter.title')}</div>
          <p className="font-serif text-2xl leading-tight mb-6 max-w-md">
            {t('newsletter.subtitle')}
          </p>
          <NewsletterInline variant="dark" />
        </div>
      </div>

      {/* Columns */}
      <div className="container py-16 grid gap-12 md:grid-cols-2 lg:grid-cols-4">
        {footerColumns.map((col) => (
          <div key={col.titleKey}>
            <div className="eyebrow text-cream/70 mb-6">{t(col.titleKey)}</div>
            <ul className="space-y-3 text-[0.9rem]">
              {col.links.map((l) => {
                const external = 'external' in l && l.external;
                const isCookies = l.href === '#cookies';
                return (
                  <li key={l.labelKey + l.href}>
                    {isCookies ? (
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new Event(OPEN_COOKIES_EVENT))}
                        className="hover:opacity-65 transition-opacity"
                      >
                        {t(l.labelKey)}
                      </button>
                    ) : external ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:opacity-65 transition-opacity"
                      >
                        {t(l.labelKey)}
                      </a>
                    ) : (
                      <Link
                        to={l.href}
                        className="hover:opacity-65 transition-opacity"
                      >
                        {t(l.labelKey)}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom band */}
      <div className="container py-10 border-t border-cream/15 flex flex-col gap-6 md:flex-row md:items-center md:justify-between text-xs">
        <div className="flex items-center gap-8">
          <Logo variant="light" />
          <span className="opacity-50">{t('footer.legal.copyright')} {year}</span>
        </div>
        <div className="flex items-center gap-5 opacity-70 uppercase tracking-[0.12em] text-[0.7rem]">
          <span>{i18n.language === 'el' ? 'Ελληνικά' : 'English'}</span>
        </div>
      </div>
    </footer>
  );
}
