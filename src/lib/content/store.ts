/**
 * Runtime override stores for structured (src/data) and media content.
 *
 * i18n copy is overlaid straight onto i18next (see ContentContext); this module
 * holds the two override kinds that are NOT i18n keys — structured data fields
 * and media slots — behind synchronous getters so non-React modules (e.g.
 * src/data/regions.ts) can read them exactly like they already read i18n.t().
 */
import i18n from '@/i18n';
import type { ContentBundle, MediaValue } from './types';

type LocaleMap = Record<string, unknown>; // locale ('' = agnostic) → value
const dataStore = new Map<string, LocaleMap>();
const mediaStore = new Map<string, MediaValue>();
let contentVersion = 0;

/** Active 2-letter locale ('en' | 'el'), read at call time. */
export function currentLocale(): string {
  const l = i18n.language || 'en';
  return l.startsWith('el') ? 'el' : 'en';
}

/** Seed the data + media stores from a fetched bundle (idempotent, replaces). */
export function loadContentStores(bundle: Pick<ContentBundle, 'data' | 'media' | 'version'>): void {
  dataStore.clear();
  for (const [k, byLocale] of Object.entries(bundle.data ?? {})) {
    if (byLocale && typeof byLocale === 'object') dataStore.set(k, byLocale as LocaleMap);
  }
  mediaStore.clear();
  for (const [k, v] of Object.entries(bundle.media ?? {})) {
    if (v && typeof (v as MediaValue).src === 'string') mediaStore.set(k, v as MediaValue);
  }
  contentVersion = bundle.version ?? 0;
}

/**
 * Structured-content override lookup: returns the client-set value for `key` in
 * the active locale (falling back to the locale-agnostic value, then the code
 * `fallback`). Drop this into the existing data accessors (e.g. regionCopy()).
 */
export function content<T>(key: string, fallback: T, locale: string = currentLocale()): T {
  const byLocale = dataStore.get(key);
  if (!byLocale) return fallback;
  if (byLocale[locale] != null) return byLocale[locale] as T;
  if (byLocale[''] != null) return byLocale[''] as T;
  return fallback;
}

/** Media slot override → its src, or null. Keys are full ('media.home.hero'). */
export function mediaSrc(key: string): string | null {
  return mediaStore.get(key)?.src ?? null;
}

export function mediaValue(key: string): MediaValue | null {
  return mediaStore.get(key) ?? null;
}

export function getContentVersion(): number {
  return contentVersion;
}
