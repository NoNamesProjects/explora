/**
 * Typed fetchers around /api/* endpoints. Server functions live under
 * /api/ (Vercel) or are mounted via server.js on cPanel.
 *
 * Server endpoints wrap responses in `{ ok: true, ...payload }`. These
 * helpers unwrap that and throw ApiError on `{ ok: false }` or non-2xx.
 */

const API_BASE = ''; // same-origin

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(`API ${status}: ${message}`);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(res.status, body || res.statusText);
  }
  const data = (await res.json()) as { ok?: boolean; error?: string } & Record<string, unknown>;
  if (data && data.ok === false) {
    throw new ApiError(res.status, data.error ?? 'unknown');
  }
  return data as T;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  return getJson<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── Types ──────────────────────────────────────────────────────────────

export interface JourneyCard {
  journeyId: string;
  shipCd: string;
  shipName: string | null;
  itinDesc: string | null;
  region: string | null;
  sailingPort: string | null;
  terminationPort: string | null;
  sailingPortName: string | null;
  terminationPortName: string | null;
  sailingDate: string;
  nights: number;
  lowestPriceEUR: number | null;
  /** Full ordered list of real destinations (sea days excluded). */
  destinations: JourneyDestination[];
  /** Owner-managed custom package (not from the Explora flatfile). */
  isCustom?: boolean;
  /** Custom packages carry their own hero image; feed cards derive one from ship/port codes. */
  heroImage?: string | null;
}

/** One destination stop on a journey card. */
export interface JourneyDestination {
  code: string;
  name: string;
  day: number;
  country: string | null;
  arrivalTime: string | null;
  departureTime: string | null;
}

export interface JourneyDay {
  dayNumber: number;
  portCd: string | null;
  portName: string | null;
  country: string | null;
  lat: number | null;
  lon: number | null;
  arrivalTime: string | null;
  departureTime: string | null;
  overnight: boolean;
  description: string | null;
}

export interface JourneyDetail {
  journey: {
    journeyId: string;
    shipCd: string;
    itinCd: string;
    itinDesc: string | null;
    region: string | null;
    sailingPort: string | null;
    terminationPort: string | null;
    sailingPortName: string | null;
    terminationPortName: string | null;
    sailingDate: string;
    nights: number;
    embkTime: string | null;
    disEmbkTime: string | null;
    /** Lowest EUR fare, after any manual override. Emitted by the detail API. */
    lowestPriceEUR?: number | null;
    priceOverridden?: boolean;
    /** ── Custom packages only (owner-managed, not from the flatfile) ── */
    isCustom?: boolean;
    titleEl?: string | null;
    summary?: string | null;
    summaryEl?: string | null;
    description?: string | null;
    descriptionEl?: string | null;
    heroImage?: string | null;
    photos?: Array<{ url: string; altEn?: string | null; altEl?: string | null }>;
    inclusions?: string[];
  };
  ship: {
    ship_cd: string;
    ship_name: string;
    decks: number | null;
    capacity: number | null;
    launch_year: number | null;
    hero_image: string | null;
  } | null;
  days: JourneyDay[];
  fares: Array<{
    fare_code: string;
    fare_desc: string | null;
    price_type: string | null;
    suite_category: string;
    prices: Record<string, number | null>;
    currency: string;
    gft: { adt: number; chd?: number } | null;
    ncf: { adt: number } | null;
    fare_start_date: string | null;
    fare_end_date: string | null;
    now_available: boolean;
    items: string[];
    // Per-guest-type components: thirdFourthAdult/Child/Infant, soloFare, soloSupplPct.
    raw: Record<string, number | null> | null;
  }>;
}

export type JourneySort = 'date' | 'price-asc' | 'price-desc' | 'nights-asc' | 'nights-desc';

export interface JourneySearchParams {
  region?: string;
  ship?: string;
  month?: string;        // YYYY-MM
  nights?: number;
  minNights?: number;
  maxNights?: number;
  departurePort?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: JourneySort;
  page?: number;
  pageSize?: number;
}

export interface JourneySearchResult {
  ok: true;
  page: number;
  pageSize: number;
  total: number;
  journeys: JourneyCard[];
}

/** Stable filter options + slider bounds for the Find-a-Journey filter bar. */
export interface JourneyFacets {
  /** Available destination slugs given the OTHER current selections (omitted by old servers). */
  regions?: string[];
  /** Available ship codes (EP0x) given the OTHER current selections. */
  ships?: string[];
  /** Available departure months (YYYY-MM) given the OTHER current selections. */
  months?: string[];
  embarkPorts: Array<{ code: string; name: string }>;
  nightsMin: number;
  nightsMax: number;
  priceMin: number;
  priceMax: number;
}

