#!/usr/bin/env bash
# Baut die Szene: Raw-Render (4K, Weitwinkel) → 0.5x-Fisheye → Untertitel → Ton
#   bash scripts/build-klassenzimmer.sh          → ganze Szene  → out/klassenzimmer/klassenzimmer.mp4
#   SECONDS_ONLY=3 bash scripts/build-klassenzimmer.sh → nur die ersten 3 s → out/klassenzimmer/test-3s.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=out/klassenzimmer; mkdir -p "$OUT"
EXTRA=(); [ -x /opt/pw-browsers/chromium ] && EXTRA+=(--browser-executable=/opt/pw-browsers/chromium)
FPS=$(python3 -I -c "import json;print(json.load(open('scenes/klassenzimmer/timeline.json'))['fps'])")
NAME=klassenzimmer; FRAMES=()
if [ -n "${SECONDS_ONLY:-}" ]; then NAME="test-${SECONDS_ONLY}s"; FRAMES=(--frames="0-$((SECONDS_ONLY*FPS-1))"); fi
python3 -I scripts/plan_tool.py locations/klassenzimmer >/dev/null   # Plan muss kollisionsfrei sein
python3 -I scripts/klassenzimmer_assets.py
npx remotion render Klassenzimmer-Raw "$OUT/raw-$NAME.mp4" --scale=2 --crf=14 --concurrency=1 "${FRAMES[@]}" "${EXTRA[@]}"
ffmpeg -v error -y -i "$OUT/raw-$NAME.mp4" -i "$OUT/sfx.wav" \
  -vf "v360=input=flat:ih_fov=130:iv_fov=100.6:output=fisheye:h_fov=115:v_fov=64.7:w=1920:h=1080:interp=lanczos,ass=$OUT/subs.ass" \
  -r "$FPS" -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest "$OUT/$NAME.mp4"
echo "→ $OUT/$NAME.mp4"
