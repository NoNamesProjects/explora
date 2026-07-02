import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { db } from '../../lib/db/client';
import { readJson, sendJson } from '../../lib/http';
import { requireAuth, hashPassword, logAdminAction } from '../../lib/admin-auth';

const createSchema = z.object({
  email: z.string().email().max(160),
  name: z.string().min(1).max(120),
  role: z.enum(['admin', 'agent']),
  password: z.string().min(8).max(200),
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'admin');
  if (!user) return;
  const sql = db();

  try {
    if (req.method === 'GET') {
      const rows = (await sql`
        SELECT id, email, name, role, disabled, created_at, last_login_at
        FROM admin_users ORDER BY created_at
      `) as Array<Record<string, unknown>>;
      const items = rows.map((r) => ({
        id: Number(r.id), email: r.email, name: r.name, role: r.role,
        disabled: r.disabled, createdAt: r.created_at, lastLoginAt: r.last_login_at,
      }));
      return sendJson(res, 200, { ok: true, items });
    }

    if (req.method === 'POST') {
      const parsed = createSchema.safeParse(await readJson(req));
      if (!parsed.success) return sendJson(res, 400, { ok: false, error: 'invalid' });
      const { email, name, role, password } = parsed.data;
      const hash = await hashPassword(password);
      const rows = (await sql`
        INSERT INTO admin_users (email, password_hash, name, role)
        VALUES (${email.toLowerCase()}, ${hash}, ${name}, ${role})
        ON CONFLICT (email) DO NOTHING
        RETURNING id, email, name, role, disabled, created_at, last_login_at
      `) as Array<Record<string, unknown>>;
      if (!rows[0]) return sendJson(res, 409, { ok: false, error: 'email-exists' });
      logAdminAction(user, req, { action: 'user.create', entity: 'user', entityId: Number(rows[0].id), after: { email, role } });
      const r = rows[0];
      return sendJson(res, 200, {
        ok: true,
        user: { id: Number(r.id), email: r.email, name: r.name, role: r.role, disabled: r.disabled, createdAt: r.created_at, lastLoginAt: r.last_login_at },
      });
    }

    res.statusCode = 405; res.setHeader('Allow', 'GET, POST'); return res.end();
  } catch (err) {
    // ON CONFLICT (email) misses the lower(email) unique index — a case-variant
    // duplicate raises 23505 instead; report it as the same 409.
    if ((err as { code?: string })?.code === '23505') {
      return sendJson(res, 409, { ok: false, error: 'email-exists' });
    }
    console.error('[admin/users]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
