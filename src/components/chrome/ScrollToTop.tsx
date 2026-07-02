import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * React Router v6 preserves the window scroll position across route changes, so a
 * card / category / menu link clicked near the bottom of a long page lands the new
 * page already scrolled down. This resets scroll to the top on every route (pathname)
 * change. Keyed on `pathname` only — search-param pagination (FindAJourney `?page=`)
 * and the in-page hash sub-navs share a pathname, so they're left undisturbed.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Instant jump — animating a full-page scroll on every navigation looks janky.
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
