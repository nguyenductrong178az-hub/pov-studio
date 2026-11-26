#!/usr/bin/env bash
# Rendert Juno: 4 Stile × 4 Ansichten in 3840×2160 (scale 2) + Übersichtsblätter
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=out/juno
mkdir -p "$OUT"
EXTRA=()
[ -x /opt/pw-browsers/chromium ] && EXTRA+=(--browser-executable=/opt/pw-browsers/chromium)
STYLES=(knete-puppe soft-3d illustration-cel neon-facette)
VIEWS=(frontal dreiviertel seitlich gesicht)
for s in "${STYLES[@]}"; do
  for v in "${VIEWS[@]}"; do
    npx remotion still "Juno-$s-$v" "$OUT/juno-$s-$v.png" --scale=2 "${EXTRA[@]}" --log=error
  done
  ffmpeg -v error -y -i "$OUT/juno-$s-frontal.png" -i "$OUT/juno-$s-dreiviertel.png" -i "$OUT/juno-$s-seitlich.png" -i "$OUT/juno-$s-gesicht.png" \
    -filter_complex "xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0,scale=3840:-1" "$OUT/blatt-$s.png"
done
ffmpeg -v error -y -i "$OUT/blatt-knete-puppe.png" -i "$OUT/blatt-soft-3d.png" -i "$OUT/blatt-illustration-cel.png" -i "$OUT/blatt-neon-facette.png" \
  -filter_complex "xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0,scale=3840:-1" "$OUT/uebersicht-alle-stile.png"
