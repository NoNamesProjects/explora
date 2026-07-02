# Explora partner site — session handoff / context

Upload this file at the start of a new session to resume with full context. It is
a condensed record of the work through 2026-06-22 and the current state.

---

## Update — 2026-06-24 (language toggle + 100% translation + suite-card popup + "Film-Still" modal)

Latest state on top. Sibling same-day session to the cinematic redesign below. Full session log:
`~/Desktop/sk/session-logs/2026-06-24-explora-i18n-toggle-suite-popup.md`.
**Build green; UI code-verified only — eyeball on a hard-refresh, EN + ΕΛ (no-Chrome rule).**

- **Header language toggle:** new `src/components/chrome/LanguageToggle.tsx` — segmented **EN｜ΕΛ** gold
  pills, **left of "Contact Us"** (+ a row in `MobileNav`). `i18n.ts` now syncs `<html lang>` on change
  and at init; choice persists to `localStorage('explora.locale')`. New key `aria.language` (en+el).
- **100% translation:** ~330 hardcoded strings extracted to `t(key, { defaultValue })` across booking /
  search-filters / journey-detail / destination / suite-ship surfaces; **`en.json`/`el.json` are now
  key-for-key identical** (locale parity asserted). All date/number formatters are locale-aware
  (`formatEUR`, JourneyDetail dates, FilterControls month, JourneyCard/RegionHero, the two price-slider
  `format` callbacks). `filterOptions.ts` `SORT_OPTIONS` → `{value,labelKey}` resolved via `t()`.
- **`src/data/suiteDetails.ts` is now locale-aware** — `suiteFeatures()/suiteInclusions()/suiteOverview()`
  read the active locale via the global `i18n.t(..., { returnObjects })` pattern (English as fallback);
  fixes the suite modal AND `/suites/:tier` showing English under ΕΛ.
- **Suite cards → in-place popup (no navigation):** extracted a shared footer-agnostic
  `src/components/booking/SuiteDetailContent.tsx`; reused by `SuiteDetailModal` (booking: party/total/
  **Select**) and the **new** `SuitePreviewModal` (journey: **Reserve this journey**). On `/journeys/:id`
  each "Choose your suite" card is now a `Dialog.Trigger asChild` button → opens the popup.
- **"Film-Still" popup redesign (`/ui`):** full-bleed photo + ink scrim + overlaid Bodoni-italic name +
  spec `<dl>` (m² · Sleeps N · Ocean-front), quiet cream rail (tabs + sticky footer). Responsive scroll:
  `flex-col` (mobile) / `md:grid md:grid-cols-[1.4fr_1fr]`, rail `min-h-0` scroll, footer flush via
  `-mb-*`. A11y: overlaid name `aria-hidden` (Dialog.Title announces it), tab focus rings,
  `motion-reduce:animate-none` on overlays. **Tuning knobs:** scrim `from-ink/85 via-ink/40`, ratio
  `md:grid-cols-[1.4fr_1fr]`, width `max-w-6xl`, height `md:h-[70vh]`.
- **Skills:** `/analise` round 6 mined 2 — `full-site-i18n-parity-pass`, `dialog-shared-body-caller-footer`.
- **Verify:** `tsc` + `vite build` green; locale parity exact; hook-order clean; Vite transforms clean.
  **Pending:** user visual confirm of the Greek + the Film-Still popup. To add ANY future locale key, go
  through the triple→`merge.mjs` path (artifact in the session log), never hand-edit one JSON.

---

## Update — 2026-06-24 (full-site cinematic redesign + audit)

Latest state on top. Full session log: `~/Desktop/sk/session-logs/2026-06-24-explora-cinematic-redesign.md`.
**Build green; UI is code-verified only — eyeball on a hard-refresh (no-Chrome rule).**

- **Cinematic warm-maritime language now applied site-wide:**
  - **ShipDetail** (`/ships/:code`): parallax `ShipHeroCinematic` with a one-line **"EXPLORA I"** nameplate;
    dark `SpecificationsBand`; dark tagline band; rounded "rise-over" seams; `LifeOnboardGrid`;
    `ParallaxMedia`. A new **"Sail with EXPLORA X"** journeys band (`ShipJourneys` + `ShipJourneyFilters`,
    where/when filter + pagination, "View all" deep-links to `/find-your-journey?ship=…`). **Art + Ship
    Guide sections removed.** `StickySubNav` is now `fixed` + tracks the auto-hiding header.
  - **/ships index**: new banner `EXPLORA II AERIAL`; hero melts into a **navy intro band**; `FleetRegister`.
  - **Suites** (`/suites/:tier`): gallery-led — `SuiteGallery` is a CSS-columns **masonry** + lightbox;
    refined `SuiteHero`/`SuiteFeatures`.
  - **Destinations** (`/destinations/:region`): refined `RegionHero` + a dark **"At a glance"**
    `RegionStatsBand` + parallax `RegionAshore`.
  - **Suite popups** (`SuitePreviewModal`/`SuiteDetailModal`): fixed **`md:h-[70vh]`** so they no longer
    resize between tabs/categories (right pane scrolls internally).
