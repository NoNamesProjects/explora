/**
 * /api/newsletter/confirm?token= — double-opt-in confirmation landing.
 *
 * GET renders an interstitial page with a single button that POSTs back to
 * the same URL; the POST flips confirmed=true (single-use: the token is
 * cleared) and renders the "thank you" page. The mutation lives on POST so
 * corporate mail scanners that prefetch every link can no longer auto-confirm
 * subscriptions on the recipient's behalf.
 * Fail-soft: an unknown/expired token shows a neutral page, never a stack trace.
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

/** Minimal cream/ink page matching the warm-maritime aesthetic. `action`
 *  renders a POST form button instead of the home link. */
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
    ask: { heading: 'Confirm your subscription', body: 'One last step — press the button below to confirm your subscription to Explora Journeys updates.', cta: 'Confirm subscription' },
    ok: { heading: "You're subscribed", body: 'Thank you — your subscription to Explora Journeys is confirmed. Watch your inbox for quiet updates on new sailings and suite collections.', home: 'Return to the site' },
    bad: { heading: 'Link no longer valid', body: 'This confirmation link has expired or was already used. If you still wish to subscribe, please sign up again from the site.', home: 'Return to the site' },
  },
  el: {
    ask: { heading: 'Επιβεβαιώστε την εγγραφή σας', body: 'Ένα τελευταίο βήμα — πατήστε το κουμπί για να επιβεβαιώσετε την εγγραφή σας στις ενημερώσεις του Explora Journeys.', cta: 'Επιβεβαίωση εγγραφής' },
    ok: { heading: 'Η εγγραφή επιβεβαιώθηκε', body: 'Ευχαριστούμε — η εγγραφή σας στο Explora Journeys επιβεβαιώθηκε. Θα λαμβάνετε διακριτικές ενημερώσεις για νέα ταξίδια και συλλογές σουιτών.', home: 'Επιστροφή στον ιστότοπο' },
    bad: { heading: 'Ο σύνδεσμος δεν ισχύει', body: 'Ο σύνδεσμος επιβεβαίωσης έληξε ή έχει ήδη χρησιμοποιηθεί. Αν επιθυμείτε ακόμη να εγγραφείτε, κάντε εγγραφή ξανά από τον ιστότοπο.', home: 'Επιστροφή στον ιστότοπο' },
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

    // GET = the emailed link. Look the token up WITHOUT mutating and render a
    // one-button interstitial — mail-scanner prefetchers follow GETs but
    // don't submit forms, so they can no longer auto-confirm.
    if (req.method === 'GET') {
      const rows = (await sql`
        SELECT email, locale FROM newsletter_subscribers
        WHERE confirm_token = ${token}
        LIMIT 1
      `) as Array<{ email: string; locale: string | null }>;
      const row = rows[0];
      if (!row) {
        const c = COPY.en.bad;
        return sendHtml(res, 404, page({ heading: c.heading, body: c.body, home, homeLabel: c.home }));
      }
      const locale = row.locale === 'el' ? 'el' : 'en';
      const c = COPY[locale].ask;
      const action = `/api/newsletter/confirm?token=${encodeURIComponent(token)}`;
      return sendHtml(res, 200, page({ heading: c.heading, body: c.body, home, homeLabel: '', action: { url: action, label: c.cta } }));
    }

    // POST = the interstitial button: perform the single-use confirmation.
    const rows = (await sql`
      UPDATE newsletter_subscribers
      SET confirmed = true, confirm_token = NULL, unsubscribed_at = NULL
      WHERE confirm_token = ${token}
      RETURNING email, locale
    `) as Array<{ email: string; locale: string | null }>;

    const row = rows[0];
    if (!row) {
      const c = COPY.en.bad;
      return sendHtml(res, 404, page({ heading: c.heading, body: c.body, home, homeLabel: c.home }));
    }
    const locale = row.locale === 'el' ? 'el' : 'en';
    const c = COPY[locale].ok;
    console.log(`[newsletter] confirmed → ${row.email}`);
    return sendHtml(res, 200, page({ heading: c.heading, body: c.body, home, homeLabel: c.home }));
  } catch (err) {
    console.error('[newsletter/confirm]', err instanceof Error ? err.message : err);
    const c = COPY.en.bad;
    return sendHtml(res, 500, page({ heading: c.heading, body: c.body, home, homeLabel: c.home }));
  }
}
