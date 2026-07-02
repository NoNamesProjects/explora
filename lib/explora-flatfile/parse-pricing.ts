/**
 * Parse a pricingReport_<CCY>-…xlsx (the live 2026 format) into fares +
 * suite-category master + per-journey metadata.
 *
 * REAL layout (probed 2026-06-01 — see [[explora-flatfile-format]]):
 *   - Single sheet named after the currency ("EUR").
 *   - A two-row header: a name row (merged suite-category group names) above
 *     a label row whose first 9 cols are the journey block
 *       Ship | Itinerary | Destination | Journey Code | Embarkation Port |
 *       Disembarkation Port | Departure Date | Length | Offer Type
 *     and then, repeating, one 6-column group per suite category:
 *       <CODE> Per Person Fare | 3rd & 4th Adult | 3rd & 4th Child |
 *       3rd & 4th Infant | Solo Fare | Solo Suppl %
 *   - One data row per (Journey × Offer Type); a journey spans several rows.
 *   - A blank group on a row = that suite is not offered on that sailing.
 *
 * Only the per-person fare goes into `prices['2A']` — that is the single key
 * both api/journeys.ts (MIN(prices->>'2A')) and JourneyDetail.tsx (min over all
 * price values) read, so storing anything else there would corrupt the "from"
 * price. The other components (3rd/4th adult/child/infant, solo, solo suppl %)
 * are preserved in `raw` instead.
 */

import * as XLSX from 'xlsx';
import type { Currency } from './pick-latest';
import type { ParsedSuiteCategory } from './parse-generic';
import {
  num, str, toIsoDate, deriveItinCd, slugFareCode, tierOf,
  normalizeShipCd, normalizeRegion,
} from './util';

export interface ParsedFare {
  journeyId: string;
  shipCd: string | null;
  itinCd: string | null;
  sailingDate: string | null; // ISO YYYY-MM-DD
  fareCode: string;
  fareDesc: string | null;
  priceType: string | null;
  suiteCategory: string;
  prices: Record<string, number | null>; // only '2A' (per person) — see note above
  currency: Currency;
  gft: { adt: number | null; chd: number | null } | null;
  ncf: { adt: number | null } | null;
  fareStartDate: string | null;
  fareEndDate: string | null;
  nowAvailable: boolean;
  items: string[];
  raw: Record<string, number | null> | null; // overflow fare components
}

export interface PricingJourneyMeta {
  journeyId: string;
  shipCd: string | null;
  itinName: string | null;
  region: string | null;
  embarkPort: string | null;
  disembarkPort: string | null;
  sailingDate: string | null;
  nights: number | null;
}

export interface ParsedPricingResult {
  currency: Currency;
  fares: ParsedFare[];
  suiteCategories: ParsedSuiteCategory[];
  journeyMeta: PricingJourneyMeta[];
}

interface JourneyCols {
  ship: number; itinName: number; region: number; journeyCode: number;
  embark: number; disembark: number; departureDate: number; length: number;
  offerType: number;
}

interface SuiteGroup {
  code: string;
  name: string;
  perPerson: number;
  adult: number | null;
  child: number | null;
  infant: number | null;
  soloFare: number | null;
  soloSuppl: number | null;
}

