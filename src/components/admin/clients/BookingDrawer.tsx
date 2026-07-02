import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/admin/api';
import type { BookingDetail, BookingStatus } from '@/lib/admin/types';
import { BOOKING_STATUS, BOOKING_STATUS_ORDER } from '@/lib/admin/status';
import { money, dateTime } from '@/lib/admin/format';
import { Drawer } from '@/components/admin/ui/Drawer';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { Spinner } from '@/components/admin/ui/Spinner';
import { ErrorState } from '@/components/admin/ui/ErrorState';
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
  const { t } = useTranslation();
  const toast = useToast();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const load = useCallback(() => {
    if (bookingId == null) return;
    setLoading(true);
    setError(false);
    setBooking(null);
    adminApi.bookings
      .get(bookingId)
      .then((r) => setBooking(r.booking))
      .catch(() => {
        setError(true);
        toast.push({ tone: 'error', message: t('admin.clients.bookings.drawer.loadError', { defaultValue: 'Could not load this booking.' }) });
      })
      .finally(() => setLoading(false));
  }, [bookingId, toast, t]);

  useEffect(() => {
    if (!open || bookingId == null) return;
    load();
  }, [open, bookingId, load]);

  async function applyStatus(status: BookingStatus) {
    if (!booking || status === booking.status) return;
    const prev = booking.status;
    setBooking({ ...booking, status }); // optimistic
    setSavingStatus(true);
    try {
      await adminApi.bookings.setStatus(booking.id, status);
      toast.push({ tone: 'success', message: t('admin.clients.bookings.drawer.statusSetToast', { defaultValue: 'Status set to “{{status}}”.', status: t(`admin.status.booking.${status}`, { defaultValue: BOOKING_STATUS[status].label }) }) });
      onChanged();
    } catch {
      setBooking({ ...booking, status: prev }); // rollback
      toast.push({ tone: 'error', message: t('admin.clients.bookings.drawer.statusUpdateError', { defaultValue: 'Could not update status.' }) });
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
      toast.push({ tone: 'success', message: t('admin.clients.bookings.drawer.noteAdded', { defaultValue: 'Note added.' }) });
    } catch {
      toast.push({ tone: 'error', message: t('admin.clients.bookings.drawer.noteAddError', { defaultValue: 'Could not add the note.' }) });
    } finally {
      setAddingNote(false);
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => { if (!o) onClose(); }}
      title={booking ? booking.ref : t('admin.clients.bookings.drawer.title', { defaultValue: 'Booking' })}
      subtitle={booking ? <StatusBadge kind="booking" value={booking.status} /> : undefined}
    >
      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-ink-500"><Spinner /> {t('admin.clients.bookings.drawer.loading', { defaultValue: 'Loading…' })}</div>
      ) : error ? (
        <ErrorState title={t('admin.clients.bookings.drawer.errorTitle', { defaultValue: 'Could not load this booking' })} onRetry={load} />
      ) : !booking ? null : (
        <div className="space-y-7">
          {/* Status changer */}
          <section>
            <h3 className="mb-2 text-eyebrow uppercase tracking-eyebrow text-ink-500">{t('admin.clients.bookings.drawer.sections.status', { defaultValue: 'Status' })}</h3>
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
                    {t(`admin.status.booking.${s}`, { defaultValue: BOOKING_STATUS[s].label })}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Journey & money */}
          <section>
            <h3 className="mb-1 text-eyebrow uppercase tracking-eyebrow text-ink-500">{t('admin.clients.bookings.drawer.sections.journeyFare', { defaultValue: 'Journey & fare' })}</h3>
            <dl>
              <Field label={t('admin.clients.bookings.drawer.fields.journey', { defaultValue: 'Journey' })}>{booking.journeyId}</Field>
              <Field label={t('admin.clients.bookings.drawer.fields.suite', { defaultValue: 'Suite' })}>{booking.suiteCategory}</Field>
              <Field label={t('admin.clients.bookings.drawer.fields.fareCode', { defaultValue: 'Fare code' })}>{booking.fareCode}</Field>
              <Field label={t('admin.clients.bookings.drawer.fields.guests', { defaultValue: 'Guests' })}>{booking.guestCount}</Field>
              <Field label={t('admin.clients.bookings.drawer.fields.indicativeTotal', { defaultValue: 'Indicative total' })}>{money(booking.indicativeTotal, booking.currency)}</Field>
              <Field label={t('admin.clients.bookings.drawer.fields.deposit', { defaultValue: 'Deposit' })}>{money(booking.depositAmount, booking.currency)}</Field>
            </dl>
          </section>

          {/* Guests (full PII) */}
          <section>
            <h3 className="mb-2 text-eyebrow uppercase tracking-eyebrow text-ink-500">{t('admin.clients.bookings.drawer.sections.guests', { defaultValue: 'Guests' })}</h3>
            <div className="space-y-3">
              {booking.guests.map((g, i) => (
                <div key={i} className="rounded-card border border-cream-300 bg-cream-soft p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink">{g.title ? `${g.title} ` : ''}{g.firstName} {g.lastName}</span>
                    {g.lead && <span className="rounded-full bg-accent-gold/15 px-2 py-0.5 text-[0.65rem] uppercase tracking-eyebrow text-accent-tan">{t('admin.clients.bookings.drawer.guest.lead', { defaultValue: 'Lead' })}</span>}
                    {g.type && g.type !== 'adult' && <span className="text-[0.65rem] uppercase tracking-eyebrow text-ink-500">{g.type}</span>}
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-ink-600">
                    {g.email && <span>{g.email}</span>}
                    {g.phone && <span>{g.phoneCountry ? `${g.phoneCountry} ` : ''}{g.phone}</span>}
                    {g.nationality && <span>{t('admin.clients.bookings.drawer.guest.nationality', { defaultValue: 'Nationality' })}: {g.nationality}</span>}
                    {g.dateOfBirth && <span>{t('admin.clients.bookings.drawer.guest.dob', { defaultValue: 'DOB' })}: {g.dateOfBirth}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {booking.message && (
            <section>
              <h3 className="mb-1 text-eyebrow uppercase tracking-eyebrow text-ink-500">{t('admin.clients.bookings.drawer.sections.message', { defaultValue: 'Message' })}</h3>
              <p className="text-sm text-ink">{booking.message}</p>
            </section>
          )}

          {/* PayPal */}
          {(booking.paypalOrderId || booking.paypalCaptureId || booking.paidAt) && (
            <section>
              <h3 className="mb-1 text-eyebrow uppercase tracking-eyebrow text-ink-500">{t('admin.clients.bookings.drawer.sections.payment', { defaultValue: 'Payment' })}</h3>
              <dl>
                <Field label={t('admin.clients.bookings.drawer.fields.orderId', { defaultValue: 'Order id' })}>{booking.paypalOrderId}</Field>
                <Field label={t('admin.clients.bookings.drawer.fields.captureId', { defaultValue: 'Capture id' })}>{booking.paypalCaptureId}</Field>
                <Field label={t('admin.clients.bookings.drawer.fields.paidAt', { defaultValue: 'Paid at' })}>{booking.paidAt ? dateTime(booking.paidAt) : '—'}</Field>
              </dl>
            </section>
          )}

          {/* Notes */}
          <section>
            <h3 className="mb-2 text-eyebrow uppercase tracking-eyebrow text-ink-500">{t('admin.clients.bookings.drawer.sections.notes', { defaultValue: 'Internal notes' })}</h3>
            <div className="space-y-2">
              {booking.adminNotes.length === 0 && <p className="text-xs text-ink-500">{t('admin.clients.bookings.drawer.notes.empty', { defaultValue: 'No notes yet.' })}</p>}
              {booking.adminNotes.map((n) => (
                <div key={n.id} className="rounded-card border border-cream-300 bg-cream-soft p-3 text-sm">
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
                placeholder={t('admin.clients.bookings.drawer.notes.placeholder', { defaultValue: 'Add an internal note…' })}
                className="min-h-0 flex-1 rounded border border-cream-300 bg-white px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              />
              <button aria-label="Add note"
                type="button"
                onClick={addNote}
                disabled={addingNote || !noteText.trim()}
                className="btn-primary self-end px-4 py-2 text-[0.7rem] disabled:opacity-50"
              >
                {addingNote ? <Spinner className="text-cream" /> : t('admin.clients.bookings.drawer.notes.add', { defaultValue: 'Add' })}
              </button>
            </div>
          </section>

          <p className="border-t border-cream-300 pt-3 text-[0.7rem] text-ink-400">
            {t('admin.clients.bookings.drawer.footer.created', { defaultValue: 'Created' })} {dateTime(booking.createdAt)} · {t('admin.clients.bookings.drawer.footer.updated', { defaultValue: 'Updated' })} {dateTime(booking.updatedAt)}
          </p>
        </div>
      )}

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title={t('admin.clients.bookings.drawer.cancelDialog.title', { defaultValue: 'Cancel this booking?' })}
        body={t('admin.clients.bookings.drawer.cancelDialog.body', { defaultValue: 'This marks the booking as cancelled. No payment is refunded automatically — handle any refund separately.' })}
        confirmLabel={t('admin.clients.bookings.drawer.cancelDialog.confirmLabel', { defaultValue: 'Mark cancelled' })}
        tone="danger"
        onConfirm={() => { setConfirmCancel(false); void applyStatus('cancelled'); }}
      />
    </Drawer>
  );
}
