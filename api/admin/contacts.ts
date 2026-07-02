import type { IncomingMessage, ServerResponse } from 'node:http';
import { paramQuery } from '../../lib/db/client';
import { sendJson } from '../../lib/http';
import { requireAuth, logAdminAction } from '../../lib/admin-auth';
import { toCsv, sendCsv } from '../../lib/csv';

interface Row {
  id: number; name: string; email: string; phone: string | null; message: string; created_at: string;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'agent');
  if (!user) return;
  if (req.method !== 'GET') { res.statusCode = 405; res.setHeader('Allow', 'GET'); return res.end(); }

  const q = new URL(req.url ?? '', 'http://x').searchParams;
  const search = q.get('q')?.trim() || null;
  const from = q.get('from') || null;
  const to = q.get('to') || null;
  const format = q.get('format');
  const page = Math.max(1, Number(q.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(q.get('pageSize')) || 25));

  const where =
    `WHERE ($1::timestamptz IS NULL OR created_at >= $1)
       AND ($2::timestamptz IS NULL OR created_at < $2)
       AND ($3::text IS NULL OR name ILIKE $3 OR email ILIKE $3)`;
  const like = search ? `%${search}%` : null;
  const params = [from, to, like];

  try {
    if (format === 'csv') {
      // Bulk PII export is admin-only; agents keep the paginated on-screen list.
      if (user.role !== 'admin') return sendJson(res, 403, { ok: false, error: 'forbidden' });
      const rows = (await paramQuery<Row>(
        `SELECT name, email, phone, message, created_at FROM contact_messages ${where} ORDER BY created_at DESC LIMIT 5000`,
        params,
      ));
      logAdminAction(user, req, { action: 'contact.export', entity: 'contact', after: { count: rows.length } });
      const csv = toCsv(rows as unknown as Array<Record<string, unknown>>, [
        { key: 'created_at', header: 'Created' }, { key: 'name', header: 'Name' },
        { key: 'email', header: 'Email' }, { key: 'phone', header: 'Phone' }, { key: 'message', header: 'Message' },
      ]);
      return sendCsv(res, `contacts-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    }

    const offset = (page - 1) * pageSize;
    const rows = (await paramQuery<Row>(
      `SELECT id, name, email, phone, message, created_at FROM contact_messages ${where}
       ORDER BY created_at DESC LIMIT $4 OFFSET $5`,
      [...params, pageSize, offset],
    ));
    const countRows = (await paramQuery<{ n: number }>(
      `SELECT count(*)::int AS n FROM contact_messages ${where}`, params,
    ));
    const items = rows.map((r) => ({
      id: Number(r.id), name: r.name, email: r.email, phone: r.phone, message: r.message, createdAt: r.created_at,
    }));
    return sendJson(res, 200, { ok: true, items, total: countRows[0]?.n ?? 0, page, pageSize });
  } catch (err) {
    console.error('[admin/contacts]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
