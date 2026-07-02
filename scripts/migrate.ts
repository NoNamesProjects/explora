/**
 * Apply lib/db/schema.sql to the database in DATABASE_URL.
 *
 * Stands in for `psql "$DATABASE_URL" < lib/db/schema.sql` where psql isn't
 * installed: reads the schema, strips comment lines, splits on `;`, and runs
 * each statement through the Neon HTTP driver. All statements are
 * CREATE … IF NOT EXISTS, so this is safe to re-run.
 *
 * Run: npm run migrate   (after DATABASE_URL is set in .env.local)
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Lightweight .env loader (same as scripts/probe.ts).
for (const path of ['.env.local', '.env']) {
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?(.*?)"?\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

import { rawQuery } from '../lib/db/client';

async function main() {
  const path = join(process.cwd(), 'lib/db/schema.sql');
  const raw = readFileSync(path, 'utf8');

  // Drop full-line `--` comments, then split into statements on `;`.
  const stripped = raw
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n');
  const statements = stripped.split(';').map((s) => s.trim()).filter(Boolean);

  console.log(`Applying ${statements.length} statements from lib/db/schema.sql …`);
  let n = 0;
  for (const stmt of statements) {
    await rawQuery(stmt);
    n++;
    const head = stmt.replace(/\s+/g, ' ').slice(0, 64);
    console.log(`  [${n}/${statements.length}] ${head}…`);
  }

  const tables = (await rawQuery(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
  )) as Array<{ table_name: string }>;
  console.log(`\nSchema applied. Tables now present: ${tables.map((t) => t.table_name).join(', ')}`);
}

main().catch((err) => {
  console.error(`✗ migrate failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
