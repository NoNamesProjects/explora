/**
 * Probe: download ONE pricingReport (EUR if available; otherwise the first
 * pricing file) + the genericReport, dump sheet names + first 50 rows of
 * each sheet to lib/explora-flatfile/probe-output.json.
 *
 * Run via `npm run probe`. Use the dumped output to validate / tune the
 * parsers in parse-pricing.ts and parse-generic.ts before the first real
 * ingest.
 */

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as XLSX from 'xlsx';
import { authenticate } from './auth';
import { listFiles } from './list-files';
import { downloadFile } from './download';
import { pickLatest, type PricingFileRef } from './pick-latest';

export interface ProbeOutput {
  generatedAt: string;
  environment: string;
  pricing: {
    file: string;
    currency: string;
    sheets: Record<string, unknown[][]>;
  } | null;
  generic: {
    file: string;
    sheets: Record<string, unknown[][]>;
  } | null;
  filesIndex: Array<{ folderPath: string; fileName: string; size: string | null }>;
}

const ROW_LIMIT = 50;

export async function runProbe(opts: { authOnly?: boolean } = {}): Promise<ProbeOutput> {
  const auth = await authenticate();
  // Auth-only fast path: don't burn the token on a list-files call.
  if (opts.authOnly) {
    return {
      generatedAt: new Date().toISOString(),
      environment: process.env.EXPLORA_ENV ?? 'preprod',
      pricing: null,
      generic: null,
      filesIndex: [],
    };
  }

  const files = await listFiles(auth.sessionToken);
  const filesIndex = files.map((f) => ({
    folderPath: f.folderPath,
    fileName: f.fileName,
    size: f.size,
  }));

  const latest = pickLatest(files);

  // Prefer EUR for the probe; fall back to whatever's there.
  const pricingPick: PricingFileRef | undefined =
    latest.pricing.find((p) => p.currency === 'EUR') ?? latest.pricing[0];

  let pricingDump: ProbeOutput['pricing'] = null;
  if (pricingPick) {
    const buf = await downloadFile(pricingPick.file.s3SignedUrl);
    pricingDump = {
      file: pricingPick.file.fileName,
      currency: pricingPick.currency,
      sheets: dumpWorkbook(buf),
    };
  }

  let genericDump: ProbeOutput['generic'] = null;
  if (latest.generic) {
    const buf = await downloadFile(latest.generic.file.s3SignedUrl);
    genericDump = {
      file: latest.generic.file.fileName,
      sheets: dumpWorkbook(buf),
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    environment: process.env.EXPLORA_ENV ?? 'preprod',
    pricing: pricingDump,
    generic: genericDump,
    filesIndex,
  };
}

function dumpWorkbook(buf: Buffer): Record<string, unknown[][]> {
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  const out: Record<string, unknown[][]> = {};
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
      raw: false,
      blankrows: false,
    });
    out[sheetName] = rows.slice(0, ROW_LIMIT);
  }
  return out;
}

export async function writeProbeOutput(output: ProbeOutput): Promise<string> {
  const path = join(process.cwd(), 'lib/explora-flatfile/probe-output.json');
  await writeFile(path, JSON.stringify(output, null, 2), 'utf8');
  return path;
}
