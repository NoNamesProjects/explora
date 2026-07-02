/**
 * Parse-check: download the live workbooks, run the real parsers + assemble,
 * and print the resulting dataset shape + a sample journey. NO database — this
 * validates the parser rework against production data without needing Neon.
 *
 * Run: npm run parse:check
 */

import { existsSync, readFileSync } from 'node:fs';

// Lightweight .env loader (same as scripts/probe.ts).
for (const path of ['.env.local', '.env']) {
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?(.*?)"?\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

import { authenticate } from '../lib/explora-flatfile/auth';
import { listFiles } from '../lib/explora-flatfile/list-files';
import { downloadFile } from '../lib/explora-flatfile/download';
import { pickLatest } from '../lib/explora-flatfile/pick-latest';
import { parseGeneric } from '../lib/explora-flatfile/parse-generic';
import { parsePricing } from '../lib/explora-flatfile/parse-pricing';
import { assemble } from '../lib/explora-flatfile/assemble';

async function main() {
  const t0 = Date.now();
  const auth = await authenticate();
  const files = await listFiles(auth.sessionToken);
  const latest = pickLatest(files);

  if (!latest.generic) throw new Error('No ItineraryReport found in listing.');
  if (!latest.pricing.length) throw new Error('No pricingReport found in listing.');

  const generic = parseGeneric(await downloadFile(latest.generic.file.s3SignedUrl));
  const pricingResults = await Promise.all(
    latest.pricing.map(async (p) => parsePricing(await downloadFile(p.file.s3SignedUrl), p.currency)),
  );
  const data = assemble(generic, pricingResults);

  const totalFares = data.faresByCurrency.reduce((a, p) => a + p.fares.length, 0);
  const totalDays = data.journeys.reduce((a, it) => a + it.days.length, 0);
  const priced = data.journeys.filter((j) =>
    data.faresByCurrency.some((c) => c.fares.some((f) => f.journeyId === j.journeyId))).length;

  console.log(`\nparse-check OK (${Date.now() - t0} ms)\n`);
  console.log('COUNTS');
  console.log(`  ships            ${data.ships.length}`);
  console.log(`  ports            ${data.ports.length}`);
  console.log(`  suiteCategories  ${data.suiteCategories.length}`);
  console.log(`  journeys         ${data.journeys.length}  (${priced} with fares, ${data.journeys.length - priced} without)`);
  console.log(`  journeyDays      ${totalDays}`);
  console.log(`  fares            ${totalFares}  (${data.faresByCurrency.map((c) => `${c.currency}:${c.fares.length}`).join(', ')})`);

  console.log('\nSHIPS (code → name)');
  for (const s of data.ships) console.log(`  ${s.shipCd} → ${s.shipName}`);

  console.log('\nREGIONS');
  const regions = [...new Set(data.journeys.map((j) => j.region).filter(Boolean))];
  for (const r of regions) console.log(`  ${r}`);

  console.log('\nSUITE CATEGORIES (code → name [tier])');
  for (const c of data.suiteCategories) console.log(`  ${c.code.padEnd(5)} ${c.name}  [${c.tier}]`);

  // Sample journey: prefer one with both days and fares.
  const sample = data.journeys.find((j) =>
    j.days.length > 0 &&
    data.faresByCurrency.some((c) => c.fares.some((f) => f.journeyId === j.journeyId))) ?? data.journeys[0];

  if (sample) {
    console.log('\nSAMPLE JOURNEY');
    console.log(`  id        ${sample.journeyId}  (itinCd ${sample.itinCd})`);
    console.log(`  ship      ${sample.shipCd}`);
    console.log(`  name      ${sample.itinDesc ?? '—'}`);
    console.log(`  region    ${sample.region ?? '—'}`);
    console.log(`  sails     ${sample.sailingDate ?? '—'}  ·  ${sample.nights ?? '?'} nights`);
    console.log(`  route     ${sample.sailingPort ?? '?'} → ${sample.terminationPort ?? '?'}  (${sample.days.length} days)`);
    console.log('  first days:');
    for (const d of sample.days.slice(0, 5)) {
      console.log(`    day ${String(d.dayNumber).padStart(2)}  ${d.portCd ?? 'at sea'}  arr ${d.arrivalTime ?? '—'}  dep ${d.departureTime ?? '—'}`);
    }

    const sampleFares = data.faresByCurrency
      .flatMap((c) => c.fares)
      .filter((f) => f.journeyId === sample.journeyId);
    const offers = [...new Set(sampleFares.map((f) => f.fareDesc))];
    const lowest = sampleFares
      .map((f) => f.prices['2A'])
      .filter((v): v is number => typeof v === 'number')
      .reduce((a, b) => (a == null || b < a ? b : a), null as number | null);
    console.log(`  fares     ${sampleFares.length} rows · offers: ${offers.join(', ')}`);
    console.log(`  lowest 2A €${lowest != null ? Math.round(lowest).toLocaleString() : '—'}`);
    const oneOffer = sampleFares.filter((f) => f.fareDesc === offers[0]);
    console.log(`  suites on "${offers[0]}":`);
    for (const f of oneOffer.slice(0, 6)) {
      console.log(`    ${f.suiteCategory.padEnd(5)} €${Math.round(f.prices['2A'] ?? 0).toLocaleString()}  (solo €${f.raw?.soloFare != null ? Math.round(f.raw.soloFare).toLocaleString() : '—'})`);
    }
  }
  console.log('');
}

main().catch((err) => {
  console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
