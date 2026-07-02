/**
 * Data shapes that flow Flatfile API → Neon → React.
 *
 * INFERRED schema based on the MSC Cache REST predecessor (same parent
 * group, same Spring Boot + Couchbase backend per local docs). Treat
 * every field as a hypothesis until validated against a real XLS dump.
 * See plan §3 for sourcing.
 */

export type ShipCd = 'EP01' | 'EP02' | 'EP03' | 'EP04' | 'EP05' | 'EP06';

export type SuiteCategory =
  | 'OT1' | 'OT2' | 'OT3' | 'OT4'   // Ocean Terrace Suites
  | 'GT'                            // Ocean Grand Terrace
  | 'PH' | 'DP' | 'PP' | 'GP'       // Penthouse tiers
  | 'OR' | 'OS';                    // Ocean Residence / Owner's Suite

export type PriceType = 'BESTPR' | 'EARLYBIRD' | 'SOLO' | 'RESIDENT';

export type Currency = 'EUR' | 'USD' | 'GBP' | 'CHF';

export type Region =
  | 'mediterranean'
  | 'caribbean'
  | 'alaska'
  | 'asia'
  | 'northern-europe'
  | 'transatlantic'
  | 'arabian'
  | 'south-america'
  | 'pacific-coast'
  | 'canada-new-england'
  | 'world-journey';

export interface Port {
  portCd: string;
  portName: string;
  country: string;
  lat: number;
  lon: number;
  timezone: string;
}

export interface Ship {
  shipCd: ShipCd;
  shipName: string;
  imo?: string;
  decks: number;
  capacityGuests: number;
  launchYear: number;
  heroImage?: string;
}

export interface SuiteCategoryDef {
  code: SuiteCategory;
  name: string;
  tier: 'OceanTerrace' | 'OceanGrandTerrace' | 'Penthouse' | 'Residence' | 'OwnersResidence';
  sqm: number;
  hasBalcony: boolean;
  maxOccupancy: number;
  imageUrl?: string;
}

export interface JourneyDay {
  dayNumber: number;
  portCd: string;
  arrivalTime?: string;   // HH:mm
  departureTime?: string; // HH:mm
  overnight: boolean;
  description?: string;
}

export interface Excursion {
  excursionCd: string;
  portCd: string;
  name: string;
  durationMinutes: number;
  intensity?: 'EASY' | 'MEDIUM' | 'HARD';
  priceEUR?: number;
  longDesc?: string;
}

export type PriceComposition =
  | '1A' | '2A' | '2A1C' | '2A2C' | '3A' | '4A' | '1A_solo';

export interface Fare {
  fareCode: string;
  fareDesc: string;
  priceType: PriceType;
  suiteCategory: SuiteCategory;
  prices: Partial<Record<PriceComposition, number | 'N/A'>>;
  currency: Currency;
  gft?: { adt: number; chd?: number };
  ncf?: { adt: number };
  fareStartDate: string; // ISO YYYY-MM-DD
  fareEndDate: string;
  optionExpiresDate?: string;
  nowAvailable: boolean;
  items: string[]; // parsed from "OBS:WIFI:0|..."
}

export interface Journey {
  journeyID: string;         // e.g. EP20270309SGASGA
  shipCd: ShipCd;
  itinCd: string;
  itinDesc: string;
  region: Region;
  sailingPort: string;
  terminationPort: string;
  sailingDate: string;       // ISO YYYY-MM-DD
  nights: number;
  embkTime?: string;
  disEmbkTime?: string;
  days?: JourneyDay[];
  fares?: Fare[];
  isAvailable: boolean;
  lastSeenAt: string;        // ISO timestamp
}

export interface IngestRun {
  runId: string;
  startedAt: string;
  finishedAt?: string;
  journeyCount: number;
  failedFiles: number;
  status: 'running' | 'ok' | 'aborted' | 'failed';
  notes?: string;
}
