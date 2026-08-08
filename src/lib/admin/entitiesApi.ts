/**
 * Admin client for site_entities — the ships and destinations an admin can now
 * create, edit and retire without a developer.
 */
import { adminFetch, post, put, del, qs } from './api';

export interface AdminEntity {
  id: number;
  kind: string;
  slug: string;
  nameEn: string;
  nameEl: string;
  groupKey: string | null;
  visible: boolean;
  position: number;
  fields: Record<string, unknown>;
  updatedAt: string | null;
}

export const entitiesApi = {
  list: (kind?: string) =>
    adminFetch<{ items: AdminEntity[] }>('/api/admin/entities' + qs({ kind: kind ?? '' })),

  create: (body: { kind: string; slug: string; nameEn: string; nameEl?: string; groupKey?: string | null }) =>
    post<{ entity: AdminEntity }>('/api/admin/entities', body),

  update: (
    slug: string,
    body: Partial<{ nameEn: string; nameEl: string; groupKey: string | null; visible: boolean; position: number; fields: unknown }>,
  ) => put<{ entity: AdminEntity }>(`/api/admin/entities/${encodeURIComponent(slug)}`, body),

  /** Also removes the entity's detail-page sections (they'd be unreachable). */
  remove: (slug: string) =>
    del<{ sectionsRemoved: number }>(`/api/admin/entities/${encodeURIComponent(slug)}`),
};
