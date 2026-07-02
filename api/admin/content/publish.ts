/**
 * CONTENT-ADMIN — publish / revert the site content overrides.
 *
 *   POST /api/admin/content/publish
 *     { keys?: string[] }              → publish: copy draft_value → published_value
 *                                        for every row with a pending draft (all,
 *                                        or restricted to the given registry keys).
 *     { op:'revert', key, locale }     → discard the unpublished draft (keep live).
 *     { op:'reset',  key, locale }     → clear the published override (back to the
 *                                        code default), leaving any draft intact.
 *
 *   DELETE /api/admin/content/publish?key=&locale=
 *                                      → remove the override row entirely (both
 *                                        draft + published gone → code default).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { db, paramQuery } from '../../../lib/db/client';
import { readJson, sendJson } from '../../../lib/http';
import { requireAuth, logAdminAction } from '../../../lib/admin-auth';
import { fieldFor, isEditableKey } from '../../../src/content/registry';

/** Resolve + validate a (key, locale) pair against the registry. */
function resolveTarget(
  key: string,
  rawLocale: string,
): { ok: true; key: string; locale: string } | { ok: false; error: string } {
  if (!isEditableKey(key)) return { ok: false, error: 'unknown-key' };
  const field = fieldFor(key)!;
  let locale = String(rawLocale ?? '');
  if (field.bilingual) {
    if (locale !== 'en' && locale !== 'el') return { ok: false, error: 'bad-locale' };
  } else {
    locale = '';
  }
  return { ok: true, key, locale };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'admin');
  if (!user) return;
  const sql = db();

  try {
    if (req.method === 'POST') {
      const body = (await readJson(req)) as
        | { op?: string; key?: string; locale?: string; keys?: unknown }
        | null;
      const op = body?.op;

      // ── Per-field revert / reset ───────────────────────────────────────────
      if (op === 'revert' || op === 'reset') {
        const target = resolveTarget(String(body?.key ?? ''), String(body?.locale ?? ''));
        if (!target.ok) return sendJson(res, 400, { ok: false, error: target.error });
        const { key, locale } = target;

        if (op === 'revert') {
          await sql`
            UPDATE site_content SET draft_value = NULL, updated_by = ${user.id}, updated_at = now()
            WHERE key = ${key} AND locale = ${locale}
          `;
        } else {
          await sql`
            UPDATE site_content
            SET published_value = NULL, published_at = NULL, updated_by = ${user.id}, updated_at = now()
            WHERE key = ${key} AND locale = ${locale}
          `;
        }
        logAdminAction(user, req, { action: `content.${op}`, entity: 'content', entityId: key, after: { locale } });
        return sendJson(res, 200, { ok: true });
      }

      // ── Publish (all pending drafts, or a subset of keys) ──────────────────
      const keys = Array.isArray(body?.keys)
        ? (body!.keys as unknown[]).filter((k): k is string => typeof k === 'string' && isEditableKey(k))
        : null;

      let text =
        `UPDATE site_content SET published_value = draft_value, draft_value = NULL,` +
        ` published_at = now(), updated_by = $1 WHERE draft_value IS NOT NULL`;
      const params: unknown[] = [user.id];
      if (keys && keys.length) {
        const placeholders = keys.map((_, i) => `$${i + 2}`).join(', ');
        text += ` AND key IN (${placeholders})`;
        params.push(...keys);
      }
      text += ` RETURNING key`;

      const rows = await paramQuery<{ key: string }>(text, params);
      const published = rows.length;
      logAdminAction(user, req, { action: 'content.publish', entity: 'content', after: { count: published } });
      return sendJson(res, 200, { ok: true, published });
    }

    // ── Clear an override entirely ───────────────────────────────────────────
    if (req.method === 'DELETE') {
      const q = new URL(req.url ?? '', 'http://x').searchParams;
      const target = resolveTarget(q.get('key') ?? '', q.get('locale') ?? '');
      if (!target.ok) return sendJson(res, 400, { ok: false, error: target.error });
      const { key, locale } = target;
      await sql`DELETE FROM site_content WHERE key = ${key} AND locale = ${locale}`;
      logAdminAction(user, req, { action: 'content.clear', entity: 'content', entityId: key, after: { locale } });
      return sendJson(res, 200, { ok: true });
    }

    res.statusCode = 405; res.setHeader('Allow', 'POST, DELETE'); return res.end();
  } catch (err) {
    console.error('[admin/content/publish]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
