#!/usr/bin/env bash
# Rendert Ren: 4 Stile × 4 Ansichten in 3840×2160 (scale 2) + Übersichtsblätter
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=out/ren
mkdir -p "$OUT"
EXTRA=()
[ -x /opt/pw-browsers/chromium ] && EXTRA+=(--browser-executable=/opt/pw-browsers/chromium)
STYLES=(clean-cel facet-flat soft-glow ink-contrast)
VIEWS=(frontal dreiviertel seitlich gesicht)
for s in "${STYLES[@]}"; do
  for v in "${VIEWS[@]}"; do
    npx remotion still "Ren-$s-$v" "$OUT/ren-$s-$v.png" --scale=2 "${EXTRA[@]}" --log=error
  done
  ffmpeg -v error -y -i "$OUT/ren-$s-frontal.png" -i "$OUT/ren-$s-dreiviertel.png" -i "$OUT/ren-$s-seitlich.png" -i "$OUT/ren-$s-gesicht.png" \
    -filter_complex "xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0,scale=3840:-1" "$OUT/blatt-$s.png"
done
ffmpeg -v error -y -i "$OUT/blatt-clean-cel.png" -i "$OUT/blatt-facet-flat.png" -i "$OUT/blatt-soft-glow.png" -i "$OUT/blatt-ink-contrast.png" \
  -filter_complex "xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0,scale=3840:-1" "$OUT/uebersicht-alle-stile.png"
