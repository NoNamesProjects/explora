/**
 * Pricing unit tests — no DB, run with `npm run test:pricing`.
 * Guards the per-passenger model in lib/pricing.ts: solo detection, the
 * 3rd/4th-adult and child/infant rates, and a complete per-guest breakdown.
 */
import { priceCabin, type FarePricing, type Party } from '../lib/pricing';

let failures = 0;
function check(name: string, cond: boolean, extra = '') {
  console.log(`  ${cond ? '✓' : '✗'} ${name}${extra ? `  (${extra})` : ''}`);
  if (!cond) failures++;
}

// A fare with every component populated (mirrors real suite CO shape).
const full: FarePricing = { perPerson: 1000, adult34: 500, child34: 250, infant34: 0, solo: 1800, soloSupplPct: 80 };

// 1) The bug we fixed: a lone adult + an infant must be the SOLO fare, not double.
{
  const c = priceCabin(full, { adults: 1, children: 0, infants: 1 });
  check('1 adult + 1 infant → solo fare (not double occupancy)', c.total === 1800 && c.solo === true, `total=${c.total} solo=${c.solo}`);
  check('  breakdown lists both guests (adult solo + free infant)',
    c.guests.length === 2 && c.guests[0].type === 'adult' && c.guests[0].price === 1800 && c.guests[1].type === 'infant' && c.guests[1].price === 0);
}

// 2) Lone adult alone is still solo.
check('1 adult alone → solo fare', priceCabin(full, { adults: 1, children: 0, infants: 0 }).total === 1800);

// 3) A child fills a paid berth, so it defeats solo (adult pays per-person, child pays child rate).
{
  const c = priceCabin(full, { adults: 1, children: 1, infants: 0 });
  check('1 adult + 1 child → NOT solo (per-person + child rate)', !c.solo && c.total === 1250, `total=${c.total}`);
}

// 4) Two adults = 2 × per-person.
check('2 adults → 2 × per-person', priceCabin(full, { adults: 2, children: 0, infants: 0 }).total === 2000);

// 5) 3rd adult at the reduced rate; children/infants at their own rates.
{
  const c = priceCabin(full, { adults: 3, children: 1, infants: 1 });
  check('3 adults + child + infant uses each available rate', c.total === 1000 + 1000 + 500 + 250 + 0, `total=${c.total}`);
  check('  full per-guest breakdown length === headcount', c.guests.length === 5);
}

// 6) When a rate is MISSING, fallbacks never undercharge: no child rate → child pays the reduced adult rate.
{
  const noChild: FarePricing = { perPerson: 1000, adult34: 500, child34: null, infant34: 0, solo: 1800, soloSupplPct: null };
  const c = priceCabin(noChild, { adults: 2, children: 1, infants: 0 });
  check('missing child rate → child billed reduced-adult rate (safe fallback)', c.total === 2500, `total=${c.total}`);
}

// 7) Solo supplement % path when soloFare is absent.
{
  const pctOnly: FarePricing = { perPerson: 1000, adult34: null, child34: null, infant34: null, solo: null, soloSupplPct: 80 };
  check('solo via supplement % (1000 × 1.8) = 1800', priceCabin(pctOnly, { adults: 1, children: 0, infants: 0 }).total === 1800);
}

// 8) byType totals always equal the sum of the per-guest breakdown.
{
  const parties: Party[] = [
    { adults: 1, children: 0, infants: 1 }, { adults: 2, children: 1, infants: 0 }, { adults: 4, children: 0, infants: 0 },
  ];
  const ok = parties.every((p) => {
    const c = priceCabin(full, p);
    const sum = c.byType.adults.total + c.byType.children.total + c.byType.infants.total;
    return sum === c.total && c.guests.reduce((s, g) => s + g.price, 0) === c.total;
  });
  check('byType totals + per-guest breakdown reconcile to total', ok);
}

console.log(failures === 0 ? '\n✅ pricing tests PASSED' : `\n❌ pricing tests FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
