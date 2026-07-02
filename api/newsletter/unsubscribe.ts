/**
 * /api/newsletter/unsubscribe?token= — GDPR unsubscribe.
 *
 * GET renders a one-button interstitial (mail scanners prefetch GETs, which
 * used to silently mass-unsubscribe recipients); the POST stamps
 * unsubscribed_at (idempotent: an already-unsubscribed row still shows the
 * confirmation page). The POST branch doubles as the RFC 8058 one-click
 * endpoint targeted by the List-Unsubscribe-Post header on broadcasts, so
 * mail clients' native "Unsubscribe" buttons keep working with zero clicks.
 * Every broadcast email carries a per-recipient link.
 *
 * Server-side only — never import from src/.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { db } from '../../lib/db/client';
import { baseUrl } from '../newsletter';

function sendHtml(res: ServerResponse, status: number, html: string): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(html);
}

function page(opts: { heading: string; body: string; home: string; homeLabel: string; action?: { url: string; label: string } }): string {
  const cta = opts.action
    ? `<form method="post" action="${opts.action.url}"><button class="btn" type="submit">${opts.action.label}</button></form>`
    : `<a class="btn" href="${opts.home}">${opts.homeLabel}</a>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${opts.heading}</title>
<style>
  :root { color-scheme: light; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#f4efe9; color:#2b2622; font-family:Georgia,'Times New Roman',serif; padding:24px; }
  .card { max-width:480px; text-align:center; }
  h1 { font-weight:400; font-size:28px; margin:0 0 14px; letter-spacing:.01em; }
  p { color:#4a433c; font-size:16px; line-height:1.6; margin:0 0 28px; }
  a.btn, button.btn { display:inline-block; background:#1c2a33; color:#f4efe9; text-decoration:none;
          padding:12px 24px; border-radius:6px; font-size:15px; border:0; font-family:inherit; cursor:pointer; }
  a.btn:hover, button.btn:hover { background:#283a45; }
</style></head>
<body><main class="card">
  <h1>${opts.heading}</h1>
  <p>${opts.body}</p>
  ${cta}
</main></body></html>`;
}

const COPY = {
  en: {
    ask: { heading: 'Unsubscribe from updates', body: 'Press the button below to stop receiving Explora Journeys updates at this address.', cta: 'Unsubscribe' },
    ok: { heading: "You've unsubscribed", body: 'You will no longer receive Explora Journeys updates at this address. We are sorry to see you go — you can resubscribe any time from the site.', home: 'Return to the site' },
    bad: { heading: 'Link no longer valid', body: 'This unsubscribe link is not valid. If you continue to receive emails you did not expect, please contact us.', home: 'Return to the site' },
  },
  el: {
    ask: { heading: 'Διαγραφή από τις ενημερώσεις', body: 'Πατήστε το κουμπί για να σταματήσετε να λαμβάνετε ενημερώσεις του Explora Journeys σε αυτή τη διεύθυνση.', cta: 'Διαγραφή' },
    ok: { heading: 'Η εγγραφή διαγράφηκε', body: 'Δεν θα λαμβάνετε πλέον ενημερώσεις του Explora Journeys σε αυτή τη διεύθυνση. Μπορείτε να εγγραφείτε ξανά οποιαδήποτε στιγμή από τον ιστότοπο.', home: 'Επιστροφή στον ιστότοπο' },
    bad: { heading: 'Ο σύνδεσμος δεν ισχύει', body: 'Ο σύνδεσμος διαγραφής δεν είναι έγκυρος. Αν συνεχίζετε να λαμβάνετε email, επικοινωνήστε μαζί μας.', home: 'Επιστροφή στον ιστότοπο' },
  },
} as const;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, POST');
    return res.end();
  }

  const home = `${baseUrl(req)}/`;
  const token = new URL(req.url ?? '', 'http://x').searchParams.get('token');
  if (!token || token.length > 64) {
    const c = COPY.en.bad;
    return sendHtml(res, 400, page({ heading: c.heading, body: c.body, home, homeLabel: c.home }));
  }

  try {
    const sql = db();

    // GET = the emailed link: render the interstitial without mutating so a
    // prefetching mail scanner can't opt the recipient out.
    if (req.method === 'GET') {
      const rows = (await sql`
        SELECT email, locale FROM newsletter_subscribers
        WHERE unsubscribe_token = ${token}
        LIMIT 1
      `) as Array<{ email: string; locale: string | null }>;
      const row = rows[0];
      if (!row) {
        const c = COPY.en.bad;
        return sendHtml(res, 404, page({ heading: c.heading, body: c.body, home, homeLabel: c.home }));
      }
      const locale = row.locale === 'el' ? 'el' : 'en';
      const c = COPY[locale].ask;
      const action = `/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
      return sendHtml(res, 200, page({ heading: c.heading, body: c.body, home, homeLabel: '', action: { url: action, label: c.cta } }));
    }

    // POST = the interstitial button OR a mail client's RFC 8058 one-click.
    // COALESCE keeps the original opt-out timestamp on repeat clicks (idempotent).
    const rows = (await sql`
      UPDATE newsletter_subscribers
      SET unsubscribed_at = COALESCE(unsubscribed_at, now())
      WHERE unsubscribe_token = ${token}
      RETURNING email, locale
    `) as Array<{ email: string; locale: string | null }>;

    const row = rows[0];
    if (!row) {
      const c = COPY.en.bad;
      return sendHtml(res, 404, page({ heading: c.heading, body: c.body, home, homeLabel: c.home }));
    }
    const locale = row.locale === 'el' ? 'el' : 'en';
    const c = COPY[locale].ok;
    console.log(`[newsletter] unsubscribed → ${row.email}`);
    return sendHtml(res, 200, page({ heading: c.heading, body: c.body, home, homeLabel: c.home }));
  } catch (err) {
    console.error('[newsletter/unsubscribe]', err instanceof Error ? err.message : err);
    const c = COPY.en.bad;
    return sendHtml(res, 500, page({ heading: c.heading, body: c.body, home, homeLabel: c.home }));
  }
}
