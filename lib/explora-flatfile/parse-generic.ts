/**
 * Parse an ItineraryReport-…xlsx (the live 2026 "generic" content) into
 * ports + per-journey day-by-day itineraries + ship stubs.
 *
 * REAL layout (probed 2026-06-01 — see [[explora-flatfile-format]]): a single
 * flat sheet "Itinerary", one row per (journey × day), headers:
 *   Ship code | Journey code | Date | Destination | Nights | Country Code |
 *   Port Code | Commercial Port Name | ETA (hh:mm) | ETD (hh:mm)
 * where "Nights" is the 1-based day index (NOT total nights).
 *
 * The journey display name, region detail, and suite-category master live in
 * the PRICING workbook, not here — assemble.ts merges the two. Suite categories
 * and excursions are therefore empty from this parser; the interfaces keep the
 * full ParsedGeneric shape that ingest.ts consumes.
 */

import * as XLSX from 'xlsx';
import {
  str, num, toIsoDate, daysBetween, deriveItinCd, shipNameOf,
  normalizeShipCd, normalizeRegion,
} from './util';

export interface ParsedShip {
  shipCd: string;
  shipName: string;
  imo: string | null;
  decks: number | null;
  capacity: number | null;
  launchYear: number | null;
}

export interface ParsedPort {
  portCd: string;
  portName: string;
  country: string | null;
  lat: number | null;
  lon: number | null;
  timezone: string | null;
}

export interface ParsedJourneyDay {
  dayNumber: number;
  portCd: string | null;
  arrivalTime: string | null;
  departureTime: string | null;
  overnight: boolean;
  description: string | null;
}

export interface ParsedItinerary {
  journeyId: string;
  shipCd: string | null;
  itinCd: string | null;
  itinDesc: string | null;
  region: string | null;
  sailingPort: string | null;
  terminationPort: string | null;
  sailingDate: string | null;
  nights: number | null;
  embkTime: string | null;
  disEmbkTime: string | null;
  days: ParsedJourneyDay[];
}

export interface ParsedSuiteCategory {
  code: string;
  name: string;
  tier: string | null;
  sqm: number | null;
  hasBalcony: boolean;
  maxOccupancy: number | null;
}

export interface ParsedExcursion {
  excursionCd: string;
  portCd: string | null;
  name: string;
  durationMinutes: number | null;
  intensity: string | null;
  priceEUR: number | null;
}

export interface ParsedGeneric {
  ships: ParsedShip[];
  ports: ParsedPort[];
  itineraries: ParsedItinerary[];
  suiteCategories: ParsedSuiteCategory[];
  excursions: ParsedExcursion[];
}

interface ItinCols {
  shipCode: number; journeyCode: number; date: number; destination: number;
  dayIndex: number; countryCode: number; portCode: number; portName: number;
  eta: number; etd: number;
}

// Working accumulator: tracks the raw day dates so sailingDate/nights can be
// computed once the journey's rows are all collected.
interface ItinWork extends ParsedItinerary {
  _dates: string[];
}

export function parseGeneric(buf: Buffer): ParsedGeneric {
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });

  const ports = new Map<string, ParsedPort>();
  const byJourney = new Map<string, ItinWork>();
  const shipCodes = new Set<string>();

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
    const cols = resolveCols(grid[headerIdx]);
    if (cols.journeyCode < 0) continue;

    for (let r = headerIdx + 1; r < grid.length; r++) {
      const row = grid[r];
      if (!row) continue;
      const journeyId = str(row[cols.journeyCode]);
      if (!journeyId) continue;

      const portCd = str(row[cols.portCode]);
      const portName = str(row[cols.portName]);
      const country = str(row[cols.countryCode]);
      if (portCd && !ports.has(portCd)) {
        ports.set(portCd, {
          portCd, portName: portName ?? portCd, country,
          lat: null, lon: null, timezone: null,
        });
      }

      const shipCd = normalizeShipCd(str(row[cols.shipCode]));
      if (shipCd) shipCodes.add(shipCd);

      let it = byJourney.get(journeyId);
      if (!it) {
        it = {
          journeyId,
          shipCd,
          itinCd: deriveItinCd(journeyId),
          itinDesc: null,
          region: normalizeRegion(str(row[cols.destination])),
          sailingPort: null,
          terminationPort: null,
          sailingDate: null,
          nights: null,
          embkTime: null,
          disEmbkTime: null,
          days: [],
          _dates: [],
        };
        byJourney.set(journeyId, it);
      }

      const dayNumber = num(row[cols.dayIndex]);
      const dateIso = toIsoDate(row[cols.date]);
      if (dateIso) it._dates.push(dateIso);
      if (dayNumber != null) {
        it.days.push({
          dayNumber,
          portCd,
          arrivalTime: str(row[cols.eta]),
          departureTime: str(row[cols.etd]),
          overnight: false,
          description: null,
        });
      }
    }
  }

  const itineraries: ParsedItinerary[] = [];
  for (const it of byJourney.values()) {
    it.days.sort((a, b) => a.dayNumber - b.dayNumber);
    const first = it.days[0];
    const last = it.days[it.days.length - 1];
    it.sailingPort = first?.portCd ?? null;
    it.terminationPort = last?.portCd ?? null;
    it.embkTime = first?.departureTime ?? null;
    it.disEmbkTime = last?.arrivalTime ?? null;

    if (it._dates.length) {
      const sorted = [...it._dates].sort();
      it.sailingDate = sorted[0];
      it.nights = daysBetween(sorted[0], sorted[sorted.length - 1]);
    }
    if (it.nights == null && it.days.length) {
      it.nights = it.days[it.days.length - 1].dayNumber - 1;
    }

    const { _dates, ...clean } = it;
    void _dates;
    itineraries.push(clean);
  }

  const ships: ParsedShip[] = [...shipCodes].map((shipCd) => ({
    shipCd,
    shipName: shipNameOf(shipCd),
    imo: null, decks: null, capacity: null, launchYear: null,
  }));

  return { ships, ports: [...ports.values()], itineraries, suiteCategories: [], excursions: [] };
}

// ─── Header resolution ──────────────────────────────────────────────────

function findHeaderRow(grid: unknown[][]): number {
  for (let r = 0; r < Math.min(grid.length, 10); r++) {
    const row = grid[r] ?? [];
    if (row.some((c) => /^journey\s*code$/i.test(String(c ?? '').trim()))) return r;
  }
  return -1;
}

function resolveCols(labelRow: unknown[]): ItinCols {
  const find = (re: RegExp): number =>
    labelRow.findIndex((c) => re.test(String(c ?? '').trim()));
  return {
    shipCode: find(/^ship\s*code$/i),
    journeyCode: find(/^journey\s*code$/i),
    date: find(/^date$/i),
    destination: find(/^destination$/i),
    dayIndex: find(/^nights$/i),
    countryCode: find(/^country\s*code$/i),
    portCode: find(/^port\s*code$/i),
    portName: find(/^commercial\s*port\s*name$/i),
    eta: find(/^eta/i),
    etd: find(/^etd/i),
  };
}
