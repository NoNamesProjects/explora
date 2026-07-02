/**
 * CONTENT-ADMIN — the registry-driven content editor endpoint.
 *
 *   GET  /api/admin/content  → the full editability registry + every stored
 *                              draft/published value, merged into a lookup map.
 *   PUT  /api/admin/content  → write ONE draft value for a (key, locale). The
 *                              key must be in CONTENT_REGISTRY (the allowlist)
 *                              and the value is sanitized to its declared type
 *                              before it ever touches the DB.
 *
 * Publishing / reverting lives in api/admin/content/publish.ts.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { db, jsonbArg } from '../../lib/db/client';
import { readJson, sendJson } from '../../lib/http';
import { requireAuth, logAdminAction } from '../../lib/admin-auth';
import { sanitizeFieldValue } from '../../lib/content-sanitize';
import { CONTENT_REGISTRY, fieldFor, isEditableKey } from '../../src/content/registry';

const putSchema = z.object({
  key: z.string().min(1).max(200),
  locale: z.string().max(8).optional(),
  value: z.unknown(),
});

/** Reject any dotted key that could be used for prototype pollution. */
const POISON = /(^|\.)(?:__proto__|constructor|prototype)(\.|$)/;

interface Row {
  key: string;
  locale: string;
  draft_value: unknown;
  published_value: unknown;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'admin');
  if (!user) return;
  const sql = db();

  try {
    // ── List: registry + current stored values ───────────────────────────────
    if (req.method === 'GET') {
      const rows = (await sql`
        SELECT key, locale, draft_value, published_value FROM site_content
      `) as Row[];
      // key → locale → { draft, published }. jsonb columns arrive already parsed.
      const values: Record<string, Record<string, { draft: unknown; published: unknown }>> = {};
      for (const r of rows) {
        (values[r.key] ??= {})[r.locale] = {
          draft: r.draft_value ?? null,
          published: r.published_value ?? null,
        };
      }
      return sendJson(res, 200, { ok: true, fields: CONTENT_REGISTRY, values });
    }

    // ── Write a draft for one (key, locale) ───────────────────────────────────
    if (req.method === 'PUT') {
      const parsed = putSchema.safeParse(await readJson(req));
      if (!parsed.success) return sendJson(res, 400, { ok: false, error: 'invalid' });
      const { key, value } = parsed.data;

      if (POISON.test(key)) return sendJson(res, 400, { ok: false, error: 'bad-key' });
      if (!isEditableKey(key)) return sendJson(res, 400, { ok: false, error: 'unknown-key' });
      const field = fieldFor(key)!; // guaranteed by isEditableKey

      // Bilingual fields live per-locale ('en'|'el'); everything else is agnostic ('').
      let locale = String(parsed.data.locale ?? '');
      if (field.bilingual) {
        if (locale !== 'en' && locale !== 'el') return sendJson(res, 400, { ok: false, error: 'bad-locale' });
      } else {
        locale = '';
      }

      const clean = sanitizeFieldValue(field.type, value);

      await sql`
        INSERT INTO site_content (key, locale, kind, type, draft_value, updated_by, updated_at)
        VALUES (${key}, ${locale}, ${field.kind}, ${field.type}, ${jsonbArg(clean)}::jsonb, ${user.id}, now())
        ON CONFLICT (key, locale) DO UPDATE SET
          draft_value = ${jsonbArg(clean)}::jsonb,
          kind        = ${field.kind},
          type        = ${field.type},
          updated_by  = ${user.id},
          updated_at  = now()
      `;

      logAdminAction(user, req, { action: 'content.draft', entity: 'content', entityId: key, after: { locale } });
      return sendJson(res, 200, { ok: true });
    }

    res.statusCode = 405; res.setHeader('Allow', 'GET, PUT'); return res.end();
  } catch (err) {
    console.error('[admin/content]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
