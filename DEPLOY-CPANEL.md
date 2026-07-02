# Deploying Explora to cPanel / hostmein (Passenger)

Runbook for the **Express + Passenger** deploy path (`server.js`). The same `api/**` handlers
also run on Vercel as functions; this doc is the shared-cPanel path. **Nothing is uploaded yet** —
this session made the repo deploy-ready and verified the production path locally. Do the upload on
deploy day with this as the checklist.

> Pairs with skills: `cpanel-passenger-app-deploy`, `shared-cpanel-lve-budget-check`,
> `hostmein-greek-domain-golive`.

---

## 0. What was fixed to make this deployable (done this session)

The cPanel/Express path was previously broken; these are now resolved:

1. **Server build added.** `npm run build` only emits the SPA. New `npm run build:server`
   (esbuild, `scripts/build-server.ts`) transpiles every `api/**/*.ts` → mirrored `api/**/*.js`
   that `server.js` imports. Use **`npm run build:deploy`** to produce both. (Emitted `.js` are
   gitignored; `.ts` stays the source of truth.)
2. **Express 5 adapter fix.** `req.query` is getter-only in Express 5; the old
   `lib/vercel-adapter.mjs` reassigned it and threw on every path-param route (`/api/journeys/:id`,
   `/api/ships/:code`). It now shadows the getter with an own data property.
