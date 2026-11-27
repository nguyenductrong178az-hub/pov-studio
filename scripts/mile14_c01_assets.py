#!/usr/bin/env python3
"""Mile 14 tập 1, C01–C08 (phòng trực ban 2:15 AM → bật dậy chạy ra cửa): phụ đề (ASS) + hiệu ứng âm thanh tự tạo bằng code + bản mix.

Thời điểm lấy thẳng từ `TL` trong src/scenes/mile14/Office.tsx (hình và tiếng dùng cùng một nguồn).
Nguồn nhìn thấy của mọi âm thanh:
  - chuông + đèn LINE 2 nháy (điện thoại bàn giữa khung), tiếng nhấc ống nghe khỏi giá (tay trái),
  - mưa gõ lên kính cửa sổ bên trái (thấy giọt nước chảy),
  - bút sột soạt trên sổ (tay phải viết „MI 14“), nhựa sột soạt nhỏ trong ống nghe (ống nghe áp tai, dây xoắn thấy được).
Không nhạc, không ù nền. Mưa và tiếng bút được hạ sâu khi có thoại.
Giọng (nếu đã có): $VOICE_DIR/C02.*, C03.*, C04.* (mp3/wav). Lời người gọi được lọc như điện thoại bàn.
Đầu ra: out/mile14/c01/subs.ass, sfx.wav, mix.wav
"""
import json
import os
import re
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out/mile14/c01"
OUT.mkdir(parents=True, exist_ok=True)
VOICE_DIRS = [Path(os.environ.get("VOICE_DIR", "/mnt/project-files/mile14/audio/c01-c04")), Path(os.environ.get("VOICE_DIR8", "/mnt/project-files/mile14/audio/c05-c08"))]

# ---- đọc TL từ Office.tsx
src = (ROOT / "src/scenes/mile14/Office.tsx").read_text(encoding="utf-8")
body = re.search(r"export const TL = \{(.*?)\};", src, re.S).group(1)
TL = {k: json.loads(v) for k, v in re.findall(r"(\w+)\s*:\s*(\[[^\]]*\]|[\d.]+)", body)}
D = float(re.search(r"OFFICE_DURATION_S\s*=\s*([\d.]+)", src).group(1))

LINES = [  # (id, người nói, khoảng thoại, câu)
    ("C02", "CALLER", TL["caller1"], "He's standing right next to me."),
    ("C03", "ME", TL["me1"], "Who is? Where are you?"),
    ("C04", "CALLER", TL["caller2"], "Mile fourteen. Don't let the truck leave."),
    ("C06", "MARI", TL["mari1"], "Dropped. No number. But it pinged County Road 9."),
    ("C07", "MARI", TL["mari2"], "Cole's out there already."),
    ("C08", "ME", TL["me2"], "Tell him to touch nothing."),
]

SR = 48000
N = int(SR * D)
rng = np.random.default_rng(14)


def tt(sec):
    return np.arange(int(sec * SR)) / SR


def bandnoise(n, lo, hi):
    f = np.fft.rfft(rng.standard_normal(n))
    fr = np.fft.rfftfreq(n, 1 / SR)
    f[(fr < lo) | (fr > hi)] = 0
    y = np.fft.irfft(f, n)
    return y / (np.abs(y).max() + 1e-9)


def env(n, a, r):
    e = np.ones(n)
    ka, kr = min(n, int(a * SR)), min(n, int(r * SR))
    if ka: e[:ka] = np.linspace(0, 1, ka)
    if kr: e[-kr:] *= np.linspace(1, 0, kr)
    return e


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, "<f4").copy()


def phone_filter(x):
    """giọng qua ống nghe điện thoại bàn: 300–3400 Hz, hơi bão hoà"""
    f = np.fft.rfft(x)
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    f *= 1 / (1 + (300 / np.maximum(fr, 1)) ** 4) / (1 + (fr / 3400) ** 4)
    y = np.fft.irfft(f, len(x))
    y /= np.abs(y).max() + 1e-9
    return np.tanh(2.2 * y) / np.tanh(2.2)


