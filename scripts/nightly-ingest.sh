#!/usr/bin/env bash
# Nightly Explora flatfile ingest.
#
# Run automatically by the launchd agent `com.explora.nightly-ingest` at 00:00
# (Athens), and runnable by hand any time:  bash scripts/nightly-ingest.sh
#
# launchd does NOT inherit your shell PATH, so we set it explicitly and cd into
# the project before invoking npm. Output is appended (with timestamps) to
# logs/nightly-ingest.log. `npm run ingest` loads .env.local itself.
#
# ⚠️  ONE-TIME macOS SETUP (required, because this project lives under ~/Desktop):
#   macOS privacy (TCC) blocks background/launchd jobs from the Desktop, Documents
#   and Downloads folders. Without this grant the launchd run fails with
#   "Operation not permitted" (exit 126). Fix once:
#     System Settings → Privacy & Security → Full Disk Access → "+" →
#     press ⌘⇧G, type /bin/bash , add it, and toggle it ON.
#   Then test:  launchctl kickstart -k gui/$(id -u)/com.explora.nightly-ingest
#   (Running this script from a Terminal works without the grant — Terminal already
#   has Desktop access; only the unattended launchd run needs it.)
set -uo pipefail

export PATH="/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
PROJECT="/Users/kostasanastasopoulos/Desktop/nonameproject/Explora"
cd "$PROJECT" || { echo "cannot cd to $PROJECT" >&2; exit 1; }

mkdir -p logs
LOG="$PROJECT/logs/nightly-ingest.log"
ts() { date "+%Y-%m-%d %H:%M:%S %Z"; }

{
  echo ""
  echo "════════════════ ingest start $(ts) ════════════════"
} >> "$LOG"

# Best-effort: make sure the local Postgres service is running (idempotent).
brew services start postgresql@16 >/dev/null 2>&1 || true

npm run ingest >> "$LOG" 2>&1
code=$?

echo "──────────────── ingest end $(ts) — exit $code ────────────────" >> "$LOG"

# Post-ingest watchdog: row counts vs last run, date-range sanity, and the
# exit code we just logged above. Appends its report to the same log and
# emails (Resend) on FAILURE only. Never blocks the nightly exit — `|| true`.
node scripts/ingest-watchdog.mjs --log "$LOG" >> "$LOG" 2>&1 || true

exit $code
