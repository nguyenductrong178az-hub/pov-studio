#!/usr/bin/env bash
# Midnight 1080p, render theo từng đoạn 300 khung (làm tiếp được nếu phiên bị ngắt): out/nextdoor/chunks/
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=out/nextdoor; CH=$OUT/chunks; mkdir -p "$CH"
EXTRA=(); [ -x /opt/pw-browsers/chromium ] && EXTRA+=(--browser-executable=/opt/pw-browsers/chromium)
FPS=30; NAME=nextdoor-01
python3 -I scripts/plan_tool.py locations/maple-court-4b >/dev/null; python3 -I scripts/plan_tool.py locations/maple-court-flur4 >/dev/null
python3 -I scripts/nextdoor_timing.py; python3 -I scripts/nextdoor_assets.py
TOTAL=$(python3 -I -c "import json,math;print(math.ceil(json.load(open('scenes/nextdoor-01/timeline.json'))['duration_s']*30))")
STEP=300; : > "$CH/list.txt"; i=0
for ((a=0; a<TOTAL; a+=STEP)); do
  # RANGE="lo-hi" (đếm từ 0): chỉ render các đoạn trong khoảng, rồi dừng trước bước ghép
  if [ -n "${RANGE:-}" ] && { [ $i -lt ${RANGE%-*} ] || [ $i -gt ${RANGE#*-} ]; }; then i=$((i+1)); continue; fi
  b=$((a+STEP-1)); [ $b -ge $TOTAL ] && b=$((TOTAL-1))
  f=$(printf "%s/c%02d.mp4" "$CH" $i)
  [ -s "$f" ] || { npx remotion render Nextdoor-Raw "$f.part.mp4" --frames="$a-$b" --scale=1 --crf=14 --concurrency=1 --log=error "${EXTRA[@]}" && mv "$f.part.mp4" "$f"; }
  echo "file '$(realpath "$f")'" >> "$CH/list.txt"; i=$((i+1)); echo "chunk $i done"
done
[ -n "${RANGE:-}" ] && { echo "xong cụm $RANGE, dừng (không ghép)"; exit 0; }
ffmpeg -v error -y -f concat -safe 0 -i "$CH/list.txt" -c copy "$OUT/raw-$NAME.mp4"
ffmpeg -v error -y -i "$OUT/raw-$NAME.mp4" -i "$OUT/mix.wav" \
  -vf "setpts=PTS-STARTPTS,v360=input=flat:ih_fov=130:iv_fov=100.6:output=fisheye:h_fov=115:v_fov=64.7:w=1920:h=1080:interp=lanczos,ass=$OUT/subs.ass,setpts=PTS-STARTPTS" \
  -r "$FPS" -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest "$OUT/$NAME.mp4"
echo "→ $OUT/$NAME.mp4"
