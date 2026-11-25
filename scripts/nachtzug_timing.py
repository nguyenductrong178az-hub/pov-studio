#!/usr/bin/env python3
"""Tàu đêm 01: MỘT nguồn thời gian chung cho cả hình VÀ tiếng, lấy từ scenes/nachtzug-01/timeline.json.

  python3 scripts/nachtzug_timing.py

1. scenes/nachtzug-01/sfx.json – mọi hiệu ứng âm thanh có nguồn NHÌN THẤY được, chỉ nằm trong các khoảng lặng
   ("#! pause" trong script.md) hoặc trên thẻ kết:
     knocks – tay Caleb đập vào kính (cảnh dựng tay đập đúng các thời điểm này)
     radio  – tiếng rè bộ đàm của Dana        buzz – điện thoại của Doyle rung trên bàn (màn hình sáng lên)
     impact – Caleb lao sầm vào ô kính khoang B ngay cạnh TÔI (giữa khung hình), trước đó ≥1 giây im lặng tuyệt đối
     steps  – bước chân của TÔI trên sàn toa (thảm cao su trên sàn thép); camera nhún theo đúng các thời điểm này
     walk   – quãng đường máy quay đi theo đường weg-ich trong mặt bằng
2. locations/nachtzug-wagen2/plan.json – đồng bộ lại thời gian góc quay và đường đi theo dòng thời gian mới, rồi chạy plan_tool kiểm tra.
"""
import json
import math
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SC = ROOT / "scenes/nachtzug-01"
PLAN = ROOT / "locations/nachtzug-wagen2/plan.json"
tl = json.loads((SC / "timeline.json").read_text(encoding="utf-8"))
plan = json.loads(PLAN.read_text(encoding="utf-8"))
L = {l["id"]: l for l in tl["lines"]}
BEAT = {int(k): v for k, v in tl["beats"].items()}
PZ = tl["pauses"]
END0, END1 = tl["events"]["endcard"]


def pause(label, before=None):
    return next(p for p in PZ if p["label"] == label and (before is None or p["before"] == before))


def beat_start(n):
    """Shot start = start of the pause in front of the beat's first line (if any), else the beat time."""
    first = next(l for l in tl["lines"] if l["beat"] == n)
    p = next((p for p in PZ if p["before"] == first["id"]), None)
    return round(p["start"], 3) if p else BEAT[n]


# ---------------------------------------------------------------- SFX events ----
ev = {"knocks": [], "steps": [], "shakes": []}
KNOCK_PERIOD = 0.27
for p in [q for q in PZ if q["label"] == "knock"]:
    t, k = p["start"] + 0.08, 0
    while t + 0.2 <= p["end"]:
        ev["knocks"].append({"t": round(t, 3), "gain": round(1.0 if p["before"] == "01" else 0.8 - 0.05 * k, 2)})
        t += KNOCK_PERIOD
        k += 1
    ev["shakes"].append({"t": round(p["start"] + 0.08, 3), "amp": 1.6 if p["before"] == "01" else 0.9})
# weak knocks on the end card (hand visible on the door glass)
for k, dt in enumerate([1.6, 1.87, 3.9]):
    ev["knocks"].append({"t": round(END0 + dt, 3), "gain": 0.45 - 0.05 * k})

ev["radio"] = round(pause("radio")["start"] + 0.12, 3)
ev["buzz"] = round(pause("buzz")["start"] + 0.08, 3)
pi = pause("impact")
ev["impact"] = round(pi["start"] + 1.0, 3)  # ≥1 s of silence after the previous line
ev["silence_before_impact"] = [round(pi["start"] - 0.05, 3), ev["impact"]]
ev["shakes"].append({"t": ev["impact"], "amp": 3.2})

