/**
 * Postgres client. Server-side only — never import from src/.
 *
 * The whole app speaks Postgres through tagged-template `sql`...`` calls. In
 * production that's Neon's HTTP driver (@neondatabase/serverless); for a local
 * Postgres (or any non-Neon host) we use the `postgres` (porsager) driver,
 * which supports the same tagged-template API. db() picks the right one from
 * DATABASE_URL's host, so every api/*.ts handler works unchanged either way.
 *
 * The two places that need driver-specific calls (the ingest's transaction
 * batching and the schema migration's raw SQL) branch on dbIsNeon() / rawQuery().
 */

import { neon } from '@neondatabase/serverless';
import postgres from 'postgres';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cached: any = null;
let cachedIsNeon = false;

function hostIsNeon(url: string): boolean {
  try {
    return /\.neon\.tech$/i.test(new URL(url).host);
  } catch {
    return false;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function db(): any {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Set a local Postgres URL or a Neon connection string in .env.local.',
    );
  }
  cachedIsNeon = hostIsNeon(url);
  cached = cachedIsNeon
    ? neon(url)
    : postgres(url, { max: 8, idle_timeout: 20, onnotice: () => {} });
  return cached;
}

/** True when the active connection is Neon's HTTP driver. */
export function dbIsNeon(): boolean {
  db();
  return cachedIsNeon;
}

/**
 * Run a raw (non-parameterised) SQL string and return the rows. Bridges neon's
 * `.query()` and porsager's `.unsafe()`. Used by the schema migration.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function rawQuery(text: string): Promise<any[]> {
  const sql = db();
  return dbIsNeon() ? sql.query(text) : sql.unsafe(text);
}

/**
 * Run a PARAMETERISED query ($1, $2, …) and return the rows. The sibling of
 * rawQuery for user input: admin list/filter/analytics SQL builds a text query
 * with placeholders and passes the bound values here. Bridges neon's
 * `sql.query(text, params)` and porsager's `sql.unsafe(text, params)`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function paramQuery<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const sql = db();
  return dbIsNeon() ? sql.query(text, params) : sql.unsafe(text, params);
}

/**
 * Produce the right bound value for a `${...}::jsonb` parameter on each driver.
 * Neon's HTTP driver wants a JSON **string** (then `::jsonb` parses it); porsager
 * wants the object via its `sql.json()` wrapper (handing it a pre-stringified
 * string makes porsager JSON-encode it again, storing a jsonb string). Returns
 * null untouched.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function jsonbArg(value: unknown): any {
  if (value == null) return null;
  if (dbIsNeon()) return JSON.stringify(value);
  return db().json(value);
}
