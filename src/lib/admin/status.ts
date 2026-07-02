// Status → {label, classes} maps. Color is never the only signal — every badge
// also carries its text (and a dot in the StatusBadge component).
import type { BookingStatus, IngestStatus } from './types';

export const BOOKING_STATUS: Record<BookingStatus, { label: string; classes: string }> = {
  pending:      { label: 'Pending',      classes: 'bg-accent-gold/12 text-accent-tan border-accent-gold/30' },
  deposit_paid: { label: 'Deposit paid', classes: 'bg-accent-mist/15 text-ink-700 border-accent-mist/40' },
  confirmed:    { label: 'Confirmed',    classes: 'bg-accent-patina/15 text-accent-patina border-accent-patina/30' },
  cancelled:    { label: 'Cancelled',    classes: 'bg-cream-300/60 text-ink-500 border-cream-400/60' },
};

export const BOOKING_STATUS_ORDER: BookingStatus[] = ['pending', 'deposit_paid', 'confirmed', 'cancelled'];

export const INGEST_STATUS: Record<IngestStatus, { label: string; classes: string }> = {
  running:  { label: 'Running',  classes: 'bg-accent-mist/15 text-ink-700 border-accent-mist/40' },
  ok:       { label: 'OK',       classes: 'bg-accent-patina/15 text-accent-patina border-accent-patina/30' },
  aborted:  { label: 'Aborted',  classes: 'bg-accent-gold/12 text-accent-tan border-accent-gold/30' },
  failed:   { label: 'Failed',   classes: 'bg-red-100 text-red-700 border-red-300' },
};
