#!/usr/bin/env bash
# Rendert Turnaround + Gesichts-Nahaufnahme für alle Stilrichtungen nach out/character/
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out/character
EXTRA=()
[ -x /opt/pw-browsers/chromium ] && EXTRA+=(--browser-executable=/opt/pw-browsers/chromium)
for id in stopmotion-knete soft-3d-teen cartoon-linie lowpoly-flat; do
  for kind in Turnaround Face; do
    npx remotion still "$kind-$id" "out/character/${kind,,}-$id.png" "${EXTRA[@]}" --log=error
  done
done
