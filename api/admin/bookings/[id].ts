import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db, jsonbArg } from '../../../lib/db/client';
import { readJson, sendJson } from '../../../lib/http';
import { requireAuth, logAdminAction } from '../../../lib/admin-auth';
import { adminRecord, type BookingNote } from '../../../lib/booking';

const STATUSES = ['pending', 'deposit_paid', 'confirmed', 'cancelled'] as const;
const patchSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('set-status'), status: z.enum(STATUSES) }),
  z.object({ op: z.literal('add-note'), text: z.string().min(1).max(2000) }),
]);

function idFromUrl(req: IncomingMessage): number {
  const seg = new URL(req.url ?? '', 'http://x').pathname.split('/').filter(Boolean).pop();
  return Number(seg);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res, 'agent');
  if (!user) return;

  const id = idFromUrl(req);
  if (!Number.isFinite(id)) return sendJson(res, 400, { ok: false, error: 'bad-id' });
  const sql = db();

  try {
    if (req.method === 'GET') {
      const rows = (await sql`SELECT * FROM booking_requests WHERE id = ${id} LIMIT 1`) as unknown[];
      if (!rows[0]) return sendJson(res, 404, { ok: false, error: 'not-found' });
      return sendJson(res, 200, { ok: true, booking: adminRecord(rows[0]) });
    }

    if (req.method === 'PATCH') {
      const parsed = patchSchema.safeParse(await readJson(req));
      if (!parsed.success) return sendJson(res, 400, { ok: false, error: 'invalid' });

      if (parsed.data.op === 'set-status') {
        const cur = (await sql`SELECT status FROM booking_requests WHERE id = ${id} LIMIT 1`) as Array<{ status: string }>;
        if (!cur[0]) return sendJson(res, 404, { ok: false, error: 'not-found' });
        await sql`UPDATE booking_requests SET status = ${parsed.data.status}, updated_at = now() WHERE id = ${id}`;
        logAdminAction(user, req, {
          action: 'booking.status', entity: 'booking', entityId: id,
          before: { status: cur[0].status }, after: { status: parsed.data.status },
        });
        return sendJson(res, 200, { ok: true, status: parsed.data.status });
      }

      // add-note
      const note: BookingNote = {
        id: randomUUID(), at: new Date().toISOString(), by: user.id, byName: user.name, text: parsed.data.text,
      };
      const rows = (await sql`
        UPDATE booking_requests
        SET admin_notes = admin_notes || ${jsonbArg([note])}::jsonb, updated_at = now()
        WHERE id = ${id}
        RETURNING admin_notes
      `) as Array<{ admin_notes: BookingNote[] }>;
      if (!rows[0]) return sendJson(res, 404, { ok: false, error: 'not-found' });
      logAdminAction(user, req, { action: 'booking.note', entity: 'booking', entityId: id, after: { noteId: note.id } });
      return sendJson(res, 200, { ok: true, adminNotes: rows[0].admin_notes });
    }

    res.statusCode = 405; res.setHeader('Allow', 'GET, PATCH'); return res.end();
  } catch (err) {
    console.error('[admin/bookings/:id]', err instanceof Error ? err.message : err);
    return sendJson(res, 500, { ok: false, error: 'server-error' });
  }
}