3. **`/api/ships/:code` is now mounted** in `server.js` (it was missing).
4. **`api/contact.ts` written** — the contact form posted to a 404 before (handler didn't exist).

All 13 routes verified against `node server.js`: health, journeys (753) + **pagination**
(`?page=2`), journey detail (days+fares), ships, ship-by-code, ports, contact (+400 on invalid)
**→ writes a `contact_messages` row**, newsletter, booking-request **→ writes a `booking_requests`
row with a server-computed deposit**, booking-by-ref 404, paypal gated, cron 401-without-bearer,
SPA deep-link fallback. Re-verified end-to-end on the Express path as a confidence pass; stderr clean.

**Re-verify any time with one command:** `npm run smoke` (`scripts/smoke-server.mjs`) compiles the
handlers, boots `server.js` on a free port, checks every endpoint, prints PASS/FAIL, and exits
non-zero on failure. Run it as the gate before each upload.

---

## 1. Pre-flight — disk / inode / LVE budget

`public/photos/` is ~252 MB / ~1,400 files. On shared hostmein this eats disk **and inodes**, and
`node_modules` adds more. Before uploading, run the `shared-cpanel-lve-budget-check` skill against
the target cPanel account to confirm headroom (especially if co-hosting with cruise2greece /
pamekrouaziera). Decide: ship photos with the app (simplest) vs. offload to a CDN/Cloudinary later.

## 2. Provision the production database (Neon)

The dual-driver needs **zero code change** — point `DATABASE_URL` at Neon and it uses the HTTP driver.

```bash
# After creating a Neon project and pasting its URL into .env.local (or export it):
npm run migrate        # applies lib/db/schema.sql (works via the driver; no psql needed)
npm run ingest         # auth → download flatfiles → parse → upsert (~8s, 753 journeys)
# sanity:
curl -s "$FRONTEND_URL/api/journeys" | python3 -c "import sys,json;print(json.load(sys.stdin)['total'])"
```

Run this from your machine against the Neon URL; the deployed app then just reads it.

## 3. Build for production (locally)

```bash
npm run build:deploy   # tsc --noEmit + vite build (dist/) + esbuild (api/**/*.js)
npm run smoke          # ← gate: boots server.js, checks every endpoint, must print PASSED
```

⚠️ **`VITE_PAYPAL_CLIENT_ID` is baked into the SPA at BUILD time** (Vite inlines `import.meta.env`).
The build must run with the **live** public client id present, or the PayPal buttons won't render.
Server-side `PAYPAL_CLIENT_ID` / `PAYPAL_SECRET` are read at runtime from the cPanel env panel — but
the public client id is a build input. So: set `VITE_PAYPAL_CLIENT_ID` before `build:deploy`.

## 4. cPanel "Setup Node.js App"

- **Application root:** the uploaded project dir.
- **Application startup file:** `server.js`
- **Application mode:** Production
- **Node version:** ≥ 20 (matches `engines`).
- Click **Run NPM Install** in the panel — or `npm install` over SSH. The host only needs the
  **runtime `dependencies`** (`express`, `postgres`, `@neondatabase/serverless`, `zod`, `xlsx`,
  `resend`) — those are what `server.js` and the esbuild-bundled `api/**/*.js` import at runtime
  (esbuild leaves them external). The build-only tools (`tsx`, `vite`, `esbuild`, `tailwindcss`) are
  `devDependencies` and run only during the **local** `build:deploy`, so they're not required on the
  host. (Don't rsync `node_modules` — install on the host so native modules match its Node/arch.)

## 5. Environment variables (cPanel env panel = RUNTIME)

Set these in the panel (NOT in an uploaded `.env` — see secrets hygiene below):

| Var | Value |
|-----|-------|
| `EXPLORA_ENV` | `prod` |
| `EXPLORA_USERNAME` | prod Okta user (`<explora-partner-username>`) |
| `EXPLORA_PASSWORD` | prod Okta password |
| `DATABASE_URL` | the Neon URL |
| `PAYPAL_ENV` | `live` |
| `PAYPAL_CLIENT_ID` | live REST app client id |
| `PAYPAL_SECRET` | live REST app secret |
| `RESEND_API_KEY` | Resend key (for booking emails) |
| `RESEND_FROM` | e.g. `Explora <noreply@yourdomain>` (verified Resend domain) |
| `BOOKING_NOTIFY_EMAIL` | `cruises2greece@outlook.com` |
| `DEPOSIT_PERCENT` | `20` |
| `FRONTEND_URL` | `https://<final-domain>` |
| `CRON_SECRET` | a long random string (gates the manual ingest trigger) |
| `PORT` | leave unset — Passenger assigns it |

**Build-time (NOT runtime):** `VITE_PAYPAL_CLIENT_ID` (the public client id) — set it in the shell
before `npm run build:deploy`, since it's compiled into `dist/`. Re-build if it changes.

## 6. Upload (rsync) — secrets hygiene

Build locally, then rsync the project up. **Never upload `.env.local`** (it holds real prod Okta
creds + will hold the live PayPal secret) — rely on the env panel.

```bash
rsync -avz --delete \
  --exclude='.env.local' --exclude='.env' \
  --exclude='.git' --exclude='node_modules' \
  --exclude='lib/explora-flatfile/probe-output.json' \
  --exclude='uploads/' \
  ./ user@host:~/explora/
```

(Exclude `node_modules` and run NPM Install on the host. Keep `dist/` and `api/**/*.js` IN the
upload — they're the built artifacts the server serves/imports.)

> ⚠️ **`--exclude='uploads/'` is REQUIRED.** The admin CMS writes client-uploaded images to
> `uploads/` on the host disk (served at `/uploads/…`). That directory does NOT exist in the local
> source tree, so without this exclude the `--delete` flag wipes every client image on each deploy.
> The dir persists on the host across deploys; back it up before any destructive host maintenance.

## 7. Daily ingest cron (replaces Vercel Cron) — **midnight**

`vercel.json`'s cron (`0 0 * * *`) does **not** run on cPanel. Add a cPanel **Cron Job** at
**00:00 daily** (the brand wants the nightly refresh at midnight Athens):

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  "https://<final-domain>/api/cron/ingest-flatfiles?force=1" >/dev/null
```

cPanel cron uses the **server's** timezone. hostmein runs Europe/Athens, so `0 0 * * *` = Athens
midnight. If the account is on UTC, either set the cPanel timezone to Europe/Athens, or schedule the
UTC equivalent (`0 21 * * *` in summer / `0 22 * * *` in winter). The handler enforces the bearer for
non-Vercel calls. (Set `INGEST_DRY_RUN=1` on the first run to verify creds/parse without writing.)

> The same nightly refresh runs locally during development via a macOS launchd agent
> (`scripts/nightly-ingest.sh` + `deploy/com.explora.nightly-ingest.plist`) — see that script's
> header for the one-time **Full Disk Access** step macOS requires for a Desktop-located project.
> Once deployed, this cPanel cron is the real always-on nightly; remove the local agent then.

## 8. Domain + SSL (deferred — "decide later")

When the domain is chosen: point DNS at the cPanel host, add the domain to the Node app, wait for
AutoSSL. For a Greek `.gr`/`.ελ` domain on hostmein, follow `hostmein-greek-domain-golive` (registry
nameserver delegation + punycode AutoSSL gotchas). Then set `FRONTEND_URL` to the https domain and
rebuild (for `VITE_*`), and add the domain as a PayPal app return/allowed origin.

## 9. Live PayPal — go-live checklist (you chose "straight to live")

- Live REST app created at developer.paypal.com → live `PAYPAL_CLIENT_ID` / `PAYPAL_SECRET` in the
  env panel; live `VITE_PAYPAL_CLIENT_ID` at build time; `PAYPAL_ENV=live`.
- The deposit is computed **server-side** from the flatfile fare (`lib/booking.ts`) — the client
  can't set the price. Capture is **fail-soft + idempotent** (`api/paypal/capture-order.ts`):
  money is captured, then recorded; a DB failure is logged loudly with the order+capture id for
  manual reconciliation; the agency email is best-effort.
- **⚠️ Recommended hardening for real money:** the capture currently depends on the browser
  completing `onApprove`. If the buyer approves but the tab closes before capture, you get an
  *approved-but-uncaptured* order that the current flow can't recover. Add a PayPal **webhook**
  (`PAYMENT.CAPTURE.COMPLETED` / `CHECKOUT.ORDER.APPROVED`) or a daily reconciliation pass to close
  this. Not built yet — flagged for a follow-up. Until then, watch the PayPal dashboard for
  approved-but-uncaptured orders.

## 10. Post-deploy smoke test

```bash
B=https://<final-domain>
curl -s $B/api/health                      # {ok:true}
curl -s "$B/api/journeys" | head -c 120     # total>0
curl -s "$B/api/journeys/<id>" | head -c 120 # ok:true, days+fares
curl -s $B/api/ships  ;  curl -s $B/api/ports
curl -s -X POST $B/api/contact -H 'content-type: application/json' \
  -d '{"name":"t","email":"t@t.com","message":"hi"}'   # {ok:true}
# then walk the booking wizard in the browser → PayPal buttons render → approve → capture → email.
```
