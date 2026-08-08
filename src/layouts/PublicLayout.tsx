import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
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
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Header />
      <main className="flex-1">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CookieBanner />
    </div>
  );
}
