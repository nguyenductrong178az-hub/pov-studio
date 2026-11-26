#!/usr/bin/env bash
# Prüfbilder der Nextdoor-Szene (Raw 130° → 0.5x-Fisheye 1920×1080) + Kontaktbogen
#   SCALE=1 bash scripts/nextdoor-probe.sh 0 8 30 ...   → out/nextdoor/probe/
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=out/nextdoor/probe; mkdir -p "$OUT"
EXTRA=(--scale="${SCALE:-1}" --log=error); [ -x /opt/pw-browsers/chromium ] && EXTRA+=(--browser-executable=/opt/pw-browsers/chromium)
TIMES=("$@"); [ ${#TIMES[@]} -eq 0 ] && TIMES=(0.3 8 22 33 38 46 64 70 85.6 90)
LIST=()
for t in "${TIMES[@]}"; do
  f=$(printf "%05.1f" "$t")
  npx remotion still Nextdoor-Probe "$OUT/raw-$f.png" --props="{\"at\":$t}" "${EXTRA[@]}"
  ffmpeg -v error -y -i "$OUT/raw-$f.png" -vf "scale=1920:1080,v360=input=flat:ih_fov=130:iv_fov=100.6:output=fisheye:h_fov=115:v_fov=64.7:w=1920:h=1080:interp=lanczos,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${t} s':x=30:y=30:fontsize=44:fontcolor=white:box=1:boxcolor=black@0.5" "$OUT/t$f.png"
  rm "$OUT/raw-$f.png"; LIST+=("$OUT/t$f.png")
done
python3 -I - "${LIST[@]}" <<'PY'
import sys
from PIL import Image
fs=sys.argv[1:]; cols=2; w,h=960,540
rows=(len(fs)+cols-1)//cols; s=Image.new("RGB",(cols*w,rows*h),"#111")
for i,f in enumerate(fs): s.paste(Image.open(f).resize((w,h)),((i%cols)*w,(i//cols)*h))
s.save("out/nextdoor/probe/kontakt.jpg",quality=88); print("→ out/nextdoor/probe/kontakt.jpg")
PY
