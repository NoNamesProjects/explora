import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type JourneyDetail, type BookingGuest, type BookingRequestResult } from '@/lib/api';

/**
 * Booking-wizard state, shared across the steps. Selection persists to
 * sessionStorage (per journey) so a refresh mid-flow doesn't lose it; the
 * journey detail is fetched once. Mirrors cruise2greece's URL+session approach.
 */
export interface BookingSelection {
  suiteCategory?: string;
  fareCode?: string;
  guestCount: number;
  adults?: number;
  children?: number;
  infants?: number;
  guests: BookingGuest[];
  message?: string;
}

/** Step nav rendered inside the right summary box: a Back link + the step's primary action. */
export interface BookingNavState {
  backTo?: string;
  backLabel?: string;
  nextLabel?: string;
  nextDisabled?: boolean;
  onNext?: () => void;
  showNext?: boolean;
}

interface BookingState {
  journeyId: string;
  detail: JourneyDetail | null;
  loading: boolean;
  selection: BookingSelection;
  setSuiteFare: (suiteCategory: string, fareCode: string) => void;
  setGuests: (guestCount: number, guests: BookingGuest[]) => void;
  setParty: (p: { adults: number; children: number; infants: number }) => void;
  setMessage: (message: string) => void;
  request: BookingRequestResult | null;
  setRequest: (r: BookingRequestResult | null) => void;
  nav: BookingNavState;
  setNav: (nav: BookingNavState) => void;
  reset: () => void;
}

const Ctx = createContext<BookingState | null>(null);

export function useBooking(): BookingState {
  const c = useContext(Ctx);
  if (!c) throw new Error('useBooking must be used within a BookingProvider');
  return c;
}

export function BookingProvider({ journeyId, children }: { journeyId: string; children: ReactNode }) {
  const key = `explora_booking_${journeyId}`;
  const [detail, setDetail] = useState<JourneyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<BookingSelection>(() => {
    try {
      const s = sessionStorage.getItem(key);
      if (s) return JSON.parse(s) as BookingSelection;
    } catch { /* ignore */ }
    return { guestCount: 2, adults: 2, children: 0, infants: 0, guests: [] };
  });
  const [request, setRequest] = useState<BookingRequestResult | null>(null);
  const [nav, setNav] = useState<BookingNavState>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.journeys.byId(journeyId)
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch(() => { /* surfaced by steps */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [journeyId]);

  useEffect(() => {
    try { sessionStorage.setItem(key, JSON.stringify(selection)); } catch { /* ignore */ }
  }, [key, selection]);

  const value: BookingState = {
    journeyId,
    detail,
    loading,
    selection,
    setSuiteFare: (suiteCategory, fareCode) => setSelection((s) => ({ ...s, suiteCategory, fareCode })),
    setGuests: (guestCount, guests) => setSelection((s) => ({ ...s, guestCount, guests })),
    setParty: (p) => setSelection((s) => ({ ...s, adults: p.adults, children: p.children, infants: p.infants, guestCount: p.adults + p.children + p.infants })),
    setMessage: (message) => setSelection((s) => ({ ...s, message })),
    request,
    setRequest,
    nav,
    setNav,
    reset: () => {
      try { sessionStorage.removeItem(key); } catch { /* ignore */ }
      setSelection({ guestCount: 2, adults: 2, children: 0, infants: 0, guests: [] });
      setRequest(null);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
