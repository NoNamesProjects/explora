/**
 * Admin auth — multi-user, zero native deps. Passwords are hashed with the
 * built-in crypto.scrypt (no bcrypt → nothing to compile on cPanel/Passenger).
 * Sessions are opaque DB-backed tokens carried in an HttpOnly cookie, looked up
 * (joined to the user) on every request — instant revocation, no JWT secret.
 *
 * Server-side only — never import from src/.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { db, jsonbArg } from './db/client';
import { reqMeta, sendJson } from './http';

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

export type AdminRole = 'admin' | 'agent';
export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: AdminRole;
}

const COOKIE_NAME = 'exp_admin';
const SESSION_TTL_DAYS = 7;
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64, maxmem: 64 * 1024 * 1024 };

// ── Password hashing ─────────────────────────────────────────────────────────

/** Hash a password → "scrypt$N$r$p$saltB64url$hashB64url". */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, SCRYPT.keylen, SCRYPT);
  return [
    'scrypt',
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString('base64url'),
    hash.toString('base64url'),
  ].join('$');
}

/** Constant-time verify against a stored "scrypt$..." string. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, nStr, rStr, pStr, saltB64, hashB64] = stored.split('$');
    if (scheme !== 'scrypt') return false;
    const N = Number(nStr), r = Number(rStr), p = Number(pStr);
    const salt = Buffer.from(saltB64, 'base64url');
    const expected = Buffer.from(hashB64, 'base64url');
    const actual = await scrypt(password, salt, expected.length, { N, r, p, maxmem: SCRYPT.maxmem });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// A fixed hash to verify against when the user is missing/disabled, so login
// timing doesn't reveal whether an email exists (anti-enumeration).
const DUMMY_HASH =
  'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$' +
  'KOQ4Z3iaNa5b4l3Q2dGZ8q3wq7x0o5oVQ2m9o0c5Q3a3sQ2q5y6o7c8d9e0f1g2h3i4j5k6l7m8n9o0p1q2r3s4t5';
/** Burn the same scrypt time as a real verify (used on missing/disabled users). */
export async function dummyVerify(password: string): Promise<void> {
  await verifyPassword(password, DUMMY_HASH);
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function createSession(
  userId: number,
  req: IncomingMessage,
  ttlDays = SESSION_TTL_DAYS,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + ttlDays * 86_400_000);
  const { ip, ua } = reqMeta(req);
  const sql = db();
  await sql`
    INSERT INTO admin_sessions (token, user_id, expires_at, ip, user_agent)
    VALUES (${token}, ${userId}, ${expiresAt}, ${ip}, ${ua})
  `;
  return { token, expiresAt };
}

export async function destroySession(token: string): Promise<void> {
  if (!token) return;
  const sql = db();
  await sql`DELETE FROM admin_sessions WHERE token = ${token}`;
}

/**
 * Opportunistic cleanup; called fire-and-forget on login. Prunes both expired
 * sessions and stale login-attempt rows (the throttle only ever reads the last
 * 15 minutes, so anything older is dead weight that would otherwise grow forever).
 */
export async function sweepExpiredSessions(): Promise<void> {
  try {
    const sql = db();
    await sql`DELETE FROM admin_sessions WHERE expires_at < now()`;
    await sql`DELETE FROM admin_login_attempts WHERE created_at < now() - interval '30 days'`;
  } catch {
    /* best effort */
  }
}

// ── Cookies (no cookie lib; raw header parse/set) ─────────────────────────────

