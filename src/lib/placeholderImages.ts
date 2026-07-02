/**
 * Placeholder image registry — used by src/lib/image.ts when Cloudinary is
 * NOT configured (dev / before partner uploads brand photography).
 *
 * Each entry maps an asset ID to a curated Unsplash photo ID. When
 * Cloudinary is configured (VITE_CLOUDINARY_CLOUD set), this registry is
 * bypassed entirely.
 *
 * If a registry entry is missing, we fall back through:
 *   1. Exact REGISTRY match → Unsplash photo
 *   2. Category prefix match (CATEGORY_FALLBACKS) → Unsplash photo (rotated by hash)
 *   3. Procedural ocean-gradient SVG → always works, never broken
 *
 * Partner workflow when real photos arrive:
 *   - Upload to Cloudinary, set VITE_CLOUDINARY_CLOUD — entire file ignored.
 *   - OR: replace individual entries here with Cloudinary asset IDs +
 *     a switch in image.ts to use them. Simpler is to just point at Cloudinary.
 *
 * Photo sourcing: Unsplash photos are free for commercial use, no attribution
 * required (https://unsplash.com/license). These are placeholder picks only;
 * partner should ultimately use licensed brand photography from Explora/MSC.
 */

/** Ocean-neutral palettes for the procedural-gradient fallback. */
const OCEAN_PALETTES: ReadonlyArray<ReadonlyArray<string>> = [
  ['#0B2433', '#15303F', '#3B6B7A', '#5E8C9B'],
  ['#15303F', '#23404F', '#3D6963', '#9BB4BD'],
  ['#0B2433', '#3B6B7A', '#7A9BB5', '#C9BBA0'],
  ['#1A2B3C', '#2C4F5A', '#5E8C9B', '#D8C28E'],
  ['#0B2433', '#23404F', '#5C6770', '#C2A878'],
  ['#0E2A3A', '#3D6963', '#7A9BB5', '#F4F0E8'],
];

/**
 * Curated Unsplash photo IDs. Format is the part after `photo-` in the
 * canonical Unsplash URL — e.g. `1530541930197-ff16ac917b0e` becomes
 * `https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?…`.
 */