/** Current selections sent to the faceted endpoint so each list narrows to the rest. */
export interface JourneyFacetParams {
  region?: string;
  ship?: string;
  month?: string;
  departurePort?: string;
}

// ─── Booking request (quote + PayPal deposit) ────────────────────────────

export interface BookingGuest {
  title?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  phoneCountry?: string;
  nationality?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  lead?: boolean;
  type?: 'adult' | 'child' | 'infant';
}

export interface BookingRequestInput {
  journeyId: string;
  suiteCategory: string;
  fareCode: string;
  guestCount: number;
  adults?: number;
  children?: number;
  infants?: number;
  guests: BookingGuest[];
  message?: string;
}

export interface BookingRequestResult {
  ok: true;
  ref: string;
  currency: string;
  indicativeTotal: number | null;
  depositAmount: number | null;
  paypalConfigured: boolean;
}

export interface BookingRequestRecord {
  ref: string;
  journeyId: string;
  suiteCategory: string | null;
  fareCode: string | null;
  currency: string;
  guestCount: number;
  guests: BookingGuest[];
  indicativeTotal: number | null;
  depositAmount: number | null;
  status: 'pending' | 'deposit_paid' | 'confirmed' | 'cancelled';
  paidAt: string | null;
  createdAt: string;
}

// ─── API ────────────────────────────────────────────────────────────────

export const api = {
  journeys: {
    search: (params: JourneySearchParams = {}) => {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v != null && v !== '') qs.set(k, String(v));
      }
      return getJson<JourneySearchResult>(`/api/journeys${qs.toString() ? `?${qs}` : ''}`);
    },
    byId: (id: string) =>
      getJson<{ ok: true } & JourneyDetail>(`/api/journeys/${encodeURIComponent(id)}`),
    facets: (params: JourneyFacetParams = {}) => {
      const qs = new URLSearchParams({ facets: '1' });
      if (params.region) qs.set('region', params.region);
      if (params.ship) qs.set('ship', params.ship);
      if (params.month) qs.set('month', params.month);
      if (params.departurePort) qs.set('departurePort', params.departurePort);
      return getJson<{ ok: true; facets: JourneyFacets }>(`/api/journeys?${qs}`).then((r) => r.facets);
    },
  },
  destinations: {
    /**
     * Per-region {total, nightsMin, nightsMax, priceFrom} for every region, in
     * one request. Replaces the old pattern of firing a search + a facets call
     * PER region (~20-22 concurrent requests for one /destinations page load,
     * against a DB pool capped at 8 — see api/destinations-stats.ts).
     */
    stats: () =>
      getJson<{ ok: true; stats: Record<string, { total: number; nightsMin: number | null; nightsMax: number | null; priceFrom: number | null }> }>(
        '/api/destinations-stats',
      ).then((r) => r.stats),
  },
  bookings: {
    /** Create a pending booking request; server recomputes the deposit from the fare. */
    request: (input: BookingRequestInput) =>
      postJson<BookingRequestResult>('/api/booking-request', input),
    get: (ref: string, email?: string) =>
      getJson<{ ok: true; booking: BookingRequestRecord }>(
        `/api/booking-request/${encodeURIComponent(ref)}${email ? `?email=${encodeURIComponent(email)}` : ''}`,
      ),
    paypalCreateOrder: (ref: string) =>
      postJson<{ ok: true; orderId: string }>('/api/paypal/create-order', { ref }),
    paypalCaptureOrder: (ref: string, orderId: string) =>
      postJson<{ ok: true; ref: string; status: string }>('/api/paypal/capture-order', { ref, orderId }),
  },
  ships: {
    all: () => getJson<{ ok: true; ships: Array<Record<string, unknown>> }>('/api/ships'),
    byCode: (code: string) =>
      getJson<{ ok: true; ship: Record<string, unknown> }>(`/api/ships/${encodeURIComponent(code)}`),
  },
  ports: {
    all: () => getJson<{ ok: true; ports: Array<Record<string, unknown>> }>('/api/ports'),
  },
  newsletter: {
    subscribe: (email: string, consent: boolean) =>
      postJson<{ ok: boolean }>('/api/newsletter', { email, consent }),
  },
  contact: {
    submit: (data: { name: string; email: string; phone?: string; message: string }) =>
      postJson<{ ok: boolean }>('/api/contact', data),
  },
};