# ---- giọng
voices, speech = {}, np.zeros(N, bool)
for lid, spk, (a, b), _ in LINES:
    hit = [h for d in VOICE_DIRS if d.exists() for h in sorted(d.glob(f"{lid}.*"))]
    if hit:
        x = load(hit[0])
        voices[lid] = (spk, a, phone_filter(x) * 0.55 if spk == "CALLER" else x / (np.abs(x).max() + 1e-9) * 0.8)  # MARI và ME nói trực tiếp trong phòng
        b = a + len(x) / SR
    speech[int(a * SR):int(b * SR)] = True

# ---- hiệu ứng
L_, R_ = np.zeros(N), np.zeros(N)
placed = []


def add(kind, t0, x, gain=1.0, pan=0.0, under_speech=False):
    i0 = int(round(t0 * SR))
    n = min(len(x), N - i0)
    x = np.asarray(x[:n]) * gain
    L_[i0:i0 + n] += x * (1 - max(0.0, pan))
    R_[i0:i0 + n] += x * (1 + min(0.0, pan))
    placed.append((kind, t0, t0 + n / SR, under_speech))


def desk_ring(sec):
    """chuông điện tử của máy bàn nhiều line: rung 2 tần số (trill 20 Hz)"""
    t = tt(sec)
    sw = (np.sin(2 * np.pi * 20 * t) > 0).astype(float)
    sw = np.convolve(sw, np.ones(96) / 96, "same")
    f = 1180 + 340 * sw
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = 0.6 * np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.08 * np.sign(np.sin(ph))
    return tone * env(len(t), 0.004, 0.03)


def pickup():
    """ống nghe nhấc khỏi giá: tiếng nhựa va + công tắc móc bật lên"""
    t = tt(0.25)
    knock = 0.7 * np.sin(2 * np.pi * 230 * t) * np.exp(-t * 55) + 0.5 * bandnoise(len(t), 800, 5000) * np.exp(-t * 120)
    click = np.zeros(len(t)); i = int(0.045 * SR)
    click[i:i + 300] = bandnoise(300, 2500, 9000) * np.exp(-np.arange(300) / 40) * 0.6
    return knock + click


def rain(sec):
    """mưa gõ lên kính: những giọt ngẫu nhiên (lách tách) + lớp rì rì rất mỏng"""
    n = int(sec * SR)
    y = 0.08 * bandnoise(n, 1500, 7000)
    for _ in range(int(sec * 55)):
        i = rng.integers(0, n - 800)
        k = np.arange(800)
        y[i:i + 800] += rng.uniform(0.15, 0.5) * np.sin(2 * np.pi * rng.uniform(2200, 4800) * k / SR) * np.exp(-k / rng.uniform(60, 140))
    return y


def pen_scratch(t0, t1):
    """đầu bút cào trên giấy: nhiễu cao, nhịp theo nét (ngắt khi nhấc bút)"""
    n = int((t1 - t0) * SR)
    t = np.arange(n) / SR
    strokes = (np.sin(2 * np.pi * 2.6 * t + 1.3 * np.sin(2 * np.pi * 0.9 * t)) > -0.35).astype(float)
    strokes = np.convolve(strokes, np.ones(480) / 480, "same")
    grain = bandnoise(n, 2500, 9000) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 11 * t)))
    return grain * strokes * env(n, 0.02, 0.05)


def plastic_rustle(sec):
    """nhựa (tấm bạt) sột soạt rất nhỏ, nghe qua ống nghe"""
    n = int(sec * SR)
    x = bandnoise(n, 400, 3000) * np.abs(bandnoise(n, 2, 18)) ** 1.5
    return phone_filter(x) * env(n, 0.03, 0.06)


