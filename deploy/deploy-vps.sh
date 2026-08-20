#!/usr/bin/env bash
# Build-local + rsync deploy to the corfuwebsites VPS (host alias: cruise2greece-dev).
#
#   bash deploy/deploy-vps.sh            # build, smoke-gate, upload, restart
#   SKIP_SMOKE=1 bash deploy/deploy-vps.sh   # skip the smoke gate (not for go-live)
#
# Why build-local: dist/ and api/**/*.js are gitignored, so a git pull on the
# host ships nothing runnable. VITE_* vars (PayPal public client id, Cloudinary)
# are baked into dist/ at THIS build — export them before running.
#
# First-time host setup (run once, as root on the VPS):
#   useradd --system --home /opt/explora --shell /usr/sbin/nologin explora || true
#   mkdir -p /opt/explora/uploads && chown -R explora:explora /opt/explora
#   cp deploy/explora.service /etc/systemd/system/ && systemctl daemon-reload
#   cp deploy/nginx-explora.conf /etc/nginx/sites-available/explora.corfuwebsites.com
#   ln -s ../sites-available/explora.corfuwebsites.com /etc/nginx/sites-enabled/
#   nginx -t && systemctl reload nginx
#   certbot --nginx -d explora.corfuwebsites.com
#   # write /opt/explora/.env (chmod 600, owner explora) — see .env.example
#   systemctl enable --now explora
#
# Nightly ingest (crontab -e on the VPS; server TZ is UTC so pin Athens time):
#   CRON_TZ=Europe/Athens
#   0 0 * * * curl -fsS --max-time 280 -H "Host: explora.corfuwebsites.com" -H "Authorization: Bearer $CRON_SECRET" "http://127.0.0.1:8092/api/cron/ingest-flatfiles?force=1" >/dev/null

set -euo pipefail
cd "$(dirname "$0")/.."

HOST_ALIAS="${DEPLOY_HOST:-cruise2greece-dev}"
APP_DIR="/opt/explora"

echo "── Building (SPA + server handlers)…"
npm run build:deploy

if [ "${SKIP_SMOKE:-0}" != "1" ]; then
  echo "── Smoke gate (local/staging DATABASE_URL — NEVER the prod URL: it seeds smoke admins)…"
  npm run smoke
fi

echo "── Uploading to ${HOST_ALIAS}:${APP_DIR}…"
# --exclude uploads/ is MANDATORY: it is the only persistent disk state
# (client-uploaded images) and --delete would wipe it on every deploy.
# public/ is also excluded: Vite copies it into dist/ at build time and the
# server only serves dist/, so uploading it would double the ~300 MB photo set.
# *.map is excluded deliberately: sourcemaps embed the full original TypeScript
# (including the admin console), so they must never be reachable in public.
# vite.config.ts uses sourcemap:'hidden', so nothing references them anyway.
rsync -avz --delete \
  --exclude='.env' --exclude='.env.local' --exclude='.env.example' \
  --exclude='*.map' --exclude='.claude' \
  --exclude='.git' --exclude='node_modules' --exclude='uploads/' \
  --exclude='Photos/' --exclude='public/' \
  --exclude='scripts/.watchdog-last.json' \
  --exclude='lib/explora-flatfile/probe-output.json' \
  ./ "${HOST_ALIAS}:${APP_DIR}/"

echo "── Installing runtime deps + restarting…"
ssh "$HOST_ALIAS" "cd ${APP_DIR} \
  && npm ci --omit=dev --no-audit --no-fund \
  && chown -R explora:explora ${APP_DIR} \
  && systemctl restart explora \
  && sleep 2 && systemctl --no-pager -l status explora | head -8"

echo "── Post-deploy smoke…"
ssh "$HOST_ALIAS" "curl -fsS -H 'Host: explora.corfuwebsites.com' http://127.0.0.1:8092/api/health"
echo
echo "✅ Deployed. Verify in a browser: https://explora.corfuwebsites.com"
