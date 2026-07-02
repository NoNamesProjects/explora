/**
 * Shared cell/value helpers for the flatfile parsers. Kept in one place so
 * parse-pricing, parse-generic, and assemble stay consistent.
 */

export function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

/** Parse a money / numeric / percentage cell. Strips €$£, thousands commas,
 *  trailing %, and whitespace. Returns null for blank / "N/A". */
export function num(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s.toUpperCase() === 'N/A') return null;
  const cleaned = s.replace(/[,€$£%\s]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8,
  sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

/** Normalise a date cell to ISO YYYY-MM-DD. Handles Date objects, DD/MM/YYYY,
 *  DD-MM-YYYY, "08 June 2026", and already-ISO strings. */
export function toIsoDate(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (!s) return null;

  // DD/MM/YYYY or DD-MM-YYYY
  let m = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // "08 June 2026" / "8 Jun 2026"
  m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})$/);
  if (m) {
    const [, d, monName, y] = m;
    const mo = MONTHS[monName.toLowerCase()];
    if (mo) return `${y}-${String(mo).padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

/** Whole days between two ISO dates (b - a). */
export function daysBetween(aIso: string, bIso: string): number {
  const a = Date.parse(`${aIso}T00:00:00Z`);
  const b = Date.parse(`${bIso}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

/**
 * Derive an itinerary code from a journey code by stripping the leading
 * ship-code + YYYYMMDD date. "EP20260608FSAPI1" → "FSAPI1". Falls back to the
 * full journey code if the pattern doesn't match. Sailings of the same
 * itinerary on different dates share this code.
 */
export function deriveItinCd(journeyCode: string): string {
  const m = /^[A-Za-z]{1,3}\d{8}(.+)$/.exec(journeyCode);
  return m ? m[1] : journeyCode;
}

// The live feed emits 2-letter ship codes; the rest of the site (the ship
// filter in FindAJourney.tsx, the EP01→explora-i link derivation in
// JourneyDetail.tsx, and megaMenu.ts) is wired for EP01–EP06. Normalising
// feed → EP0n at ingest time lets the existing frontend work unchanged.
//
// Feed-code → EXPLORA I–VI. EP and EX are the two in-service ships (both sail
// from 2026-06), so launch-date order can't separate them — and the original
// 2026-06-01 guess had them flipped. Corrected 2026-06-09 by cross-checking
// journey EP20260706PIRPIR against the live site: EP = EXPLORA II, EX = EXPLORA I.
// EL/EO/EA/EJ → III–VI match the launch-date order of their sailings.
const SHIP_CODE_MAP: Record<string, string> = {
  EX: 'EP01', EP: 'EP02', EL: 'EP03', EO: 'EP04', EA: 'EP05', EJ: 'EP06',
};

const EP_NAMES: Record<string, string> = {
  EP01: 'EXPLORA I', EP02: 'EXPLORA II', EP03: 'EXPLORA III',
  EP04: 'EXPLORA IV', EP05: 'EXPLORA V', EP06: 'EXPLORA VI',
};

/** Feed ship code → the canonical EP0n the site expects. Unknown codes pass
 *  through unchanged (still named via shipNameOf's fallback). */
export function normalizeShipCd(code: string | null): string | null {
  if (!code) return code;
  return SHIP_CODE_MAP[code.toUpperCase()] ?? code;
}

/** Display name for a ship code. Accepts either a canonical EP0n or a raw feed
 *  code; falls back to the code itself so nothing is invented. */
export function shipNameOf(code: string | null): string {
  if (!code) return 'Unknown';
  const up = code.toUpperCase();
  return EP_NAMES[up] ?? EP_NAMES[SHIP_CODE_MAP[up] ?? ''] ?? code;
}

// Feed "Destination" labels → the URL slugs the site filters on (the region
// <select> in FindAJourney.tsx and the /destinations/:region route). Confirmed
// 1:1 against the site's region set 2026-06-01.
const REGION_SLUGS: Record<string, string> = {
  'mediterranean & western europe': 'mediterranean',
  'caribbean & central america': 'caribbean',
  'alaska': 'alaska',
  'asia': 'asia',
  'northern europe, iceland & greenland': 'northern-europe',
  'grand journeys': 'transatlantic',
  'red sea & arabian peninsula': 'arabian',
  'south america & amazon': 'south-america',
  'central & north america pacific coast': 'pacific-coast',
  'us & canada east coast & new england': 'canada-new-england',
  'world journey': 'world-journey',
};

const warnedRegions = new Set<string>();

/** Feed region label → site URL slug. Unknown labels fall back to a kebab slug
 *  (logged once) so the value stays filterable instead of silently breaking. */
export function normalizeRegion(label: string | null): string | null {
  if (!label) return label;
  const key = label.trim().toLowerCase().replace(/\s+/g, ' ');
  const slug = REGION_SLUGS[key];
  if (slug) return slug;
  if (!warnedRegions.has(key)) {
    warnedRegions.add(key);
    console.warn(`[normalizeRegion] no slug mapping for "${label}" — using fallback`);
  }
  return key.replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Stable fare code from an Offer Type label. "Explora Journeys Fare" →
 *  "EXPLORA_JOURNEYS_FARE". */
export function slugFareCode(offerType: string | null): string {
  const slug = (offerType ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'STANDARD';
}

/** Coarse tier grouping derived from a suite-category name. */
export function tierOf(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('penthouse')) return 'Penthouse';
  if (n.includes('residence')) return 'Residence';
  if (n.includes('terrace')) return 'Ocean Terrace';
  return 'Suite';
}