def dial_tone(sec):
    """tút liên tục của đường dây chết (350 + 440 Hz), nghe qua ống nghe"""
    t = tt(sec)
    return phone_filter(0.5 * np.sin(2 * np.pi * 350 * t) + 0.5 * np.sin(2 * np.pi * 440 * t)) * env(len(t), 0.01, 0.02)


def keys_jingle(sec):
    """chùm chìa khoá: vài tiếng kim loại leng keng nối nhau"""
    n = int(sec * SR); y = np.zeros(n)
    for i0 in sorted(rng.integers(0, int(n * 0.8), 14)):
        k = np.arange(min(2400, n - i0))
        f = rng.uniform(3000, 7500)
        y[i0:i0 + len(k)] += rng.uniform(0.3, 0.8) * (np.sin(2 * np.pi * f * k / SR) + 0.5 * np.sin(2 * np.pi * f * 1.51 * k / SR)) * np.exp(-k / rng.uniform(250, 600))
    return y / (np.abs(y).max() + 1e-9)


def chair_roll(sec):
    """ghế văn phòng trượt trên sàn: bánh xe lăn (nhiễu trầm) + tiếng kẽo kẹt ngắn"""
    n = int(sec * SR); t = np.arange(n) / SR
    y = bandnoise(n, 120, 700) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 7 * t)))
    y += 0.25 * np.sin(2 * np.pi * (900 + 300 * np.sin(2 * np.pi * 2.5 * t)) * t) * (np.sin(2 * np.pi * 1.7 * t) > 0.6)
    return y * env(n, 0.08, 0.15)


def key_clack():
    t = tt(0.05)
    return 0.6 * bandnoise(len(t), 1500, 7000) * np.exp(-t * 180) + 0.5 * np.sin(2 * np.pi * 150 * t) * np.exp(-t * 90)


# nhịp gõ phím của Mari lấy từ officeEnv.ts (hình dùng cùng danh sách)
env_ts = (ROOT / "src/scenes/mile14/officeEnv.ts").read_text(encoding="utf-8")
TAPS = json.loads(re.search(r"MARI_TAPS[^=]*=\s*(\[\[.*?\]\]);", env_ts, re.S).group(1))

add("ring", TL["ringA"], desk_ring(TL["ringB"] - TL["ringA"]), 0.55)
add("pickup", TL["grabB"] - 0.02, pickup(), 0.7, pan=0.35)
add("pen", TL["writeA"], pen_scratch(TL["writeA"], TL["writeB"]), 0.09, pan=-0.2, under_speech=True)
c2_end = TL["caller2"][1]
if "C04" in voices:
    c2_end = TL["caller2"][0] + len(voices["C04"][2]) / SR
add("rustle", c2_end + 0.05, plastic_rustle(0.35), 0.22, pan=0.5)

# C05: đèn LINE 2 tắt, tút; ống nghe đặt về giá; ghế trượt sang Mari; gõ phím; ghế trượt lại; chìa khoá; ghế kẽo kẹt khi bật dậy
add("hang", TL["hang"] - 0.01, bandnoise(int(0.02 * SR), 1500, 6000) * np.exp(-np.arange(int(0.02 * SR)) / 80), 0.5, pan=0.5)
add("tone", TL["toneA"], dial_tone(TL["toneB"] - TL["toneA"]), 0.3, pan=0.7)
add("putdown", TL["putB"] - 0.03, pickup(), 0.5, pan=0.35)
add("pen_down", TL["dropB"] - 0.12, key_clack() * 0.5, 0.35, pan=-0.2)
add("chair1", TL["turnA"], chair_roll(TL["turnB"] - TL["turnA"]), 0.3)
for tk, h, f in TAPS:
    add("tap", tk, key_clack(), 0.05 + 0.02 * (f % 2), pan=-0.55 + 0.1 * h, under_speech=True)
