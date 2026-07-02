# Explora partner site — work done (2026-06-01 → 2026-06-02)

A summary of everything built/changed in this work block. The site went from
"structure complete, no data" to "**real Explora data live on a local DB, pages
polished, home redesigned**."

---

## 1. Flat-file API — verified & ingesting

- **Credentials confirmed.** Okta **production** login works
  (`<explora-partner-username>`, `EXPLORA_ENV=prod`). `npm run probe:auth` → `Auth OK`.
  (Flat-files-only partners use the **production** tenant, not preprod.)
- **Real workbook format discovered** (the 2022 spec sample was obsolete):
  - `Pricing files/EUR/Excel/pricingReport_EUR-…xlsx` — a **pivoted cross-tab**:
    journey columns (Ship, Itinerary, Destination, Journey Code, Embarkation/
    Disembarkation Port, Departure Date, Length, Offer Type) + 19 suite-category
    column groups × 6 sub-columns (Per-Person, 3rd/4th Adult/Child/Infant, Solo, Solo %).
    One row per (journey × offer type).
  - `Itinerary files/Excel/ItineraryReport-…xlsx` — flat sheet, one row per
    (journey × day): Ship code, Journey code, Date, Destination, Nights (= day index),
    Country, Port Code, Commercial Port Name, ETA, ETD.
  - **No `genericReport`** any more — generic content = the itinerary sheet + suite
    names lifted from the pricing header.
- **Parsers reworked** to this real shape and validated against full production data:
  - `lib/explora-flatfile/util.ts` *(new)* — shared `str/num/toIsoDate/daysBetween/
    deriveItinCd/shipNameOf/slugFareCode/tierOf` + region & ship normalizers.
  - `parse-pricing.ts` — pivoted reader → `{ fares, suiteCategories, journeyMeta }`.
  - `parse-generic.ts` — itinerary reader → ports, ships, day-by-day journeys.
  - `assemble.ts` *(new)* — merges the two workbooks into upsert-ready data.
  - `pick-latest.ts` — matches the current filenames (skips CSV twins), sorts by
    `lastModified`.
- **Validation harness:** `npm run parse:check` *(new, `scripts/parse-check.ts`)* —
  auth → list → download → parse → assemble → print, **no DB needed**.
  Result: **753 journeys, 35,791 EUR fares, 9,569 day-stops, 409 ports, 6 ships,
  19 suite categories.**

### Normalizations applied at ingest
- **Ship codes** feed → site canonical (confirmed with partner):
  `EP→EP01 (EXPLORA I)`, `EX→EP02 (II)`, `EL→EP03 (III)`, `EO→EP04 (IV)`,
  `EA→EP05 (V)`, `EJ→EP06 (VI)`. The whole frontend already speaks `EP01…EP06`, so
  no UI changes were needed.
- **Region labels** → URL slugs (11, 1:1): e.g. "Mediterranean & Western Europe" →
  `mediterranean`, "Grand Journeys" → `transatlantic`, "US & Canada East Coast & New
  England" → `canada-new-england`.

---

## 2. Database — local Postgres + dual driver

- Installed **PostgreSQL 16** (Homebrew), DB **`explora`**,
  `DATABASE_URL=postgresql://kostasanastasopoulos@localhost:5432/explora` (trust auth).
- **`lib/db/client.ts` is now dual-driver**: Neon HTTP for `*.neon.tech` hosts,
  **`postgres` (porsager)** for local/any other Postgres. Every `api/*.ts` handler
  works unchanged. Helpers added: `dbIsNeon()`, `rawQuery()`, `jsonbArg()`.
  → **To go live later, just point `DATABASE_URL` at a hosted Postgres — zero code changes.**
