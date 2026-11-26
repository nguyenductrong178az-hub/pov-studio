#!/usr/bin/env python3
"""Tàu đêm 01: phụ đề + thẻ kết (ASS) và hiệu ứng âm thanh tự tạo bằng code (WAV).

Đầu vào: scenes/nachtzug-01/timeline.json (thoại, độ dài audio thật) + scenes/nachtzug-01/sfx.json
         (thời điểm hiệu ứng, do scripts/nachtzug_timing.py tạo – cảnh hình dùng đúng các thời điểm này).
Quy tắc âm thanh (CLAUDE.md):
  - mọi âm thanh đều có nguồn NHÌN THẤY trong khung: tay Caleb đập kính, bộ đàm của Dana, điện thoại Doyle trên bàn,
    Caleb lao vào ô kính cạnh TÔI, bước chân của chính TÔI (máy quay đi).
  - không có lớp âm nền (không gió, không tiếng ù, không tiếng xì xào: hành khách khác không xuất hiện), không nhạc, không tiếng boom.
  - hiệu ứng chỉ nằm giữa các câu thoại (kiểm tra trong nachtzug_timing.py và kiểm tra lại ở đây trên dạng sóng thật).
  - đúng ≥1 giây im lặng tuyệt đối trước cú va chạm lớn.
  - bước chân khớp mặt sàn toa: thảm cao su trên sàn thép → tiếng gót trầm, tiếng cao su miết, cộng hưởng kim loại ngắn và đục;
    chân trái/phải hơi khác nhau.
  - phụ đề nhỏ (34 px), hiện đúng lúc bắt đầu nói, tắt 0,12 giây sau khi nói xong.
Đầu ra: out/nachtzug/subs.ass, out/nachtzug/sfx.wav, out/nachtzug/mix.wav
"""
import json
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
tl = json.loads((ROOT / "scenes/nachtzug-01/timeline.json").read_text(encoding="utf-8"))
ev = json.loads((ROOT / "scenes/nachtzug-01/sfx.json").read_text(encoding="utf-8"))
out = ROOT / "out/nachtzug"
out.mkdir(parents=True, exist_ok=True)
D = tl["duration_s"]
END0, END1 = tl["events"]["endcard"]

# ------------------------------------------------------------------ ASS ----
NAMES = {"STRANGER": "Stranger", "LEXI": "Lexi", "DANA": "Dana", "DOYLE": "Doyle", "ME": "Me"}
COLORS = {"STRANGER": "#ef6a1f", "LEXI": "#ff7ab0", "DANA": "#e58fa5", "DOYLE": "#d9a25a", "ME": "#9fd27a"}


def ass_time(t):
    t = max(0.0, t)
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


def ass_color(h):
    return f"&H{h[5:7]}{h[3:5]}{h[1:3]}&".upper()


