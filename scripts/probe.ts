/**
 * Probe runner. Loads .env.local, authenticates against the flatfile API,
 * lists files, downloads one pricing XLS + one generic XLS, and dumps the
 * first 50 rows of each sheet to lib/explora-flatfile/probe-output.json.
 *
 * Run:   npm run probe
 * Auth-only smoke test: npm run probe -- --auth-only
 */

import { existsSync, readFileSync } from 'node:fs';

// Lightweight .env loader (no dotenv dep). Loads .env.local first, then
// .env — never overrides values already in process.env.
for (const path of ['.env.local', '.env']) {
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?(.*?)"?\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

import { runProbe, writeProbeOutput } from '../lib/explora-flatfile/probe';

async function main() {
  const authOnly = process.argv.includes('--auth-only');

  const t0 = Date.now();
  try {
    const out = await runProbe({ authOnly });
    const ms = Date.now() - t0;
    if (authOnly) {
      console.log(`Auth OK (${ms} ms). Environment: ${out.environment}.`);
      return;
    }
    const path = await writeProbeOutput(out);
    console.log(`Probe OK (${ms} ms).`);
    console.log(`Environment:     ${out.environment}`);
    console.log(`Pricing file:    ${out.pricing?.file ?? '(none found)'}`);
    console.log(`Pricing sheets:  ${out.pricing ? Object.keys(out.pricing.sheets).join(', ') : '—'}`);
    console.log(`Generic file:    ${out.generic?.file ?? '(none found)'}`);
    console.log(`Generic sheets:  ${out.generic ? Object.keys(out.generic.sheets).join(', ') : '—'}`);
    console.log(`Files indexed:   ${out.filesIndex.length}`);
    console.log(`Output written:  ${path}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
}

main();
