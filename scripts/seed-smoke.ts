/**
 * Seed a SYNTHETIC catalog + fixtures so `npm run smoke` can exercise the full
 * backend — including the money-safety and opt-in paths — WITHOUT Explora,
 * PayPal or Resend credentials. Idempotent: re-running refreshes the fixtures.
 *
 * Seeds:
 *   - 6 ships (EP01–EP06; smoke asserts EP05/EP06 stay hidden), 2 ports,
 *     1 suite category
 *   - SMOKEJ1: available future journey (+ days + EUR fare + an enabled
 *     per-suite fare_override 1500 — deposit checks assert the override price)
 *   - SMOKEJ2: soft-deleted journey (must be unbookable, 409)
 *   - SMOKEJ3: past journey (must be unbookable)
 *   - EXP-SMOKE1: pending booking with paypal_order_id TESTORDER123 (capture
 *     binding + no-fabricated-success checks)
 *   - newsletter fixtures with known tokens (interstitial GET/POST checks)
 *   - smoke-admin@example.com / smoke-agent@example.com admin users (CSV role
 *     gating checks) — passwords below, TEST FIXTURES ONLY.
 *
 * Run: tsx scripts/seed-smoke.ts   (uses DATABASE_URL from .env.local)
 */

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
import { hashPassword } from '../lib/admin-auth';

export const SMOKE = {
  journeyOk: 'SMOKEJ1',
  journeyGone: 'SMOKEJ2',
  journeyPast: 'SMOKEJ3',
  suite: 'OT1',
  fareCode: 'ALLIN',
  feedPrice: 2000,
  overridePrice: 1500,
  bookingRef: 'EXP-SMOKE1',
  orderId: 'TESTORDER123',
  confirmToken: 'smoke-confirm-token',
  unsubToken: 'smoke-unsub-token',
  adminEmail: 'smoke-admin@example.com',
  adminPassword: 'smoke-Admin-pass-1',
  agentEmail: 'smoke-agent@example.com',
  agentPassword: 'smoke-Agent-pass-1',
} as const;