const REGISTRY: Record<string, string> = {
  // ── Destinations: kebab-case slugs ───────────────────────────────────
  'explora/placeholder/destination-mediterranean':         '1530541930197-ff16ac917b0e',
  'explora/placeholder/destination-mediterranean-hero':    '1545569310-25e2e2b1d8d4',
  'explora/placeholder/destination-caribbean':             '1507525428034-b723cf961d3e',
  'explora/placeholder/destination-caribbean-hero':        '1559128010-7c1ad6e1b6e5',
  'explora/placeholder/destination-alaska':                '1531366936337-7c912a4589a7',
  'explora/placeholder/destination-alaska-hero':           '1531366936337-7c912a4589a7',
  'explora/placeholder/destination-asia':                  '1528181304800-259b08848526',
  'explora/placeholder/destination-asia-hero':             '1528181304800-259b08848526',
  'explora/placeholder/destination-northern-europe':       '1517823382935-51bfcb0ec6bc',
  'explora/placeholder/destination-northern-europe-hero':  '1517823382935-51bfcb0ec6bc',
  'explora/placeholder/destination-transatlantic':         '1473496169904-658ba7c44d8a',
  'explora/placeholder/destination-transatlantic-hero':    '1473496169904-658ba7c44d8a',
  'explora/placeholder/destination-arabian':               '1518684079-3c830dcef090',
  'explora/placeholder/destination-arabian-hero':          '1518684079-3c830dcef090',
  'explora/placeholder/destination-south-america':         '1543872084-c7bd3822856f',
  'explora/placeholder/destination-south-america-hero':    '1543872084-c7bd3822856f',
  'explora/placeholder/destination-pacific-coast':         '1486328228599-85db4443971f',
  'explora/placeholder/destination-pacific-coast-hero':    '1486328228599-85db4443971f',
  'explora/placeholder/destination-canada-new-england':    '1474524955719-b9f87c50ce47',
  'explora/placeholder/destination-canada-new-england-hero': '1474524955719-b9f87c50ce47',
  'explora/placeholder/destination-world-journey':         '1502209524164-acea936639a2',
  'explora/placeholder/destination-world-journey-hero':    '1502209524164-acea936639a2',

  // ── Ships (6) — fleet thumbs + hero ──────────────────────────────────
  'explora/placeholder/ship-i':                  '1599640842225-85d111c60e6b',
  'explora/placeholder/ship-ii':                 '1571902943202-507ec2618e8f',
  'explora/placeholder/ship-iii':                '1612277795421-9bc7706a4a34',
  'explora/placeholder/ship-iv':                 '1602002418082-a4443e081dd1',
  'explora/placeholder/ship-v':                  '1493558103817-58b2924bce98',
  'explora/placeholder/ship-vi':                 '1488646953014-85cb44e25828',
  'explora/placeholder/ship-explora-i-hero':     '1599640842225-85d111c60e6b',
  'explora/placeholder/ship-explora-ii-hero':    '1571902943202-507ec2618e8f',
  'explora/placeholder/ship-explora-iii-hero':   '1612277795421-9bc7706a4a34',
  'explora/placeholder/ship-explora-iv-hero':    '1602002418082-a4443e081dd1',
  'explora/placeholder/ship-explora-v-hero':     '1493558103817-58b2924bce98',
  'explora/placeholder/ship-explora-vi-hero':    '1488646953014-85cb44e25828',

  // ── Suites: 10 ship-tiers + 4 overview cards ─────────────────────────
  'explora/placeholder/suite-owners':            '1631049307264-da0ec9d70304',
  'explora/placeholder/suite-cocoon':            '1582719478250-c89cae4dc85b',
  'explora/placeholder/suite-serenity':          '1611892440504-42a792e24d32',
  'explora/placeholder/suite-retreat':           '1591088398332-8a7791972843',
  'explora/placeholder/suite-cove':              '1564501049412-61c2a3083791',
  'explora/placeholder/suite-grandPenthouse':    '1618773928121-c32242e63f39',
  'explora/placeholder/suite-premierPenthouse':  '1611892440504-42a792e24d32',
  'explora/placeholder/suite-deluxePenthouse':   '1631049307264-da0ec9d70304',
  'explora/placeholder/suite-penthouse':         '1582719478250-c89cae4dc85b',
  'explora/placeholder/suite-oceanTerrace':      '1591088398332-8a7791972843',
  'explora/placeholder/suite-tier-owners':       '1631049307264-da0ec9d70304',
  'explora/placeholder/suite-tier-residences':   '1611892440504-42a792e24d32',
  'explora/placeholder/suite-tier-penthouses':   '1582719478250-c89cae4dc85b',
  'explora/placeholder/suite-tier-suites':       '1591088398332-8a7791972843',
  'explora/placeholder/suite-overview-hero':     '1611892440504-42a792e24d32',

  // ── Venues (6) ───────────────────────────────────────────────────────
  'explora/placeholder/venue-astern-lounge':     '1517248135467-4c7edcad34c4',
  'explora/placeholder/venue-sky-bar-14':        '1559827260-dc66d52bef19',
  'explora/placeholder/venue-cove-residence':    '1582719478250-c89cae4dc85b',
  'explora/placeholder/venue-explora-lounge':    '1414235077428-338989a2e8c0',
  'explora/placeholder/venue-helios-pool':       '1571902943202-507ec2618e8f',
  'explora/placeholder/venue-malt-whisky-bar':   '1568374750540-5f5e8f74dfde',

  // ── Life on board ────────────────────────────────────────────────────
  'explora/placeholder/life-dining':             '1414235077428-338989a2e8c0',
  'explora/placeholder/life-suites':             '1611892440504-42a792e24d32',
  'explora/placeholder/life-wellness':           '1540555700478-4be289fbecef',
  'explora/placeholder/life-lounging':           '1571902943202-507ec2618e8f',
  'explora/placeholder/life-entertainment':      '1493225457124-a3eb161ffa5f',
  'explora/placeholder/life-shopping':           '1567401893414-76b7b1e5a7a5',

  // ── Life-in-region (per-region × 4 sub-tabs) ─────────────────────────
  'explora/placeholder/life-mediterranean-culture':   '1533105079780-92b9be482077',
  'explora/placeholder/life-mediterranean-culinary':  '1473093295043-cdd812d0e601',
  'explora/placeholder/life-mediterranean-history':   '1552832230-c0197dd311b5',
  'explora/placeholder/life-mediterranean-nature':    '1530541930197-ff16ac917b0e',

  // ── Highlights ───────────────────────────────────────────────────────
  'explora/placeholder/highlight-monaco':        '1531219572328-a0171b4448a3',
  'explora/placeholder/highlight-sailgp':        '1530549387789-4c1017266635',
  'explora/placeholder/highlight-world':         '1502209524164-acea936639a2',
  'explora/placeholder/highlight-ambassador':    '1494790108377-be9c29b29330',

  // ── Collections (homepage cards) ─────────────────────────────────────
  'explora/placeholder/collection-summer2026':       '1502209524164-acea936639a2',
  'explora/placeholder/collection-winter2026':       '1517823382935-51bfcb0ec6bc',
  'explora/placeholder/collection-f1Monaco':         '1531219572328-a0171b4448a3',
  'explora/placeholder/collection-worldJourney2029': '1488646953014-85cb44e25828',
  'explora/placeholder/collection-summer':           '1502209524164-acea936639a2',

  // ── Editorial / single-use ───────────────────────────────────────────
  'explora/placeholder/hero-ocean':              '1559827260-dc66d52bef19',
  'explora/placeholder/hero-aerial-ship':        '1599640842225-85d111c60e6b',
  'explora/placeholder/hero-still-life':         '1567401893414-76b7b1e5a7a5',
  // Warm amber-lit wellness interior — homepage hero. Mood-match for the
  // brand's "Maybe…" hammam/spa frames (the image itself is generic Unsplash).
  'explora/placeholder/hero-amber-interior':     '1540555700478-4be289fbecef',
  'explora/placeholder/world-journey':           '1488646953014-85cb44e25828',
  'explora/placeholder/why-explora':             '1559827260-dc66d52bef19',
  'explora/placeholder/dining':                  '1414235077428-338989a2e8c0',
  'explora/placeholder/godmother':               '1494790108377-be9c29b29330',
  'explora/placeholder/ship-guide-cover':        '1599640842225-85d111c60e6b',
  'explora/placeholder/ebrochure-cover':         '1602002418082-a4443e081dd1',

  // ── Latest Offers cards (homepage section 1) ─────────────────────────
  'explora/placeholder/offer-invitation':        '1533105079780-92b9be482077',
  'explora/placeholder/offer-spontaneous':       '1486328228599-85db4443971f',
  'explora/placeholder/offer-extended':          '1500530855697-b586d89ba3ee',
};

