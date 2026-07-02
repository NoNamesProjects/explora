/**
 * Pure, side-effect-free derivation of headline stats for a destination region
 * from a page of JourneyCard results. No fetching, no React, no i18n — give it
 * the journeys + the server's total and it returns a flat, display-ready shape.
 *
 * Every field is null-safe: missing ship names, prices and dates are skipped,
 * never coerced into bogus values.
 */

import type { JourneyCard } from '@/lib/api';

export interface RegionStats {
  /** Total matching journeys (the server's `total`, not the page length). */
  count: number;
  /** Distinct ship names, sorted by ship number when derivable, else alpha. */
  ships: string[];
  /** Distinct port names across preview + embark/disembark, capped. */
  ports: string[];
  nightsMin: number | null;
  nightsMax: number | null;
  /** Lowest non-null fare in EUR across the page, or null. */
  priceFrom: number | null;
  /** Distinct sailing months as month names, chronological. */
  months: string[];
}

const PORTS_CAP = 24;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Trailing integer in a ship name ("Explora II" stays alpha; "Ship 12" → 12). */
function shipNumber(name: string): number | null {
  const m = name.match(/(\d+)\s*$/);
  return m ? Number(m[1]) : null;
}

function compareShips(a: string, b: string): number {
  const na = shipNumber(a);
  const nb = shipNumber(b);
  if (na != null && nb != null) {
    const base = a.slice(0, a.length - String(na).length).trim();
    const baseCmp = base.localeCompare(b.slice(0, b.length - String(nb).length).trim());
    if (baseCmp !== 0) return baseCmp;
    return na - nb;
  }
  return a.localeCompare(b);
}

export function deriveRegionStats(journeys: JourneyCard[], total: number): RegionStats {
  const list = Array.isArray(journeys) ? journeys : [];

  const shipSet = new Set<string>();
  const portSet = new Set<string>();
  // 'YYYY-MM' → its numeric sort key, deduped chronologically.
  const monthSet = new Set<string>();

  let nightsMin: number | null = null;
  let nightsMax: number | null = null;
  let priceFrom: number | null = null;

  for (const j of list) {
    if (!j) continue;

    if (j.shipName) shipSet.add(j.shipName);

    const portCandidates: Array<string | null | undefined> = [
      ...(Array.isArray(j.destinations) ? j.destinations.map((d) => d.name) : []),
      j.sailingPortName,
      j.terminationPortName,
    ];
    for (const p of portCandidates) {
      if (p && portSet.size < PORTS_CAP) portSet.add(p);
    }

    if (typeof j.nights === 'number' && Number.isFinite(j.nights)) {
      nightsMin = nightsMin == null ? j.nights : Math.min(nightsMin, j.nights);
      nightsMax = nightsMax == null ? j.nights : Math.max(nightsMax, j.nights);
    }

    if (typeof j.lowestPriceEUR === 'number' && Number.isFinite(j.lowestPriceEUR)) {
      priceFrom = priceFrom == null ? j.lowestPriceEUR : Math.min(priceFrom, j.lowestPriceEUR);
    }

    if (typeof j.sailingDate === 'string' && j.sailingDate.length >= 7) {
      const ym = j.sailingDate.slice(0, 7); // 'YYYY-MM'
      if (/^\d{4}-\d{2}$/.test(ym)) monthSet.add(ym);
    }
  }

  const ships = [...shipSet].sort(compareShips);

  const months = [...monthSet]
    .sort() // ISO 'YYYY-MM' sorts chronologically as strings
    .map((ym) => {
      const monthIdx = Number(ym.slice(5, 7)) - 1;
      return MONTH_NAMES[monthIdx] ?? ym;
    });
  // Distinct month names, keeping first (chronological) occurrence.
  const seenMonth = new Set<string>();
  const monthsDistinct = months.filter((m) => (seenMonth.has(m) ? false : (seenMonth.add(m), true)));

  return {
    count: total,
    ships,
    ports: [...portSet],
    nightsMin,
    nightsMax,
    priceFrom,
    months: monthsDistinct,
  };
}
