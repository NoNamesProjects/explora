import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import el from './locales/el.json';

const STORAGE_KEY = 'explora.locale';
const fromStorage = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
const initial = fromStorage === 'el' || fromStorage === 'en' ? fromStorage : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    el: { translation: el },
  },
  lng: initial,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  // Repaint components when the CMS overlay calls addResource ('added'). Without
  // this, a runtime override overlays the resources but the UI shows defaults
  // until the next language toggle.
  react: { bindI18n: 'languageChanged loaded added removed' },
});

/**
 * Overlay client-edited copy onto i18next. Each key is set wholesale via
 * addResource (setPath overwrites the leaf — so a rich-doc replaces a string
 * and a shorter list array replaces cleanly, no stale tail). Called both
 * synchronously from window.__CONTENT__ at boot (zero flash) and again by
 * ContentProvider after a fetch / live update.
 */
export function applyI18nOverlay(bundle: {
  en?: Record<string, unknown>;
  el?: Record<string, unknown>;
} | null | undefined): void {
  if (!bundle) return;
  for (const lng of ['en', 'el'] as const) {
    const map = bundle[lng];
    if (!map) continue;
    for (const [key, value] of Object.entries(map)) {
      if (!key || key.includes('__proto__') || key.includes('constructor') || key.includes('prototype')) continue;
      i18n.addResource(lng, 'translation', key, value as string, { silent: true });
    }
  }
  i18n.emit('added'); // one repaint after the batch
}

// Zero-flash path: server (server.js) inlines window.__CONTENT__ before the
// bundle runs; apply its i18n overlay synchronously during module init.
if (typeof window !== 'undefined') {
  const boot = (window as unknown as { __CONTENT__?: { i18n?: { en?: Record<string, unknown>; el?: Record<string, unknown> } } }).__CONTENT__;
  if (boot?.i18n) applyI18nOverlay(boot.i18n);
}

/** Keep persisted locale + <html lang> in sync with the active language. */
function syncDocumentLang(lng: string) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng.startsWith('el') ? 'el' : 'en';
  }
}

i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, lng);
  syncDocumentLang(lng);
});

// Set the initial <html lang> once on load (before any toggle).
syncDocumentLang(initial);

export default i18n;
