import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin/api';
import type { BookingDetail, BookingStatus } from '@/lib/admin/types';
import { BOOKING_STATUS, BOOKING_STATUS_ORDER } from '@/lib/admin/status';
import { money, dateTime } from '@/lib/admin/format';
import { Drawer } from '@/components/admin/ui/Drawer';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { Spinner } from '@/components/admin/ui/Spinner';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { useToast } from '@/components/admin/ui/Toast';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <dt className="w-32 shrink-0 text-eyebrow uppercase tracking-eyebrow text-ink-500 pt-0.5">{label}</dt>
      <dd className="min-w-0 text-ink">{children || '—'}</dd>
    </div>
  );
}

export function BookingDrawer({
  bookingId, open, onClose, onChanged,
}: {
  bookingId: number | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    if (!open || bookingId == null) return;
    setLoading(true);
    setBooking(null);
    adminApi.bookings
      .get(bookingId)
      .then((r) => setBooking(r.booking))
      .catch(() => toast.push({ tone: 'error', message: 'Could not load this booking.' }))
      .finally(() => setLoading(false));
  }, [open, bookingId, toast]);

  async function applyStatus(status: BookingStatus) {
    if (!booking || status === booking.status) return;
    const prev = booking.status;
    setBooking({ ...booking, status }); // optimistic
    setSavingStatus(true);
    try {
      await adminApi.bookings.setStatus(booking.id, status);
      toast.push({ tone: 'success', message: `Status set to “${BOOKING_STATUS[status].label}”.` });
      onChanged();
    } catch {
      setBooking({ ...booking, status: prev }); // rollback
      toast.push({ tone: 'error', message: 'Could not update status.' });
    } finally {
      setSavingStatus(false);
    }
  }

  function onStatusClick(status: BookingStatus) {
    if (status === 'cancelled') { setConfirmCancel(true); return; }
    void applyStatus(status);
  }

  async function addNote() {
    if (!booking || !noteText.trim()) return;
    setAddingNote(true);
    try {
      const r = await adminApi.bookings.addNote(booking.id, noteText.trim());
      setBooking({ ...booking, adminNotes: r.adminNotes });
      setNoteText('');
    } catch {
      toast.push({ tone: 'error', message: 'Could not add the note.' });
    } finally {
      setAddingNote(false);
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => { if (!o) onClose(); }}
      title={booking ? booking.ref : 'Booking'}
      subtitle={booking ? <StatusBadge kind="booking" value={booking.status} /> : undefined}
    >
      {loading || !booking ? (
        <div className="flex items-center gap-2 py-10 text-sm text-ink-500"><Spinner /> Loading…</div>
      ) : (
        <div className="space-y-7">
          {/* Status changer */}
          <section>
            <h3 className="mb-2 text-eyebrow uppercase tracking-eyebrow text-ink-500">Status</h3>
            <div className="flex flex-wrap gap-2">
              {BOOKING_STATUS_ORDER.map((s) => {
                const active = booking.status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={savingStatus}
                    onClick={() => onStatusClick(s)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                      active ? BOOKING_STATUS[s].classes : 'border-cream-300 text-ink-500 hover:bg-cream-200'
                    }`}
                  >
                    {BOOKING_STATUS[s].label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Journey & money */}
          <section>
            <h3 className="mb-1 text-eyebrow uppercase tracking-eyebrow text-ink-500">Journey &amp; fare</h3>
            <dl>
              <Field label="Journey">{booking.journeyId}</Field>
              <Field label="Suite">{booking.suiteCategory}</Field>
              <Field label="Fare code">{booking.fareCode}</Field>
              <Field label="Guests">{booking.guestCount}</Field>
              <Field label="Indicative total">{money(booking.indicativeTotal, booking.currency)}</Field>
              <Field label="Deposit">{money(booking.depositAmount, booking.currency)}</Field>
            </dl>
          </section>

          {/* Guests (full PII) */}
          <section>
            <h3 className="mb-2 text-eyebrow uppercase tracking-eyebrow text-ink-500">Guests</h3>
            <div className="space-y-3">
              {booking.guests.map((g, i) => (
                <div key={i} className="rounded-card border border-cream-300 bg-white p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink">{g.title ? `${g.title} ` : ''}{g.firstName} {g.lastName}</span>
                    {g.lead && <span className="rounded-full bg-accent-gold/15 px-2 py-0.5 text-[0.65rem] uppercase tracking-eyebrow text-accent-tan">Lead</span>}
                    {g.type && g.type !== 'adult' && <span className="text-[0.65rem] uppercase tracking-eyebrow text-ink-500">{g.type}</span>}
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-ink-600">
                    {g.email && <span>{g.email}</span>}
                    {g.phone && <span>{g.phoneCountry ? `${g.phoneCountry} ` : ''}{g.phone}</span>}
                    {g.nationality && <span>Nationality: {g.nationality}</span>}
                    {g.dateOfBirth && <span>DOB: {g.dateOfBirth}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {booking.message && (
            <section>
              <h3 className="mb-1 text-eyebrow uppercase tracking-eyebrow text-ink-500">Message</h3>
              <p className="text-sm text-ink">{booking.message}</p>
            </section>
          )}

          {/* PayPal */}
          {(booking.paypalOrderId || booking.paypalCaptureId || booking.paidAt) && (
            <section>
              <h3 className="mb-1 text-eyebrow uppercase tracking-eyebrow text-ink-500">Payment</h3>
              <dl>
                <Field label="Order id">{booking.paypalOrderId}</Field>
                <Field label="Capture id">{booking.paypalCaptureId}</Field>
                <Field label="Paid at">{booking.paidAt ? dateTime(booking.paidAt) : '—'}</Field>
              </dl>
            </section>
          )}

          {/* Notes */}
          <section>
            <h3 className="mb-2 text-eyebrow uppercase tracking-eyebrow text-ink-500">Internal notes</h3>
            <div className="space-y-2">
              {booking.adminNotes.length === 0 && <p className="text-xs text-ink-500">No notes yet.</p>}
              {booking.adminNotes.map((n) => (
                <div key={n.id} className="rounded-card border border-cream-300 bg-white p-3 text-sm">
                  <p className="text-ink">{n.text}</p>
                  <p className="mt-1 text-[0.7rem] text-ink-500">{n.byName} · {dateTime(n.at)}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={2}
                placeholder="Add an internal note…"
                className="min-h-0 flex-1 rounded border border-cream-300 bg-white px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              />
              <button
                type="button"
                onClick={addNote}
                disabled={addingNote || !noteText.trim()}
                className="btn-primary self-end px-4 py-2 text-[0.7rem] disabled:opacity-50"
              >
                {addingNote ? <Spinner className="text-cream" /> : 'Add'}
              </button>
            </div>
          </section>

          <p className="border-t border-cream-300 pt-3 text-[0.7rem] text-ink-400">
            Created {dateTime(booking.createdAt)} · Updated {dateTime(booking.updatedAt)}
          </p>
        </div>
      )}

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel this booking?"
        body="This marks the booking as cancelled. No payment is refunded automatically — handle any refund separately."
        confirmLabel="Mark cancelled"
        tone="danger"
        onConfirm={() => { setConfirmCancel(false); void applyStatus('cancelled'); }}
      />
    </Drawer>
  );
}
