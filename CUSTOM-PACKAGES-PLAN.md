# Custom Packages — Implementation Plan

Executable plan for adding **manually-managed custom packages** (owner's own cruise/journey
offers, priced and edited in the admin like a CMS) to the Explora partner site. Hand this to
the executor (Opus). It is self-contained; read the referenced files before editing.

---

## 1. Product decisions (confirmed by the owner — do not re-litigate)

1. **Pricing model: FULL per-passenger** — each custom package fare carries the same shape as the
   Explora feed fares: per-person (2A), 3rd/4th adult, child, infant, solo fare, solo supplement %.
   → **Reuse `lib/pricing.ts` `fareToPricing()` + `priceCabin()` unchanged.** Do not invent a
   second pricing engine.
2. **Placement: MIXED with Explora sailings** — custom packages appear inside Find-a-Journey and the
   home teaser alongside feed journeys, visually identical (same `JourneyCard`).
3. **Booking: REQUEST + PayPal deposit** — custom packages flow through the existing booking wizard
   (suite/fare → guest details → review → deposit). Same funnel, same 20% server-computed deposit.

Consequence: custom packages must be **indistinguishable from feed journeys** to the public read
paths, the booking funnel, and PayPal — but stored separately so the nightly ingest can't touch them,
and rendered with the owner's **own photos + copy + itinerary** (feed journeys derive imagery from
ship/port codes; custom packages carry explicit media).

---

## 2. Architecture decision + rationale

**Store custom packages in DEDICATED tables the ingest never touches, then MERGE them into the read
+ pricing paths.** (This mirrors the codebase's proven "survive-the-ingest side table" pattern:
`fare_overrides`, `site_content`, `site_entities`, `page_sections` — none are touched by
`lib/explora-flatfile/ingest.ts`.)

**Why not reuse the `journeys`/`fares` tables with a `source='custom'` flag?** Two blockers:
- `journeys.ship_cd` is `NOT NULL REFERENCES ships` — a custom package may not sit on a real Explora
  ship, and relaxing that constraint on the feed table is invasive and risks the ingest.
- The nightly ingest's soft-delete (`ingest.ts` ~L234-241) and hard-delete (~L274-278) are **NOT
  scoped to feed rows**, so a manual `journeys` row goes invisible within ~12h and is DELETED after
  7 days (the central pitfall the audit flagged). Scoping every ingest write to `source='feed'` is
  more error-prone than simply keeping custom data in its own tables.

**Invariant (critical): `lib/explora-flatfile/ingest.ts` stays UNTOUCHED.** Custom tables are never
referenced by the ingest, so they physically cannot be wiped.

**Journey-id namespacing:** custom package public ids are prefixed **`CUSTOM-<slug-or-nanoid>`** so
(a) they never collide with feed `journey_id`s, and (b) read/booking code can branch on the prefix
cheaply (`id.startsWith('CUSTOM-')`). `booking_requests.journey_id` has **no FK**, so a custom id is
already storable there with zero schema change.

---

## 3. Schema (Phase 1)

Append to `lib/db/schema.sql` (idempotent `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT
EXISTS`, matching the file's existing style). Then `npm run migrate` applies it (the migration runner
splits on `;` and runs each statement; keep statements simple, no dollar-quoted bodies).

