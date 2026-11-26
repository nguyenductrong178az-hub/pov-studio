#!/usr/bin/env python3
"""Erzeugt Untertitel (ASS) und Platzhalter-Ton (WAV) aus scenes/klassenzimmer/timeline.json."""
import json, math, struct, sys, wave, random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
tl = json.loads((ROOT / "scenes/klassenzimmer/timeline.json").read_text(encoding="utf-8"))
out = ROOT / "out/klassenzimmer"; out.mkdir(parents=True, exist_ok=True)

def ass_time(t):
    h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"

def ass_color(hexc):  # #rrggbb → &HBBGGRR&
    r, g, b = hexc[1:3], hexc[3:5], hexc[5:7]
    return f"&H{b}{g}{r}&".upper()

ass = ["[Script Info]", "ScriptType: v4.00+", "PlayResX: 1920", "PlayResY: 1080", "WrapStyle: 0", "",
       "[V4+ Styles]",
       "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
       "Style: Line,DejaVu Sans,58,&H00FFFFFF,&H00FFFFFF,&H00141414,&H64000000,-1,0,0,0,100,100,0,0,1,4,2,2,120,120,400,1",
       "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
for l in tl["lines"]:
    name = tl["speaker_name"][l["speaker"]]
    col = ass_color(tl["speaker_color"][l["speaker"]])
    ass.append(f"Dialogue: 0,{ass_time(l['start'])},{ass_time(l['end'])},Line,{name},0,0,0,,{{\\c{col}}}{name}:{{\\c&HFFFFFF&}} {l['text']}")
(out / "subs.ass").write_text("\n".join(ass) + "\n", encoding="utf-8")

# ---- Platzhalter-Ton (bis die ElevenLabs-Stimmen da sind) ----
SR, D = 48000, tl["duration_s"]
ev = tl["events"]
random.seed(7)
brown = 0.0
samples = []
for i in range(SR * D):
    t = i / SR
    w = random.uniform(-1, 1)
    brown = 0.985 * brown + 0.015 * w * 4
    v = 0.012 * w  # Raumton
    b0, b1 = ev["phoneBuzz"]
    if b0 <= t < b1 and (t % 0.6) < 0.35:  # Handy-Vibration
        v += 0.18 * (1 if math.sin(2 * math.pi * 165 * t) > 0 else -1) * 0.6
    if b0 <= t < b1:  # Warnton (zweitonig)
        f = 853 if (t % 0.5) < 0.25 else 960
        v += 0.06 * math.sin(2 * math.pi * f * t)
    for a, b in (ev["jet1"], ev["jet2"]):  # Triebwerksdröhnen, an- und abschwellend
        if a - 1 <= t <= b + 2:
            k = (t - (a - 1)) / ((b + 2) - (a - 1))
            v += 0.55 * brown * math.sin(math.pi * k) ** 2
    dt = t - ev["bang"]
    if 0 <= dt < 1.5:  # Knall
        v += 0.9 * math.exp(-dt * 5) * (0.7 * math.sin(2 * math.pi * 42 * dt) + 0.5 * w)
    samples.append(max(-1, min(1, v)))
with wave.open(str(out / "sfx.wav"), "wb") as wf:
    wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(SR)
    wf.writeframes(b"".join(struct.pack("<h", int(s * 32000)) for s in samples))
print("→ subs.ass, sfx.wav")
