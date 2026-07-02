/**
 * One-shot, resumable fetch of one destination photo per port.
 *
 *   npm run fetch:port-images -- --wiki --smoke        # first ~12 ports, Wikimedia, validate
 *   npm run fetch:port-images -- --wiki --embark-only  # the ~37 embarkation ports
 *   npm run fetch:port-images -- --wiki                # every visited port (keyless, ~minutes)
 *   npm run fetch:port-images -- --smoke               # same, via Pexels (needs PEXELS_API_KEY)
 *
 * Two sources:
 *   • --wiki  → Wikipedia/Wikimedia REST (keyless; each city's own lead photo; attribution stored).
 *   • default → Pexels (needs PEXELS_API_KEY; 200 searches/hour, so it staggers across windows).
 *
 * Embarkation ports are fetched FIRST (cards + heroes). Resumable: skips ports
 * already downloaded. Each photo is saved to public/photos/ports/<port_cd>.<ext>
 * and recorded in src/data/portImages.generated.json (with attribution).
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';

// ── Lightweight .env loader (same pattern as scripts/migrate.ts) ─────────────
for (const path of ['.env.local', '.env']) {
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?(.*?)"?\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

import { db } from '../lib/db/client';

const PEXELS_KEY = process.env.PEXELS_API_KEY;
const ARGS = process.argv.slice(2);
const SMOKE = ARGS.includes('--smoke');
const EMBARK_ONLY = ARGS.includes('--embark-only');
const NO_WAIT = ARGS.includes('--no-wait');
const WIKI = ARGS.includes('--wiki');
const COMMONS = ARGS.includes('--commons'); // keyless real photos from Wikimedia Commons

// Re-fetch just a subset of port codes (audit fix mode): --only AAATC,AEDFW,…
// When set, these ports are ALWAYS re-fetched (the "already done" skip is bypassed).
const ONLY: Set<string> | null = (() => {
  const i = ARGS.indexOf('--only');
  const csv = i === -1 ? null : ARGS[i + 1];
  if (!csv || csv.startsWith('--')) return null;
  return new Set(csv.split(',').map((s) => s.trim()).filter(Boolean));
})();

// Per-port query overrides (code → better search string), written by the photo
// audit. Lets a flagged port re-fetch against a curated query instead of the
// default city+country one. Optional file — absent = no overrides.
const OVERRIDE_QUERIES: Record<string, string> = (() => {
  const f = 'src/data/portImageQueries.override.json';
  try {
    return existsSync(f) ? (JSON.parse(readFileSync(f, 'utf8')) as Record<string, string>) : {};
  } catch {
    return {};
  }
})();

const OUT_JSON = 'src/data/portImages.generated.json';
const IMG_DIR = 'public/photos/ports';
const REQUEST_DELAY_MS = WIKI || COMMONS ? 1200 : 300;
const UA = 'ExploraPartnerSite/1.0 (destination port image fetch; contact: partner site)';

/** Wikimedia lead images that are NOT photos — flags, crests, seals, logos, maps. */
const GRAPHIC_RE = /(flag|coat[_-]?of[_-]?arms|wappen|bandera|escudo|seal|emblem|crest|insignia|\blogo\b|locator|location[_-]?map|map[_-]?of|\bmap\b)/i;

interface PortRow { port_cd: string; port_name: string; country: string | null }
interface Entry { file: string; credit?: string; creditUrl?: string; source?: string; query?: string }
interface Hit { url: string; credit: string; creditUrl: string }

// ISO-3166 alpha-2 → English name (disambiguates e.g. Cartagena ES vs CO).
const COUNTRY: Record<string, string> = {
  AE: 'United Arab Emirates', AR: 'Argentina', AU: 'Australia', BB: 'Barbados', BE: 'Belgium',
  BR: 'Brazil', CA: 'Canada', CL: 'Chile', CN: 'China', CO: 'Colombia', CR: 'Costa Rica',
  CY: 'Cyprus', DE: 'Germany', DK: 'Denmark', DO: 'Dominican Republic', DZ: 'Algeria',
  EC: 'Ecuador', EE: 'Estonia', EG: 'Egypt', ES: 'Spain', FI: 'Finland', FR: 'France',
  GB: 'United Kingdom', GR: 'Greece', HR: 'Croatia', ID: 'Indonesia', IE: 'Ireland',
  IL: 'Israel', IN: 'India', IS: 'Iceland', IT: 'Italy', JP: 'Japan', KH: 'Cambodia',
  KR: 'South Korea', LK: 'Sri Lanka', LV: 'Latvia', MA: 'Morocco', MC: 'Monaco',
  ME: 'Montenegro', MT: 'Malta', MU: 'Mauritius', MX: 'Mexico', MY: 'Malaysia',
  NL: 'Netherlands', NO: 'Norway', NZ: 'New Zealand', OM: 'Oman', PA: 'Panama', PE: 'Peru',
  PH: 'Philippines', PL: 'Poland', PT: 'Portugal', QA: 'Qatar', RU: 'Russia', SA: 'Saudi Arabia',
  SE: 'Sweden', SG: 'Singapore', SI: 'Slovenia', SN: 'Senegal', TH: 'Thailand', TN: 'Tunisia',
  TR: 'Turkey', TW: 'Taiwan', US: 'United States', VI: 'US Virgin Islands', VN: 'Vietnam', ZA: 'South Africa',
};

