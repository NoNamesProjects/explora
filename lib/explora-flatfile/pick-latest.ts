/**
 * From the flat list of files returned by listFiles(), pick the latest
 * pricingReport per currency + the latest generic/itinerary report.
 *
 * Explora's filenames changed since the original spec. Both the current
 * (2026) and legacy (2022) conventions are matched:
 *
 *   pricingReport_EUR-01Jun26-09_50.xlsx     ← current (Excel)
 *   pricingReportCsv_EUR-01Jun26-09_50.csv   ← current CSV twin, skipped
 *   ItineraryReport-1Jun26.xlsx              ← current generic content (Excel)
 *   ItineraryReport-1Jun26.csv               ← current CSV twin, skipped
 *   pricingReport - EUR - 08-02-2022.xls     ← legacy, still matched
 *   genericReport - 08-02-2022.xls           ← legacy, still matched
 *
 * The in-filename date format has fully drifted (DDMonYY-HH_MM, no leading
 * zeros), so recency is decided by the API's `lastModified` timestamp rather
 * than by parsing the name — exactly the fallback the original spec called
 * for. The filename is used only to identify file type + currency.
 *
 * The `.xls`/`.xlsx`-only extension match drops the CSV twins (SheetJS reads
 * the Excel workbooks; the CSV duplicates carry the same data).
 */

import type { FlatFile } from './list-files';

export type Currency = 'EUR' | 'USD' | 'GBP' | 'CHF';

export interface PricingFileRef {
  file: FlatFile;
  currency: Currency;
  date: Date;
}

export interface GenericFileRef {
  file: FlatFile;
  date: Date;
}

export interface LatestFiles {
  pricing: PricingFileRef[];
  generic: GenericFileRef | null;
}

// "pricingReport" + a separator (space/underscore/hyphen) + 3-letter currency,
// ending in .xls/.xlsx. The required separator after "pricingReport" rejects
// the "pricingReportCsv_…" twin (no separator there), and the extension drops
// the .csv files.
const PRICING_RE = /^pricingReport[\s_-]+([A-Z]{3})\b.*\.xlsx?$/i;

// "ItineraryReport" (current) or "genericReport" (legacy) Excel workbook.
const GENERIC_RE = /^(?:itinerary|generic)Report\b.*\.xlsx?$/i;

const EPOCH = new Date(0);

export function pickLatest(files: ReadonlyArray<FlatFile>): LatestFiles {
  const pricingByCurrency = new Map<Currency, PricingFileRef>();
  let generic: GenericFileRef | null = null;

  for (const f of files) {
    const name = f.fileName.trim();
    const date = f.lastModified ?? EPOCH;

    const mPricing = name.match(PRICING_RE);
    if (mPricing) {
      const ccy = mPricing[1].toUpperCase() as Currency;
      const existing = pricingByCurrency.get(ccy);
      if (!existing || date > existing.date) {
        pricingByCurrency.set(ccy, { file: f, currency: ccy, date });
      }
      continue;
    }

    if (GENERIC_RE.test(name)) {
      if (!generic || date > generic.date) {
        generic = { file: f, date };
      }
    }
  }

  return {
    pricing: [...pricingByCurrency.values()],
    generic,
  };
}