ass = ["[Script Info]", "ScriptType: v4.00+", "PlayResX: 1920", "PlayResY: 1080", "WrapStyle: 0", "ScaledBorderAndShadow: yes", "",
       "[V4+ Styles]",
       "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
       # small subtitles: 34 px, thin outline, low in frame
       "Style: Line,DejaVu Sans,34,&H00FFFFFF,&H00FFFFFF,&H00141414,&H80000000,-1,0,0,0,100,100,0,0,1,2.2,1,2,260,260,62,1",
       "Style: Card,DejaVu Sans,88,&H00FFFFFF,&H00FFFFFF,&H00141414,&H96000000,-1,0,0,0,100,100,0,0,3,16,0,8,120,120,170,1",
       "Style: Opt,DejaVu Sans,46,&H00FFFFFF,&H00FFFFFF,&H00141414,&H96000000,-1,0,0,0,100,100,0,0,3,12,0,8,120,120,0,1",
       "Style: Next,DejaVu Sans,36,&H0057B3FF,&H00FFFFFF,&H00141414,&H96000000,-1,0,0,0,100,100,0,0,3,9,0,2,120,120,100,1",
       "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
lines = tl["lines"]
for i, l in enumerate(lines):
    n, c = NAMES[l["speaker"]], ass_color(COLORS[l["speaker"]])
    # in sync with the voice: appears when the speech starts, leaves 0.12 s after it ends (never overlaps the next line)
    end = l["end"] + 0.12
    if i + 1 < len(lines):
        end = min(end, lines[i + 1]["start"] - 0.02)
    ass.append(f"Dialogue: 0,{ass_time(l['start'])},{ass_time(end)},Line,{n},0,0,0,,{{\\c{c}\\fs28}}{n}{{\\c&HFFFFFF&\\fs34}}  {l['text']}")
ass += [
    f"Dialogue: 1,{ass_time(END0)},{ass_time(END1)},Card,,0,0,0,,{{\\fad(400,0)}}What would you do?",
    f"Dialogue: 1,{ass_time(END0 + 0.8)},{ass_time(END1)},Opt,,0,0,350,,{{\\fad(300,0)}}{{\\c&H57B3FF&}}A{{\\c&HFFFFFF&}}  Open the door – save Caleb. But the gang sees everything.",
    f"Dialogue: 1,{ass_time(END0 + 1.6)},{ass_time(END1)},Opt,,0,0,450,,{{\\fad(300,0)}}{{\\c&H57B3FF&}}B{{\\c&HFFFFFF&}}  Keep it shut – you're safe. But Caleb freezes.",
    f"Dialogue: 1,{ass_time(END0 + 3.0)},{ass_time(END1)},Next,,0,0,0,,{{\\fad(300,0)}}Part 2: Who's in the chat?",
]
(out / "subs.ass").write_text("\n".join(ass) + "\n", encoding="utf-8")

# ------------------------------------------------------------------ SFX ----
SR = 48000
N = int(SR * D) + SR
L_ = np.zeros(N, np.float32)
R_ = np.zeros(N, np.float32)
rng = np.random.default_rng(47)
placed = []  # (kind, t0, t1) for the overlap check


def add(kind, t0, x, gain=1.0, pan=0.0):
    i0 = int(round(t0 * SR))
    x = np.asarray(x, np.float32) * gain
    n = min(len(x), N - i0)
    L_[i0:i0 + n] += x[:n] * (1 - max(0.0, pan))
    R_[i0:i0 + n] += x[:n] * (1 + min(0.0, pan))
    nz = np.nonzero(np.abs(x) > 1e-3)[0]
    placed.append((kind, t0, t0 + (nz[-1] + 1) / SR if len(nz) else t0))


def tt(sec):
    return np.arange(int(sec * SR)) / SR


def bandnoise(n, lo, hi):
    """white noise band-passed by FFT mask"""
    x = rng.standard_normal(n)
    f = np.fft.rfft(x)
    fr = np.fft.rfftfreq(n, 1 / SR)
    f[(fr < lo) | (fr > hi)] = 0
    y = np.fft.irfft(f, n)
    return y / (np.abs(y).max() + 1e-9)


def fade_out(x, sec=0.03):
    k = min(len(x), int(sec * SR))
    x[-k:] *= np.linspace(1, 0, k)
    return x


def knock_glass(g):
    t = tt(0.22)
    body = 0.9 * np.sin(2 * np.pi * 95 * t) * np.exp(-t * 28)                       # knuckles/palm on the pane
    crack = 0.35 * bandnoise(len(t), 800, 5000) * np.exp(-t * 90)
    pane = 0.22 * (np.sin(2 * np.pi * 1650 * t) + 0.6 * np.sin(2 * np.pi * 2380 * t)) * np.exp(-t * 55)  # glass ring
    return fade_out(g * (body + crack + pane))


def radio_squelch():
    t = tt(0.42)
    click = np.zeros_like(t); click[:120] = np.hanning(240)[:120] * 0.8
    hiss = 0.32 * bandnoise(len(t), 900, 3800) * np.minimum(1, t / 0.01) * np.exp(-((t - 0.12) / 0.2) ** 2)
    chirp = 0.18 * np.sin(2 * np.pi * (1200 + 600 * t) * t) * ((t > 0.3) & (t < 0.38))
    return fade_out(click + hiss + chirp)


def phone_buzz():
    t = tt(0.75)
    gate = (((t > 0.0) & (t < 0.3)) | ((t > 0.42) & (t < 0.72))).astype(float)
    gate = np.convolve(gate, np.ones(240) / 240, "same")
    motor = 0.5 * np.sin(2 * np.pi * 172 * t) + 0.25 * np.sign(np.sin(2 * np.pi * 172 * t)) * 0.4
    rattle = 0.18 * bandnoise(len(t), 300, 1400) * (0.5 + 0.5 * np.sin(2 * np.pi * 43 * t))  # phone on the table top
    return fade_out(gate * (motor + rattle))


def impact_door():
    t = tt(0.78)
    thump = 1.0 * (np.sin(2 * np.pi * 52 * t) + 0.6 * np.sin(2 * np.pi * 104 * t)) * np.exp(-t * 7)
    hit = 0.8 * bandnoise(len(t), 150, 6000) * np.exp(-t * 35)
    steel = sum(a * np.sin(2 * np.pi * f * t) for a, f in ((0.30, 311), (0.22, 523), (0.16, 877), (0.10, 1240))) * np.exp(-t * 5.5)
    glass = 0.18 * bandnoise(len(t), 2500, 7000) * np.exp(-t * 14) * (1 + np.sin(2 * np.pi * 28 * t)) / 2
    return fade_out(thump + hit + steel + glass, 0.08)


def footstep(foot, g):
    """rubber floor mat over a steel deck: heel thud + rubber scuff + short dull metal resonance"""
    t = tt(0.28)
    v = 1.0 if foot == "L" else 0.93
    heel = 0.75 * np.sin(2 * np.pi * 88 * v * t) * np.exp(-t * 32)
    scuff = 0.22 * bandnoise(len(t), 400, 2600) * np.exp(-((t - 0.035) / 0.03) ** 2)
    deck = 0.12 * (np.sin(2 * np.pi * 410 * v * t) + 0.5 * np.sin(2 * np.pi * 690 * v * t)) * np.exp(-t * 26)
    toe = 0.35 * np.sin(2 * np.pi * 120 * v * t) * np.exp(-np.clip(t - 0.09, 0, None) * 40) * (t > 0.09)
    return fade_out(g * (heel + scuff + deck + toe))


for k in ev["knocks"]:
    add("knock", k["t"], knock_glass(k["gain"]), 0.9, pan=-0.12)
add("radio", ev["radio"], radio_squelch(), 0.55, pan=-0.35)   # Dana stands left at the door
add("buzz", ev["buzz"], phone_buzz(), 0.5, pan=-0.1)          # table in front, slightly left
add("impact", ev["impact"], impact_door(), 1.0, pan=-0.2)
for s in ev["steps"]:
    add("step", s["t"], footstep(s["foot"], s["gain"]), 0.6, pan=-0.12 if s["foot"] == "L" else 0.12)

# check again on the real waveforms: no effect under a line, silence before the impact
bad = [f"{k} {a:.2f}-{b:.2f}s under line {l['id']}" for k, a, b in placed for l in tl["lines"]
       if a < l["end"] + 0.02 and b > l["start"] - 0.02]
s0, s1 = ev["silence_before_impact"]
if any(a < s1 - 1e-3 and b > s0 for k, a, b in placed if k != "impact"):
    bad.append("effect inside the silence before the impact")
if bad:
    raise SystemExit("SFX check failed:\n  " + "\n  ".join(bad))

peak = max(np.abs(L_).max(), np.abs(R_).max(), 1e-9)
sfx = np.stack([L_, R_], 1)[: int(SR * D)] * (0.9 / peak)


def write_wav(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-", str(path)],
                   input=pcm.tobytes(), check=True)


write_wav(out / "sfx.wav", sfx)

# ------------------------------------------------------------------ mix ----
dialog = ROOT / "out/audio/nachtzug-01/dialog_mix.wav"
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(dialog), "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"],
                     capture_output=True, check=True).stdout
dia = np.frombuffer(raw, "<f4").reshape(-1, 2).copy()
n = int(SR * D)
dia = np.pad(dia, ((0, max(0, n - len(dia))), (0, 0)))[:n]
mix = dia + sfx * 0.6
# digital silence before the impact (also kills breath tails of the previous line)
a, b = int(s0 * SR) + 1, int(s1 * SR) - 1
ramp = int(0.02 * SR)
mix[a - ramp:a] *= np.linspace(1, 0, ramp)[:, None]
mix[a:b] = 0
pk = np.abs(mix).max()
if pk > 0.95:
    mix *= 0.95 / pk
write_wav(out / "mix.wav", mix)
print(f"→ {out / 'subs.ass'} · sfx.wav · mix.wav ({D:.1f} s) · {len(placed)} effects, all between lines; "
      f"silence {s0:.2f}–{s1:.2f} s before impact")
