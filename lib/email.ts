/**
 * Best-effort booking-request notification via Resend. NEVER throws to the
 * caller — a captured deposit must never be lost because an email failed
 * (the fail-soft principle). Returns true only if the email was accepted.
 */

interface NotifyBooking {
  ref: string;
  journeyId: string | null;
  suiteCategory: string | null;
  fareCode: string | null;
  currency: string;
  guestCount: number;
  indicativeTotal: number | null;
  depositAmount: number | null;
  status: string;
  message?: string | null;
  guests: Array<{
    title?: string; firstName?: string; lastName?: string;
    email?: string; phone?: string; nationality?: string; dateOfBirth?: string; type?: string;
  }>;
}

function esc(s?: string | null): string {
  return (s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));
}

export async function sendBookingNotification(b: NotifyBooking): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.BOOKING_NOTIFY_EMAIL || process.env.RESEND_FROM;
  const from = process.env.RESEND_FROM || 'Explora Journeys <onboarding@resend.dev>';
  if (!key || !to) {
    console.log(`[booking] ${b.ref} notify skipped (no RESEND_API_KEY) — status=${b.status}, guests=${b.guestCount}`);
    return false;
  }
  const lead = b.guests?.[0] ?? {};
  const money = (n: number | null) => (n != null ? `${b.currency} ${n.toLocaleString()}` : '—');
  const nAdults = b.guests.filter((g) => g.type === 'adult' || !g.type).length;
  const nChildren = b.guests.filter((g) => g.type === 'child').length;
  const nInfants = b.guests.filter((g) => g.type === 'infant').length;
  const guestRows = b.guests
    .map((g, i) => `<tr><td style="padding:4px 10px 4px 0">${i + 1}. ${esc(g.firstName)} ${esc(g.lastName)}</td><td style="padding:4px 10px">${esc(g.nationality)}</td><td style="padding:4px 10px">${esc(g.dateOfBirth)}</td><td style="padding:4px 10px">${esc(g.email)} ${esc(g.phone)}</td></tr>`)
    .join('');
  const html = `
    <div style="font-family:system-ui,sans-serif;color:#0C2340">
      <h2 style="margin:0 0 4px">New booking request — ${esc(b.ref)}</h2>
      <p style="margin:0 0 16px;color:#4F6573">Status: <strong>${esc(b.status)}</strong> · please confirm availability and the final price.</p>
      <table style="border-collapse:collapse;margin-bottom:16px">
        <tr><td style="padding:2px 12px 2px 0;color:#4F6573">Journey</td><td><strong>${esc(b.journeyId)}</strong></td></tr>
        <tr><td style="padding:2px 12px 2px 0;color:#4F6573">Suite</td><td>${esc(b.suiteCategory)} · fare ${esc(b.fareCode)}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;color:#4F6573">Guests</td><td>${b.guestCount}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;color:#4F6573">Party</td><td>${nAdults} adults · ${nChildren} children · ${nInfants} infants</td></tr>
        <tr><td style="padding:2px 12px 2px 0;color:#4F6573">Indicative total</td><td>${money(b.indicativeTotal)}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;color:#4F6573">Deposit</td><td><strong>${money(b.depositAmount)}</strong></td></tr>
      </table>
      <table style="border-collapse:collapse;font-size:14px">${guestRows}</table>
      ${b.message ? `<p style="margin-top:16px;color:#4F6573">Message: ${esc(b.message)}</p>` : ''}
    </div>`;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, reply_to: lead.email || undefined, subject: `New booking request ${b.ref} — ${b.status}`, html }),
    });
    if (!res.ok) { console.error(`[booking] ${b.ref} Resend ${res.status}`); return false; }
    return true;
  } catch (e) {
    console.error(`[booking] ${b.ref} notify failed:`, e instanceof Error ? e.message : e);
    return false;
  }
}
