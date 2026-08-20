/**
 * Fixed-window, in-memory rate limiter for the public POST endpoints.
 *
 * Per Node process: exact on the single-process VPS/cPanel deploy; on Vercel
 * each warm instance keeps its own window, which still bounds abuse. State
 * resets on restart — fine for abuse control, not for billing-grade quotas.
 *
 * Server-side only — never import from src/.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { reqMeta, sendJson } from './http';

interface Bucket { count: number; resetAt: number; }

const buckets = new Map<string, Bucket>();

// Opportunistic sweep so the map can't grow unbounded under key spraying
// (e.g. randomized newsletter addresses). Amortized: at most one O(n) pass
// per SWEEP_MIN_INTERVAL_MS, and a hard cap fails OPEN (clear) rather than
// letting memory grow — this is abuse control, not a billing-grade quota.
const SWEEP_ABOVE = 10_000;
const MAX_BUCKETS = 50_000;
const SWEEP_MIN_INTERVAL_MS = 30_000;
let lastSweepAt = 0;

function sweep(now: number): void {
  if (buckets.size <= SWEEP_ABOVE || now - lastSweepAt < SWEEP_MIN_INTERVAL_MS) {
    if (buckets.size > MAX_BUCKETS) buckets.clear();
    return;
  }
  lastSweepAt = now;
  for (const [key, b] of buckets) {
    if (now >= b.resetAt) buckets.delete(key);
  }
  if (buckets.size > MAX_BUCKETS) buckets.clear();
}

interface Decision { allowed: boolean; retryAfterSec: number; }

function decide(key: string, limit: number, windowMs: number, now: number): Decision {
  sweep(now);
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  buckets.set(key, { ...bucket, count: bucket.count + 1 });
  return { allowed: true, retryAfterSec: 0 };
}

export interface RateLimitOpts {
  /** Namespace so endpoints don't share windows (e.g. 'contact'). */
  scope: string;
  /** Max requests per window. */
  limit: number;
  windowMs: number;
  /** Override the per-IP key (e.g. a normalized email address). */
  key?: string;
}

/**
 * Returns true when the request was REJECTED (a 429 with Retry-After has
 * already been sent — the caller must stop). Call before any parsing or DB
 * work so floods stay cheap.
 */
export function rateLimited(req: IncomingMessage, res: ServerResponse, opts: RateLimitOpts): boolean {
  const id = opts.key ?? reqMeta(req).ip ?? 'unknown';
  const { allowed, retryAfterSec } = decide(`${opts.scope}:${id}`, opts.limit, opts.windowMs, Date.now());
  if (allowed) return false;
  res.setHeader('Retry-After', String(retryAfterSec));
  sendJson(res, 429, { ok: false, error: 'rate-limited' });
  return true;
}
