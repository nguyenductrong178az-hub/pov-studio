#!/usr/bin/env bash
# Prüfbilder der Nachtzug-Szene (4K-Raw → 0.5x-Fisheye 1920×1080) + Kontaktbogen
#   bash scripts/nachtzug-probe.sh 0 8 30 ...   → out/nachtzug/probe/
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=out/nachtzug/probe; mkdir -p "$OUT"
EXTRA=(--scale=2 --log=error); [ -x /opt/pw-browsers/chromium ] && EXTRA+=(--browser-executable=/opt/pw-browsers/chromium)
TIMES=("$@"); [ ${#TIMES[@]} -eq 0 ] && TIMES=(0 8 30 50.5 73 87 100 117 124 129)
LIST=()
for t in "${TIMES[@]}"; do
  f=$(printf "%05.1f" "$t")
  npx remotion still Nachtzug-Probe "$OUT/raw-$f.png" --props="{\"at\":$t}" "${EXTRA[@]}"
  ffmpeg -v error -y -i "$OUT/raw-$f.png" -vf "v360=input=flat:ih_fov=130:iv_fov=100.6:output=fisheye:h_fov=115:v_fov=64.7:w=1920:h=1080:interp=lanczos,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${t} s':x=30:y=30:fontsize=44:fontcolor=white:box=1:boxcolor=black@0.5" "$OUT/t$f.png"
  rm "$OUT/raw-$f.png"; LIST+=("$OUT/t$f.png")
done
python3 - "${LIST[@]}" <<'PY'
import sys
from PIL import Image
fs=sys.argv[1:]; cols=2; w,h=960,540
rows=(len(fs)+cols-1)//cols; s=Image.new("RGB",(cols*w,rows*h),"#111")
for i,f in enumerate(fs): s.paste(Image.open(f).resize((w,h)),((i%cols)*w,(i//cols)*h))
s.save("out/nachtzug/probe/kontakt.jpg",quality=88); print("→ out/nachtzug/probe/kontakt.jpg")
PY
