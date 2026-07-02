/**
 * Dev-only synthetic catalog + operations seed.
 *
 * Fills the DB with realistic Explora-shaped data when no flatfile credentials
 * are available (CI, cloud sandboxes, fresh dev machines). Mirrors the exact
 * upsert statements of lib/explora-flatfile/ingest.ts — same ON CONFLICT
 * semantics, same last_seen_at bumps — so re-running it behaves like a daily
 * ingest (price overrides in fare_overrides must survive, availability
 * flags refresh, counts stay stable for the 30%-drop guard).
 *
 * Deterministic: a seeded PRNG generates the same rows on every run.
 *
 *   npm run seed:dev
 */

import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

// Lightweight .env loader (same as scripts/migrate.ts).
for (const path of ['.env.local', '.env']) {
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?(.*?)"?\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

import { db, jsonbArg } from '../lib/db/client';

// ── Deterministic PRNG (mulberry32) ───────────────────────────────────────
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260702);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

// ── Fixture data ───────────────────────────────────────────────────────────
const SHIPS = [
  { shipCd: 'EP01', shipName: 'EXPLORA I', imo: '9895379', decks: 14, capacity: 922, launchYear: 2023 },
  { shipCd: 'EP02', shipName: 'EXPLORA II', imo: '9895381', decks: 14, capacity: 922, launchYear: 2024 },
  { shipCd: 'EP03', shipName: 'EXPLORA III', imo: '9925683', decks: 14, capacity: 922, launchYear: 2026 },
  { shipCd: 'EP04', shipName: 'EXPLORA IV', imo: '9925695', decks: 14, capacity: 922, launchYear: 2027 },
];

const PORTS = [
  { portCd: 'AAATC', portName: 'At Sea', country: null, tz: null },
  { portCd: 'GRPIR', portName: 'Piraeus (Athens)', country: 'Greece', tz: 'Europe/Athens' },
  { portCd: 'GRJMK', portName: 'Mykonos', country: 'Greece', tz: 'Europe/Athens' },
  { portCd: 'GRJTR', portName: 'Santorini', country: 'Greece', tz: 'Europe/Athens' },
  { portCd: 'GRCFU', portName: 'Corfu', country: 'Greece', tz: 'Europe/Athens' },
  { portCd: 'ESBCN', portName: 'Barcelona', country: 'Spain', tz: 'Europe/Madrid' },
  { portCd: 'ESPMI', portName: 'Palma de Mallorca', country: 'Spain', tz: 'Europe/Madrid' },
  { portCd: 'FRMRS', portName: 'Marseille', country: 'France', tz: 'Europe/Paris' },
  { portCd: 'FRNCE', portName: 'Nice (Villefranche)', country: 'France', tz: 'Europe/Paris' },
  { portCd: 'ITCIV', portName: 'Civitavecchia (Rome)', country: 'Italy', tz: 'Europe/Rome' },
  { portCd: 'ITNAP', portName: 'Naples', country: 'Italy', tz: 'Europe/Rome' },
  { portCd: 'ITVCE', portName: 'Venice (Fusina)', country: 'Italy', tz: 'Europe/Rome' },
  { portCd: 'HRDBV', portName: 'Dubrovnik', country: 'Croatia', tz: 'Europe/Zagreb' },
  { portCd: 'MTVLL', portName: 'Valletta', country: 'Malta', tz: 'Europe/Malta' },
  { portCd: 'BBBGI', portName: 'Bridgetown', country: 'Barbados', tz: 'America/Barbados' },
  { portCd: 'AGSJO', portName: "St John's", country: 'Antigua and Barbuda', tz: 'America/Antigua' },
  { portCd: 'LCCAS', portName: 'Castries', country: 'Saint Lucia', tz: 'America/St_Lucia' },
  { portCd: 'VGRAT', portName: 'Road Town (Tortola)', country: 'British Virgin Islands', tz: 'America/Tortola' },
  { portCd: 'SXPHI', portName: 'Philipsburg', country: 'Sint Maarten', tz: 'America/Lower_Princes' },
  { portCd: 'NOBGO', portName: 'Bergen', country: 'Norway', tz: 'Europe/Oslo' },
  { portCd: 'NOGEI', portName: 'Geiranger', country: 'Norway', tz: 'Europe/Oslo' },
  { portCd: 'NOFLA', portName: 'Flåm', country: 'Norway', tz: 'Europe/Oslo' },
  { portCd: 'DKCPH', portName: 'Copenhagen', country: 'Denmark', tz: 'Europe/Copenhagen' },
  { portCd: 'GBSOU', portName: 'Southampton', country: 'United Kingdom', tz: 'Europe/London' },
];

