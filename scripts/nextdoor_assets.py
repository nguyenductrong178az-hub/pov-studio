#!/usr/bin/env python3
"""The Neighbor Next Door 01 „Midnight": phụ đề + thẻ kết (ASS) và hiệu ứng âm thanh tự tạo bằng code (WAV).

Đầu vào: scenes/nextdoor-01/timeline.json (thoại, độ dài audio thật) + scenes/nextdoor-01/sfx.json
         (thời điểm hiệu ứng, do scripts/nextdoor_timing.py tạo – cảnh hình dùng đúng các thời điểm này).
Quy tắc âm thanh (CLAUDE.md):
  - mọi âm thanh đều có nguồn NHÌN THẤY: tiếng gõ qua tường Tây (khung ảnh nảy), tay TÔI gõ tường, điện thoại trong tay (rung, chuông),
    chốt cửa 4B, xích cửa 4A (Rosa), cú "rầm" trong 4C (khe sáng xanh tắt, cửa 4B rung), bước chân của TÔI (sàn gỗ / thảm).
  - không có âm nền, không nhạc, không boom; tiếng xì xào chỉ là những người đã có mặt trong hình.
  - hiệu ứng chỉ nằm giữa các câu thoại (kiểm tra trong nextdoor_timing.py và kiểm tra lại ở đây trên dạng sóng thật).
  - đúng ≥1 giây im lặng tuyệt đối trước cú "rầm".
  - phụ đề nhỏ (34 px), hiện đúng lúc bắt đầu nói, tắt 0,12 giây sau khi nói xong. Câu xì xào đám đông không có phụ đề.
Đầu ra: out/nextdoor/subs.ass, out/nextdoor/sfx.wav, out/nextdoor/mix.wav
"""
import json
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
tl = json.loads((ROOT / "scenes/nextdoor-01/timeline.json").read_text(encoding="utf-8"))
ev = json.loads((ROOT / "scenes/nextdoor-01/sfx.json").read_text(encoding="utf-8"))
out = ROOT / "out/nextdoor"
out.mkdir(parents=True, exist_ok=True)
D = tl["duration_s"]
END0, END1 = tl["events"]["endcard"]

# ------------------------------------------------------------------ ASS ----
NAMES = {"ME": "Me", "PRUITT": "Mr. Pruitt (phone)", "ROSA": "Mrs. Alvarez", "DISPATCH": "911 (phone)"}
COLORS = {"ME": "#9fd27a", "PRUITT": "#d9a25a", "ROSA": "#e58fa5", "DISPATCH": "#8fc8ff"}


def ass_time(t):
    t = max(0.0, t)
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


def ass_color(h):
    return f"&H{h[5:7]}{h[3:5]}{h[1:3]}&".upper()


