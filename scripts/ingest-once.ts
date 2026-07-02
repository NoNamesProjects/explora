/**
 * One-shot ingest runner. Loads .env.local, runs the full pipeline, prints
 * the result. Use INGEST_DRY_RUN=1 to skip DB writes.
 *
 * Run:   npm run ingest
 * Dry:   INGEST_DRY_RUN=1 npm run ingest
 */

import { existsSync, readFileSync } from 'node:fs';

// Lightweight .env loader (no dotenv dep).
for (const path of ['.env.local', '.env']) {
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?(.*?)"?\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

import { runIngest, IngestAbort } from '../lib/explora-flatfile/ingest';

async function main() {
  const t0 = Date.now();
  try {
    const result = await runIngest({ dryRun: process.env.INGEST_DRY_RUN === '1' });
    console.log(`Ingest ${result.status} (${Date.now() - t0} ms)`);
    console.log(`  Run ID:    ${result.runId}`);
    console.log(`  Ships:     ${result.counts.ships}`);
    console.log(`  Ports:     ${result.counts.ports}`);
    console.log(`  Suites:    ${result.counts.suiteCategories}`);
    console.log(`  Journeys:  ${result.counts.journeys}`);
    console.log(`  Days:      ${result.counts.journeyDays}`);
    console.log(`  Fares:     ${result.counts.fares}`);
    console.log(`  Excursions:${result.counts.excursions}`);
    if (result.notes) console.log(`  Notes:     ${result.notes}`);
  } catch (err) {
    if (err instanceof IngestAbort) {
      console.error(`✗ Ingest aborted: ${err.message}`);
      process.exit(2);
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
}

main();