const SUITES = [
  { code: 'OT1', name: 'Ocean Terrace Suite', tier: 'Ocean Terrace', sqm: 35, hasBalcony: true, maxOccupancy: 3, base: 1.0 },
  { code: 'OT2', name: 'Ocean Terrace Suite Deluxe', tier: 'Ocean Terrace', sqm: 39, hasBalcony: true, maxOccupancy: 3, base: 1.15 },
  { code: 'OG1', name: 'Ocean Grand Terrace Suite', tier: 'Ocean Terrace', sqm: 44, hasBalcony: true, maxOccupancy: 4, base: 1.35 },
  { code: 'OP1', name: 'Ocean Penthouse', tier: 'Penthouse', sqm: 70, hasBalcony: true, maxOccupancy: 4, base: 1.9 },
  { code: 'OP2', name: 'Ocean Grand Penthouse', tier: 'Penthouse', sqm: 89, hasBalcony: true, maxOccupancy: 4, base: 2.4 },
  { code: 'OR1', name: 'Ocean Residence', tier: 'Residence', sqm: 149, hasBalcony: true, maxOccupancy: 6, base: 3.6 },
];

interface Region { region: string; embark: string[]; call: string[] }
const REGIONS: Region[] = [
  { region: 'mediterranean', embark: ['GRPIR', 'ESBCN', 'ITCIV', 'ITVCE'], call: ['GRJMK', 'GRJTR', 'GRCFU', 'ESPMI', 'FRMRS', 'FRNCE', 'ITNAP', 'HRDBV', 'MTVLL'] },
  { region: 'caribbean', embark: ['BBBGI', 'SXPHI'], call: ['AGSJO', 'LCCAS', 'VGRAT'] },
  { region: 'northern-europe', embark: ['DKCPH', 'GBSOU'], call: ['NOBGO', 'NOGEI', 'NOFLA'] },
];

const ITIN_ADJ = ['A Journey Through', 'Idyllic Shores of', 'Hidden Harbours of', 'A Sun-Drawn Passage:', 'Slow Days Across'];
const ITIN_TAIL: Record<string, string> = {
  mediterranean: 'the Aegean & Ionian',
  caribbean: 'the Windward Isles',
  'northern-europe': 'the Norwegian Fjords',
};

const FIRST = ['Eleni', 'Marcus', 'Sofia', 'James', 'Amelie', 'Nikos', 'Clara', 'Henrik', 'Isabella', 'Dimitris', 'Freya', 'Thomas', 'Georgia', 'Lukas', 'Anna', 'Petros', 'Maria', 'Oliver'];
const LAST = ['Papadopoulos', 'Bennett', 'Rossi', 'Lindqvist', 'Dubois', 'Katsaros', 'Schmidt', 'Andersen', 'Moretti', 'Georgiou', 'Nilsen', 'Clarke', 'Economou', 'Weber', 'Ferrara', 'Ioannou'];
const guestName = () => `${pick(FIRST)} ${pick(LAST)}`;
const emailFor = (name: string, i: number) =>
  `${name.toLowerCase().replace(/[^a-z]+/g, '.')}${i}@example.com`;

