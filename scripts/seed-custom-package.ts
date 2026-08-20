/**
 * Seed one demo custom package (dev/CI). Idempotent — re-running replaces the
 * demo rows. `npm run seed:custom-package`
 *
 * The demo proves the whole path: it appears in /api/journeys next to the feed
 * sailings, has its own detail page with custom photos/copy, and is bookable
 * through the normal wizard with a server-computed deposit.
 */
import { db, jsonbArg } from '../lib/db/client';
import { publicIdForSlug } from '../lib/custom-packages';

const SLUG = 'demo-ionian-signature';

async function run() {
  const sql = db();
  const sailing = new Date();
  sailing.setUTCDate(sailing.getUTCDate() + 60); // comfortably past MIN_LEAD_DAYS
  const sailingDate = sailing.toISOString().slice(0, 10);

  const rows = (await sql`
    INSERT INTO custom_packages (
      public_id, slug, title_en, title_el, summary_en, summary_el,
      description_en, description_el, region, nights, sailing_date,
      sailing_port_name, termination_port_name, hero_image, photos, itinerary,
      inclusions, visible
    ) VALUES (
      ${publicIdForSlug(SLUG)}, ${SLUG},
      ${'Ionian Signature — Corfu to Kotor'}, ${'Ιόνιο Signature — Κέρκυρα προς Κότορ'},
      ${'Seven nights along the Ionian and the Bay of Kotor, curated end to end.'},
      ${'Επτά νύχτες στο Ιόνιο και στον κόλπο του Κότορ, σε επιμελημένο ταξίδι.'},
      ${'A private-charter itinerary assembled by our team: slow mornings at anchor, afternoons ashore in the old towns, and a final approach into the Bay of Kotor at first light.'},
      ${'Ένα ιδιωτικό δρομολόγιο από την ομάδα μας: ήρεμα πρωινά, απογεύματα στις παλιές πόλεις και είσοδος στον κόλπο του Κότορ με το πρώτο φως.'},
      ${'mediterranean'}, ${7}, ${sailingDate}::date,
      ${'Corfu'}, ${'Kotor'},
      ${'/photos/ports/corfu.jpg'},
      ${jsonbArg([
        { url: '/photos/ports/corfu.jpg', altEn: 'Corfu old town from the water at golden hour', altEl: 'Η παλιά πόλη της Κέρκυρας από τη θάλασσα' },
        { url: '/photos/ports/kotor.jpg', altEn: 'The Bay of Kotor at first light', altEl: 'Ο κόλπος του Κότορ με το πρώτο φως' },
      ])}::jsonb,
      ${jsonbArg([
        { dayNumber: 1, portName: 'Corfu', country: 'Greece', departureTime: '18:00' },
        { dayNumber: 2, portName: 'Paxos', country: 'Greece', arrivalTime: '08:00', departureTime: '19:00' },
        { dayNumber: 3, portName: 'Sarandë', country: 'Albania', arrivalTime: '09:00', departureTime: '18:00' },
        { dayNumber: 4, portName: 'At sea', country: null },
        { dayNumber: 5, portName: 'Dubrovnik', country: 'Croatia', arrivalTime: '07:00', departureTime: '20:00', overnight: false },
        { dayNumber: 6, portName: 'Budva', country: 'Montenegro', arrivalTime: '08:00', departureTime: '17:00' },
        { dayNumber: 7, portName: 'Kotor', country: 'Montenegro', arrivalTime: '06:30' },
      ])}::jsonb,
      ${jsonbArg(['All dining on board', 'Shore excursions in every port', 'Beverages and gratuities', 'Private transfers'])}::jsonb,
      ${true}
    )
    ON CONFLICT (slug) DO UPDATE SET
      title_en = EXCLUDED.title_en, title_el = EXCLUDED.title_el,
      summary_en = EXCLUDED.summary_en, summary_el = EXCLUDED.summary_el,
      description_en = EXCLUDED.description_en, description_el = EXCLUDED.description_el,
      region = EXCLUDED.region, nights = EXCLUDED.nights, sailing_date = EXCLUDED.sailing_date,
      sailing_port_name = EXCLUDED.sailing_port_name, termination_port_name = EXCLUDED.termination_port_name,
      hero_image = EXCLUDED.hero_image, photos = EXCLUDED.photos, itinerary = EXCLUDED.itinerary,
      inclusions = EXCLUDED.inclusions, visible = EXCLUDED.visible, updated_at = now()
    RETURNING id, public_id
  `) as Array<{ id: number; public_id: string }>;

  const pkg = rows[0];

  // Two suites, full per-passenger rate cards (same components as a feed fare).
  const fares = [
    { suite: 'OT1', name: 'Ocean Terrace Suite', code: 'SIGNATURE', label: 'Signature Fare', pp: 3200, a34: 1600, c34: 900, i34: 0, solo: 5120, pct: 60, order: 1 },
    { suite: 'PH', name: 'Penthouse', code: 'SIGNATURE', label: 'Signature Fare', pp: 5400, a34: 2700, c34: 1400, i34: 0, solo: 8640, pct: 60, order: 2 },
  ];
  for (const f of fares) {
    await sql`
      INSERT INTO custom_package_fares (
        package_id, suite_category, suite_name, fare_code, fare_label, currency,
        per_person, third_fourth_adult, third_fourth_child, third_fourth_infant,
        solo_fare, solo_suppl_pct, now_available, items, sort_order
      ) VALUES (
        ${pkg.id}, ${f.suite}, ${f.name}, ${f.code}, ${f.label}, 'EUR',
        ${f.pp}, ${f.a34}, ${f.c34}, ${f.i34}, ${f.solo}, ${f.pct}, true,
        ${jsonbArg(['All dining', 'Shore excursions', 'Beverages', 'Gratuities'])}::jsonb, ${f.order}
      )
      ON CONFLICT (package_id, suite_category, fare_code, currency) DO UPDATE SET
        suite_name = EXCLUDED.suite_name, fare_label = EXCLUDED.fare_label,
        per_person = EXCLUDED.per_person, third_fourth_adult = EXCLUDED.third_fourth_adult,
        third_fourth_child = EXCLUDED.third_fourth_child, third_fourth_infant = EXCLUDED.third_fourth_infant,
        solo_fare = EXCLUDED.solo_fare, solo_suppl_pct = EXCLUDED.solo_suppl_pct,
        now_available = EXCLUDED.now_available, items = EXCLUDED.items, sort_order = EXCLUDED.sort_order
    `;
  }

  console.log(`✓ custom package seeded: ${pkg.public_id} (sailing ${sailingDate}, ${fares.length} fares)`);
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
