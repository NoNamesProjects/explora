/**
 * Okta partner-portal authentication for the Explora flatfile API.
 *
 * Returns a sessionToken that the next list-files call consumes. Per the
 * partner spec, the token is SINGLE-USE — every list-files call needs its
 * own fresh authenticate(). The single-flight mutex below prevents two
 * concurrent code paths from each burning a token (which could trip Okta's
 * rate limit or lock the account).
 *
 * The password is never written to any error string or log line.
 */

import { getExploraConfig, ExploraEnvError } from './env';

export interface AuthResult {
  sessionToken: string;
  expiresAt: Date;
}

export class ExploraAuthError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ExploraAuthError';
    this.status = status;
  }
}

let inFlight: Promise<AuthResult> | null = null;

export function authenticate(): Promise<AuthResult> {
  if (inFlight) return inFlight;
  const p = doAuth();
  inFlight = p;
  // Always clear after settle so the next caller starts fresh (the token we
  // just minted is single-use for ONE list-files call). Both settle paths are
  // handled HERE: a bare `p.finally(...)` would fork a new promise branch
  // that rejects with no handler when auth fails — an unhandledRejection
  // that kills the whole Node process (observed on the cPanel runtime).
  p.then(
    () => { inFlight = null; },
    () => { inFlight = null; },
  );
  return p;
}

async function doAuth(): Promise<AuthResult> {
  const cfg = getExploraConfig();

  let res: Response;
  try {
    res = await fetch(cfg.authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ username: cfg.username, password: cfg.password }),
    });
  } catch (err) {
    throw new ExploraAuthError(
      `Network error contacting ${cfg.authUrl}: ${String(err)}`,
    );
  }

  if (!res.ok) {
    // Body may contain the username — keep it; never log the password.
    const body = await res.text().catch(() => '');
    throw new ExploraAuthError(
      `Auth failed (${res.status}) — check EXPLORA_USERNAME and EXPLORA_PASSWORD. Response: ${truncate(body, 240)}`,
      res.status,
    );
  }

  const data = (await res.json().catch(() => null)) as
    | {
        status?: string;
        sessionToken?: string;
        expiresAt?: string;
      }
    | null;

  if (!data || data.status !== 'SUCCESS' || !data.sessionToken) {
    throw new ExploraAuthError(
      `Auth response missing sessionToken. status=${data?.status ?? 'unknown'}`,
    );
  }

  const expiresAt = data.expiresAt ? new Date(data.expiresAt) : new Date(Date.now() + 5 * 60_000);
  return { sessionToken: data.sessionToken, expiresAt };
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

export { ExploraEnvError };