- **Audit + fixes:** `tsc` + `vite build` green, no hook-order/runtime issues. Added ~12 missing i18n keys
  (en+el on suite + destination), fixed a Framer/CSS **parallax transform-conflict** (slow-zoom had
  silently stopped), a11y (lightbox alt, sub-nav focus ring, godmother `h3→h2`), and deleted 3 dead files
  (`RegionOverview`, `ShipGuideBand`, `ArtCurationBlock`) + orphaned locale keys.
- **Shared:** `JourneyPagination` extracted with a `tone: ink|cream` prop; reused by FindAJourney + the
  ship journeys band.
- **Skills:** `/analise` round 5 mined 3 (`parallax-without-transform-conflict`,
  `tailwind-jit-dynamic-class-pitfall`, `detail-page-related-results-deeplink`).
- **Unchanged:** go-live gate (migrate+ingest+smoke vs hosted Neon); 742 journeys (manual ingest); the IP
  boundary; the no-Chrome rule; `/api/ships` = 4 by design.

---

## Update — 2026-06-22 (home polish + data refresh)

Latest state on top of the 2026-06-02 record below. Full session log:
`~/Desktop/sk/session-logs/2026-06-22-explora-home-polish.md`.

- **Data:** refreshed to **742 journeys** (local DB). Nightly auto-ingest still not running
  (FDA/laptop-asleep) — refresh manually: `bash scripts/nightly-ingest.sh` or `npm run ingest`.
- **Home page:** journey-card price label `From` → **per person** (`common.perPerson`); hero is now a
  plain small paragraph **"Maybe the best hotel isn't a hotel"** (`hero.tagline`) replacing the
  rotating headline + old subtitle — **user-approved IP exception** (Greek translated); **"Our
  Destinations"** cards use real harvested port photos (same pipeline as the package cards); **"All
  Journeys Include"** list text enlarged; home video poster = the film's own YouTube thumbnail.
