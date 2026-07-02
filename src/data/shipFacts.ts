/**
 * Per-ship facts that vary between vessels: launch status, the five headline
 * spec values, godmother (where publicly named), taglines. Static data — extend
 * when partner shares the remaining godmother names + portrait URLs.
 *
 * The five spec LABELS (Ocean-Front Suites · Heated Pools · Restaurants · Bars &
 * Lounges · Guest-to-Host Ratio) live in the locale file at `ship.stats` and are
 * shared/translated. Only the VALUES vary per ship, so each record carries a
 * `specValues` array in that same order; ships without one fall back to the
 * shared `ship.stats` values. Sourced from the official explorajourneys.com ship
 * pages (Jun 2026): EXPLORA I & II = 456 suites / 6 restaurants; the newer
 * EXPLORA III & IV = 461 suites / 7 restaurants; all share 5 pools, 12 bars,
 * 1.25:1. Class specs not shown in the band (≈63,900 GT, 248 m, 14 decks, ~922
 * guests, ~640 crew) are recorded here for reference.
 */

import type { ShipCode } from '@/lib/shipAssets';

export type ShipStatus = 'in-service' | 'launching' | 'coming-soon';

export interface ShipGodmother {
  /** Publicly named godmother. Null for ships without an announced godmother. */
  name: string | null;
  /** i18n key for the bio paragraph. Null falls back to ship.godmother.tba. */
  bioKey: string | null;
  /** Optional portrait. Null hides the portrait column. */
  image: string | null;
}

export interface ShipFacts {
  code: ShipCode;
  name: string;          // "EXPLORA I"
  numeral: string;       // "I" — for italic-serif emphasis in the hero
  launchYear: number | null;
  status: ShipStatus;
  godmother: ShipGodmother;
  /** Optional per-ship tagline override. Null = use shared ship.tagline. */
  taglineOverrideKey: string | null;
  /**
   * The five headline spec VALUES in the order of the locale `ship.stats`
   * labels: [Ocean-Front Suites, Heated Pools, Restaurants, Bars & Lounges,
   * Guest-to-Host Ratio]. Undefined → use the shared `ship.stats` values.
   */
  specValues?: string[];
}

export const SHIP_FACTS: Record<ShipCode, ShipFacts> = {
  'explora-i': {
    code: 'explora-i',
    name: 'EXPLORA I',
    numeral: 'I',
    launchYear: 2023,
    status: 'in-service',
    godmother: {
      name: 'Dr. Sylvia Earle',
      bioKey: 'ship.godmother.exploraI.body',
      image: null,
    },
    taglineOverrideKey: null,
    specValues: ['456', '5', '6', '12', '1.25:1'],
  },
  'explora-ii': {
    code: 'explora-ii',
    name: 'EXPLORA II',
    numeral: 'II',
    launchYear: 2024,
    status: 'in-service',
    godmother: {
      name: 'Rosalba Giugni',
      bioKey: 'ship.godmother.exploraII.body',
      image: null,
    },
    taglineOverrideKey: null,
    specValues: ['456', '5', '6', '12', '1.25:1'],
  },
  'explora-iii': {
    code: 'explora-iii',
    name: 'EXPLORA III',
    numeral: 'III',
    launchYear: 2026,
    status: 'launching',
    godmother: {
      name: 'Cristina Ozores',
      bioKey: 'ship.godmother.exploraIII.body',
      image: null,
    },
    taglineOverrideKey: null,
    specValues: ['461', '5', '7', '12', '1.25:1'],
  },
  'explora-iv': {
    code: 'explora-iv',
    name: 'EXPLORA IV',
    numeral: 'IV',
    launchYear: 2027,
    status: 'launching',
    // Godmother not yet announced (as of Jun 2026) — falls back to ship.godmother.tba.
    godmother: { name: null, bioKey: null, image: null },
    taglineOverrideKey: null,
    specValues: ['461', '5', '7', '12', '1.25:1'],
  },
  'explora-v': {
    code: 'explora-v',
    name: 'EXPLORA V',
    numeral: 'V',
    launchYear: null,
    status: 'coming-soon',
    godmother: { name: null, bioKey: null, image: null },
    taglineOverrideKey: null,
    // No specValues yet — coming-soon; falls back to shared ship.stats.
  },
  'explora-vi': {
    code: 'explora-vi',
    name: 'EXPLORA VI',
    numeral: 'VI',
    launchYear: null,
    status: 'coming-soon',
    godmother: { name: null, bioKey: null, image: null },
    taglineOverrideKey: null,
  },
};

export function getShipFacts(code: string): ShipFacts {
  return SHIP_FACTS[code as ShipCode] ?? SHIP_FACTS['explora-i'];
}