async function main() {
  const sql = db();

  // Ships (EP05/EP06 exist but are hidden by the API by design).
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  for (let i = 1; i <= 6; i++) {
    await sql`
      INSERT INTO ships (ship_cd, ship_name) VALUES (${`EP0${i}`}, ${`EXPLORA ${ROMAN[i - 1]}`})
      ON CONFLICT (ship_cd) DO NOTHING
    `;
  }

  await sql`INSERT INTO ports (port_cd, port_name, country) VALUES ('GRPIR', 'Piraeus (Athens)', 'Greece') ON CONFLICT (port_cd) DO NOTHING`;
  await sql`INSERT INTO ports (port_cd, port_name, country) VALUES ('ITFSA', 'Fusina (Venice)', 'Italy') ON CONFLICT (port_cd) DO NOTHING`;
  await sql`INSERT INTO suite_categories (code, name, tier) VALUES (${SMOKE.suite}, 'Ocean Terrace 1', 'terrace') ON CONFLICT (code) DO NOTHING`;

  // Journeys — refresh fully (delete + insert) so re-runs reset dates/flags.
  await sql`DELETE FROM fare_overrides WHERE journey_id IN (${SMOKE.journeyOk}, ${SMOKE.journeyGone}, ${SMOKE.journeyPast})`;
  await sql`DELETE FROM journeys WHERE journey_id IN (${SMOKE.journeyOk}, ${SMOKE.journeyGone}, ${SMOKE.journeyPast})`;
  await sql`
    INSERT INTO journeys (journey_id, ship_cd, itin_cd, itin_desc, region, sailing_port, termination_port, sailing_date, nights, is_available)
    VALUES
      (${SMOKE.journeyOk},   'EP01', 'SMK1', 'Smoke: Adriatic Passage', 'mediterranean', 'ITFSA', 'GRPIR', CURRENT_DATE + 30, 7, true),
      (${SMOKE.journeyGone}, 'EP01', 'SMK2', 'Smoke: Withdrawn Sailing', 'mediterranean', 'ITFSA', 'GRPIR', CURRENT_DATE + 30, 7, false),
      (${SMOKE.journeyPast}, 'EP01', 'SMK3', 'Smoke: Departed Sailing', 'mediterranean', 'ITFSA', 'GRPIR', CURRENT_DATE - 10, 7, true)
  `;
  await sql`
    INSERT INTO journey_days (journey_id, day_number, port_cd) VALUES
      (${SMOKE.journeyOk}, 1, 'ITFSA'), (${SMOKE.journeyOk}, 2, 'GRPIR')
    ON CONFLICT (journey_id, day_number) DO NOTHING
  `;
  for (const j of [SMOKE.journeyOk, SMOKE.journeyGone, SMOKE.journeyPast]) {
    await sql`
      INSERT INTO fares (journey_id, fare_code, suite_category, prices, currency, now_available, raw)
      VALUES (${j}, ${SMOKE.fareCode}, ${SMOKE.suite}, ${jsonbArg({ '2A': SMOKE.feedPrice })}::jsonb, 'EUR', true, ${jsonbArg({})}::jsonb)
      ON CONFLICT (journey_id, fare_code, suite_category, currency) DO UPDATE
        SET prices = EXCLUDED.prices, now_available = true, last_seen_at = now()
    `;
  }
  await sql`
    INSERT INTO fare_overrides (journey_id, suite_category, currency, override_price, enabled, note)
    VALUES (${SMOKE.journeyOk}, ${SMOKE.suite}, 'EUR', ${SMOKE.overridePrice}, true, 'smoke fixture')
  `;

  // Pending booking bound to a known PayPal order id.
  await sql`DELETE FROM booking_requests WHERE ref = ${SMOKE.bookingRef}`;
  await sql`
    INSERT INTO booking_requests
      (ref, journey_id, suite_category, fare_code, currency, guest_count, guests, indicative_total, deposit_amount, status, paypal_order_id)
    VALUES
      (${SMOKE.bookingRef}, ${SMOKE.journeyOk}, ${SMOKE.suite}, ${SMOKE.fareCode}, 'EUR', 2,
       ${jsonbArg([{ firstName: 'Smoke', lastName: 'Test', lead: true, type: 'adult' }, { firstName: 'Smoke', lastName: 'Two', type: 'adult' }])}::jsonb,
       3000, 600, 'pending', ${SMOKE.orderId})
  `;

  // Newsletter fixtures: one pending (confirm flow), one confirmed (unsub flow).
  await sql`DELETE FROM newsletter_subscribers WHERE email IN ('smoke-pending@example.com', 'smoke-confirmed@example.com')`;
  await sql`
    INSERT INTO newsletter_subscribers (email, confirmed, confirm_token, unsubscribe_token, locale)
    VALUES
      ('smoke-pending@example.com',   false, ${SMOKE.confirmToken}, 'smoke-unsub-token-b', 'en'),
      ('smoke-confirmed@example.com', true,  NULL,                  ${SMOKE.unsubToken},   'en')
  `;

  // Admin-console users with known passwords (test fixtures — remove in prod).
  const adminHash = await hashPassword(SMOKE.adminPassword);
  const agentHash = await hashPassword(SMOKE.agentPassword);
  await sql`
    INSERT INTO admin_users (email, password_hash, name, role)
    VALUES (${SMOKE.adminEmail}, ${adminHash}, 'Smoke Admin', 'admin')
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin', disabled = false
  `;
  await sql`
    INSERT INTO admin_users (email, password_hash, name, role)
    VALUES (${SMOKE.agentEmail}, ${agentHash}, 'Smoke Agent', 'agent')
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'agent', disabled = false
  `;
  // A clean slate for login throttling between smoke runs.
  await sql`DELETE FROM admin_login_attempts WHERE email IN (${SMOKE.adminEmail}, ${SMOKE.agentEmail})`;

  console.log('Smoke fixtures seeded:');
  console.log(`  journeys: ${SMOKE.journeyOk} (bookable, override ${SMOKE.overridePrice}), ${SMOKE.journeyGone} (withdrawn), ${SMOKE.journeyPast} (past)`);
  console.log(`  booking:  ${SMOKE.bookingRef} (pending, order ${SMOKE.orderId})`);
  console.log(`  admin users: ${SMOKE.adminEmail} / ${SMOKE.agentEmail}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(`✗ seed-smoke failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