- **`/api/ships` returns 4 by design** (EXPLORA V/VI hidden via `src/data/shipVisibility.ts` + the
  handler's SQL `NOT IN`). The smoke test was corrected to assert 4 (was a stale `=== 6`) — do NOT
  "fix" the ships API. `npm run smoke` = 14 checks green.
- `/analise` this session added 4 library skills (see `~/Desktop/sk/skills/00-PROJECT-SKILLS-INDEX.md`,
  Explora round 3).
- **Constraint:** do NOT use Chrome / browser-automation tools (standing user rule).

---

## 1. What this project is

Partner-facing site that mirrors the **structure and visual language** of
explorajourneys.com (Explora Journeys = MSC Group ultra-luxury cruise brand) and
ships **placeholder content the partner swaps**. The partner is authorised and holds
Explora flat-file API credentials.

**Stack:** Vite 5 + React 18 + TS + Tailwind v3 (warm-gold `#96845E`, navy ink `#0C2340`,
cream `#F4F2EF`) · Radix · Framer Motion · Swiper · i18next (en + el) · Vercel `/api/*`
(or cPanel via `server.js`) · Postgres · SheetJS ingest · `tsx` CLI scripts.

**Path:** `/Users/kostasanastasopoulos/Desktop/nonameproject/Explora/`

### ⚠️ IP boundary (non-negotiable)
- ✅ CAN replicate: page structure, nav hierarchy, typography pairing, colour philosophy,
  component shapes, and **factual product taxonomy** (ship names EXPLORA I–VI, suite-tier
  names, venue names, port names, deck specs, Dr. Sylvia Earle as Explora I godmother).
- ❌ MUST NOT reproduce: verbatim brand campaign copy (esp. the "Maybe…" headline series),
  McCann/Scene7 brand photography, licensed fonts (we ship Bodoni Moda + Inter). All
  placeholder copy in `src/locales/{en,el}.json` is original phrasing — keep it original.

---

## 2. Current state (as of 2026-06-22)

**Real Explora data is LIVE on a local Postgres**, and the site renders it end-to-end —
plus a front-end redesign pass landed on the home, journey-detail, and booking-suite pages.
- 753 journeys (11 regions), 35,791 EUR fares, 9,417 day-stops, 409 ports, 6 ships,
  19 suite categories.
- `/find-your-journey`, journey detail, destination regions, and the home search all
  return real packages with real port **names** and prices.
- **Home recomposed** (`Home.tsx`): hero+search → featured voyages → video → destinations
  → life onboard → all-journeys-include → newsletter. Ship carousel removed. New sections
  in `src/components/home/` (`HomeVideo`, `DestinationsRow`, `LifeOnboard`,
  `AllJourneysInclude`, `NewsletterBand`).
- **Journey detail redesigned** (`JourneyDetail.tsx`): sticky `JourneySubNav` with a navy
  detail bar (Departs/Arrives/ports/Nights + Reserve), itinerary as an accordion TABLE,
  new inclusions + onboard-experiences sections, suites shown with **no price**.
- **Booking suite step** (`/journeys/:id/book/suite`): `SuiteOfferCard` is now a carousel
  card; `PackagePanel` has a collapsible "Your destinations" + gated "All Suites Include";
  new `SuiteDetailModal` + `src/data/suiteDetails.ts`.
- **New templated route** `/experience/:topic` (suites · dining · wellness) via
  `Experience.tsx` + `src/data/experiences.ts`; mega-menu experience links repointed there.
- New i18n keys: `experience.*`, `journey.*`, `onboard.*`, plus some `home.*`.
- `npm run typecheck` + `npm run build` green; all three redesigned surfaces verified in
  the running app.

**Credentials/env** live in `.env.local` (gitignored): Okta **prod** username/password
(`EXPLORA_ENV=prod`, user `<explora-partner-username>` — password is in the file, not here),
and `DATABASE_URL=postgresql://kostasanastasopoulos@localhost:5432/explora` (local).

---

## 3. What happened this session (narrative + decisions)

1. **Verified creds + receivability.** `probe:auth` → Auth OK (prod). `probe` listed 4 live
   files. Discovered the **real workbook format** differs from the 2022 spec (pivoted
   pricing cross-tab; flat itinerary sheet; no genericReport).
2. **Reworked the parsers** to the real shape (`parse-pricing`, `parse-generic`, new
   `assemble.ts` + `util.ts`, fixed `pick-latest`). Built `npm run parse:check` (no-DB
   validation). Key mapping: pricing "Per Person Fare" → `prices['2A']` (the only key the
   UI reads); other components → `fares.raw`.
3. **DB decision.** User couldn't get a Neon connection string; chose **local Postgres**.
   Installed Homebrew `postgresql@16`, made `lib/db/client.ts` **dual-driver** (Neon HTTP
   for `*.neon.tech`, porsager `postgres` otherwise). Added `npm run migrate`.
4. **Ingested** all data (8.7s). Fixed a porsager jsonb double-encoding bug (`jsonbArg()`).
5. **Polished pages** (audited via subagents): port codes → names (API joins),
   `lowestPriceEUR`::float8, journey-detail null-safety, card consistency, line-clamp.
6. **Coming-soon treatment** for dead links/buttons (`ComingSoon` component + `comingSoon`
   flag on mega-menu links). About neutralised. **Decision: delete nothing, mark + list.**
7. **Trimmed nav** to Find a Journey · Destinations · Ships (Header `triggerKeys`).
8. **Redesigned the home** to: hero+search → ship carousel → award banner → packages teaser.

### 2026-06-22 session
9. **UI redesign pass** across three surfaces (no data/DB changes):
   - **Home** recomposed (ship carousel out; video/destinations/life-onboard/inclusions/
     newsletter in) with five new `src/components/home/` sections.
   - **Journey detail** rebuilt around a sticky `JourneySubNav` (navy detail bar +
     Reserve), an accordion-table itinerary, inclusions + onboard-experiences sections,
     and price-free suite cards. Fixed a `useMemo`→`const` hook-order bug.
   - **Booking suite step** got carousel suite cards, a collapsible "Your destinations",
     a gated "All Suites Include" box, and a new `SuiteDetailModal`.
   - Added a templated `/experience/:topic` route (suites · dining · wellness) and
     repointed the mega-menu experience links to it.
   - Added `experience.*` / `journey.*` / `onboard.*` i18n keys + new data files
     (`experiences.ts`, `onboardExperiences.ts`, `suiteDetails.ts`).

---

## 4. How to resume

```bash
cd /Users/kostasanastasopoulos/Desktop/nonameproject/Explora
brew services start postgresql@16     # ensure DB is running
npm run dev                           # http://localhost:5173 (SPA + /api/*)
```
If the DB is empty (fresh machine): `npm run migrate` then `npm run ingest`.
Refresh data anytime: `npm run ingest` (idempotent upsert; ghost-resilient soft-delete).

Useful scripts: `probe:auth`, `probe`, `parse:check`, `migrate`, `ingest:dry`, `ingest`,
`typecheck`, `build`.

---

## 5. Codebase map (key files)

```
src/
  routes/        Home.tsx (hero+search→featured→video→destinations→life→inclusions→
                 newsletter), Experience.tsx (templated /experience/:topic), FindAJourney.tsx,
                 JourneyDetail.tsx (sticky JourneySubNav + accordion-table itinerary),
                 DestinationRegion.tsx, ShipDetail.tsx, About.tsx
  components/
    home/        HomeVideo.tsx, DestinationsRow.tsx, LifeOnboard.tsx,
                 AllJourneysInclude.tsx, NewsletterBand.tsx, PackagesTeaser.tsx
                 (ShipCarousel.tsx parked — removed from Home)
    journey/     JourneySubNav.tsx, ItineraryTable.tsx, InclusionsBlock.tsx,
                 OnboardExperiences.tsx
    booking/     SuiteOfferCard.tsx (carousel), PackagePanel.tsx (collapsible/gated),
                 SuiteDetailModal.tsx
    hero/        RotatingHeadline.tsx, SearchWidget.tsx
    chrome/      Header.tsx (triggerKeys), MegaMenu/megaMenu.ts (experience→/experience/*),
                 UtilityNav.tsx, Footer.tsx
    ui/          ComingSoon.tsx, SectionHeading.tsx, Breadcrumb.tsx
    ship/        ArtCurationBlock.tsx, StickySubNav.tsx, DeckSwitcher.tsx, SuiteTierCarousel.tsx
  lib/           api.ts (typed fetchers + JourneyCard/JourneyDetail), image.ts,
                 shipAssets.ts (+ cabinImagesForSuite)
  data/          megaMenu.ts (nav + ships + comingSoon), shipFacts.ts, experiences.ts,
                 onboardExperiences.ts, suiteDetails.ts (suiteSqm / SQM_BY_TIER)
  locales/       en.json, el.json (+ experience.* / journey.* / onboard.* / home.*)
api/             journeys.ts, journeys/[id].ts (both LEFT JOIN ports for names), ships*, ports, health, newsletter, cron/ingest-flatfiles
lib/
  db/            client.ts (DUAL DRIVER + dbIsNeon/rawQuery/jsonbArg), schema.sql
  explora-flatfile/  util.ts, parse-pricing.ts, parse-generic.ts, assemble.ts,
                     pick-latest.ts, auth.ts, list-files.ts, download.ts, env.ts, ingest.ts, probe.ts
scripts/         probe.ts, ingest-once.ts, parse-check.ts, migrate.ts
public/photos/   686 real ship photos (6 ship folders) — used by shipAssets manifest
```

---

## 6. Open items / next steps

- **Authoritative suite m² sizes (from this session):** only **Ocean Terrace 35** and
  **Owner Residence 280** are confirmed. Fill the rest into `SQM_BY_TIER` in
  `src/data/suiteDetails.ts` once the real numbers arrive.
- **Onboard tabs are thin** for ships other than **Explora I** (`onboardExperiences.ts`);
  the **Floorplan** tab is omitted for now.
- **Visual QA by hand:** the three redesigned surfaces (home, `/journeys/:id`,
  `/journeys/:id/book/suite`) should be eyeballed in the browser — no browser automation
  is available here.
- **Go-live DB:** provision hosted Postgres (Neon/Supabase/cPanel-PG), set `DATABASE_URL`,
  `migrate` + `ingest`. Dual-driver means **no code changes** (Neon URL auto-uses HTTP driver).
- **Footer:** still shows its full column set; trim to match the simplified top nav if wanted.
- **Coming-soon list to triage** (parked, not deleted — decide build/keep/drop):
  mega-menu Collections (7), Experience/life-on-explora (7), Offers (8), Why Explora
  (suites/sustainability/awards/club/ambassadors/gallery/ocean-state-of-mind); footer pages
  (travel advisors, press, manage reservation, brochures, FAQ, awards, partnerships, health,
  foundation, MSC group, lost&found, legal/*); Home offer/life cards; ShipDetail PDFs &
  godmother/sustainability CTAs; e-brochure; All Destinations.
- **Minor i18n:** ShipDetail "Launching {year}" / "In service since {year}" / "Ship Guide".
- **Home tuning** the user may request: hero height, swap placeholder hero for a real photo,
  add Nights to the search, number of teaser cards.

---

## 7. Gotchas to remember
- Porsager jsonb: pass objects via `jsonbArg()`/`sql.json()`, NOT `JSON.stringify(...)::jsonb`.
- Flat-files use the **production** Okta tenant (preprod is booking-flow partners only).
- Region/ship values are normalized **at ingest** (`util.ts`) — DB stores slugs + EP0n codes.
- `imageUrl()` placeholder keys resolve to curated fallbacks (never break) until Cloudinary set.
- Vite re-optimizes deps after a lockfile change → the first page load can briefly error;
  just refresh.