- **`npm run migrate`** *(new, `scripts/migrate.ts`)* applies `lib/db/schema.sql`
  through the driver (psql isn't installed).
- **Ingest batched** (`ingest.ts`) via chunked transactions — first load ran in **8.7s**
  (753 journeys / 35,791 fares / 9,417 days / 409 ports / 6 ships).
- **Gotcha fixed:** porsager double-encodes `JSON.stringify(obj)::jsonb` into a jsonb
  *string* (so `prices->>'2A'` returned NULL) — `jsonbArg()` passes the object via
  porsager's `sql.json()` (string for Neon).

---

## 3. Listing / detail pages — correctness & polish

- **Port codes → names.** `api/journeys.ts` + `api/journeys/[id].ts` now LEFT JOIN
  `ports` and return `sailingPortName` / `terminationPortName`. Cards and the journey
  hero/facts show e.g. **"Fusina (Venice) → Piraeus (Athens)"** instead of `ITFSA → GRPIR`.
- **`lowestPriceEUR`** cast to `::float8` (real number, not a string).
- **Journey detail hardened** (`JourneyDetail.tsx`): null ship facts no longer leave
  blank prose; robust `EP01 → explora-i` slug helper; lowest-priced EUR offer shown per
  suite; graceful fallback if `days` is empty; breadcrumb shows the route, not the raw code.
- **Card consistency:** `line-clamp-2` titles; DestinationRegion cards now match
  FindAJourney (preview ports, "Departs" label, price).

---

## 4. "Coming soon" treatment (nothing deleted)

- New `src/components/ui/ComingSoon.tsx` (`ComingSoonButton`, `ComingSoonTag`).
- Applied to dead links/buttons: Account icon, Home offer/life cards, ShipDetail CTAs
  (deck plans, godmother, sustainability, ship guide), Art "Discover", e-brochure,
  the "Experiences" tab (was fake placeholder cards), and the genuinely-broken mega-menu
  items (Destination Experiences, Pre/Post, Ships → Design/Sustainability/Captains,
  All Destinations) via a `comingSoon` flag on `MegaLink`.
- About page neutralised (no "Placeholder/Milestone" dev text; no invented brand copy).

---

## 5. Navigation simplified

- Header top nav trimmed to **Find a Journey · Destinations · Ships**
  (`Header.tsx` `MegaMenu triggerKeys={['nav.destinations','nav.ships']}`). The
  Experience/Offers panels are parked (data kept).

---

## 6. Home page redesigned

`src/routes/Home.tsx`, four sections:
1. **Hero banner + package search** (`RotatingHeadline` + `SearchWidget` → searches
   `/find-your-journey` by destination + month; destinations match live data).
2. **Ship carousel** (`src/components/home/ShipCarousel.tsx`) — 6 ships, real photos,
   native scroll + big dark arrows, each → `/ships/:code`.
3. **"An Award-winning Experience"** banner (kept from the old home).
4. **Featured voyages** (`src/components/home/PackagesTeaser.tsx`) — 3 live journeys +
   **View all journeys** → `/find-your-journey`.

Old marketing sections (Pillars, Collections, Life Onboard, Inclusions, Highlights,
Ocean State, Invitation, old Fleet grid, Latest Offers) are retired — components parked.

---

## How to run locally

```bash
cd /Users/kostasanastasopoulos/Desktop/nonameproject/Explora
brew services start postgresql@16        # if not already running
npm run dev                              # Vite + API on http://localhost:5173

# data pipeline (already done once; re-run to refresh):
npm run parse:check                      # validate parsers, no DB
npm run migrate                          # create tables (idempotent)
npm run ingest:dry                       # validate counts, no writes
npm run ingest                           # load real data (~9s)

npm run typecheck && npm run build       # both green
```

Open **http://localhost:5173/** (home) and **/find-your-journey** (all packages).

---

## Verified state
- `typecheck` ✓ · `build` ✓ · locale JSON ✓
- `/api/journeys` → `total: 753`, real port names, numeric prices
- DB: 753 journeys across 11 regions, EP01→EXPLORA I … EP06→EXPLORA VI

## Open follow-ups (not blocking)
- **Go-live DB**: provision hosted Postgres, set `DATABASE_URL`, `migrate` + `ingest`.
- **Footer**: still has its full column set (separate from the top nav) — trim if wanted.
- **Coming-soon list**: the parked structural nav (Collections, Experience, Offers, Why
  Explora, footer pages) is awaiting a build/keep/drop decision per item.
- Minor i18n: ShipDetail "Launching {year}" / "In service since {year}" / "Ship Guide"
  eyebrow still English-only.
- 152 day-rows were de-duplicated by `UNIQUE(journey_id, day_number)` (same-day stops).

---

## 2026-06-22 — Homepage + Journey-detail + Booking-suite UI redesign

A focused front-end pass: the **home page**, the **journey-detail page**
(`/journeys/:id`), and the **suite step of the booking funnel**
(`/journeys/:id/book/suite`) were recomposed to read like a premium voyage site.
`typecheck` + `build` stayed green; all three surfaces verified in the running app.

### Home page (`src/routes/Home.tsx`) — recomposed
- New flow: **hero + search → featured voyages → video → destinations → life onboard
  → all-journeys-include → newsletter**. The ship carousel was removed.
- New section components in `src/components/home/`:
  `HomeVideo.tsx`, `DestinationsRow.tsx`, `LifeOnboard.tsx`, `AllJourneysInclude.tsx`,
  `NewsletterBand.tsx`.

### Experience route (new, templated)
- `src/routes/Experience.tsx` + `src/data/experiences.ts` — one templated
  `/experience/:topic` route serving **suites · dining · wellness**.
- Mega-menu experience links repointed to `/experience/*`
  (`src/components/chrome/MegaMenu/megaMenu.ts`).

### Journey detail (`src/routes/JourneyDetail.tsx`) — redesigned
- New **sticky `JourneySubNav`** with a navy detail bar showing
  Departs / Arrives / ports / Nights + a **Reserve** action.
- Itinerary is now an **accordion TABLE** (`ItineraryTable.tsx`).
- New **inclusions** and **onboard-experiences** sections
  (`InclusionsBlock.tsx`, `OnboardExperiences.tsx` + `src/data/onboardExperiences.ts`).
- Suites now render **with no price** on this page.
- Fixed a hook-order issue (`useMemo` → `const`).

### Booking — suite step (`/journeys/:id/book/suite`)
- `SuiteOfferCard.tsx` is now a **carousel card**; `PackagePanel.tsx` gained a
  **collapsible "Your destinations"** and a **gated "All Suites Include"** box.
- New `SuiteDetailModal.tsx` + `src/data/suiteDetails.ts` (incl. `suiteSqm`).
- `src/lib/shipAssets.ts` gained `cabinImagesForSuite`.

### i18n
- `src/locales/{en,el}.json` gained `experience.*`, `journey.*`, `onboard.*`, plus a
  few `home.*` keys.

### Open follow-ups from this pass
- **Authoritative suite m² sizes pending.** Only **Ocean Terrace 35** and
  **Owner Residence 280** are confirmed → fill `SQM_BY_TIER` in
  `src/data/suiteDetails.ts`.
- Per-ship onboard tabs are thin except **Explora I**.
- Floorplan tab omitted for now.
- Verify visually in-browser by hand (no browser automation available).
