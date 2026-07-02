// Shared admin-console types (frontend mirror of the api/admin/* responses).

export type AdminRole = 'admin' | 'agent';

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: AdminRole;
}

export type BookingStatus = 'pending' | 'deposit_paid' | 'confirmed' | 'cancelled';

export interface BookingListRow {
  id: number;
  ref: string;
  journeyId: string | null;
  suiteCategory: string | null;
  currency: string;
  guestCount: number;
  indicativeTotal: number | null;
  depositAmount: number | null;
  status: BookingStatus;
  paidAt: string | null;
  createdAt: string;
  leadName: string | null;
  leadEmail: string | null;
}

export interface BookingGuest {
  title?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  phoneCountry?: string;
  nationality?: string;
  dateOfBirth?: string;
  lead?: boolean;
  type?: 'adult' | 'child' | 'infant';
}

export interface BookingNote {
  id: string;
  at: string;
  by: number | null;
  byName: string;
  text: string;
}

export interface BookingDetail {
  id: number;
  ref: string;
  journeyId: string | null;
  suiteCategory: string | null;
  fareCode: string | null;
  currency: string;
  guestCount: number;
  guests: BookingGuest[];
  indicativeTotal: number | null;
  depositAmount: number | null;
  status: BookingStatus;
  paypalOrderId: string | null;
  paypalCaptureId: string | null;
  paidAt: string | null;
  notifySentAt: string | null;
  message: string | null;
  adminNotes: BookingNote[];
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactRow {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type IngestStatus = 'running' | 'ok' | 'aborted' | 'failed';

export interface IngestRun {
  runId: string;
  startedAt: string;
  finishedAt: string | null;
  journeyCount: number;
  fareCount: number;
  failedFiles: number;
  status: IngestStatus;
  notes: string | null;
}

export interface CatalogHealth {
  journeysTotal: number;
  journeysActive: number;
  journeysSoftDeleted: number;
  aboutToPurge: number;
  faresTotal: number;
  shipsTotal: number;
  portsTotal: number;
  suitesTotal: number;
  excursionsTotal: number;
  journeysFresh: string | null;
  faresFresh: string | null;
  lastRun: IngestRun | null;
}

export interface CatalogJourneyRow {
  journeyId: string;
  shipCd: string;
  shipName: string | null;
  itinDesc: string | null;
  region: string | null;
  sailingPort: string | null;
  terminationPort: string | null;
  sailingDate: string;
  nights: number;
  isAvailable: boolean;
  consecutiveMissing: number;
  lastSeenAt: string;
  fareCount: number;
}

export interface CatalogFareRow {
  fareCode: string;
  fareDesc: string | null;
  priceType: string | null;
  suiteCategory: string | null;
  currency: string;
  prices: Record<string, unknown>;
  nowAvailable: boolean;
}

export interface Analytics {
  totals: {
    requests: number;
    converted: number;
    deposits: number;
    contacts: number;
    conversionRate: number;
  };
  series: Array<{ bucket: string; requests: number; converted: number; deposits: number }>;
  byStatus: Array<{ status: BookingStatus; n: number; deposits: number }>;
  topJourneys: Array<{ journeyId: string | null; itinDesc: string | null; region: string | null; n: number; deposits: number }>;
}

export interface DiagnosticCheck {
  configured: boolean;
  reachable?: boolean;
  mode?: string;
  driver?: string;
}
export interface Diagnostics {
  generatedAt: string;
  checks: Record<string, DiagnosticCheck>;
}

export interface AdminUserRow extends AdminUser {
  disabled: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}