/** Category prefix → fallback Unsplash IDs (rotated by hash on the asset ID). */
const CATEGORY_FALLBACKS: Record<string, ReadonlyArray<string>> = {
  destination: ['1502209524164-acea936639a2', '1530541930197-ff16ac917b0e', '1559827260-dc66d52bef19', '1473496169904-658ba7c44d8a'],
  ship:        ['1599640842225-85d111c60e6b', '1571902943202-507ec2618e8f', '1602002418082-a4443e081dd1'],
  suite:       ['1611892440504-42a792e24d32', '1582719478250-c89cae4dc85b', '1631049307264-da0ec9d70304'],
  life:        ['1414235077428-338989a2e8c0', '1540555700478-4be289fbecef', '1571902943202-507ec2618e8f'],
  venue:       ['1517248135467-4c7edcad34c4', '1568374750540-5f5e8f74dfde', '1559827260-dc66d52bef19'],
  highlight:   ['1530549387789-4c1017266635', '1531219572328-a0171b4448a3', '1488646953014-85cb44e25828'],
  collection:  ['1502209524164-acea936639a2', '1517823382935-51bfcb0ec6bc', '1488646953014-85cb44e25828'],
};

function unsplashUrl(id: string, w: number, h: number, dpr?: number): string {
  const params = new URLSearchParams({
    w: String(w),
    h: String(h),
    fit: 'crop',
    auto: 'format',
    q: '80',
  });
  if (dpr && dpr > 1) params.set('dpr', String(dpr));
  return `https://images.unsplash.com/photo-${id}?${params.toString()}`;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Procedural ocean-toned gradient as a data: URL. Always works, never breaks. */
export function gradientFallback(seed: string, w = 1280, h = 720): string {
  const palette = OCEAN_PALETTES[hashString(seed) % OCEAN_PALETTES.length];
  const stops = palette
    .map((c, i) => `<stop offset='${Math.round((i / (palette.length - 1)) * 100)}%' stop-color='${c}'/>`)
    .join('');
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' preserveAspectRatio='xMidYMid slice'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>${stops}</linearGradient></defs>` +
    `<rect width='100%' height='100%' fill='url(#g)'/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Resolve a placeholder URL for an asset ID. Order:
 *   1. Exact match in REGISTRY → Unsplash photo
 *   2. Prefix match in CATEGORY_FALLBACKS → Unsplash photo (rotated by hash)
 *   3. Procedural ocean gradient (always succeeds)
 */
export function placeholderUrl(
  assetId: string,
  w: number,
  h: number,
  dpr?: number,
): string {
  const exact = REGISTRY[assetId];
  if (exact) return unsplashUrl(exact, w, h, dpr);

  for (const [prefix, ids] of Object.entries(CATEGORY_FALLBACKS)) {
    if (assetId.includes(`/${prefix}-`) || assetId.includes(`/${prefix}/`)) {
      const id = ids[hashString(assetId) % ids.length];
      return unsplashUrl(id, w, h, dpr);
    }
  }

  return gradientFallback(assetId, w, h);
}