chair_back0 = max(TL["backA"], TL["mari2"][0] + (len(voices["C07"][2]) / SR if "C07" in voices else 1.8) + 0.02)
add("chair2", chair_back0, chair_roll(TL["backB"] - chair_back0 + 0.05), 0.3, under_speech=True)
add("keys", TL["keyB"] - 0.05, keys_jingle(0.9), 0.3, pan=0.3, under_speech=True)
add("rise", TL["riseA"], chair_roll(0.5) * 0.7, 0.25, under_speech=True)

rn = rain(D)
duck = np.convolve(speech.astype(float), np.ones(int(0.15 * SR)) / int(0.15 * SR), "same")
rn *= 0.12 * (1 - 0.7 * duck)  # mưa hạ sâu khi có thoại
L_ += rn * 1.15
R_ += rn * 0.55  # cửa sổ ở bên trái

# kiểm tra: hiệu ứng có tiếng (trừ mưa và bút, được phép nằm dưới thoại ở mức rất nhỏ) không đè lên thoại
bad = []
for kind, a, b, under in placed:
    if not under and speech[int(a * SR):int(b * SR)].any():
        bad.append(f"{kind} {a:.2f}–{b:.2f} s đè lên thoại")
if bad:
    raise SystemExit("SFX check failed:\n  " + "\n  ".join(bad))

sfx = np.stack([L_, R_], 1)


def write_wav(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-", str(path)],
                   input=pcm.tobytes(), check=True)


write_wav(OUT / "sfx.wav", sfx)
mix = sfx.copy()
for lid, (spk, a, x) in voices.items():
    i0 = int(a * SR); n = min(len(x), N - i0)
    pan = {"CALLER": (0.75, 0.45), "ME": (0.8, 0.8), "MARI": (0.45, 0.85)}[spk]  # ống nghe áp tai trái; Mari ở bên phải
    mix[i0:i0 + n, 0] += x[:n] * pan[0]
    mix[i0:i0 + n, 1] += x[:n] * pan[1]
pk = np.abs(mix).max()
if pk > 0.95:
    mix *= 0.95 / pk
write_wav(OUT / "mix.wav", mix)

# ---- phụ đề: 34 px, tên người nói 28 px; hiện lúc bắt đầu nói, tắt 0,12 s sau khi nói xong
NAMES = {"CALLER": "Caller (phone)", "ME": "Me", "MARI": "Mari"}
COLORS = {"CALLER": "&H5AA2D9&", "ME": "&H7AD29F&", "MARI": "&HE0B08A&"}


def ass_time(t):
    return f"0:{int(t // 60):02d}:{t % 60:05.2f}"


ass = ["[Script Info]", "ScriptType: v4.00+", "PlayResX: 1920", "PlayResY: 1080", "WrapStyle: 0", "ScaledBorderAndShadow: yes", "",
       "[V4+ Styles]",
       "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
       "Style: Line,DejaVu Sans,34,&H00FFFFFF,&H00FFFFFF,&H00141414,&H80000000,-1,0,0,0,100,100,0,0,1,2.2,1,2,260,260,62,1",
       "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
for lid, spk, (a, b), text in LINES:
    if lid in voices:  # phụ đề theo tiếng nói thật trong file (bỏ khoảng lặng đầu/cuối)
        x = np.abs(voices[lid][2]); w = int(0.02 * SR)
        lv = np.sqrt(np.convolve(x ** 2, np.ones(w) / w, "same"))
        on = np.nonzero(lv > lv.max() * 0.06)[0]
        a, b = a + on[0] / SR, a + on[-1] / SR
    ass.append(f"Dialogue: 0,{ass_time(a)},{ass_time(b + 0.12)},Line,,0,0,0,,{{\\c{COLORS[spk]}\\fs28}}{NAMES[spk]}{{\\c&HFFFFFF&\\fs34}}  {text}")
(OUT / "subs.ass").write_text("\n".join(ass) + "\n", encoding="utf-8")
print(f"→ {OUT} · {D:.1f} s · giọng: {', '.join(voices) or 'chưa có'} · {len(placed)} hiệu ứng + mưa")
