/**
 * Admin client for the manual fare-override seam
 * (api/admin/catalog/pricing/[journeyId].ts). Set / read / revert the "from"
 * (or per-suite) price that survives the nightly flatfile ingest.
 *
 * suiteCategory '' = the whole-journey "from" price. currency defaults to EUR.
 */
import { adminFetch, del, put, qs } from './api';

export interface FareOverride {
  journeyId: string;
  suiteCategory: string;
  currency: string;
  price: number | null;
  note: string | null;
  enabled: boolean;
  updatedAt: string;
}

export interface SetOverrideBody {
  suiteCategory?: string;
  currency?: string;
  price: number;
  note?: string;
  enabled?: boolean;
}

const base = (journeyId: string) => `/api/admin/catalog/pricing/${encodeURIComponent(journeyId)}`;

export const pricingApi = {
  /** All override rows recorded for a journey (whole-journey + per-suite). */
  list: (journeyId: string) =>
    adminFetch<{ ok: true; overrides: FareOverride[] }>(base(journeyId)),

  /** Set or update one override (UPSERT). */
  set: (journeyId: string, body: SetOverrideBody) =>
    put<{ ok: true; override: FareOverride }>(base(journeyId), body),

  /** Delete one override → revert that fare to the feed price. */
  revert: (journeyId: string, suiteCategory = '', currency = 'EUR') =>
    del<{ ok: true }>(base(journeyId) + qs({ suiteCategory, currency })),
};