```sql
-- ── Custom packages (owner-managed offers; the ingest NEVER touches these) ──
CREATE TABLE IF NOT EXISTS custom_packages (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id     text NOT NULL UNIQUE,            -- 'CUSTOM-<slug>' — used everywhere a journey_id is
  slug          text NOT NULL UNIQUE,
  title_en      text NOT NULL,
  title_el      text,
  summary_en    text,                            -- short card/subtitle copy
  summary_el    text,
  description_en text,                           -- long detail copy (sanitized on render)
  description_el text,
  region        text,                            -- free text or a region slug (for the card label)
  nights        integer NOT NULL DEFAULT 0,
  sailing_date  date,                            -- optional; NULL = "flexible dates"
  sailing_port_name    text,
  termination_port_name text,
  hero_image    text,                            -- media URL (from the media library / uploads)
  photos        jsonb NOT NULL DEFAULT '[]',     -- [{url, altEn, altEl}]
  itinerary     jsonb NOT NULL DEFAULT '[]',     -- [{dayNumber, portName, country, arrivalTime, departureTime, overnight, description}]
  inclusions    jsonb NOT NULL DEFAULT '[]',     -- ["Full-board dining", ...]
  deposit_pct   numeric,                         -- optional per-package override of DEPOSIT_PERCENT
  visible       boolean NOT NULL DEFAULT false,  -- draft until the admin publishes
  created_by    bigint REFERENCES admin_users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS custom_package_fares (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  package_id         bigint NOT NULL REFERENCES custom_packages(id) ON DELETE CASCADE,
  suite_category     text NOT NULL,              -- code, e.g. 'OT1' (drives berths via suiteBerths) or a custom label
  suite_name         text,                       -- display name; falls back to suiteLabel(suite_category)
  fare_code          text NOT NULL,
  fare_label         text,
  currency           text NOT NULL DEFAULT 'EUR',
  per_person         numeric NOT NULL,           -- → prices['2A']
  third_fourth_adult numeric,                    -- → raw.thirdFourthAdult
  third_fourth_child numeric,                    -- → raw.thirdFourthChild
  third_fourth_infant numeric,                   -- → raw.thirdFourthInfant (NULL ⇒ free)
  solo_fare          numeric,                    -- → raw.soloFare
  solo_suppl_pct     numeric,                    -- → raw.soloSupplPct
  now_available      boolean NOT NULL DEFAULT true,
  items              jsonb NOT NULL DEFAULT '[]', -- inclusion chips shown on the fare (like fares.items)
  sort_order         integer NOT NULL DEFAULT 0,
  UNIQUE (package_id, suite_category, fare_code, currency)
);

CREATE INDEX IF NOT EXISTS custom_packages_visible_idx ON custom_packages (visible, sailing_date);
CREATE INDEX IF NOT EXISTS custom_package_fares_pkg_idx ON custom_package_fares (package_id);
```

Notes:
- Berths: `suiteBerths(suite_category)` (now exported from `lib/pricing.ts`) returns 2 for OT*/GT,
  else 4. For a truly custom suite label, it defaults to 4 — acceptable; add the code to
  `TWO_BERTH_SUITES` if a 2-berth custom suite is needed.
- Shape `custom_package_fares` → the API `fares` row shape so the SAME `fareToPricing()` reads it:
  `prices = { '2A': per_person }`, `raw = { thirdFourthAdult, thirdFourthChild, thirdFourthInfant,
  soloFare, soloSupplPct }`.

---

## 4. Reused building blocks (already in place — do not rebuild)

- **Pricing:** `lib/pricing.ts` `fareToPricing(prices, raw)` + `priceCabin(fp, party)`. The two money
  bugs are already fixed (solo = `adults===1 && children===0`; server derives party from the guest
  list). `suiteBerths` + occupancy caps are exported here now.
- **Booking/quote:** `lib/booking.ts` `computeQuote(journeyId, suiteCategory, fareCode, party)` and
  `genRef()` / `getBookingByRef()`. Deposit % via `depositPercent()`.
- **Booking funnel (frontend):** `src/components/booking/*` (SuiteFareStep reads `/api/journeys/:id`
  fares; ReviewStep POSTs `/api/booking-request`; PayPal steps). No structural change needed if the
  custom detail returns fares in the same shape.
- **Admin patterns to clone:** `api/admin/entities.ts` + `entities/[slug].ts` (CRUD + `logAdminAction`
  audit), `api/admin/catalog/pricing/[journeyId].ts` (numeric fare editing), `src/routes/admin/
  Entities.tsx` + `src/lib/admin/entitiesApi.ts` (admin UI + client). Media upload/picker:
  `api/admin/media.ts`, `src/components/admin/media/MediaPicker.tsx`.