// ── Build journeys ─────────────────────────────────────────────────────────
interface SeedDay { dayNumber: number; portCd: string | null; arrivalTime: string | null; departureTime: string | null; overnight: boolean; description: string | null }
interface SeedJourney { journeyId: string; shipCd: string; itinCd: string; itinDesc: string; region: string; sailingPort: string; terminationPort: string; sailingDate: string; nights: number; embkTime: string; disEmbkTime: string; days: SeedDay[] }

function buildJourneys(): SeedJourney[] {
  const out: SeedJourney[] = [];
  // Departures every ~9 days per ship from 2026-08-05 for ~7 months.
  const start = new Date('2026-08-05T00:00:00Z');
  for (const ship of SHIPS) {
    let cursor = new Date(start.getTime() + between(0, 6) * 86400000);
    for (let leg = 0; leg < 8; leg++) {
      const region = REGIONS[(leg + SHIPS.indexOf(ship)) % REGIONS.length];
      const nights = pick([7, 7, 9, 10, 11, 14]);
      const embark = pick(region.embark);
      const disembark = rand() < 0.5 ? embark : pick(region.embark);
      const sailingDate = cursor.toISOString().slice(0, 10);
      const journeyId = `${ship.shipCd}${sailingDate.replace(/-/g, '')}${embark}`;
      const days: SeedDay[] = [];
      days.push({ dayNumber: 1, portCd: embark, arrivalTime: null, departureTime: '19:00', overnight: false, description: 'Embarkation' });
      for (let d = 2; d <= nights; d++) {
        const sea = rand() < 0.28;
        days.push(sea
          ? { dayNumber: d, portCd: 'AAATC', arrivalTime: null, departureTime: null, overnight: false, description: 'A day at sea' }
          : { dayNumber: d, portCd: pick(region.call), arrivalTime: '08:00', departureTime: rand() < 0.2 ? null : '18:00', overnight: rand() < 0.12, description: null });
      }
      days.push({ dayNumber: nights + 1, portCd: disembark, arrivalTime: '07:00', departureTime: null, overnight: false, description: 'Disembarkation' });
      out.push({
        journeyId, shipCd: ship.shipCd, itinCd: `IT${region.region.slice(0, 3).toUpperCase()}${nights}N`,
        itinDesc: `${pick(ITIN_ADJ)} ${ITIN_TAIL[region.region]}`,
        region: region.region, sailingPort: embark, terminationPort: disembark,
        sailingDate, nights, embkTime: '15:00', disEmbkTime: '09:00', days,
      });
      cursor = new Date(cursor.getTime() + (nights + between(1, 3)) * 86400000);
    }
  }
  return out;
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const sql = db();
  const runId = randomUUID();
  const t0 = Date.now();
  await sql`INSERT INTO ingest_runs (run_id, status, notes) VALUES (${runId}, 'running', 'dev seed — synthetic catalog')`;

  // Master data (same upsert shape as lib/explora-flatfile/ingest.ts).
  for (const s of SHIPS) {
    await sql`
      INSERT INTO ships (ship_cd, ship_name, imo, decks, capacity, launch_year, updated_at)
      VALUES (${s.shipCd}, ${s.shipName}, ${s.imo}, ${s.decks}, ${s.capacity}, ${s.launchYear}, now())
      ON CONFLICT (ship_cd) DO UPDATE
        SET ship_name = EXCLUDED.ship_name, imo = EXCLUDED.imo, decks = EXCLUDED.decks,
            capacity = EXCLUDED.capacity, launch_year = EXCLUDED.launch_year, updated_at = now()
    `;
  }
  for (const p of PORTS) {
    await sql`
      INSERT INTO ports (port_cd, port_name, country, lat, lon, timezone)
      VALUES (${p.portCd}, ${p.portName}, ${p.country}, ${null}, ${null}, ${p.tz})
      ON CONFLICT (port_cd) DO UPDATE
        SET port_name = EXCLUDED.port_name, country = EXCLUDED.country, timezone = EXCLUDED.timezone
    `;
  }
  for (const c of SUITES) {
    await sql`
      INSERT INTO suite_categories (code, name, tier, sqm, has_balcony, max_occupancy)
      VALUES (${c.code}, ${c.name}, ${c.tier}, ${c.sqm}, ${c.hasBalcony}, ${c.maxOccupancy})
      ON CONFLICT (code) DO UPDATE
        SET name = EXCLUDED.name, tier = EXCLUDED.tier, sqm = EXCLUDED.sqm,
            has_balcony = EXCLUDED.has_balcony, max_occupancy = EXCLUDED.max_occupancy
    `;
  }

  // Journeys + days + EUR fares.
  const journeys = buildJourneys();
  let fareCount = 0;
  for (const it of journeys) {
    await sql`
      INSERT INTO journeys (
        journey_id, ship_cd, itin_cd, itin_desc, region, sailing_port, termination_port,
        sailing_date, nights, embk_time, dis_embk_time,
        is_available, consecutive_missing, last_seen_at, updated_at
      ) VALUES (
        ${it.journeyId}, ${it.shipCd}, ${it.itinCd}, ${it.itinDesc},
        ${it.region}, ${it.sailingPort}, ${it.terminationPort},
        ${it.sailingDate}, ${it.nights}, ${it.embkTime}, ${it.disEmbkTime},
        true, 0, now(), now()
      )
      ON CONFLICT (journey_id) DO UPDATE
        SET itin_desc = EXCLUDED.itin_desc, region = EXCLUDED.region,
            sailing_port = EXCLUDED.sailing_port, termination_port = EXCLUDED.termination_port,
            sailing_date = EXCLUDED.sailing_date, nights = EXCLUDED.nights,
            is_available = true, consecutive_missing = 0, last_seen_at = now(), updated_at = now()
    `;
    await sql`DELETE FROM journey_days WHERE journey_id = ${it.journeyId}`;
    for (const d of it.days) {
      await sql`
        INSERT INTO journey_days (journey_id, day_number, port_cd, arrival_time, departure_time, overnight, description)
        VALUES (${it.journeyId}, ${d.dayNumber}, ${d.portCd}, ${d.arrivalTime}, ${d.departureTime}, ${d.overnight}, ${d.description})
        ON CONFLICT (journey_id, day_number) DO NOTHING
      `;
    }
    const perNight = between(320, 540); // EUR pp per night for the entry suite
    for (const suite of SUITES) {
      const pp = Math.round(perNight * it.nights * suite.base / 10) * 10;
      const prices = { '2A': pp, '1A': Math.round(pp * 1.6), '3A': Math.round(pp * 0.55) };
      await sql`
        INSERT INTO fares (
          journey_id, fare_code, fare_desc, price_type, suite_category,
          prices, currency, gft, ncf, fare_start_date, fare_end_date,
          now_available, items, raw, last_seen_at
        ) VALUES (
          ${it.journeyId}, ${'BSTA'}, ${'Best Available'}, ${'Per Person Fare'}, ${suite.code},
          ${jsonbArg(prices)}::jsonb, ${'EUR'}, ${null}, ${null}, ${null}, ${null},
          true, ${['All-inclusive beverages', 'Onboard gratuities', 'Wi-Fi']}, ${jsonbArg({ seed: true })}::jsonb, now()
        )
        ON CONFLICT (journey_id, fare_code, suite_category, currency) DO UPDATE
          SET prices = EXCLUDED.prices, now_available = EXCLUDED.now_available,
              items = EXCLUDED.items, raw = EXCLUDED.raw, last_seen_at = now()
      `;
      fareCount++;
    }
  }

  // ── Operations data (idempotent: keyed refs/emails) ──────────────────────
  const statuses = ['pending', 'pending', 'pending', 'deposit_paid', 'deposit_paid', 'confirmed', 'cancelled'] as const;
  for (let i = 1; i <= 18; i++) {
    const j = journeys[Math.floor(rand() * journeys.length)];
    const suite = pick(SUITES);
    const count = between(1, 4);
    // Shape mirrors lib/booking.ts BookingGuestRow (what the public wizard writes).
    const guests = Array.from({ length: count }, (_, g) => {
      const firstName = pick(FIRST);
      const lastName = pick(LAST);
      return {
        title: g === 0 ? 'Mr' : 'Ms',
        firstName,
        lastName,
        email: emailFor(`${firstName} ${lastName}`, i * 10 + g),
        phone: `+30 69${between(10000000, 99999999)}`,
        nationality: pick(['GR', 'GB', 'DE', 'IT', 'FR']),
        dateOfBirth: `19${between(55, 95)}-0${between(1, 9)}-1${between(0, 9)}`,
        lead: g === 0,
        type: 'adult' as const,
      };
    });
    const total = between(4000, 42000);
    const status = statuses[i % statuses.length];
    const daysAgo = between(0, 45);
    await sql`
      INSERT INTO booking_requests (
        ref, journey_id, suite_category, fare_code, currency, guest_count, guests,
        indicative_total, deposit_amount, status, message, ip, user_agent, created_at, updated_at
      ) VALUES (
        ${`EXP-SEED-${String(i).padStart(4, '0')}`}, ${j.journeyId}, ${suite.code}, ${'BSTA'}, ${'EUR'},
        ${count}, ${jsonbArg(guests)}::jsonb, ${total}, ${Math.round(total * 0.2)},
        ${status}, ${i % 3 === 0 ? 'We would love a table for two at Anthology on the first night.' : null},
        ${'203.0.113.' + i}, ${'seed'}, now() - ${daysAgo + ' days'}::interval, now() - ${daysAgo + ' days'}::interval
      )
      ON CONFLICT (ref) DO NOTHING
    `;
  }
  for (let i = 1; i <= 8; i++) {
    const name = guestName();
    await sql`
      INSERT INTO contact_messages (name, email, phone, message, ip, user_agent, created_at)
      SELECT ${name}, ${emailFor(name, 900 + i)}, ${i % 2 ? '+44 20 7946 09' + (10 + i) : null},
             ${pick([
               'Could you tell me whether the Corfu departure can accommodate a wheelchair user?',
               'Do you offer connecting suites for a family of five?',
               'Is the drinks list truly all-inclusive on the fjords itineraries?',
               'We celebrate our anniversary aboard — can something special be arranged?',
             ])},
             ${'198.51.100.' + i}, ${'seed'}, now() - ${i * 2 + ' days'}::interval
      WHERE NOT EXISTS (SELECT 1 FROM contact_messages WHERE email = ${emailFor(name, 900 + i)})
    `;
  }
  for (let i = 1; i <= 12; i++) {
    const name = guestName();
    const email = emailFor(name, 700 + i);
    await sql`
      INSERT INTO newsletter_subscribers (email, confirmed, confirm_token, consent_at, locale)
      VALUES (${email}, ${i % 3 !== 0}, ${i % 3 === 0 ? 'seedtoken' + i : null}, now() - ${i * 3 + ' days'}::interval, ${i % 2 ? 'en' : 'el'})
      ON CONFLICT (email) DO NOTHING
    `;
  }

  const [{ jc }] = (await sql`SELECT COUNT(*)::int AS jc FROM journeys WHERE is_available = true`) as Array<{ jc: number }>;
  await sql`
    UPDATE ingest_runs
    SET status = 'ok', finished_at = now(), journey_count = ${jc}, fare_count = ${fareCount}
    WHERE run_id = ${runId}
  `;
  console.log(`✓ seeded ${journeys.length} journeys, ${fareCount} fares, ${SHIPS.length} ships, ${PORTS.length} ports in ${Date.now() - t0}ms`);
  process.exit(0);
}

main().catch((err) => {
  console.error('seed failed:', err);
  process.exit(1);
});
