#!/usr/bin/env bash
# Resize + convert the port photo library to WebP.
#
#   bash scripts/optimise-images.sh            # convert public/photos/ports
#   DRY=1 bash scripts/optimise-images.sh      # report only, change nothing
#   DIR=public/photos/x bash scripts/optimise-images.sh
#
# Why: these render on every journey card at roughly 600px wide, but shipped as
# full-size JPGs averaging 430KB (a few over 2MB), so one screen of the listing
# pulled ~2.9MB. Resizing to 1200px and encoding WebP at q82 cuts that by about
# 85% with no visible difference at card or hero size.
#
# The originals are moved to image-originals/ (repo root, NOT under public/ —
# Vite copies public/ verbatim into dist/ with no exclude mechanism, so a
# gitignored folder inside public/ still ships to production) rather than
# deleted, so a re-encode at different settings is always possible.
#
# Requires cwebp (brew install webp) and sips (macOS built-in).

set -euo pipefail
cd "$(dirname "$0")/.."

DIR="${DIR:-public/photos/ports}"
MAXW="${MAXW:-1200}"
QUALITY="${QUALITY:-82}"
ORIG_DIR="image-originals/$(basename "$DIR")"

command -v cwebp >/dev/null || { echo "cwebp not found — brew install webp"; exit 1; }

[ "${DRY:-0}" = "1" ] || mkdir -p "$ORIG_DIR"

before=0; after=0; n=0; skipped=0

while IFS= read -r -d '' src; do
  base="$(basename "$src")"
  stem="${base%.*}"
  out="$DIR/$stem.webp"

  # Already converted in a previous run.
  if [ -f "$out" ] && [ "$src" != "$out" ]; then skipped=$((skipped+1)); continue; fi
  [ "${src##*.}" = "webp" ] && { skipped=$((skipped+1)); continue; }

  sz_before=$(stat -f%z "$src")
  before=$((before + sz_before))

  if [ "${DRY:-0}" = "1" ]; then
    n=$((n+1)); continue
  fi

  tmp="$(mktemp -t exp-img).${src##*.}"
  cp "$src" "$tmp"
  # Cap the LONGER edge, not just width: a portrait source (e.g. 1280x1920)
  # capped only on width stays 1200x1800 — nearly as many pixels as the
  # original, and the file size barely drops. -Z caps whichever dimension is
  # larger, so both orientations end up around the same pixel budget. Only
  # ever shrinks, never upscales a photo already smaller than MAXW.
  w=$(sips -g pixelWidth "$tmp" 2>/dev/null | awk '/pixelWidth/{print $2}')
  h=$(sips -g pixelHeight "$tmp" 2>/dev/null | awk '/pixelHeight/{print $2}')
  if [ -n "$w" ] && [ -n "$h" ] && { [ "$w" -gt "$MAXW" ] || [ "$h" -gt "$MAXW" ]; }; then
    sips -Z "$MAXW" "$tmp" >/dev/null 2>&1
  fi
  cwebp -quiet -q "$QUALITY" -m 6 "$tmp" -o "$out" 2>/dev/null || { rm -f "$tmp"; echo "  ! failed: $base"; continue; }
  rm -f "$tmp"

  sz_after=$(stat -f%z "$out")
  after=$((after + sz_after))
  mv "$src" "$ORIG_DIR/$base"
  n=$((n+1))
done < <(find "$DIR" -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) -print0)

echo
if [ "${DRY:-0}" = "1" ]; then
  printf "DRY RUN — %d images, %.1f MB would be processed\n" "$n" "$(echo "$before/1048576" | bc -l)"
else
  printf "converted %d images (skipped %d)\n" "$n" "$skipped"
  printf "  before: %.1f MB\n" "$(echo "$before/1048576" | bc -l)"
  printf "  after:  %.1f MB\n" "$(echo "$after/1048576" | bc -l)"
  [ "$before" -gt 0 ] && printf "  saved:  %.0f%%\n" "$(echo "100-($after*100/$before)" | bc -l)"
  echo "  originals moved to $ORIG_DIR (gitignored, not deployed)"
fi