- **Sanitizer:** `lib/content-sanitize.ts` for `description_*` on render.

---

## 5. Phased tasks

### Phase 1 — Schema + migration
- Append the DDL above to `lib/db/schema.sql`.
- `npm run migrate` (local DB) → confirm the two tables appear.
- No ingest changes. Verify `npm run smoke` still 75 green.

### Phase 2 — Pricing/booking integration (server)
- New `lib/custom-packages.ts`: helpers `isCustomId(id)`, `getCustomPackageByPublicId(id)`,
  `getCustomPackageFare(publicId, suiteCategory, fareCode)` returning the fare in `{prices, raw,
  currency, now_available}` shape, and `customPackageToDetail(pkg, fares)` returning the SAME object
  shape as `api/journeys/[id]` (journey/ship/days/fares).
- Branch `lib/booking.ts` `computeQuote()`: if `isCustomId(journeyId)`, load the custom fare, run
  `fareToPricing` + `priceCabin`, honor `custom_packages.deposit_pct ?? depositPercent()`; else the
  existing feed path. Availability gate for custom: `visible=true` AND (`sailing_date` NULL OR
  `>= today + MIN_LEAD_DAYS`) AND `now_available` on the fare.

### Phase 3 — Public read paths (server) + API types
- `api/journeys/[id].ts`: at the top, if `isCustomId(id)` return `customPackageToDetail(...)` (404 if
  not found or not visible). Keep the feed path otherwise. Match the exact JSON shape (see the file:
  `{ ok, journey:{journeyId, shipCd, region, sailingDate, nights, sailingPortName,
  terminationPortName, lowestPriceEUR, priceOverridden}, ship, days[], fares[] }`) PLUS new optional
  fields for custom media/copy: `journey.heroImage`, `journey.photos`, `journey.summary`,
  `journey.descriptionHtml`, `journey.inclusions`, `journey.isCustom:true`.
- `api/journeys.ts` (list): after building the feed cards, UNION visible custom packages shaped as
  `JourneyCard` (same fields the feed cards produce: `journeyId`(=public_id), `title`, `region`,
  `nights`, `sailingDate`, `lowestPriceEUR`, `image`/`heroImage`, `shipName`?). Respect the same
  filters conceptually (visible + date lead). Merge into the sorted/paginated result so they interleave
  with feed journeys. Also feed the facets if cheap; otherwise leave facets feed-only (note it).
- `src/lib/api.ts`: extend `JourneyCard` + `JourneyDetail` types with the optional custom fields
  (`isCustom?`, `heroImage?`, `photos?`, `summary?`, `descriptionHtml?`, `inclusions?`). Keep them
  optional so feed journeys are unaffected.

### Phase 4 — Admin CRUD API
- `api/admin/custom-packages.ts` (GET list, POST create) and `api/admin/custom-packages/[id].ts`
  (GET one, PATCH update incl. fares + visible toggle, DELETE). Admin-role gated via `requireAuth(req,
  res, 'admin')`; Zod-validate; `logAdminAction` on every mutation; generate `public_id` = `CUSTOM-` +
  slug. Fares managed as a nested array (replace-all on PATCH, simplest) or a sub-resource.
- Mount them in `server.js` (add `app.all('/api/admin/custom-packages', ...)` +
  `/api/admin/custom-packages/:id`) AND remember `npm run build:server` emits the `.js`.

### Phase 5 — Admin UI (new "Packages" tab)
- New route `src/routes/admin/Packages.tsx` + `src/lib/admin/customPackagesApi.ts`, cloning the
  Entities patterns (DataTable list, Drawer editor). Editor covers: titles/summary/description (EN/EL),
  region, nights, optional date, hero + gallery via `MediaPicker`, itinerary rows, inclusions chips,
  a fares editor (suite/fare + the 6 price fields), and a **visible/publish** toggle.
- Register in `src/components/admin/navItems.tsx` (`admin.nav.packages`, adminOnly) and the admin
  router (`AdminRoot.tsx`). Add i18n keys `admin.nav.packages` + the page's keys to BOTH `en.json` and
  `el.json` (parity is asserted — keep them key-for-key identical).

