-- 2026-05-24 — Explora partner site initial schema.
--
-- Apply with: psql "$DATABASE_URL" < lib/db/schema.sql
-- Or via Neon's SQL editor in the Vercel dashboard.
--
-- All tables are intentionally simple. The flatfile ingest cron (see
-- lib/explora-flatfile/ingest.ts) writes to these from parsed XLS data.

CREATE TABLE IF NOT EXISTS ships (
  ship_cd        text PRIMARY KEY,
  ship_name      text NOT NULL,
  imo            text,
  decks          int,
  capacity       int,
  launch_year    int,
  hero_image     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ports (
  port_cd        text PRIMARY KEY,
  port_name      text NOT NULL,
  country        text,
  lat            double precision,
  lon            double precision,
  timezone       text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suite_categories (
  code           text PRIMARY KEY,
  name           text NOT NULL,
  tier           text NOT NULL,
  sqm            int,
  has_balcony    boolean DEFAULT true,
  max_occupancy  int,
  image_url      text
);

CREATE TABLE IF NOT EXISTS journeys (
  journey_id        text PRIMARY KEY,
  ship_cd           text NOT NULL REFERENCES ships(ship_cd) ON UPDATE CASCADE,
  itin_cd           text NOT NULL,
  itin_desc         text,
  region            text,
  sailing_port      text,
  termination_port  text,
  sailing_date      date NOT NULL,
  nights            int NOT NULL,
  embk_time         text,
  dis_embk_time     text,
  is_available      boolean NOT NULL DEFAULT true,
  consecutive_missing int NOT NULL DEFAULT 0,
  raw               jsonb,
  last_seen_at      timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journeys_sailing_date_idx ON journeys (sailing_date);
CREATE INDEX IF NOT EXISTS journeys_ship_cd_idx       ON journeys (ship_cd);
CREATE INDEX IF NOT EXISTS journeys_region_idx        ON journeys (region);
CREATE INDEX IF NOT EXISTS journeys_sailing_port_idx  ON journeys (sailing_port);
CREATE INDEX IF NOT EXISTS journeys_is_available_idx  ON journeys (is_available) WHERE is_available = true;

CREATE TABLE IF NOT EXISTS journey_days (
  id               bigserial PRIMARY KEY,
  journey_id       text NOT NULL REFERENCES journeys(journey_id) ON DELETE CASCADE,
  day_number       int NOT NULL,
  port_cd          text REFERENCES ports(port_cd) ON UPDATE CASCADE,
  arrival_time     text,
  departure_time   text,
  overnight        boolean DEFAULT false,
  description      text,
  UNIQUE (journey_id, day_number)
);

CREATE INDEX IF NOT EXISTS journey_days_journey_idx ON journey_days (journey_id);

CREATE TABLE IF NOT EXISTS fares (
  id                bigserial PRIMARY KEY,
  journey_id        text NOT NULL REFERENCES journeys(journey_id) ON DELETE CASCADE,
  fare_code         text NOT NULL,
  fare_desc         text,
  price_type        text,
  suite_category    text REFERENCES suite_categories(code) ON UPDATE CASCADE,
  prices            jsonb NOT NULL DEFAULT '{}'::jsonb,
  currency          text NOT NULL,
  gft               jsonb,
  ncf               jsonb,
  fare_start_date   date,
  fare_end_date     date,
  option_expires    date,
  now_available     boolean NOT NULL DEFAULT true,
  items             text[] NOT NULL DEFAULT '{}',
  raw               jsonb,
  last_seen_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (journey_id, fare_code, suite_category, currency)
);

CREATE INDEX IF NOT EXISTS fares_journey_idx ON fares (journey_id);

CREATE TABLE IF NOT EXISTS excursions (
  excursion_cd     text PRIMARY KEY,
  port_cd          text REFERENCES ports(port_cd) ON UPDATE CASCADE,
  name             text NOT NULL,
  duration_minutes int,
  intensity        text,
  price_eur        numeric(10,2),
  long_desc        text,
  last_seen_at     timestamptz NOT NULL DEFAULT now()
);

-- Audit log for ingest runs. The ghost-resilient soft delete reads from
-- here to decide whether to gate (current run vs prior run journey count).
CREATE TABLE IF NOT EXISTS ingest_runs (
  run_id           uuid PRIMARY KEY,
  started_at       timestamptz NOT NULL DEFAULT now(),
  finished_at      timestamptz,
  journey_count    int NOT NULL DEFAULT 0,
  fare_count       int NOT NULL DEFAULT 0,
  failed_files     int NOT NULL DEFAULT 0,
  status           text NOT NULL DEFAULT 'running'
                     CHECK (status IN ('running', 'ok', 'aborted', 'failed')),
  notes            text
);

CREATE INDEX IF NOT EXISTS ingest_runs_started_idx ON ingest_runs (started_at DESC);

-- Newsletter (used by /api/newsletter)
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  email            text PRIMARY KEY,
  confirmed        boolean NOT NULL DEFAULT false,
  confirm_token    text,
  consent_at       timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at  timestamptz
);

-- Contact form submissions (used by /api/contact)
CREATE TABLE IF NOT EXISTS contact_messages (
  id               bigserial PRIMARY KEY,
  name             text NOT NULL,
  email            text NOT NULL,
  phone            text,
  message          text NOT NULL,
  ip               text,
  user_agent       text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Booking requests / quote-with-deposit (used by /api/booking-request + /api/paypal/*).
-- Flatfiles can't confirm a cabin live, so a request is recorded BEFORE payment
-- (audit trail), the deposit is captured fail-soft, and the team confirms manually.
CREATE TABLE IF NOT EXISTS booking_requests (
  id                bigserial PRIMARY KEY,
  ref               text UNIQUE NOT NULL,
  journey_id        text,                       -- soft ref (no FK: survive catalog churn)
  suite_category    text,
  fare_code         text,
  currency          text NOT NULL DEFAULT 'EUR',
  guest_count       int NOT NULL DEFAULT 1,
  guests            jsonb NOT NULL DEFAULT '[]'::jsonb,
  indicative_total  numeric(12,2),
  deposit_amount    numeric(12,2),
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'deposit_paid', 'confirmed', 'cancelled')),
  paypal_order_id   text,
  paypal_capture_id text,
  paid_at           timestamptz,
  notify_sent_at    timestamptz,
  message           text,
  ip                text,
  user_agent        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_requests_journey_idx ON booking_requests (journey_id);

-- ── Admin / operations dashboard ───────────────────────────────────────────
-- Multi-user operator accounts. Passwords are crypto.scrypt hashes stored as
-- "scrypt$N$r$p$saltB64url$hashB64url" (see lib/admin-auth.ts). Email kept
-- lowercased in the app; the lower() unique index is the case-insensitive guard.
CREATE TABLE IF NOT EXISTS admin_users (
  id            bigserial PRIMARY KEY,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name          text NOT NULL,
  role          text NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
  disabled      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_lower_idx ON admin_users (lower(email));

-- Opaque DB-backed sessions (no JWT). Cookie holds the 256-bit token; lookup
-- joins to the user on every request. Deleting a user cascades their sessions.
CREATE TABLE IF NOT EXISTS admin_sessions (
  token       text PRIMARY KEY,
  user_id     bigint NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  ip          text,
  user_agent  text
);

CREATE INDEX IF NOT EXISTS admin_sessions_user_idx    ON admin_sessions (user_id);
CREATE INDEX IF NOT EXISTS admin_sessions_expires_idx ON admin_sessions (expires_at);

-- Login throttle: count recent failures per ip/email before hashing.
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id         bigserial PRIMARY KEY,
  ip         text,
  email      text,
  ok         boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_login_attempts_idx ON admin_login_attempts (created_at DESC);

-- Append-only admin action log. before/after store status/note-id transitions
-- only — never guest PII (full PII lives in booking_requests + the gated detail).
CREATE TABLE IF NOT EXISTS admin_audit (
  id          bigserial PRIMARY KEY,
  user_id     bigint REFERENCES admin_users(id) ON DELETE SET NULL,
  user_email  text,
  action      text NOT NULL,
  entity      text,
  entity_id   text,
  before      jsonb,
  after       jsonb,
  ip          text,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_created_idx ON admin_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_entity_idx  ON admin_audit (entity, entity_id);

-- Internal operator notes on a booking. Append-only array of
-- {id, at, by, byName, text}. Low volume, so jsonb beats a side table.
ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS admin_notes jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Indexes the admin inbox / filters lean on.
CREATE INDEX IF NOT EXISTS booking_requests_status_idx  ON booking_requests (status);
CREATE INDEX IF NOT EXISTS booking_requests_created_idx ON booking_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS contact_messages_created_idx ON contact_messages (created_at DESC);

-- ── Client CMS: content overrides / media / price overrides / email campaigns ──
-- Everything below is the self-service admin CMS. Defaults stay in code
-- (src/locales, src/data, /photos); these tables hold ONLY what the client changed.

-- Sparse, per-key editorial overrides read at boot and merged over the code
-- defaults. key = a dotted path (e.g. 'hero.tagline', 'media.home.hero').
-- kind = i18n | data | media. type = plain | rich | image | number | list.
-- value columns are jsonb (a plain string is stored as a JSON string).
-- draft_value = unpublished edit; published_value = live (NULL → fall back to code).
CREATE TABLE IF NOT EXISTS site_content (
  key             text NOT NULL,
  locale          text NOT NULL DEFAULT '',   -- 'en' | 'el' | '' (locale-agnostic: media/number)
  kind            text NOT NULL,
  type            text NOT NULL,
  draft_value     jsonb,
  published_value jsonb,
  updated_by      bigint REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  published_at    timestamptz,
  PRIMARY KEY (key, locale)
);
CREATE INDEX IF NOT EXISTS site_content_published_idx ON site_content (published_at)
  WHERE published_value IS NOT NULL;

-- Uploaded media. Files live on the cPanel disk under /uploads; metadata here.
CREATE TABLE IF NOT EXISTS media_assets (
  id            bigserial PRIMARY KEY,
  filename      text NOT NULL,          -- on-disk name
  url           text NOT NULL,          -- public URL, e.g. /uploads/<name>
  original_name text,
  mime          text,
  bytes         int,
  width         int,
  height        int,
  alt_en        text,
  alt_el        text,
  category      text,                   -- 'banner' | 'ship' | 'destination' | 'suite' | ...
  uploaded_by   bigint REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS media_assets_created_idx  ON media_assets (created_at DESC);
CREATE INDEX IF NOT EXISTS media_assets_category_idx ON media_assets (category);

-- Manual per-journey/suite price overrides that SURVIVE the daily ingest. The
-- read path (api/journeys*) COALESCEs override_price over the fed fares.prices;
-- lib/explora-flatfile/ingest.ts never touches this table.
CREATE TABLE IF NOT EXISTS fare_overrides (
  journey_id     text NOT NULL,
  suite_category text NOT NULL DEFAULT '',   -- '' = applies to the whole journey's "from" price
  currency       text NOT NULL DEFAULT 'EUR',
  override_price numeric(12,2),
  note           text,
  enabled        boolean NOT NULL DEFAULT true,
  updated_by     bigint REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (journey_id, suite_category, currency)
);
CREATE INDEX IF NOT EXISTS fare_overrides_journey_idx ON fare_overrides (journey_id) WHERE enabled;

-- Email broadcasts to newsletter subscribers. body = the rich "runs" document;
-- body_html = the sanitized HTML actually sent. Run status mirrors ingest_runs.
CREATE TABLE IF NOT EXISTS email_campaigns (
  id           bigserial PRIMARY KEY,
  subject      text NOT NULL,
  body         jsonb,
  body_html    text,
  recipients   int NOT NULL DEFAULT 0,
  sent_count   int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  status       text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'ok', 'failed')),
  notes        text,
  sent_by      bigint REFERENCES admin_users(id) ON DELETE SET NULL,
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz
);
CREATE INDEX IF NOT EXISTS email_campaigns_started_idx ON email_campaigns (started_at DESC);

-- Newsletter double-opt-in needs an unsubscribe token (confirm_token already exists).
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS unsubscribe_token text;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS locale text;

-- ── 2026-07-02 backend-hardening pass ──────────────────────────────────────

-- PayPal capture claim: set atomically (WHERE status='pending' … RETURNING) so
-- two concurrent capture calls can never both reach PayPal for the same ref.
ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS capture_started_at timestamptz;

-- Cross-process ingest lock. runIngest INSERTs its 'running' audit row before
-- doing any work; this partial unique index makes that INSERT an atomic claim
-- on both drivers (advisory locks don't exist over the Neon HTTP driver).
-- Sweep any stale claim first so the index can always be created.
UPDATE ingest_runs SET status = 'failed', finished_at = now(), notes = COALESCE(notes, 'stale — swept by migration') WHERE status = 'running' AND started_at < now() - interval '30 minutes';

UPDATE ingest_runs SET status = 'failed', finished_at = now(), notes = COALESCE(notes, 'duplicate running row — swept by migration') WHERE status = 'running' AND run_id NOT IN (SELECT run_id FROM ingest_runs WHERE status = 'running' ORDER BY started_at DESC LIMIT 1);

CREATE UNIQUE INDEX IF NOT EXISTS ingest_runs_one_running_idx ON ingest_runs (status) WHERE status = 'running';

-- Email-broadcast single-flight: at most one 'running' campaign at a time, same
-- partial-unique-index technique. Stale rows from crashed sends are reaped first.
UPDATE email_campaigns SET status = 'failed', finished_at = now(),
  notes = coalesce(notes || ' — ', '') || 'stale: reaped by migration'
  WHERE status = 'running' AND started_at < now() - interval '30 minutes';
CREATE UNIQUE INDEX IF NOT EXISTS email_campaigns_one_running_idx
  ON email_campaigns ((true)) WHERE status = 'running';

-- Token lookups on the double-opt-in path (confirm/unsubscribe are WHERE token=$1).
CREATE INDEX IF NOT EXISTS newsletter_confirm_token_idx ON newsletter_subscribers (confirm_token) WHERE confirm_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS newsletter_unsub_token_idx ON newsletter_subscribers (unsubscribe_token) WHERE unsubscribe_token IS NOT NULL;

-- ref already has a UNIQUE constraint (implicit index) — the extra index was redundant.
DROP INDEX IF EXISTS booking_requests_ref_idx;

-- ══ 2026-08-04 · CMS page-builder (Tier B) ═════════════════════════════════
-- site_content (above) is Tier A: flat, always-present leaf fields, one row per
-- (key, locale). It cannot express ORDER or EXISTENCE, so it can never model
-- "add / delete / reorder a section". These tables are Tier B: an ordered list
-- of section INSTANCES per page, plus the entities (ships / destinations) whose
-- detail pages are assembled from them. The two tiers coexist — a page migrates
-- to Tier B only when it needs restructuring, everything else stays on Tier A.
--
-- Field VALUES live inside the jsonb config; their SHAPE is validated
-- server-side against src/content/sectionTypes.ts (the write allowlist, same
-- role CONTENT_REGISTRY plays for site_content). section_type / kind are
-- deliberately NOT DB enums: a new type is a code change, never a migration.

-- Admin-manageable "things" that own a detail page. Replaces the closed
-- RegionKey / ShipCode TS unions that are duplicated across 5-7 files each.
CREATE TABLE IF NOT EXISTS site_entities (
  id               bigserial PRIMARY KEY,
  kind             text NOT NULL,
  slug             text NOT NULL UNIQUE,
  name_en          text NOT NULL DEFAULT '',
  name_el          text NOT NULL DEFAULT '',
  group_key        text,
  visible          boolean NOT NULL DEFAULT false,
  position         int NOT NULL DEFAULT 0,
  fields           jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_fields jsonb,
  created_by       bigint REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by       bigint REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  published_at     timestamptz
);
CREATE INDEX IF NOT EXISTS site_entities_kind_idx ON site_entities (kind, position);

-- One generic ordered gallery table, replacing four hardcoded per-category
-- arrays (shipAssets exterior/onboard/decks/cabins) plus regions.ts ports[].
-- src is a plain path so the 686 existing /photos/* brand images seed straight
-- in without first becoming media_assets rows; media_asset_id is set only for
-- admin-uploaded images (kept for provenance + cascade cleanup).
CREATE TABLE IF NOT EXISTS entity_media (
  id             bigserial PRIMARY KEY,
  entity_slug    text NOT NULL,
  group_name     text NOT NULL,
  group_key      text,
  src            text NOT NULL,
  alt            text,
  media_asset_id bigint REFERENCES media_assets(id) ON DELETE SET NULL,
  name_en        text,
  name_el        text,
  position       int NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS entity_media_lookup_idx ON entity_media (entity_slug, group_name, position);

-- A suite tier has its own copy beyond "a photo", so it gets a small table.
-- Its cabin photos live in entity_media as group_name='cabin', group_key=tier_key.
CREATE TABLE IF NOT EXISTS ship_suite_tiers (
  ship_slug   text NOT NULL,
  tier_key    text NOT NULL,
  name_en     text NOT NULL DEFAULT '',
  name_el     text NOT NULL DEFAULT '',
  tagline_en  text,
  tagline_el  text,
  position    int NOT NULL DEFAULT 0,
  PRIMARY KEY (ship_slug, tier_key)
);

-- The ordered, addable / removable / hideable section list. Draft/published is
-- doubled across order + visibility + config (not just value, as site_content
-- does) so an admin can stage a whole restructure and publish it atomically.
CREATE TABLE IF NOT EXISTS page_sections (
  id                bigserial PRIMARY KEY,
  page_key          text NOT NULL,
  entity_slug       text,
  section_type      text NOT NULL,
  slug              text NOT NULL,
  position          int NOT NULL DEFAULT 0,
  position_published int,
  visible_draft     boolean NOT NULL DEFAULT true,
  visible_published boolean,
  config_draft      jsonb NOT NULL DEFAULT '{}'::jsonb,
  config_published  jsonb,
  is_new            boolean NOT NULL DEFAULT true,
  deleted_draft     boolean NOT NULL DEFAULT false,
  created_by        bigint REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by        bigint REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  published_at      timestamptz
);

-- entity_slug is NULL on singleton pages (home / both index pages) and NULL is
-- never equal to NULL in a UNIQUE constraint, so the identity index coalesces.
CREATE UNIQUE INDEX IF NOT EXISTS page_sections_identity_idx
  ON page_sections (page_key, coalesce(entity_slug, ''), slug);
CREATE INDEX IF NOT EXISTS page_sections_order_idx
  ON page_sections (page_key, coalesce(entity_slug, ''), position);

-- Order is staged like everything else: `position` is the draft order the admin
-- drags, `position_published` is what the live site sorts by. Added after the
-- first cut of page_sections, hence the ALTER rather than an inline column.
ALTER TABLE page_sections ADD COLUMN IF NOT EXISTS position_published int;

-- ── Custom packages ─────────────────────────────────────────────────────────
-- Owner-managed offers that are NOT in the Explora flatfile: own price, photos,
-- copy and itinerary, edited in the admin like a CMS record.
--
-- They live in their OWN tables on purpose. The nightly ingest's soft-delete
-- (last_seen_at < now() - 12h) and 7-day hard delete are not scoped to
-- feed-sourced rows, so a manual row inside `journeys` would be wiped within a
-- day. lib/explora-flatfile/ingest.ts never references these tables, so they
-- physically cannot be touched by a refresh — the same survive-the-ingest
-- pattern as fare_overrides / site_content / site_entities / page_sections.
--
-- public_id is namespaced 'CUSTOM-<slug>' so it can never collide with a feed
-- journey_id, and the read/booking paths branch on that prefix.
-- booking_requests.journey_id is deliberately FK-free, so a custom public_id is
-- already storable there with no schema change.
CREATE TABLE IF NOT EXISTS custom_packages (
  id                    bigserial PRIMARY KEY,
  public_id             text NOT NULL UNIQUE,
  slug                  text NOT NULL UNIQUE,
  title_en              text NOT NULL,
  title_el              text,
  summary_en            text,
  summary_el            text,
  description_en        text,
  description_el        text,
  region                text,
  nights                int NOT NULL DEFAULT 0,
  sailing_date          date,
  sailing_port_name     text,
  termination_port_name text,
  hero_image            text,
  photos                jsonb NOT NULL DEFAULT '[]'::jsonb,
  itinerary             jsonb NOT NULL DEFAULT '[]'::jsonb,
  inclusions            jsonb NOT NULL DEFAULT '[]'::jsonb,
  deposit_pct           numeric,
  visible               boolean NOT NULL DEFAULT false,
  created_by            bigint REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by            bigint REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS custom_packages_visible_idx ON custom_packages (visible, sailing_date);

-- One row per bookable suite+fare on a custom package. Column set mirrors the
-- flatfile fare components so lib/pricing.ts fareToPricing()/priceCabin() price
-- a custom package with the SAME engine as a feed sailing (per-person 2A,
-- reduced 3rd/4th adult, child, infant, solo fare / solo supplement %).
CREATE TABLE IF NOT EXISTS custom_package_fares (
  id                  bigserial PRIMARY KEY,
  package_id          bigint NOT NULL REFERENCES custom_packages(id) ON DELETE CASCADE,
  suite_category      text NOT NULL,
  suite_name          text,
  fare_code           text NOT NULL,
  fare_label          text,
  currency            text NOT NULL DEFAULT 'EUR',
  per_person          numeric NOT NULL,
  third_fourth_adult  numeric,
  third_fourth_child  numeric,
  third_fourth_infant numeric,
  solo_fare           numeric,
  solo_suppl_pct      numeric,
  now_available       boolean NOT NULL DEFAULT true,
  items               jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order          int NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS custom_package_fares_identity_idx
  ON custom_package_fares (package_id, suite_category, fare_code, currency);
CREATE INDEX IF NOT EXISTS custom_package_fares_pkg_idx ON custom_package_fares (package_id, sort_order);
