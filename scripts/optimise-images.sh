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
# The originals are moved to public/photos/_originals (gitignored, never
# deployed) rather than deleted, so a re-encode at different settings is always
# possible. src/lib/portImages.ts resolves .webp first, then the original
# extension, so the site keeps working mid-migration.
#
# Requires cwebp (brew install webp) and sips (macOS built-in).

set -euo pipefail
cd "$(dirname "$0")/.."

DIR="${DIR:-public/photos/ports}"
MAXW="${MAXW:-1200}"
QUALITY="${QUALITY:-82}"
ORIG_DIR="public/photos/_originals/$(basename "$DIR")"

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
  # Only shrink: never upscale a photo that is already narrower than MAXW.
  w=$(sips -g pixelWidth "$tmp" 2>/dev/null | awk '/pixelWidth/{print $2}')
  if [ -n "$w" ] && [ "$w" -gt "$MAXW" ]; then
    sips --resampleWidth "$MAXW" "$tmp" >/dev/null 2>&1
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
