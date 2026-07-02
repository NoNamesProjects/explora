/**
 * Public content bundle — every PUBLISHED override, folded into the three
 * adapter shapes the client applies at boot (i18n copy / structured data /
 * media). Sparse: defaults live in code, this returns only what changed.
 * Never breaks the site — any error returns an empty (all-defaults) bundle.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { db } from '../lib/db/client';
import { sendJson } from '../lib/http';

interface Row {
  key: string;
  locale: string;
  kind: string;
  published_value: unknown;
  pub_ms: string | number | null;
}

export interface ContentBundle {
  version: number;
  i18n: { en: Record<string, unknown>; el: Record<string, unknown> };
  data: Record<string, Record<string, unknown>>;
  media: Record<string, unknown>;
}

// Defense-in-depth: writes are allowlisted in api/admin/content.ts, but a
// poisoned row must still never become a prototype-pollution vector here.
const POISON = /(^|\.)(__proto__|constructor|prototype)($|\.)/;

export function foldBundle(rows: Row[]): ContentBundle {
  const i18n: ContentBundle['i18n'] = { en: {}, el: {} };
  const data: ContentBundle['data'] = {};
  const media: ContentBundle['media'] = {};
  let version = 0;
  for (const r of rows) {
    if (POISON.test(r.key) || POISON.test(r.locale)) continue;
    const ms = r.pub_ms != null ? Math.floor(Number(r.pub_ms)) : 0;
    if (ms > version) version = ms;
    if (r.kind === 'i18n') {
      const loc = r.locale === 'el' ? 'el' : 'en';
      i18n[loc][r.key] = r.published_value;
    } else if (r.kind === 'media') {
      media[r.key] = r.published_value;
    } else if (r.kind === 'data') {
      (data[r.key] ??= {})[r.locale || ''] = r.published_value;
    }
  }
  return { version, i18n, data, media };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    return res.end();
  }
  try {
    const sql = db();
    const rows = (await sql`
      SELECT key, locale, kind, published_value,
             extract(epoch from published_at) * 1000 AS pub_ms
      FROM site_content
      WHERE published_value IS NOT NULL
    `) as Row[];
    res.setHeader(
      'Cache-Control',
      process.env.VERCEL ? 's-maxage=30, stale-while-revalidate=300' : 'no-cache',
    );
    return sendJson(res, 200, { ok: true, ...foldBundle(rows) });
  } catch (err) {
    console.error('[api/content]', err instanceof Error ? err.message : err);
    return sendJson(res, 200, { ok: true, version: 0, i18n: { en: {}, el: {} }, data: {}, media: {} });
  }
}
