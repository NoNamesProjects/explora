/**
 * POST /api/newsletter — public double-opt-in subscribe.
 *
 * Zod-validate { email, locale? }, UPSERT into newsletter_subscribers, and send
 * a confirmation email (Resend, fail-soft). We never leak whether the address
 * already existed — the response is always { ok:true }. A previously-confirmed
 * (still-subscribed) address is a no-op: we don't churn its token or re-send.
 *
 * Also the home of two tiny shared helpers the broadcast handler reuses:
 *   - sendEmail(): the fail-soft Resend idiom (mirrors lib/email.ts).
 *   - baseUrl():   the public origin for confirm/unsubscribe links.
 *
 * Server-side only — never import from src/.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db } from '../lib/db/client';
import { readJson, sendJson } from '../lib/http';

const schema = z.object({
  email: z.string().email().max(160),
  locale: z.enum(['en', 'el']).optional(),
  // `consent` may still be sent by older clients — zod strips it silently.
});

// ── Shared helpers (also imported by api/admin/broadcast.ts) ─────────────────

/**
 * The public origin used to build confirm/unsubscribe links. PUBLIC_BASE_URL
 * wins when set (production: never build emailed links from client-supplied
 * x-forwarded-host — host-poisoning); otherwise infer from the forwarded
 * proto/host the request arrived on (correct on Vercel & cPanel), then a dev
 * default.
 */
export function baseUrl(req: IncomingMessage): string {
  const configured = (process.env.PUBLIC_BASE_URL || '').trim();
  if (configured) return configured.replace(/\/+$/, '');
  const proto =
    (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim() ||
    ((req.socket as { encrypted?: boolean } | undefined)?.encrypted ? 'https' : 'http');
  const host =
    (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim() ||
    (req.headers.host as string | undefined);
  if (host) return `${proto}://${host}`;
  return 'http://localhost:5173';
}

/**
 * Fail-soft transactional send via Resend. NEVER throws — a missing key or a
 * transient API error just logs and returns false (mirrors lib/email.ts).
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  /** Extra message headers (e.g. List-Unsubscribe for broadcasts). */
  headers?: Record<string, string>;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'Aesthisis <onboarding@resend.dev>';
  if (!key) {
    console.log(`[email] skipped (no RESEND_API_KEY) — to=${opts.to} subject="${opts.subject}"`);
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: opts.to,
        reply_to: opts.replyTo || undefined,
        subject: opts.subject,
        html: opts.html,
        headers: opts.headers && Object.keys(opts.headers).length ? opts.headers : undefined,
      }),
    });
    if (!res.ok) {
      console.error(`[email] Resend ${res.status} to=${opts.to}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[email] send failed:', e instanceof Error ? e.message : e);
    return false;
  }
}

// ── Confirmation email copy ──────────────────────────────────────────────────

function confirmEmail(link: string, locale: 'en' | 'el'): { subject: string; html: string } {
  const t =
    locale === 'el'
      ? {
          subject: 'Επιβεβαιώστε την εγγραφή σας — Explora Journeys',
          heading: 'Επιβεβαιώστε την εγγραφή σας',
          body: 'Ευχαριστούμε για το ενδιαφέρον σας. Επιβεβαιώστε τη διεύθυνσή σας για να λαμβάνετε διακριτικές ενημερώσεις για νέα ταξίδια και συλλογές σουιτών.',
          cta: 'Επιβεβαίωση εγγραφής',
          ignore: 'Αν δεν ζητήσατε αυτό το email, απλώς αγνοήστε το.',
        }
      : {
          subject: 'Confirm your subscription — Explora Journeys',
          heading: 'Confirm your subscription',
          body: 'Thank you for your interest. Please confirm your address to receive quiet updates on new sailings and suite collections.',
          cta: 'Confirm subscription',
          ignore: "If you didn't request this, you can safely ignore this email.",
        };
  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2b2622;line-height:1.6">
      <h1 style="font-size:22px;font-weight:400;margin:0 0 12px">${t.heading}</h1>
      <p style="margin:0 0 24px;color:#4a433c">${t.body}</p>
      <p style="margin:0 0 24px">
        <a href="${link}" style="display:inline-block;background:#1c2a33;color:#f4efe9;text-decoration:none;padding:12px 22px;border-radius:6px;font-size:15px">${t.cta}</a>
      </p>
      <p style="margin:0;font-size:13px;color:#8a8078">${t.ignore}</p>
    </div>`;
  return { subject: t.subject, html };
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    return res.end();
  }

  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return sendJson(res, 400, { ok: false, error: 'invalid' });

  const email = parsed.data.email.trim().toLowerCase();
  const locale = parsed.data.locale ?? 'en';

  try {
    const sql = db();
    const confirmToken = randomBytes(24).toString('base64url');
    const unsubToken = randomBytes(24).toString('base64url');

    // Single race-safe UPSERT. The DO-UPDATE WHERE-guard means an already
    // confirmed & still-subscribed row is left untouched and RETURNS NOTHING,
    // so we know NOT to re-send. A new / pending / previously-unsubscribed row
    // is (re)armed with a fresh confirm token and RETURNS the token → we send.
    const rows = (await sql`
      INSERT INTO newsletter_subscribers
        (email, confirmed, confirm_token, unsubscribe_token, consent_at, locale, unsubscribed_at)
      VALUES (${email}, false, ${confirmToken}, ${unsubToken}, now(), ${locale}, NULL)
      ON CONFLICT (email) DO UPDATE SET
        confirmed         = false,
        confirm_token     = EXCLUDED.confirm_token,
        unsubscribe_token = COALESCE(newsletter_subscribers.unsubscribe_token, EXCLUDED.unsubscribe_token),
        consent_at        = now(),
        locale            = EXCLUDED.locale,
        unsubscribed_at   = NULL
      WHERE newsletter_subscribers.confirmed = false
         OR newsletter_subscribers.unsubscribed_at IS NOT NULL
      RETURNING confirm_token, unsubscribe_token
    `) as Array<{ confirm_token: string; unsubscribe_token: string }>;

    const row = rows[0];
    if (row?.confirm_token) {
      const link = `${baseUrl(req)}/api/newsletter/confirm?token=${row.confirm_token}`;
      const { subject, html } = confirmEmail(link, locale);
      await sendEmail({ to: email, subject, html }); // fail-soft
      console.log(`[newsletter] confirm sent → ${email}`);
    } else {
      console.log(`[newsletter] already confirmed → ${email} (no re-send)`);
    }

    // Never leak whether the address existed / was already confirmed.
    return sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error('[newsletter]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
