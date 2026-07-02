import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { db } from '../../../lib/db/client';
import { readJson, sendJson } from '../../../lib/http';
import { requireAuth, hashPassword, logAdminAction } from '../../../lib/admin-auth';

const patchSchema = z.object({
  role: z.enum(['admin', 'agent']).optional(),
  disabled: z.boolean().optional(),
  password: z.string().min(8).max(200).optional(),
});

function idFromUrl(req: IncomingMessage): number {
  return Number(new URL(req.url ?? '', 'http://x').pathname.split('/').filter(Boolean).pop());
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const actor = await requireAuth(req, res, 'admin');
  if (!actor) return;
  if (req.method !== 'PATCH') { res.statusCode = 405; res.setHeader('Allow', 'PATCH'); return res.end(); }

  const id = idFromUrl(req);
  if (!Number.isFinite(id)) return sendJson(res, 400, { ok: false, error: 'bad-id' });
  const parsed = patchSchema.safeParse(await readJson(req));
  if (!parsed.success) return sendJson(res, 400, { ok: false, error: 'invalid' });
  const { role, disabled, password } = parsed.data;
  const sql = db();

  try {
    const cur = (await sql`SELECT id, role, disabled FROM admin_users WHERE id = ${id} LIMIT 1`) as Array<{ id: number; role: string; disabled: boolean }>;
    if (!cur[0]) return sendJson(res, 404, { ok: false, error: 'not-found' });

    // Self-lockout guard: don't let the last enabled admin demote/disable themselves out.
    const willLoseAdmin = (role && role !== 'admin') || disabled === true;
    if (cur[0].role === 'admin' && willLoseAdmin) {
      const others = (await sql`
        SELECT count(*)::int AS n FROM admin_users WHERE role = 'admin' AND NOT disabled AND id <> ${id}
      `) as Array<{ n: number }>;
      if ((others[0]?.n ?? 0) === 0) {
        return sendJson(res, 409, { ok: false, error: 'last-admin', message: 'Cannot remove the last enabled admin.' });
      }
    }

    if (role !== undefined) await sql`UPDATE admin_users SET role = ${role} WHERE id = ${id}`;
    if (disabled !== undefined) await sql`UPDATE admin_users SET disabled = ${disabled} WHERE id = ${id}`;
    if (password !== undefined) {
      const hash = await hashPassword(password);
      await sql`UPDATE admin_users SET password_hash = ${hash} WHERE id = ${id}`;
      // Revoke existing sessions on password change.
      await sql`DELETE FROM admin_sessions WHERE user_id = ${id}`;
    }

    logAdminAction(actor, req, {
      action: 'user.update', entity: 'user', entityId: id,
      before: { role: cur[0].role, disabled: cur[0].disabled },
      after: { role: role ?? cur[0].role, disabled: disabled ?? cur[0].disabled, passwordChanged: password !== undefined },
    });
    return sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error('[admin/users/:id]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
