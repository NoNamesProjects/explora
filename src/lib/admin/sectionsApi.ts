/**
 * Admin client for the page-builder (page_sections). Thin wrappers over the
 * shared cookie-credentialed fetchers in ./api, same idiom as pricingApi /
 * contentApi.
 */
import { adminFetch, post, put, del, qs } from './api';

export interface AdminSection {
  id: number;
  pageKey: string;
  entitySlug: string | null;
  sectionType: string;
  slug: string;
  position: number;
  visible: boolean;
  config: Record<string, unknown>;
  isNew: boolean;
  deleted: boolean;
  /** Draft differs from what's live — drives the "unpublished" badge. */
  dirty: boolean;
  updatedAt: string | null;
  publishedAt: string | null;
}

export const sectionsApi = {
  list: (pageKey: string, entitySlug?: string | null) =>
    adminFetch<{ items: AdminSection[] }>('/api/admin/sections' + qs({ page: pageKey, entity: entitySlug ?? '' })),

  create: (body: { pageKey: string; entitySlug?: string | null; sectionType: string; slug?: string }) =>
    post<{ section: AdminSection }>('/api/admin/sections', body),

  update: (id: number, body: { config?: unknown; visible?: boolean; slug?: string }) =>
    put<{ section: AdminSection }>(`/api/admin/sections/${id}`, body),

  /** Stages a delete for a published section; hard-deletes one never published. */
  remove: (id: number) => del<{ section?: AdminSection; removed?: boolean }>(`/api/admin/sections/${id}`),

  restore: (id: number) => del<{ section: AdminSection }>(`/api/admin/sections/${id}?restore=1`),

  reorder: (pageKey: string, entitySlug: string | null, orderedIds: number[]) =>
    post<{ items: AdminSection[] }>('/api/admin/sections/reorder', { pageKey, entitySlug, orderedIds }),

  publish: (pageKey: string, entitySlug?: string | null) =>
    post<{ published: number; deleted: number; items: AdminSection[] }>(
      '/api/admin/sections/publish', { pageKey, entitySlug: entitySlug ?? null },
    ),
};

/** The public route a page key previews on, with the draft flag appended. */
export function previewUrlFor(pageKey: string, entitySlug?: string | null): string {
  const base =
    pageKey === 'home' ? '/'
    : pageKey === 'ships-index' ? '/ships'
    : pageKey === 'destinations-index' ? '/destinations'
    : pageKey === 'ship-detail' ? `/ships/${entitySlug ?? ''}`
    : pageKey === 'destination-detail' ? `/destinations/${entitySlug ?? ''}`
    : '/';
  return `${base}?cms_preview=1`;
}