// Famous cruise terminal → recognisable city (keyed by lowercased full port name).
const OVERRIDES: Record<string, string> = {
  'fusina (venice)': 'Venice',
  'civitavecchia (rome)': 'Rome',
  'civitavecchia': 'Rome',
  'piraeus (athens)': 'Athens',
  'piraeus': 'Athens',
  'new year fireworks dxb': 'Dubai',
  'yokohama (tokyo)': 'Tokyo',
};

/** The recognisable city name (no country), override-aware. */
function cityName(name: string): string {
  const o = OVERRIDES[name.toLowerCase().trim()];
  if (o) return o;
  return name.replace(/\(.*?\)/g, ' ').split(/[,/]/)[0].trim();
}

/** Pexels query: "City, Country". */
function pexelsQuery(name: string, country: string | null): string {
  const city = cityName(name);
  const c = country ? COUNTRY[country] : '';
  return [city, c].filter(Boolean).join(', ');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const extOf = (url: string) => {
  const m = /\.(jpe?g|png|webp|svg)(?:[?#]|$)/i.exec(url);
  return m ? `.${m[1].toLowerCase().replace('jpeg', 'jpg')}` : '.jpg';
};

/** Validate real image bytes (JPEG/PNG/WebP/GIF) so an error HTML never gets saved. */
function isImage(buf: Buffer): boolean {
  if (buf.length < 1024) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;                                    // JPEG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true; // PNG
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return true;
  if (buf.subarray(0, 4).toString('ascii') === 'GIF8') return true;                       // GIF
  return false;
}

/** fetch() that backs off on 429/5xx — both the Wikimedia API and its image CDN throttle bursts. */
async function fetchRetry(url: string, init?: RequestInit, tries = 6): Promise<Response> {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, init);
    if (res.status === 429 || res.status >= 500) {
      // Escalate even when Retry-After says "1s" (Wikimedia often 429s again right after).
      const ra = Number(res.headers.get('Retry-After'));
      const wait = Math.min(30000, Math.max(ra > 0 ? ra * 1000 : 0, 1500 * (i + 1)));
      console.log(`    ⏳ ${res.status} — wait ${Math.round(wait / 1000)}s & retry…`);
      await sleep(wait);
      continue;
    }
    return res;
  }
  return fetch(url, init);
}

async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetchRetry(url, { headers: { 'User-Agent': UA, Accept: 'image/avif,image/webp,image/*,*/*' } });
  const buf = Buffer.from(await res.arrayBuffer());
  if (!isImage(buf)) throw new Error(`not an image (http ${res.status}, ${buf.length}b)`);
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  if (buf.length < 12_000 || (isPng && buf.length < 25_000)) throw new Error(`too-small/graphic (${buf.length}b)`); // flags/seals/low-res
  return buf;
}

async function loadPorts(): Promise<PortRow[]> {
  const sql = db();
  const embark = (await sql`
    SELECT DISTINCT p.port_cd, p.port_name, p.country
    FROM journeys j JOIN ports p ON p.port_cd = j.sailing_port
    WHERE j.is_available = true AND j.sailing_port IS NOT NULL
    ORDER BY p.port_name
  `) as PortRow[];
  if (EMBARK_ONLY) return embark;

  const all = (await sql`
    SELECT DISTINCT p.port_cd, p.port_name, p.country
    FROM journey_days jd JOIN ports p ON p.port_cd = jd.port_cd
    WHERE jd.port_cd IS NOT NULL
    ORDER BY p.port_name
  `) as PortRow[];

  const seen = new Set(embark.map((p) => p.port_cd));
  const ordered = [...embark, ...all.filter((p) => !seen.has(p.port_cd))];
  return SMOKE ? ordered.slice(0, 12) : ordered;
}