ass = ["[Script Info]", "ScriptType: v4.00+", "PlayResX: 1920", "PlayResY: 1080", "WrapStyle: 0", "ScaledBorderAndShadow: yes", "",
       "[V4+ Styles]",
       "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
       "Style: Line,DejaVu Sans,34,&H00FFFFFF,&H00FFFFFF,&H00141414,&H80000000,-1,0,0,0,100,100,0,0,1,2.2,1,2,260,260,62,1",
       "Style: Card,DejaVu Sans,88,&H00FFFFFF,&H00FFFFFF,&H00141414,&H96000000,-1,0,0,0,100,100,0,0,3,16,0,8,120,120,170,1",
       "Style: Opt,DejaVu Sans,46,&H00FFFFFF,&H00FFFFFF,&H00141414,&H96000000,-1,0,0,0,100,100,0,0,3,12,0,8,120,120,0,1",
       "Style: Next,DejaVu Sans,34,&H0057B3FF,&H00FFFFFF,&H00141414,&H96000000,-1,0,0,0,100,100,0,0,3,9,0,2,120,120,100,1",
       "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
lines = tl["lines"]
for i, l in enumerate(lines):
    n, c = NAMES[l["speaker"]], ass_color(COLORS[l["speaker"]])
    end = l["end"] + 0.12
    if i + 1 < len(lines):
        end = min(end, lines[i + 1]["start"] - 0.02)
    ass.append(f"Dialogue: 0,{ass_time(l['start'])},{ass_time(end)},Line,{n},0,0,0,,{{\\c{c}\\fs28}}{n}{{\\c&HFFFFFF&\\fs34}}  {l['text']}")
ass += [
    f"Dialogue: 1,{ass_time(END0)},{ass_time(END1)},Card,,0,0,0,,{{\\fad(400,0)}}What would you do?",
    f"Dialogue: 1,{ass_time(END0 + 0.8)},{ass_time(END1)},Opt,,0,0,350,,{{\\fad(300,0)}}{{\\c&H57B3FF&}}A{{\\c&HFFFFFF&}}  Lock your door and wait 25 minutes for the police.",
    f"Dialogue: 1,{ass_time(END0 + 1.6)},{ass_time(END1)},Opt,,0,0,450,,{{\\fad(300,0)}}{{\\c&H57B3FF&}}B{{\\c&HFFFFFF&}}  Break open 4C yourself – before the footage is gone.",
    f"Dialogue: 1,{ass_time(END0 + 3.2)},{ass_time(END1)},Next,,0,0,0,,{{\\fad(300,0)}}Unknown number: \"Jenna says hi.\"",
]
(out / "subs.ass").write_text("\n".join(ass) + "\n", encoding="utf-8")

# ------------------------------------------------------------------ SFX ----
SR = 48000
N = int(SR * D) + SR
L_ = np.zeros(N, np.float32)
R_ = np.zeros(N, np.float32)
rng = np.random.default_rng(23)
placed = []


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


def knock_wall(g):
    """cú gõ từ phòng bên cạnh qua tường thạch cao: đục, thấp, có tiếng khung gỗ rung"""
    t = tt(0.3)
    body = 1.0 * np.sin(2 * np.pi * 78 * t) * np.exp(-t * 20) + 0.5 * np.sin(2 * np.pi * 142 * t) * np.exp(-t * 26)
    thud = 0.4 * bandnoise(len(t), 120, 900) * np.exp(-t * 45)
    return fade_out(g * (body + thud), 0.06)


def knock_knuckle(g):
    """đốt ngón tay TÔI gõ lên tường: sắc hơn, gần hơn"""
    t = tt(0.2)
    body = 0.8 * np.sin(2 * np.pi * 150 * t) * np.exp(-t * 30)
    tap = 0.5 * bandnoise(len(t), 500, 3500) * np.exp(-t * 80)
    return fade_out(g * (body + tap), 0.04)


def phone_buzz():
    t = tt(0.75)
    gate = (((t > 0.0) & (t < 0.3)) | ((t > 0.42) & (t < 0.72))).astype(float)
    gate = np.convolve(gate, np.ones(240) / 240, "same")
    motor = 0.5 * np.sin(2 * np.pi * 172 * t) + 0.25 * np.sign(np.sin(2 * np.pi * 172 * t)) * 0.4
    rattle = 0.2 * bandnoise(len(t), 300, 1400) * (0.5 + 0.5 * np.sin(2 * np.pi * 43 * t))   # điện thoại áp vào lòng bàn tay
    return fade_out(gate * (motor + rattle))


def phone_ring():
    """chuông điện thoại hai nốt (nguồn: điện thoại trong tay TÔI)"""
    t = tt(1.0)
    gate = ((t % 0.5) < 0.32).astype(float) * (t < 0.98)
    gate = np.convolve(gate, np.ones(480) / 480, "same")
    tone = 0.5 * np.sin(2 * np.pi * 880 * t) + 0.35 * np.sin(2 * np.pi * 1109 * t) + 0.1 * np.sin(2 * np.pi * 1760 * t)
    return fade_out(gate * tone, 0.05)


def latch(kind):
    """chốt cửa + bản lề kêu: mở = cạch + kẽo kẹt; đóng = cánh cửa khép + cạch"""
    t = tt(0.3)
    click = 0.8 * bandnoise(len(t), 1500, 6000) * np.exp(-t * 120)
    clunk = 0.6 * np.sin(2 * np.pi * 120 * t) * np.exp(-t * 28)
    creak = 0.22 * np.sin(2 * np.pi * (380 + 160 * t) * t) * np.exp(-((t - 0.16) / 0.07) ** 2)
    x = click + clunk + (creak if kind == "open" else 0.5 * creak)
    return fade_out(x, 0.04)


def chain_rattle(kind):
    t = tt(0.5)
    n = 7 if kind == "open" else 5
    x = np.zeros_like(t)
    for i in range(n):
        s = int((0.03 + i * 0.045 + rng.uniform(0, 0.015)) * SR)
        m = int(0.05 * SR)
        if s + m < len(t):
            tk = np.arange(m) / SR
            x[s:s + m] += (0.5 * np.sin(2 * np.pi * rng.uniform(2200, 3800) * tk) + 0.3 * bandnoise(m, 1800, 7000)) * np.exp(-tk * 90)
    return fade_out(x * 0.7, 0.05)


def impact_wall():
    """cú "rầm" trong 4C: đồ đạc đổ / cửa đập, truyền qua tường – thấp, nặng, có mảnh vỡ"""
    t = tt(0.9)
    thump = 1.0 * (np.sin(2 * np.pi * 48 * t) + 0.6 * np.sin(2 * np.pi * 96 * t)) * np.exp(-t * 6.5)
    hit = 0.8 * bandnoise(len(t), 120, 5000) * np.exp(-t * 28)
    debris = 0.35 * bandnoise(len(t), 1500, 8000) * np.exp(-t * 9) * (0.6 + 0.4 * np.sin(2 * np.pi * 31 * t))
    wood = sum(a * np.sin(2 * np.pi * f * t) for a, f in ((0.25, 210), (0.18, 340), (0.12, 610))) * np.exp(-t * 7)
    return fade_out(thump + hit + debris + wood, 0.1)


def footstep(foot, g, surface):
    t = tt(0.28)
    v = 1.0 if foot == "L" else 0.93
    if surface == "wood":  # sàn gỗ cũ trong 4B: cộc + tiếng ván kêu cót két
        heel = 0.7 * np.sin(2 * np.pi * 95 * v * t) * np.exp(-t * 30)
        scuff = 0.18 * bandnoise(len(t), 300, 2400) * np.exp(-((t - 0.04) / 0.035) ** 2)
        creak = 0.12 * np.sin(2 * np.pi * (520 + 220 * v * t) * t) * np.exp(-((t - 0.11) / 0.06) ** 2) * (1 if rng.random() < 0.5 else 0.3)
        return fade_out(g * (heel + scuff + creak))
    heel = 0.55 * np.sin(2 * np.pi * 70 * v * t) * np.exp(-t * 36)  # thảm hành lang: rất trầm, êm
    scuff = 0.2 * bandnoise(len(t), 200, 1600) * np.exp(-((t - 0.05) / 0.05) ** 2)
    return fade_out(g * (heel + scuff))


for k in ev["knocks"]:
    add("knock", k["t"], knock_wall(k["gain"]), 0.9, pan=-0.45)        # tường Tây, bên trái đầu giường
for k in ev["myknocks"]:
    add("myknock", k["t"], knock_knuckle(k["gain"]), 0.8, pan=-0.2)
for b in ev["buzz"]:
    add("buzz", b, phone_buzz(), 0.5, pan=0.3)                         # điện thoại ở tay phải
for r in ev["ring"]:
    add("ring", r, phone_ring(), 0.45, pan=0.3)
for d in ev["door"]:
    add("door", d["t"], latch(d["kind"]), 0.7, pan=0.0)
for c in ev["chain"]:
    add("chain", c["t"], chain_rattle(c["kind"]), 0.6, pan=0.15)       # cửa 4A phía sau
add("impact", ev["impact"], impact_wall(), 1.0, pan=-0.35)             # 4C phía Tây
for s in ev["steps"]:
    add("step", s["t"], footstep(s["foot"], s["gain"], s["surface"]), 0.55, pan=-0.12 if s["foot"] == "L" else 0.12)

# kiểm tra lại trên dạng sóng thật: không hiệu ứng nào đè lên thoại, im lặng tuyệt đối trước cú rầm
bad = [f"{k} {a:.2f}-{b:.2f}s đè lên câu {l['id']}" for k, a, b in placed for l in tl["lines"]
       if a < l["end"] + 0.02 and b > l["start"] - 0.02]
s0, s1 = ev["silence_before_impact"]
if any(a < s1 - 1e-3 and b > s0 for k, a, b in placed if k != "impact"):
    bad.append("có hiệu ứng trong khoảng im lặng trước cú rầm")
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
dialog = ROOT / "out/audio/nextdoor-01/dialog_mix.wav"
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(dialog), "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"],
                     capture_output=True, check=True).stdout
dia = np.frombuffer(raw, "<f4").reshape(-1, 2).copy()
n = int(SR * D)
dia = np.pad(dia, ((0, max(0, n - len(dia))), (0, 0)))[:n]
mix = dia + sfx * 0.6
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
