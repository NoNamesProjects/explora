/**
 * Admin API client. Same shape as src/lib/api.ts but every call sends the
 * session cookie (credentials:'include') and a 401 fires a global event so the
 * AdminAuthProvider can bounce to the login screen from anywhere.
 */
import { ApiError } from '@/lib/api';
import type {
  AdminUser, BookingListRow, BookingDetail, BookingStatus, ContactRow, Paginated,
  IngestRun, CatalogHealth, CatalogJourneyRow, CatalogFareRow, Analytics, Diagnostics,
  AdminUserRow, AdminRole,
} from './types';

export const ADMIN_UNAUTHORIZED = 'explora:admin-unauthorized';

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new CustomEvent(ADMIN_UNAUTHORIZED));
    const body = await res.text().catch(() => '');
    let msg = body || res.statusText;
    try { const j = JSON.parse(body); if (j?.error) msg = j.error; } catch { /* keep text */ }
    throw new ApiError(res.status, msg);
  }
  const data = (await res.json()) as { ok?: boolean; error?: string } & Record<string, unknown>;
  if (data && data.ok === false) throw new ApiError(res.status, data.error ?? 'unknown');
  return data as T;
}

export const post = <T>(path: string, body?: unknown) =>
  adminFetch<T>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });

export const patch = <T>(path: string, body: unknown) =>
  adminFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });

export const del = <T>(path: string) => adminFetch<T>(path, { method: 'DELETE' });

export const put = <T>(path: string, body: unknown) =>
  adminFetch<T>(path, { method: 'PUT', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });

/** Build a query string, dropping null/undefined/'' values. */
export function qs(params: Record<string, string | number | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export interface BookingFilters {
  status?: string; q?: string; from?: string; to?: string; page?: number; pageSize?: number;
}
export interface ContactFilters { q?: string; from?: string; to?: string; page?: number; pageSize?: number; }

export const adminApi = {
  auth: {
    me: () => adminFetch<{ user: AdminUser }>('/api/admin/auth/me'),
    login: (email: string, password: string) =>
      post<{ user: AdminUser }>('/api/admin/auth/login', { email, password }),
    logout: () => post<{ ok: true }>('/api/admin/auth/logout'),
  },
  bookings: {
    list: (f: BookingFilters = {}) =>
      adminFetch<Paginated<BookingListRow>>('/api/admin/bookings' + qs({ ...f })),
    get: (id: number) => adminFetch<{ booking: BookingDetail }>(`/api/admin/bookings/${id}`),
    setStatus: (id: number, status: BookingStatus) =>
      patch<{ status: BookingStatus }>(`/api/admin/bookings/${id}`, { op: 'set-status', status }),
    addNote: (id: number, text: string) =>
      patch<{ adminNotes: BookingDetail['adminNotes'] }>(`/api/admin/bookings/${id}`, { op: 'add-note', text }),
    exportUrl: (f: BookingFilters = {}) => '/api/admin/bookings' + qs({ ...f, format: 'csv' }),
  },
  contacts: {
    list: (f: ContactFilters = {}) => adminFetch<Paginated<ContactRow>>('/api/admin/contacts' + qs({ ...f })),
    exportUrl: (f: ContactFilters = {}) => '/api/admin/contacts' + qs({ ...f, format: 'csv' }),
  },
  ingest: {
    run: () => post<{ mode: 'sync' | 'async'; runId?: string }>('/api/admin/ingest/run'),
    status: () => adminFetch<{ run: IngestRun | null }>('/api/admin/ingest/status'),
    history: (limit = 25) => adminFetch<{ runs: IngestRun[] }>('/api/admin/ingest/history' + qs({ limit })),
  },
  catalog: {
    health: () => adminFetch<{ health: CatalogHealth }>('/api/admin/catalog/health'),
    journeys: (f: Record<string, string | number | null | undefined> = {}) =>
      adminFetch<Paginated<CatalogJourneyRow>>('/api/admin/catalog/journeys' + qs(f)),
    fares: (journeyId: string) =>
      adminFetch<{ items: CatalogFareRow[] }>('/api/admin/catalog/fares' + qs({ journeyId })),
    ships: () => adminFetch<{ items: Record<string, unknown>[] }>('/api/admin/catalog/ships'),
    ports: () => adminFetch<{ items: Record<string, unknown>[] }>('/api/admin/catalog/ports'),
  },
  analytics: (from?: string, to?: string, granularity?: 'day' | 'week') =>
    adminFetch<{ analytics: Analytics }>('/api/admin/analytics/kpis' + qs({ from, to, granularity })),
  diagnostics: () => adminFetch<{ diagnostics: Diagnostics }>('/api/admin/diagnostics'),
  users: {
    list: () => adminFetch<{ items: AdminUserRow[] }>('/api/admin/users'),
    create: (b: { email: string; name: string; role: AdminRole; password: string }) =>
      post<{ user: AdminUserRow }>('/api/admin/users', b),
    update: (id: number, b: { role?: AdminRole; disabled?: boolean; password?: string }) =>
      patch<{ ok: true }>(`/api/admin/users/${id}`, b),
  },
};