// ── Wikimedia (keyless) ──────────────────────────────────────────────────────
// Use the PageImages API with pithumbsize so MediaWiki returns a width it will
// actually render (hand-editing the px in the URL 400s for many files).
async function wikiPageImage(title: string): Promise<{ src: string; page: string; title: string } | null> {
  const r = await fetchRetry(
    `https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages%7Cinfo&inprop=url&piprop=thumbnail&pithumbsize=1280&titles=${encodeURIComponent(title)}&origin=*`,
    { headers: { 'User-Agent': UA } },
  );
  if (!r.ok) return null;
  const d = (await r.json()) as any;
  const page = d.query?.pages ? (Object.values(d.query.pages)[0] as any) : null;
  const src: string | undefined = page?.thumbnail?.source;
  if (!src || /\.svg(?:[?#]|$)/i.test(src) || GRAPHIC_RE.test(decodeURIComponent(src))) return null; // skip SVG + flags/crests/seals/maps
  return { src, page: page.fullurl ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`, title: page.title ?? title };
}

async function searchWikimedia(name: string, country: string | null): Promise<Hit | null> {
  const city = cityName(name);
  let found = await wikiPageImage(city);
  if (!found) {
    // search fallback with country context → top page title → page image
    const q = [city, country ? COUNTRY[country] : ''].filter(Boolean).join(' ');
    const r = await fetchRetry(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=1&format=json&origin=*`,
      { headers: { 'User-Agent': UA } },
    );
    if (r.ok) {
      const d = (await r.json()) as any;
      const top: string | undefined = d.query?.search?.[0]?.title;
      if (top) found = await wikiPageImage(top);
    }
  }
  if (!found) return null;
  return { url: found.src, credit: `Wikimedia Commons — ${found.title}`, creditUrl: found.page };
}

// ── Wikimedia Commons (keyless) — REAL photographs, not article infobox images ─
// Searches the Commons file namespace and keeps a clean landscape photo, skipping
// maps / collages / flags / paintings / banners. Degrades the query (curated →
// city+country → city) so an over-specific query still resolves to a good photo.
const COMMONS_REJECT =
  /(flag|coat[_-]?of[_-]?arms|wappen|escudo|seal_of|\bseal\b|emblem|crest|insignia|\blogo\b|locator|location[_-]?map|map[_-]?of|\bmap\b|montage|collage|diagram|satellite|orthophoto|\bchart\b|plan[_-]?of|\.svg|\.pdf|painting|engraving|\bdrawing\b|sketch|postcard|\bstamp\b|banner)/i;

interface CommonsHit extends Hit { query: string }

async function commonsSearch(query: string): Promise<CommonsHit | null> {
  const url =
    `https://commons.wikimedia.org/w/api.php?action=query&format=json` +
    `&generator=search&gsrnamespace=6&gsrlimit=20&gsrsearch=${encodeURIComponent(query)}` +
    `&prop=imageinfo&iiprop=url%7Csize%7Cmime%7Cextmetadata&iiurlwidth=1600&origin=*`;
  const r = await fetchRetry(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) return null;
  const d = (await r.json()) as any;
  const pages: any[] = d.query?.pages ? Object.values(d.query.pages) : [];
  pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0)); // preserve search relevance order
  const cands: Array<{ ii: any; ratio: number }> = [];
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    const title: string = p.title || '';
    if (!ii || !/image\/(jpe?g|png)/i.test(ii.mime || '')) continue;
    if (COMMONS_REJECT.test(title)) continue;
    if ((ii.width || 0) < 1200) continue;
    cands.push({ ii, ratio: ii.width / Math.max(1, ii.height) });
  }
  // Prefer a clean landscape (cards/heroes crop to landscape); else any sane ratio.
  const pick =
    cands.find((c) => c.ratio >= 1.2 && c.ratio <= 2.2) ??
    cands.find((c) => c.ratio >= 0.9 && c.ratio <= 2.6);
  if (!pick) return null;
  const artist = String(pick.ii.extmetadata?.Artist?.value || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return {
    url: pick.ii.thumburl || pick.ii.url,
    credit: `Wikimedia Commons${artist ? ' — ' + artist : ''}`,
    creditUrl: pick.ii.descriptionurl || '',
    query,
  };
}

async function searchCommons(p: PortRow, override?: string): Promise<CommonsHit | null> {
  const city = cityName(p.port_name);
  const cc = p.country ? COUNTRY[p.country] : '';
  const attempts = [override, [city, cc].filter(Boolean).join(' '), city]
    .filter((q): q is string => Boolean(q && q.trim()));
  const tried = new Set<string>();
  for (const q of attempts) {
    if (tried.has(q)) continue;
    tried.add(q);
    const hit = await commonsSearch(q);
    if (hit) return hit;
    await sleep(400);
  }
  return null;
}

