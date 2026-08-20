import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/chrome/Header';
import { Footer } from '@/components/chrome/Footer';
import { CookieBanner } from '@/components/chrome/CookieBanner';
import { ScrollToTop } from '@/components/chrome/ScrollToTop';

function PageFallback() {
  return (
    <div className="container py-section-y">
      <div className="h-8 w-40 animate-pulse rounded bg-cream-300" />
      <div className="mt-6 h-64 w-full animate-pulse rounded bg-cream-300" />
    </div>
  );
}

/** The public marketing chrome (Header / Footer / CookieBanner). */
export function PublicLayout() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col">
      {/* Visually hidden until focused — the translated string existed but was
          never rendered, so keyboard/screen-reader users had no way to skip
          the header's nav + mega-menu on every page. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-card focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-cream"
      >
        {t('aria.skipToContent', { defaultValue: 'Skip to content' })}
      </a>
      <ScrollToTop />
      <Header />
      <main id="main-content" className="flex-1">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CookieBanner />
    </div>
  );
}