# ---------------------------------------------------------------- camera walk ----
path = next(c for c in plan["cameras"] if c["id"] == "K7")["path"]
seg = [math.dist(a, b) for a, b in zip(path, path[1:])]
total = sum(seg)
w1, w2 = [p for p in PZ if p["label"] == "walk"]
STAND, STEP1, STEP2 = 0.5, 0.5, 0.46  # stand-up time, step cadence (nervous, brisk)
n1 = round((w1["end"] - w1["start"] - STAND) / STEP1)
n2 = round((w2["end"] - w2["start"] - 0.15) / STEP2)
step_len = total / (n1 + n2)
d1 = round(step_len * n1, 3)
walk = {"path": path, "total": round(total, 3), "stop_dist": d1, "segments": [
    {"t0": w1["start"], "walk0": round(w1["start"] + STAND, 3), "t1": round(w1["start"] + STAND + n1 * STEP1, 3), "d0": 0, "d1": d1},
    {"t0": w2["start"], "walk0": w2["start"], "t1": round(w2["start"] + n2 * STEP2, 3), "d0": d1, "d1": round(total, 3)},
]}
foot = 0
for s, n, cad in ((walk["segments"][0], n1, STEP1), (walk["segments"][1], n2, STEP2)):
    for i in range(n):
        ev["steps"].append({"t": round(s["walk0"] + (i + 0.35) * cad, 3), "foot": "LR"[foot % 2], "gain": 1.0 if i < n - 1 else 0.7})
        foot += 1
ev["walk"] = walk

# ---------------------------------------------------------------- check: nothing under dialogue ----
DUR = {"knock": 0.22, "radio": 0.45, "buzz": 0.75, "impact": 0.75, "step": 0.28}
events = [("knock", k["t"]) for k in ev["knocks"]] + [("radio", ev["radio"]), ("buzz", ev["buzz"]), ("impact", ev["impact"])] \
    + [("step", s["t"]) for s in ev["steps"]]
bad = []
for kind, t in events:
    for l in tl["lines"]:
        if t < l["end"] + 0.03 and t + DUR[kind] > l["start"] - 0.03:
            bad.append(f"{kind} {t:.2f}s overlaps line {l['id']} ({l['start']:.2f}-{l['end']:.2f})")
lines_in_silence = [l["id"] for l in tl["lines"] if l["end"] > ev["silence_before_impact"][0] + 0.06 and l["start"] < ev["impact"]]
if lines_in_silence:
    bad.append(f"speech inside the 1 s silence before the impact: {lines_in_silence}")
if bad:
    raise SystemExit("SFX overlap dialogue:\n  " + "\n  ".join(bad))
ev["durations"] = DUR
(SC / "sfx.json").write_text(json.dumps(ev, indent=2) + "\n", encoding="utf-8")

# ---------------------------------------------------------------- plan times ----
fmt = lambda a, b: f"{a:.1f}–{b:.1f} s".replace(".", ",")
shots = {"K1": (0.0, beat_start(2)), "K2": (beat_start(2), beat_start(3)), "K3": (beat_start(3), beat_start(4)),
         "K4": (beat_start(4), beat_start(5)), "K5": (beat_start(5), beat_start(6)), "K6": (beat_start(6), beat_start(7)),
         "K7": (beat_start(7), END0), "K8": (END0, END1)}
for c in plan["cameras"]:
    a, b = shots[c["id"]]
    c["t0"], c["t1"], c["time"] = round(a, 3), round(b, 3), fmt(a, b)
times = {
    "weg-hanna": (L["03"]["start"] + 0.9, L["03"]["start"] + 4.9),
    "weg-brandt": (BEAT[5], BEAT[5] + 3.2),
    "weg-hanna-zurueck": (BEAT[5] + 0.5, BEAT[5] + 2.5),
    "weg-jonas": (L["15"]["start"], L["15"]["start"] + 4.12),
    "weg-jonas-tuer": (ev["impact"] + 0.8, ev["impact"] + 3.3),  # va vào kính khoang B trước, rồi mới chạy sang cửa
    "weg-ich": (walk["segments"][0]["t0"], walk["segments"][1]["t1"]),
}
for p in plan["paths"]:
    a, b = times[p["id"]]
    p["t0"], p["t1"], p["time"] = round(a, 3), round(b, 3), fmt(a, b)
PLAN.write_text(json.dumps(plan, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
r = subprocess.run(["python3", "-I", str(ROOT / "scripts/plan_tool.py"), str(PLAN.parent)], capture_output=True, text=True)
print(r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr)
if r.returncode:
    raise SystemExit(r.stdout + r.stderr)
print(f"→ {(SC / 'sfx.json').relative_to(ROOT)}: {len(ev['knocks'])} knocks, {len(ev['steps'])} steps, "
      f"radio {ev['radio']} s, buzz {ev['buzz']} s, impact {ev['impact']} s (silence {ev['silence_before_impact']})")
