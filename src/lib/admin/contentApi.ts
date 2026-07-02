/**
 * Client API for the CONTENT-ADMIN editor. Thin wrappers over the shared admin
 * fetchers (which carry the session cookie + surface 401s). All calls hit
 * /api/admin/content and /api/admin/content/publish.
 */
import { adminFetch, put, post, del } from './api';
import type { EditableField } from '@/content/registry';

/** The stored draft/published pair for one (key, locale). */
export interface FieldValuePair {
  draft: unknown;
  published: unknown;
}

/** key → locale ('en'|'el'|'') → { draft, published }. */
export type ContentValues = Record<string, Record<string, FieldValuePair>>;

export interface ContentPayload {
  ok: true;
  fields: EditableField[];
  values: ContentValues;
}

/** Which locales a field is stored under: bilingual → en+el, else agnostic (''). */
export function localesFor(field: EditableField): string[] {
  return field.bilingual ? ['en', 'el'] : [''];
}

export const contentApi = {
  /** Registry + every stored draft/published value. */
  get: () => adminFetch<ContentPayload>('/api/admin/content'),

  /** Write a draft value for one (key, locale). */
  saveDraft: (key: string, locale: string, value: unknown) =>
    put<{ ok: true }>('/api/admin/content', { key, locale, value }),

  /** Publish pending drafts — all of them, or just the given keys. */
  publish: (keys?: string[]) =>
    post<{ ok: true; published: number }>(
      '/api/admin/content/publish',
      keys && keys.length ? { keys } : {},
    ),

  /** Throw away an unpublished draft, keeping the live value. */
  discardDraft: (key: string, locale: string) =>
    post<{ ok: true }>('/api/admin/content/publish', { op: 'revert', key, locale }),

  /** Clear the published override (fall back to the code default), keeping any draft. */
  resetToDefault: (key: string, locale: string) =>
    post<{ ok: true }>('/api/admin/content/publish', { op: 'reset', key, locale }),

  /** Remove the override row entirely — draft + published gone, back to code default. */
  clearOverride: (key: string, locale: string) =>
    del<{ ok: true }>(
      `/api/admin/content/publish?key=${encodeURIComponent(key)}&locale=${encodeURIComponent(locale)}`,
    ),
};
