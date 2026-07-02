/**
 * Merge the two live workbooks into one upsert-ready dataset.
 *
 * The itinerary workbook (parse-generic) supplies ports, ships, and the
 * day-by-day journeys. The pricing workbook (parse-pricing) supplies the
 * suite-category master, the per-journey display name + region + embark/
 * disembark ports, and the fares. Neither sheet is complete on its own, so a
 * journey is the union of both sources:
 *   - itinerary-sourced journeys are enriched with the pricing metadata;
 *   - journeys that appear only in pricing get a stub row (no days) so their
 *     fares still have a parent (fares.journey_id FK → journeys).
 */

import type { Currency } from './pick-latest';
import type {
  ParsedGeneric, ParsedItinerary, ParsedShip, ParsedPort, ParsedSuiteCategory,
} from './parse-generic';
import type { ParsedFare, ParsedPricingResult } from './parse-pricing';
import { deriveItinCd, shipNameOf } from './util';

export interface AssembledData {
  ships: ParsedShip[];
  ports: ParsedPort[];
  suiteCategories: ParsedSuiteCategory[];
  journeys: ParsedItinerary[];
  faresByCurrency: Array<{ currency: Currency; fares: ParsedFare[] }>;
}

export function assemble(
  generic: ParsedGeneric,
  pricing: ParsedPricingResult[],
): AssembledData {
  const journeys = new Map<string, ParsedItinerary>(
    generic.itineraries.map((it) => [it.journeyId, { ...it }]),
  );
  const ships = new Map<string, ParsedShip>(
    generic.ships.map((s) => [s.shipCd, s]),
  );
  const suites = new Map<string, ParsedSuiteCategory>();

  for (const p of pricing) {
    for (const c of p.suiteCategories) {
      if (!suites.has(c.code)) suites.set(c.code, c);
    }

    for (const m of p.journeyMeta) {
      const existing = journeys.get(m.journeyId);
      if (existing) {
        existing.itinDesc ??= m.itinName;
        existing.region ??= m.region;
        existing.sailingPort ??= m.embarkPort;
        existing.terminationPort ??= m.disembarkPort;
        existing.sailingDate ??= m.sailingDate;
        existing.shipCd ??= m.shipCd;
        if (existing.nights == null) existing.nights = m.nights;
      } else {
        journeys.set(m.journeyId, {
          journeyId: m.journeyId,
          shipCd: m.shipCd,
          itinCd: deriveItinCd(m.journeyId),
          itinDesc: m.itinName,
          region: m.region,
          sailingPort: m.embarkPort,
          terminationPort: m.disembarkPort,
          sailingDate: m.sailingDate,
          nights: m.nights,
          embkTime: null,
          disEmbkTime: null,
          days: [],
        });
      }

      if (m.shipCd && !ships.has(m.shipCd)) {
        ships.set(m.shipCd, {
          shipCd: m.shipCd, shipName: shipNameOf(m.shipCd),
          imo: null, decks: null, capacity: null, launchYear: null,
        });
      }
    }
  }

  return {
    ships: [...ships.values()],
    ports: generic.ports,
    suiteCategories: [...suites.values()],
    journeys: [...journeys.values()],
    faresByCurrency: pricing.map((p) => ({ currency: p.currency, fares: p.fares })),
  };
}
