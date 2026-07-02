import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as Dialog from '@radix-ui/react-dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { visibleShips } from '@/data/megaMenu';
import { Logo } from './Logo';
import { LanguageToggle } from './LanguageToggle';

const REGIONS = [
  { slug: 'mediterranean', key: 'mediterranean' },
  { slug: 'caribbean', key: 'caribbean' },
  { slug: 'northern-europe', key: 'northernEurope' },
  { slug: 'asia', key: 'asia' },
  { slug: 'alaska', key: 'alaska' },
  { slug: 'world-journey', key: 'worldJourney' },
] as const;

/**
 * Mobile/tablet navigation drawer (`< lg`, where the desktop mega-menu is
 * hidden). Hamburger → Radix Dialog slide-over with the primary links:
 * Find a Journey · Destinations · Ships · Contact.
 */
export function MobileNav() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const sectionCls = 'text-eyebrow uppercase tracking-eyebrow text-ink-600 mb-3';
  const linkCls = 'block py-2 text-ink hover:text-accent-patina transition-colors';

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label={t('aria.openMenu')}
          className="lg:hidden inline-flex items-center justify-center p-1.5 text-accent-gold hover:text-ink transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm data-[state=open]:animate-[fadeUp_240ms_ease-out]" />
        <Dialog.Content className="fixed right-0 top-0 z-50 h-full w-[min(86vw,360px)] bg-cream shadow-2xl overflow-y-auto data-[state=open]:animate-[fadeUp_300ms_ease-out] focus:outline-none">
          <VisuallyHidden.Root>
            <Dialog.Title>{t('aria.openMenu')}</Dialog.Title>
          </VisuallyHidden.Root>

          <div className="flex items-center justify-between px-6 py-4 border-b border-cream-300/60">
            <Logo />
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label={t('aria.closeMenu')}
                className="p-1.5 text-accent-gold hover:text-ink transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </Dialog.Close>
          </div>

          <nav className="px-6 py-6 space-y-8">
            <Dialog.Close asChild>
              <Link to="/find-your-journey" className="block font-serif text-2xl text-ink hover:text-accent-patina transition-colors">
                {t('nav.findAJourney')}
              </Link>
            </Dialog.Close>

            <div>
              <div className={sectionCls}>{t('nav.destinations')}</div>
              {REGIONS.map((r) => (
                <Dialog.Close asChild key={r.slug}>
                  <Link to={`/destinations/${r.slug}`} className={linkCls}>
                    {t(`mega.destinations.regions.${r.key}`)}
                  </Link>
                </Dialog.Close>
              ))}
            </div>

            <div>
              <div className={sectionCls}>{t('nav.ships')}</div>
              {visibleShips.map((s) => (
                <Dialog.Close asChild key={s.code}>
                  <Link to={`/ships/${s.code}`} className={linkCls}>
                    {t(s.labelKey)}
                  </Link>
                </Dialog.Close>
              ))}
            </div>

            <div className="pt-4 border-t border-cream-300/60 flex flex-col gap-3">
              <LanguageToggle className="self-start" />
              <Dialog.Close asChild>
                <Link to="/contact" className="btn-secondary justify-center text-center">
                  {t('nav.contact')}
                </Link>
              </Dialog.Close>
              <Dialog.Close asChild>
                <Link to="/find-your-journey" className="btn-primary justify-center text-center">
                  {t('cta.reserve')}
                </Link>
              </Dialog.Close>
            </div>
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