// ── Pexels (keyed) ───────────────────────────────────────────────────────────
async function searchPexels(query: string): Promise<Hit | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=1&size=large`,
      { headers: { Authorization: PEXELS_KEY as string } },
    );
    if (res.status === 429) {
      const reset = Number(res.headers.get('X-Ratelimit-Reset'));
      const waitMs = reset ? Math.max(0, reset * 1000 - Date.now()) + 2000 : 60_000;
      if (NO_WAIT) { console.log(`  ⏸ rate limit — stop (resume later).`); process.exit(0); }
      console.log(`  ⏳ rate limit — sleeping ${Math.round(waitMs / 1000)}s…`);
      await sleep(waitMs); continue;
    }
    if (!res.ok) { console.log(`  ✗ pexels ${res.status} for "${query}"`); return null; }
    const data = (await res.json()) as any;
    const photo = data.photos?.[0];
    if (!photo) return null;
    const remaining = Number(res.headers.get('X-Ratelimit-Remaining'));
    if (remaining === 0 && !NO_WAIT) {
      const reset = Number(res.headers.get('X-Ratelimit-Reset'));
      await sleep(reset ? Math.max(0, reset * 1000 - Date.now()) + 2000 : 60_000);
    }
    return { url: photo.src.landscape, credit: photo.photographer, creditUrl: photo.photographer_url };
  }
  return null;
}

async function main() {
  if (!WIKI && !COMMONS && !PEXELS_KEY) {
    console.error('✗ No source. Use --commons / --wiki (keyless) or set PEXELS_API_KEY (https://www.pexels.com/api/).');
    process.exit(1);
  }
  mkdirSync(IMG_DIR, { recursive: true });

  const map: Record<string, Entry> = existsSync(OUT_JSON)
    ? (JSON.parse(readFileSync(OUT_JSON, 'utf8')) as Record<string, Entry>)
    : {};

  let ports = await loadPorts();
  if (ONLY) ports = ports.filter((p) => ONLY.has(p.port_cd));
  const src = COMMONS ? 'wikimedia-commons' : WIKI ? 'wikimedia' : 'pexels';
  const scope = ONLY ? `only ${ports.length}/${ONLY.size}` : SMOKE ? 'smoke' : EMBARK_ONLY ? 'embark-only' : 'all';
  console.log(`▸ source=${src}; ${ports.length} ports (${scope}); ${Object.keys(map).length} already done.`);

  let done = 0, skipped = 0, missed = 0;
  const unresolved: string[] = [];

  for (const p of ports) {
    const prior = map[p.port_cd];
    // --only forces a re-fetch; otherwise skip ports already on disk (resumable).
    if (!ONLY && prior && existsSync('public' + prior.file)) { skipped++; continue; }

    const override = OVERRIDE_QUERIES[p.port_cd];
    let query = override ?? (WIKI || COMMONS ? cityName(p.port_name) : pexelsQuery(p.port_name, p.country));
    let hit: Hit | null;
    if (COMMONS) {
      const ch = await searchCommons(p, override);
      hit = ch;
      if (ch) query = ch.query; // record the query that actually resolved (after degradation)
    } else if (WIKI) {
      hit = await searchWikimedia(override ?? p.port_name, override ? null : p.country);
    } else {
      hit = await searchPexels(query);
    }
    if (!hit) { missed++; unresolved.push(`${p.port_cd} "${p.port_name}" → "${query}"`); await sleep(REQUEST_DELAY_MS); continue; }

    try {
      const ext = extOf(hit.url);
      const diskPath = `${IMG_DIR}/${p.port_cd}${ext}`;
      const buf = await downloadImage(hit.url);
      // Remove a stale prior file with a different extension so it isn't orphaned.
      if (prior && prior.file !== `/photos/ports/${p.port_cd}${ext}` && existsSync('public' + prior.file)) {
        try { unlinkSync('public' + prior.file); } catch { /* best-effort */ }
      }
      writeFileSync(diskPath, buf);
      map[p.port_cd] = { file: `/photos/ports/${p.port_cd}${ext}`, credit: hit.credit, creditUrl: hit.creditUrl, source: src, query };
      writeFileSync(OUT_JSON, JSON.stringify(sortObj(map), null, 2) + '\n'); // crash-safe incremental write
      done++;
      console.log(`  ✓ ${p.port_cd} ${p.port_name} ← "${query}" (${Math.round(buf.length / 1024)}kb)`);
    } catch (e) {
      missed++;
      console.log(`  ✗ ${p.port_cd} "${p.port_name}": ${e instanceof Error ? e.message : String(e)}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`\n▸ done. fetched ${done}, skipped ${skipped}, missed ${missed}. total mapped: ${Object.keys(map).length}.`);
  if (unresolved.length) {
    console.log(`\n${unresolved.length} unresolved (add to OVERRIDES + re-run; cards fall back to the region image):`);
    unresolved.slice(0, 50).forEach((u) => console.log(`  · ${u}`));
  }
}

function sortObj(o: Record<string, Entry>): Record<string, Entry> {
  return Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
}

main().catch((err) => {
  console.error(`✗ fetch-port-images failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
