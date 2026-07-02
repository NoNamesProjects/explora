/**
 * /api/admin/broadcast — send an email broadcast to confirmed subscribers.
 *
 * POST (admin): { subject, body (rich "runs" doc), test? } — sanitize + render
 *   the body, then either send a single TEST to the current admin (sync) or run
 *   a real campaign. A campaign writes its email_campaigns row (status 'running')
 *   FIRST, selects recipients (confirmed AND unsubscribed_at IS NULL), and sends
 *   one email each with a per-recipient unsubscribe link appended (GDPR).
 *   Dual-mode, mirroring api/admin/ingest/run.ts: on Vercel it awaits + returns a
 *   sync summary; on long-lived hosts it fires-and-polls, returning 202.
 * GET (admin): the latest email_campaigns row, for the client status poll.
 *
 * Server-side only — never import from src/.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { db, jsonbArg } from '../../lib/db/client';
import { sendJson, readJson } from '../../lib/http';
import { requireAuth, logAdminAction } from '../../lib/admin-auth';
import { sanitizeFieldValue, richDocToHtml } from '../../lib/content-sanitize';
import { sendEmail, baseUrl } from '../newsletter';

interface CampaignRow {
  id: number; subject: string; recipients: number; sent_count: number; failed_count: number;
  status: string; notes: string | null; started_at: string; finished_at: string | null;
}
function mapCampaign(r: CampaignRow) {
  return {
    id: Number(r.id), subject: r.subject, recipients: r.recipients,
    sentCount: r.sent_count, failedCount: r.failed_count, status: r.status,
    notes: r.notes, startedAt: r.started_at, finishedAt: r.finished_at,
  };
}

/** Wrap the rendered body in an on-brand shell + the unsubscribe footer. */
function wrapEmail(bodyHtml: string, unsubLink: string | null): string {
  const footer = unsubLink
    ? `<p style="margin:32px 0 0;font-size:12px;color:#8a8078">You are receiving this because you subscribed to Explora Journeys updates. <a href="${unsubLink}" style="color:#8a8078">Unsubscribe</a>.</p>`
    : `<p style="margin:32px 0 0;font-size:12px;color:#8a8078">You are receiving this because you subscribed to Explora Journeys updates.</p>`;
  return `<div style="font-family:Georgia,'Times New Roman',serif;max-width:600px;margin:0 auto;color:#2b2622;line-height:1.6">${bodyHtml}${footer}</div>`;
}

interface Recipient { email: string; unsubscribe_token: string | null }

/**
 * Send the campaign to every recipient (sequentially, so we don't spike the
 * Resend rate limit) and stamp the final tally on the campaign row. Never throws.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runCampaign(
  sql: any, campaignId: number, subject: string, bodyHtml: string, base: string, recipients: Recipient[],
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    const unsubLink = r.unsubscribe_token
      ? `${base}/api/newsletter/unsubscribe?token=${r.unsubscribe_token}`
      : null;
    const ok = await sendEmail({ to: r.email, subject, html: wrapEmail(bodyHtml, unsubLink) });
    if (ok) sent++; else failed++;
  }
  // Partial success stays 'ok' (failed_count records the misses); all-failed → 'failed'.
  const status = recipients.length > 0 && sent === 0 ? 'failed' : 'ok';
  await sql`
    UPDATE email_campaigns
    SET sent_count = ${sent}, failed_count = ${failed}, status = ${status}, finished_at = now()
    WHERE id = ${campaignId}
  `;
  return { sent, failed };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'admin');
  if (!user) return;

  const sql = db();

  // ── GET: latest campaign (poll) ────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const rows = (await sql`
        SELECT id, subject, recipients, sent_count, failed_count, status, notes, started_at, finished_at
        FROM email_campaigns ORDER BY started_at DESC LIMIT 1
      `) as CampaignRow[];
      return sendJson(res, 200, { ok: true, campaign: rows[0] ? mapCampaign(rows[0]) : null });
    } catch (err) {
      console.error('[admin/broadcast] poll', err instanceof Error ? err.message : err);
      return sendJson(res, 500, { ok: false, error: 'server-error' });
    }
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, POST');
    return res.end();
  }

  // ── POST: send a test or a broadcast ───────────────────────────────────────
  const body = (await readJson(req)) as { subject?: unknown; body?: unknown; test?: unknown } | null;
  const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
  if (!subject) return sendJson(res, 400, { ok: false, error: 'subject-required' });

  const cleanBody = sanitizeFieldValue('rich', body?.body);
  const bodyHtml = richDocToHtml(cleanBody);
  if (!bodyHtml) return sendJson(res, 400, { ok: false, error: 'empty-body' });

  const base = baseUrl(req);
  const isTest = body?.test === true;

  try {
    // Test: send only to the acting admin, synchronously.
    if (isTest) {
      const preview = `${base}/api/newsletter/unsubscribe?token=preview`;
      const ok = await sendEmail({ to: user.email, subject, html: wrapEmail(bodyHtml, preview) });
      logAdminAction(user, req, { action: 'broadcast.test', after: { to: user.email, sent: ok ? 1 : 0 } });
      return sendJson(res, 200, { ok: true, mode: 'test', to: user.email, sent: ok ? 1 : 0 });
    }

    // Real broadcast — recipients first, so the campaign row records the count.
    const recipients = (await sql`
      SELECT email, unsubscribe_token FROM newsletter_subscribers
      WHERE confirmed = true AND unsubscribed_at IS NULL
    `) as Recipient[];
    const recipientCount = recipients.length;

    const inserted = (await sql`
      INSERT INTO email_campaigns (subject, body, body_html, recipients, status, sent_by)
      VALUES (${subject}, ${jsonbArg(cleanBody)}::jsonb, ${bodyHtml}, ${recipientCount}, 'running', ${user.id})
      RETURNING id
    `) as Array<{ id: number }>;
    const campaignId = Number(inserted[0].id);

    logAdminAction(user, req, { action: 'broadcast.send', entity: 'campaign', entityId: campaignId, after: { recipients: recipientCount } });

    // Vercel functions freeze after the response — must finish within budget.
    if (process.env.VERCEL) {
      const { sent, failed } = await runCampaign(sql, campaignId, subject, bodyHtml, base, recipients);
      return sendJson(res, 200, { ok: true, mode: 'sync', campaignId, recipients: recipientCount, sent, failed });
    }

    // Long-lived hosts (cPanel/Passenger, dev): fire-and-poll. The 'running' row
    // is already written, so GET /api/admin/broadcast has data immediately.
    void runCampaign(sql, campaignId, subject, bodyHtml, base, recipients).catch(async (err) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[admin/broadcast] background failed:', msg);
      try {
        await sql`UPDATE email_campaigns SET status = 'failed', notes = ${msg.slice(0, 500)}, finished_at = now() WHERE id = ${campaignId}`;
      } catch { /* best effort */ }
    });
    return sendJson(res, 202, { ok: true, mode: 'async', campaignId, recipients: recipientCount });
  } catch (err) {
    console.error('[admin/broadcast]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