### Phase 6 — Frontend rendering (custom media/copy)
- `JourneyCard` (`src/components/.../JourneyCard`): when `card.isCustom && card.heroImage`, use the
  explicit image instead of the ship/port-derived asset; otherwise unchanged.
- `JourneyDetail` route: when `detail.journey.isCustom`, render `heroImage`/`photos`, `summary`,
  sanitized `descriptionHtml`, and `inclusions`; the itinerary already renders from `days[]` (custom
  detail supplies `days` from the `itinerary` jsonb). The suite/fare cards + booking CTA are unchanged
  (they read `fares[]`).

### Phase 7 — Booking funnel (verify, minimal code)
- Because placement=mixed and the custom detail returns `fares[]` in feed shape, SuiteFareStep →
  GuestDetails → Review → `/api/booking-request` → PayPal should work unchanged. Confirm
  `api/booking-request.ts` (now deriving party from `guests[].type` + capacity via `suiteBerths`)
  handles the custom `suiteCategory`. Confirm `api/paypal/create-order.ts` + `capture-order.ts` read
  the stored deposit (they key off `booking_requests` by ref, journey-agnostic — should be fine).

### Phase 8 — Tests, seed, verify, deploy
- `scripts/seed-custom-package.ts`: insert one demo published custom package + a couple of fares, for
  local/dev.
- Extend `scripts/smoke-server.mjs`: custom package appears in `/api/journeys`; `/api/journeys/CUSTOM-…`
  returns detail with fares; a booking-request against the custom package prices correctly and creates
  a pending row; hidden (visible=false) custom package 404s publicly.
- Add `scripts/test-pricing.ts`-style asserts only if new pricing branches are added (there shouldn't
  be — it reuses `priceCabin`).
- Run `npm run typecheck && npm run test:pricing && npm run build && npm run smoke` — all green.
- Deploy: `bash deploy/deploy-vps.sh` (build-local → smoke gate → rsync → `npm ci --omit=dev` →
  restart). Run `npm run migrate` against the PROD DB first (SSH tunnel to the box's Postgres, as done
  at go-live) so the two new tables exist in production.

---

## 6. Invariants / gotchas (do not violate)

- **Never edit `lib/explora-flatfile/ingest.ts`.** Custom tables are separate on purpose.
- **`public_id` prefix `CUSTOM-`** is the branch key across read + booking paths.
- The public feed reads exclude EXPLORA V/VI via `ship_cd NOT IN ('EP05','EP06')` and gate on
  `sailing_date >= CURRENT_DATE + MIN_LEAD_DAYS (2)`. Custom packages have their own gate (Phase 2) —
  don't accidentally apply the ship filter to them (they may have no ship).
- **Deposit is server-computed** (never trust the client). Custom deposit = `deposit_pct ?? DEPOSIT_PERCENT`.
- **i18n parity:** every new key goes into BOTH `src/locales/en.json` and `el.json`, key-for-key.
- **Deploy artifacts are gitignored** (`dist/`, `api/**/*.js`): deploy is build-local + rsync via
  `deploy/deploy-vps.sh`, never a git pull on the box. Run `npm run build:server` so `server.js` can
  import the new compiled admin handlers.
- **Production is LIVE** at https://ex.corfuwebsites.com — migrate the prod DB and smoke-gate before
  deploying.

## 7. Verify commands

```bash
npm run migrate         # applies the two new tables (local first, then prod via tunnel)
npm run typecheck
npm run test:pricing    # 10 assertions — unchanged engine must stay green
npm run build           # SPA
npm run build:server    # emits api/**/*.js incl. new admin handlers
npm run smoke           # 75 + new custom-package checks, must PASS
```

## 8. Rough size
~3–5 focused dev sessions: Phase 1 (0.5) · Phase 2–3 (1–1.5) · Phase 4–5 (1.5) · Phase 6 (0.5) ·
Phase 7–8 (0.5–1).