export function parsePricing(buf: Buffer, currency: Currency): ParsedPricingResult {
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });

  const fares: ParsedFare[] = [];
  const suiteCategories = new Map<string, ParsedSuiteCategory>();
  const journeyMeta = new Map<string, PricingJourneyMeta>();

  for (const sheetName of wb.SheetNames) {
    const grid = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
      header: 1,
      defval: null,
      raw: false,
      blankrows: false,
    });
    if (!grid.length) continue;

    const headerIdx = findHeaderRow(grid);
    if (headerIdx < 0) continue;
    const labelRow = grid[headerIdx];
    const nameRow = headerIdx > 0 ? grid[headerIdx - 1] : [];

    const cols = resolveJourneyCols(labelRow);
    if (cols.journeyCode < 0) continue;

    const groups = resolveSuiteGroups(labelRow, nameRow);
    for (const g of groups) {
      if (!suiteCategories.has(g.code)) {
        suiteCategories.set(g.code, {
          code: g.code, name: g.name, tier: tierOf(g.name),
          sqm: null, hasBalcony: true, maxOccupancy: null,
        });
      }
    }

    for (let r = headerIdx + 1; r < grid.length; r++) {
      const row = grid[r];
      if (!row) continue;
      const journeyId = str(row[cols.journeyCode]);
      if (!journeyId) continue;

      const offerType = str(row[cols.offerType]);
      const shipCd = normalizeShipCd(str(row[cols.ship]));
      const sailingDate = toIsoDate(row[cols.departureDate]);
      const length = num(row[cols.length]);

      if (!journeyMeta.has(journeyId)) {
        journeyMeta.set(journeyId, {
          journeyId,
          shipCd,
          itinName: str(row[cols.itinName]),
          region: normalizeRegion(str(row[cols.region])),
          embarkPort: str(row[cols.embark]),
          disembarkPort: str(row[cols.disembark]),
          sailingDate,
          nights: length,
        });
      }

      const fareCode = slugFareCode(offerType);

      for (const g of groups) {
        const perPerson = num(row[g.perPerson]);
        if (perPerson == null) continue; // suite not offered on this sailing

        fares.push({
          journeyId,
          shipCd,
          itinCd: deriveItinCd(journeyId),
          sailingDate,
          fareCode,
          fareDesc: offerType,
          priceType: null,
          suiteCategory: g.code,
          prices: { '2A': perPerson },
          currency,
          gft: null,
          ncf: null,
          fareStartDate: null,
          fareEndDate: null,
          nowAvailable: true,
          items: [],
          raw: {
            thirdFourthAdult: g.adult != null ? num(row[g.adult]) : null,
            thirdFourthChild: g.child != null ? num(row[g.child]) : null,
            thirdFourthInfant: g.infant != null ? num(row[g.infant]) : null,
            soloFare: g.soloFare != null ? num(row[g.soloFare]) : null,
            soloSupplPct: g.soloSuppl != null ? num(row[g.soloSuppl]) : null,
          },
        });
      }
    }
  }

  return {
    currency,
    fares,
    suiteCategories: [...suiteCategories.values()],
    journeyMeta: [...journeyMeta.values()],
  };
}

// ─── Header resolution ──────────────────────────────────────────────────

function findHeaderRow(grid: unknown[][]): number {
  for (let r = 0; r < Math.min(grid.length, 10); r++) {
    const row = grid[r] ?? [];
    if (row.some((c) => /^journey\s*code$/i.test(String(c ?? '').trim()))) return r;
  }
  return -1;
}

function resolveJourneyCols(labelRow: unknown[]): JourneyCols {
  const find = (re: RegExp): number =>
    labelRow.findIndex((c) => re.test(String(c ?? '').trim()));
  return {
    ship: find(/^ship$/i),
    itinName: find(/^itinerary$/i),
    region: find(/^destination$/i),
    journeyCode: find(/^journey\s*code$/i),
    embark: find(/^embarkation\s*port$/i),
    disembark: find(/^disembarkation\s*port$/i),
    departureDate: find(/^departure\s*date$/i),
    length: find(/^length$/i),
    offerType: find(/^offer\s*type$/i),
  };
}

// Each suite group is anchored by its "… Per Person Fare" column; the role
// columns are matched by label within the span up to the next anchor, so the
// parser tolerates column reordering or extra columns inside a group.
function resolveSuiteGroups(labelRow: unknown[], nameRow: unknown[]): SuiteGroup[] {
  const anchors: number[] = [];
  labelRow.forEach((c, i) => {
    if (/per\s*person\s*fare\s*$/i.test(String(c ?? '').trim())) anchors.push(i);
  });

  const groups: SuiteGroup[] = [];
  for (let a = 0; a < anchors.length; a++) {
    const start = anchors[a];
    const end = a + 1 < anchors.length ? anchors[a + 1] : labelRow.length;
    const code = String(labelRow[start])
      .replace(/\s*per\s*person\s*fare\s*$/i, '')
      .trim();
    const name = str(nameRow[start]) ?? code;

    const roleCol = (re: RegExp): number | null => {
      for (let c = start; c < end; c++) {
        if (re.test(String(labelRow[c] ?? '').trim())) return c;
      }
      return null;
    };

    groups.push({
      code,
      name,
      perPerson: start,
      adult: roleCol(/3rd\s*&?\s*4th\s*adult/i),
      child: roleCol(/3rd\s*&?\s*4th\s*child/i),
      infant: roleCol(/3rd\s*&?\s*4th\s*infant/i),
      soloFare: roleCol(/solo\s*fare/i),
      soloSuppl: roleCol(/solo\s*suppl/i),
    });
  }
  return groups;
}