export function parseCookies(req: IncomingMessage): Record<string, string> {
  const out: Record<string, string> = {};
  const header = req.headers.cookie;
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

// `Secure` should be set whenever the request is effectively HTTPS. Signals, in
// order of trust:
//  1. COOKIE_SECURE=1 — operator override for proxies (a misconfigured cPanel/
//     Passenger vhost) that drop the x-forwarded-proto header entirely.
//  2. PUBLIC_BASE_URL https:// — operator-controlled truth, independent of the
//     client-suppliable proto header.
//  3. request transport — x-forwarded-proto / x-forwarded-ssl / socket.encrypted.
function cookieSecure(req?: IncomingMessage): boolean {
  const forced = process.env.COOKIE_SECURE;
  if (forced === '1' || forced === 'true') return true;
  if ((process.env.PUBLIC_BASE_URL || '').trim().toLowerCase().startsWith('https://')) return true;
  if (!req) return false;
  const proto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim();
  const fwdSsl = (req.headers['x-forwarded-ssl'] as string | undefined)?.trim();
  return proto === 'https' || fwdSsl === 'on'
    || (req.socket as { encrypted?: boolean } | undefined)?.encrypted === true;
}

export function setSessionCookie(
  req: IncomingMessage,
  res: ServerResponse,
  token: string,
  maxAgeSec = SESSION_TTL_DAYS * 86_400,
): void {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`,
  ];
  if (cookieSecure(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(res: ServerResponse, req?: IncomingMessage): void {
  const parts = [`${COOKIE_NAME}=`, 'HttpOnly', 'Path=/', 'SameSite=Lax', 'Max-Age=0'];
  if (cookieSecure(req)) parts.push('Secure'); // flag parity with setSessionCookie
  res.setHeader('Set-Cookie', parts.join('; '));
}

// ── The gate ──────────────────────────────────────────────────────────────────

function roleSatisfies(have: AdminRole, need?: AdminRole): boolean {
  if (!need) return true;
  if (have === 'admin') return true; // admin satisfies any requirement
  return have === need;
}

/**
 * Resolve the current admin user from the session cookie. On failure it SENDS
 * the response (401 no/expired session, 403 wrong role) and returns null.
 * Caller pattern:  const user = await requireAuth(req, res, 'admin'); if (!user) return;
 */
export async function requireAuth(
  req: IncomingMessage,
  res: ServerResponse,
  role?: AdminRole,
): Promise<AuthUser | null> {
  const token = parseCookies(req)[COOKIE_NAME];
  if (!token) {
    sendJson(res, 401, { ok: false, error: 'unauthenticated' });
    return null;
  }
  const sql = db();
  const rows = (await sql`
    SELECT u.id, u.email, u.name, u.role, u.disabled
    FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id
    WHERE s.token = ${token} AND s.expires_at > now()
    LIMIT 1
  `) as Array<{ id: number; email: string; name: string; role: AdminRole; disabled: boolean }>;
  const row = rows[0];
  if (!row || row.disabled) {
    sendJson(res, 401, { ok: false, error: 'unauthenticated' });
    return null;
  }
  const user: AuthUser = { id: Number(row.id), email: row.email, name: row.name, role: row.role };
  if (!roleSatisfies(user.role, role)) {
    sendJson(res, 403, { ok: false, error: 'forbidden' });
    return null;
  }
  return user;
}

// ── Login throttle ────────────────────────────────────────────────────────────

const THROTTLE_MAX = 8; // failures per 15-minute window (see the interval in the query below)

/** true = allowed to attempt; false = too many recent failures. */
export async function checkLoginThrottle(ip: string | null, email: string): Promise<boolean> {
  const sql = db();
  const rows = (await sql`
    SELECT count(*)::int AS n FROM admin_login_attempts
    WHERE ok = false
      AND created_at > now() - interval '15 minutes'
      AND (ip = ${ip} OR email = ${email})
  `) as Array<{ n: number }>;
  return (rows[0]?.n ?? 0) < THROTTLE_MAX;
}

export async function recordLoginAttempt(ip: string | null, email: string, ok: boolean): Promise<void> {
  try {
    const sql = db();
    await sql`INSERT INTO admin_login_attempts (ip, email, ok) VALUES (${ip}, ${email}, ${ok})`;
    if (ok) {
      // A successful login proves the credential holder is legitimate — clear
      // their recent failures so stale typos don't accumulate toward a lockout.
      await sql`
        DELETE FROM admin_login_attempts
        WHERE ok = false AND email = ${email}
          AND created_at > now() - interval '15 minutes'
      `;
    }
  } catch {
    /* best effort */
  }
}

// ── Audit log ──────────────────────────────────────────────────────────────────

export interface AuditEntry {
  action: string;
  entity?: string;
  entityId?: string | number;
  before?: unknown;
  after?: unknown;
}

/** Fire-and-forget. NEVER throws into the request path. Store transitions, not PII. */
export function logAdminAction(
  user: Pick<AuthUser, 'id' | 'email'> | null,
  req: IncomingMessage,
  entry: AuditEntry,
): void {
  void (async () => {
    try {
      const { ip, ua } = reqMeta(req);
      const sql = db();
      await sql`
        INSERT INTO admin_audit (user_id, user_email, action, entity, entity_id, before, after, ip, user_agent)
        VALUES (${user?.id ?? null}, ${user?.email ?? null}, ${entry.action}, ${entry.entity ?? null},
                ${entry.entityId != null ? String(entry.entityId) : null},
                ${jsonbArg(entry.before ?? null)}::jsonb, ${jsonbArg(entry.after ?? null)}::jsonb, ${ip}, ${ua})
      `;
    } catch (err) {
      console.error('[admin-audit] failed:', err instanceof Error ? err.message : err);
    }
  })();
}
