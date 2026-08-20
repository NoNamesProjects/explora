/**
 * Admin client for the owner's custom packages (offers outside the Explora
 * flatfile). Mirrors entitiesApi: thin typed wrappers over adminFetch.
 */
import { adminFetch, post, patch, del } from './api';

export interface CustomPhoto {
  url: string;
  altEn?: string | null;
  altEl?: string | null;
}

export interface CustomItineraryDay {
  dayNumber?: number;
  portName?: string | null;
  country?: string | null;
  arrivalTime?: string | null;
  departureTime?: string | null;
  overnight?: boolean;
  description?: string | null;
}

/** A suite's full rate card — same components as an Explora flatfile fare. */
export interface CustomPackageFare {
  id?: number;
  suiteCategory: string;
  suiteName?: string | null;
  fareCode: string;
  fareLabel?: string | null;
  currency?: string;
  perPerson: number | null;
  thirdFourthAdult?: number | null;
  thirdFourthChild?: number | null;
  thirdFourthInfant?: number | null;
  soloFare?: number | null;
  soloSupplPct?: number | null;
  nowAvailable?: boolean;
  items?: string[];
  sortOrder?: number;
}

export interface CustomPackage {
  id: number;
  publicId: string;
  slug: string;
  titleEn: string;
  titleEl: string | null;
  summaryEn: string | null;
  summaryEl: string | null;
  descriptionEn: string | null;
  descriptionEl: string | null;
  region: string | null;
  nights: number;
  sailingDate: string | null;
  sailingPortName: string | null;
  terminationPortName: string | null;
  heroImage: string | null;
  photos: CustomPhoto[];
  itinerary: CustomItineraryDay[];
  inclusions: string[];
  depositPct: number | null;
  visible: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  fares: CustomPackageFare[];
}

export type CustomPackagePatch = Partial<
  Omit<CustomPackage, 'id' | 'publicId' | 'slug' | 'createdAt' | 'updatedAt' | 'fares'>
> & { fares?: CustomPackageFare[] };

export const customPackagesApi = {
  list: () =>
    adminFetch<{ ok: true; items: CustomPackage[] }>('/api/admin/custom-packages').then((r) => r.items),

  get: (id: number) =>
    adminFetch<{ ok: true; package: CustomPackage }>(`/api/admin/custom-packages/${id}`).then((r) => r.package),

  create: (input: { titleEn: string; titleEl?: string | null; slug?: string }) =>
    post<{ ok: true; package: CustomPackage }>('/api/admin/custom-packages', input).then((r) => r.package),

  update: (id: number, input: CustomPackagePatch) =>
    patch<{ ok: true; package: CustomPackage }>(`/api/admin/custom-packages/${id}`, input).then((r) => r.package),

  remove: (id: number) => del<{ ok: true }>(`/api/admin/custom-packages/${id}`),
};
