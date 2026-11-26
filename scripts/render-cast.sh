#!/usr/bin/env bash
# Rendert für jede Cast-Figur Turnaround (frontal, 3/4, seitlich) + Nahaufnahme in Stil B, 3840×2160
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=out/cast
mkdir -p "$OUT"
EXTRA=()
[ -x /opt/pw-browsers/chromium ] && EXTRA+=(--browser-executable=/opt/pw-browsers/chromium)
FIGS=("$@")
[ ${#FIGS[@]} -eq 0 ] && FIGS=(weber carol rafa leo bia thiago)
for f in "${FIGS[@]}"; do
  for v in frontal dreiviertel seitlich gesicht; do
    npx remotion still "Cast-$f-$v" "$OUT/$f-$v.png" --scale=2 "${EXTRA[@]}" --log=error
  done
  ffmpeg -v error -y -i "$OUT/$f-frontal.png" -i "$OUT/$f-dreiviertel.png" -i "$OUT/$f-seitlich.png" -i "$OUT/$f-gesicht.png" \
    -filter_complex "xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0,scale=3840:-1" "$OUT/blatt-$f.png"
done
npx remotion still Cast-Lineup "$OUT/lineup.png" --scale=2 "${EXTRA[@]}" --log=error
