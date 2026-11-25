#!/usr/bin/env bash
# Stilprobe: je Richtung Ganzkörper, Nahaufnahme, Palette, POV-Probebild (Fisheye) + Tafel 2×2
#   bash scripts/render-stile.sh [id ...]      → out/stile/
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=out/stile
mkdir -p "$OUT"
EXTRA=(--concurrency=1 --log=error)
[ -x /opt/pw-browsers/chromium ] && EXTRA+=(--browser-executable=/opt/pw-browsers/chromium)
IDS=("$@")
[ ${#IDS[@]} -eq 0 ] && IDS=(puppen-noir knete-fenster vinyl-hell comic-linie)
for id in "${IDS[@]}"; do
  for v in figur gesicht palette pov; do
    npx remotion still "Stil-$id-$v" "$OUT/$id-$v-raw.png" --scale=2 "${EXTRA[@]}"
  done
  for v in figur gesicht palette; do
    ffmpeg -v error -y -i "$OUT/$id-$v-raw.png" -vf scale=1920:1080:flags=lanczos "$OUT/$id-$v.png"
  done
  # POV: 130°-Rohbild → 0.5x-Fisheye wie im Video
  ffmpeg -v error -y -i "$OUT/$id-pov-raw.png" \
    -vf "v360=input=flat:ih_fov=130:iv_fov=100.6:output=fisheye:h_fov=115:v_fov=64.7:w=1920:h=1080:interp=lanczos" "$OUT/$id-pov.png"
  rm -f "$OUT/$id"-*-raw.png
  ffmpeg -v error -y -i "$OUT/$id-figur.png" -i "$OUT/$id-gesicht.png" -i "$OUT/$id-palette.png" -i "$OUT/$id-pov.png" \
    -filter_complex "xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0" "$OUT/tafel-$id.png"
  echo "✓ $id"
done
