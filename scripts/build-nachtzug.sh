#!/usr/bin/env bash
# Night Train 01 (English): Raw-Render (4K, 130°) → 0.5x-Fisheye → Untertitel/Endkarte → Ton
#   bash scripts/build-nachtzug.sh                 → out/nachtzug/nachtzug-01.mp4
#   SCALE=1.5 bash scripts/build-nachtzug.sh   → dựng ở 2880×1620 (nhanh hơn ~1,8×, giữa khung hơi mềm hơn)
#   SECONDS_ONLY=5 bash scripts/build-nachtzug.sh  → nur die ersten 5 s → out/nachtzug/test-5s.mp4
#   FROM=120 SECONDS_ONLY=14 bash …                → Ausschnitt ab 120 s
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=out/nachtzug; mkdir -p "$OUT"
EXTRA=(); [ -x /opt/pw-browsers/chromium ] && EXTRA+=(--browser-executable=/opt/pw-browsers/chromium)
FPS=$(python3 -I -c "import json;print(json.load(open('scenes/nachtzug-01/timeline.json'))['fps'])")
NAME=nachtzug-01; FRAMES=(); FROM=${FROM:-0}; SS=()
if [ -n "${SECONDS_ONLY:-}" ]; then
  NAME="test-${FROM}-${SECONDS_ONLY}s"; F0=$((FROM*FPS)); FRAMES=(--frames="$F0-$((F0+SECONDS_ONLY*FPS-1))"); SS=(-ss "$FROM" -t "$SECONDS_ONLY")
fi
python3 -I scripts/plan_tool.py locations/nachtzug-wagen2 >/dev/null   # Plan muss kollisionsfrei sein
python3 -I scripts/nachtzug_timing.py   # SFX + plan times from the timeline
python3 -I scripts/nachtzug_assets.py
npx remotion render Nachtzug-Raw "$OUT/raw-$NAME.mp4" --scale="${SCALE:-2}" --crf=14 --concurrency=1 "${FRAMES[@]}" "${EXTRA[@]}"
ffmpeg -v error -y -i "$OUT/raw-$NAME.mp4" "${SS[@]}" -i "$OUT/mix.wav" \
  -vf "setpts=PTS-STARTPTS+${FROM}/TB,v360=input=flat:ih_fov=130:iv_fov=100.6:output=fisheye:h_fov=115:v_fov=64.7:w=1920:h=1080:interp=lanczos,ass=$OUT/subs.ass,setpts=PTS-STARTPTS" \
  -r "$FPS" -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest "$OUT/$NAME.mp4"
echo "→ $OUT/$NAME.mp4"
