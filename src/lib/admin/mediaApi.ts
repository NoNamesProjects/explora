/**
 * Media library client API. Reads/writes go through the shared admin helpers
 * (cookie-credentialed `adminFetch` / `del` / `patch` from ./api), except the
 * binary UPLOAD which needs a raw-body POST — so that one uses a direct fetch,
 * mirroring adminFetch's 401 → ADMIN_UNAUTHORIZED + ApiError behaviour.
 */
import { ApiError } from '@/lib/api';
import { adminFetch, del, patch, qs, ADMIN_UNAUTHORIZED } from './api';

export interface MediaAsset {
  id: number;
  filename: string;
  url: string;
  originalName: string | null;
  mime: string | null;
  bytes: number | null;
  width: number | null;
  height: number | null;
  altEn: string | null;
  altEl: string | null;
  category: string | null;
  uploadedBy: number | null;
  createdAt: string;
}

export interface MediaListResponse {
  items: MediaAsset[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MediaFilters {
  category?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface UploadOpts {
  category?: string;
  altEn?: string;
  altEl?: string;
}

/** Editorial buckets an asset can be tagged with (mirrors media_assets.category). */
export const MEDIA_CATEGORIES = ['banner', 'ship', 'destination', 'suite', 'onboard', 'other'] as const;
export type MediaCategory = (typeof MEDIA_CATEGORIES)[number];

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // keep in sync with api/admin/media.ts
export const ACCEPT_ATTR = 'image/jpeg,image/png,image/webp,image/gif';

/** GET /api/admin/media — list, filter by category/search, paginate. */
export function listMedia(f: MediaFilters = {}): Promise<MediaListResponse> {
  return adminFetch<MediaListResponse>('/api/admin/media' + qs({ ...f }));
}

/**
 * POST /api/admin/media — upload one image as raw bytes (bypasses the JSON body
 * cap). Metadata rides in the query string; the mime is the Content-Type.
 */
export async function uploadMedia(file: File, opts: UploadOpts = {}): Promise<MediaAsset> {
  const query = qs({ filename: file.name, category: opts.category, altEn: opts.altEn, altEl: opts.altEl });
  const res = await fetch('/api/admin/media' + query, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': file.type || 'application/octet-stream', Accept: 'application/json' },
    body: file,
  });
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new CustomEvent(ADMIN_UNAUTHORIZED));
    const body = await res.text().catch(() => '');
    let msg = body || res.statusText;
    try { const j = JSON.parse(body); if (j?.error) msg = j.error; } catch { /* keep text */ }
    throw new ApiError(res.status, msg);
  }
  const data = (await res.json()) as { ok?: boolean; error?: string; asset?: MediaAsset };
  if (!data.ok || !data.asset) throw new ApiError(res.status, data.error ?? 'upload-failed');
  return data.asset;
}

/** PATCH /api/admin/media/:id — edit alt text / category. */
export function updateMedia(
  id: number,
  body: { altEn?: string | null; altEl?: string | null; category?: string | null },
): Promise<{ asset: MediaAsset }> {
  return patch<{ asset: MediaAsset }>(`/api/admin/media/${id}`, body);
}

/** DELETE /api/admin/media/:id — remove the file + row. */
export function removeMedia(id: number): Promise<{ ok: true }> {
  return del<{ ok: true }>(`/api/admin/media/${id}`);
}

/** Convenience namespace, matching the `adminApi.<area>` idiom used elsewhere. */
export const mediaApi = {
  list: listMedia,
  upload: uploadMedia,
  update: updateMedia,
  remove: removeMedia,
};
