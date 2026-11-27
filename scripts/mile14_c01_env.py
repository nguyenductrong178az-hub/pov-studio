#!/usr/bin/env python3
"""Mile 14 C06–C07: đường bao âm lượng của giọng MARI (30 khung/giây, để miệng khớp tiếng) + nhịp gõ phím của Mari.
Ghi src/scenes/mile14/officeEnv.ts — hình (Office.tsx) và tiếng (mile14_c01_assets.py) dùng chung danh sách nhịp gõ."""
import os, re, subprocess
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
VOICE = Path(os.environ.get("VOICE_DIR8", "/mnt/project-files/mile14/audio/c05-c08"))
SR = 16000


def env30(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, "<f4")
    n = int(len(x) / SR * 30) + 1
    e = np.array([np.sqrt(np.mean(x[int(i / 30 * SR):int((i + 1) / 30 * SR)] ** 2) + 1e-12) for i in range(n)])
    e = e / (np.percentile(e, 95) + 1e-9)
    return [round(float(min(1.0, v)), 2) for v in e]


# nhịp gõ: 11,0 → 17,7 s, ~6 nhịp/giây có nghỉ, (thời điểm, tay 0/1, ngón 0–3)
rng = np.random.default_rng(6)
taps, t = [], 11.0
while t < 17.7:
    burst = int(rng.integers(3, 9))
    for _ in range(burst):
        taps.append((round(t, 3), int(rng.integers(0, 2)), int(rng.integers(0, 4))))
        t += float(rng.uniform(0.09, 0.2))
    t += float(rng.uniform(0.15, 0.5))
lines = ["// Tự sinh bởi scripts/mile14_c01_env.py — đừng sửa tay.", "export const MARI_ENV: Record<string, number[]> = {"]
for k in ("C06", "C07"):
    f = sorted(VOICE.glob(f"{k}.*"))[0]
    lines.append(f'  {k}: {env30(f)},')
lines.append("};")
lines.append("export const MARI_TAPS: [number, number, number][] = " + str([list(x) for x in taps]).replace("[[", "[[").replace(" ", "") + ";")
(ROOT / "src/scenes/mile14/officeEnv.ts").write_text("\n".join(lines) + "\n")
print("taps", len(taps))
