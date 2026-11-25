#!/usr/bin/env python3
"""The Neighbor Next Door 01 „Midnight": MỘT nguồn thời gian chung cho hình VÀ tiếng, lấy từ scenes/nextdoor-01/timeline.json.

  python3 scripts/nextdoor_timing.py

1. scenes/nextdoor-01/sfx.json – mọi hiệu ứng có nguồn NHÌN THẤY được, chỉ nằm trong khoảng lặng ("#! pause"):
     knocks   – ba tiếng gõ từ 4C qua tường Tây (khung ảnh nảy lên đúng các thời điểm này)
     myknocks – khớp tay TÔI gõ lại ba lần        buzz – điện thoại trong tay rung (2 lần)
     door     – chốt cửa 4B mở / đóng              chain – xích cửa 4A (mở, đóng)
     ring     – điện thoại đổ chuông (Pruitt gọi lại)
     impact   – tiếng "rầm" trong 4C, trước đó đúng 1 giây im lặng tuyệt đối
     steps    – bước chân TÔI (sàn gỗ cũ trong 4B, thảm cũ ngoài hành lang); camera nhún đúng các thời điểm này
2. scenes/nextdoor-01/lips.json – độ mở miệng (0…1) theo âm lượng của CHÍNH file giọng, 30 lần/giây, cho người có mặt trong hình.
3. locations/maple-court-4b/plan.json + locations/maple-court-flur4/plan.json – thời gian góc quay và đường đi theo dòng thời gian,
   rồi chạy plan_tool kiểm tra va chạm.
"""
import json
import math
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SC = ROOT / "scenes/nextdoor-01"
P4B, PFL = ROOT / "locations/maple-court-4b/plan.json", ROOT / "locations/maple-court-flur4/plan.json"
tl = json.loads((SC / "timeline.json").read_text(encoding="utf-8"))
p4b = json.loads(P4B.read_text(encoding="utf-8"))
pfl = json.loads(PFL.read_text(encoding="utf-8"))
L = {l["id"]: l for l in tl["lines"]}
PZ = {p["label"]: p for p in tl["pauses"]}
END0, END1 = tl["events"]["endcard"]
r3 = lambda x: round(x, 3)

# ---------------------------------------------------------------- SFX ----
ev = {"knocks": [], "myknocks": [], "buzz": [], "door": [], "chain": [], "steps": [], "shakes": [], "ring": []}
k0 = PZ["knock"]["start"] + 0.1
for i in range(3):
    ev["knocks"].append({"t": r3(k0 + i * 0.36), "gain": [1.0, 0.95, 1.0][i]})
ev["shakes"].append({"t": r3(k0), "amp": 1.4})
m = PZ["myknock_buzz"]
for i in range(3):
    ev["myknocks"].append({"t": r3(m["start"] + 0.12 + i * 0.3), "gain": 0.8})
ev["buzz"].append(r3(m["start"] + 1.2))
ev["buzz"].append(r3(PZ["buzz"]["start"] + 0.05))


def walk(t0, t1, dist, cadence=0.5, stand=0.0, surface="wood"):
    """bước chân đều trong [t0+stand, t1]; trả về đoạn đi + danh sách bước"""
    w0 = t0 + stand
    n = max(1, round((t1 - w0 - 0.15) / cadence))
    steps = [{"t": r3(w0 + (i + 0.35) * cadence), "foot": "LR"[i % 2], "gain": 1.0 if i < n - 1 else 0.7, "surface": surface} for i in range(n)]
    return {"t0": r3(t0), "walk0": r3(w0), "t1": r3(w0 + n * cadence), "dist": r3(dist)}, steps


def plen(pts):
    return sum(math.dist(a, b) for a, b in zip(pts, pts[1:]))


path = lambda plan, pid: next(q for q in plan["paths"] if q["id"] == pid)
# 1) giường → cửa 4B → cửa 4C (khoảng lặng "walk")
w = PZ["walk"]
d1, d2 = plen(path(p4b, "weg-tuer")["points"]), plen(path(pfl, "weg-4c")["points"])
seg, st = walk(w["start"], w["end"], d1 + d2, cadence=0.5, stand=0.5)
t_door = seg["walk0"] + (seg["t1"] - seg["walk0"]) * d1 / (d1 + d2)
for s in st:
    s["surface"] = "wood" if s["t"] < t_door else "carpet"
ev["steps"] += st
ev["door"].append({"t": r3(t_door - 0.35), "kind": "open"})
WALKS = {"weg-tuer": (seg["walk0"], t_door), "weg-4c": (t_door, seg["t1"])}
# 2) xích cửa 4A, rồi TÔI bước về phía Rosa
c = PZ["chain"]
ev["chain"].append({"t": r3(c["start"] + 0.08), "kind": "open"})
seg, st = walk(c["start"] + 0.7, c["end"], plen(path(pfl, "weg-rosa")["points"]), cadence=0.48, surface="carpet")
ev["steps"] += st
WALKS["weg-rosa"] = (seg["walk0"], seg["t1"])
# 3) Rosa đóng cửa, TÔI về tủ quần áo trong 4B
c = PZ["chain_walk"]
ev["chain"].append({"t": r3(c["start"] + 0.08), "kind": "close"})
d1, d2 = plen(path(pfl, "weg-zurueck")["points"]), plen(path(p4b, "weg-schrank")["points"])
seg, st = walk(c["start"] + 0.65, c["end"], d1 + d2, cadence=0.46)
t_in = seg["walk0"] + (seg["t1"] - seg["walk0"]) * d1 / (d1 + d2)
for s in st:
    s["surface"] = "carpet" if s["t"] < t_in else "wood"
ev["steps"] += st
WALKS["weg-zurueck"], WALKS["weg-schrank"] = (seg["walk0"], t_in), (t_in, seg["t1"])
# 4) chuông điện thoại, TÔI đi từ tủ ra sát cửa 4B
c = PZ["ring"]
ev["ring"] = [r3(c["start"] + 0.05), r3(c["start"] + 1.15)]
seg, st = walk(c["start"] + 0.1, c["end"], plen(path(p4b, "weg-tuer-2")["points"]), cadence=0.5)
ev["steps"] += st
WALKS["weg-tuer-2"] = (seg["walk0"], seg["t1"])
# 5) tiếng "rầm"
pi = PZ["impact"]
ev["impact"] = r3(pi["start"] + 1.0)
ev["silence_before_impact"] = [r3(pi["start"] - 0.05), ev["impact"]]
ev["shakes"].append({"t": ev["impact"], "amp": 3.0})
# sau tiếng rầm (vẫn trong khoảng lặng trước câu 19): mở cửa 4B, 2 bước ra ngưỡng cửa
ev["door"].append({"t": r3(ev["impact"] + 0.75), "kind": "open"})
seg, st = walk(ev["impact"] + 1.05, pi["end"] - 0.05, plen(path(p4b, "weg-schwelle")["points"]), cadence=0.42)
ev["steps"] += st[:2]
WALKS["weg-schwelle"] = (seg["walk0"], seg["walk0"] + 2 * 0.42)
ev["walks"] = {k: [r3(a), r3(b)] for k, (a, b) in WALKS.items()}

# ---------------------------------------------------------------- không đè lên thoại ----
DUR = {"knock": 0.3, "myknock": 0.2, "buzz": 0.75, "door": 0.3, "chain": 0.5, "ring": 1.0, "impact": 0.9, "step": 0.26}
events = [("knock", k["t"]) for k in ev["knocks"]] + [("myknock", k["t"]) for k in ev["myknocks"]] + [("buzz", b) for b in ev["buzz"]] \
    + [("door", d["t"]) for d in ev["door"]] + [("chain", c["t"]) for c in ev["chain"]] + [("ring", r) for r in ev["ring"]] \
    + [("impact", ev["impact"])] + [("step", s["t"]) for s in ev["steps"]]
bad = [f"{k} {t:.2f}s đè lên câu {l['id']} ({l['start']:.2f}-{l['end']:.2f})" for k, t in events for l in tl["lines"]
       if t < l["end"] + 0.03 and t + DUR[k] > l["start"] - 0.03]
if any(l["end"] > ev["silence_before_impact"][0] + 0.06 and l["start"] < ev["impact"] for l in tl["lines"]):
    bad.append("có thoại trong 1 giây im lặng trước tiếng rầm")
if bad:
    raise SystemExit("Hiệu ứng đè lên thoại:\n  " + "\n  ".join(bad))
ev["durations"] = DUR
(SC / "sfx.json").write_text(json.dumps(ev, indent=1) + "\n", encoding="utf-8")

# ---------------------------------------------------------------- khớp môi ----
FPS = tl["fps"]
VISIBLE = {"ROSA", "OKAFOR", "BRIANNA", "DEB", "TYLER", "MRS_LEE", "RAY"}
lips = {}
for x in tl["lines"] + tl["crowd"]:
    if x["speaker"] not in VISIBLE:
        continue
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(ROOT / x["file"]), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    a = np.frombuffer(raw, "<f4")
    hop = 16000 // FPS
    n = len(a) // hop
    rms = np.sqrt(np.array([np.mean(a[i * hop:(i + 1) * hop] ** 2) for i in range(n)]) + 1e-12)
    db = 20 * np.log10(rms)
    v = np.clip((db + 42) / 26, 0, 1)                 # −42 dB = đóng, −16 dB = mở hết
    v = np.convolve(v, [0.25, 0.5, 0.25], "same")      # mượt như cơ hàm
    lips.setdefault(x["speaker"], []).append({"id": x["id"], "t0": r3(x["file_start"]), "v": [round(float(q), 2) for q in v]})
(SC / "lips.json").write_text(json.dumps({"fps": FPS, "speakers": lips}) + "\n", encoding="utf-8")

# ---------------------------------------------------------------- thời gian trong mặt bằng ----
fmt = lambda a, b: f"{a:.1f}–{b:.1f} s".replace(".", ",")
for plan in (p4b, pfl):
    for q in plan["paths"]:
        if q["id"] in WALKS:
            a, b = WALKS[q["id"]]
            q["t0"], q["t1"], q["time"] = r3(a), r3(b), fmt(a, b)
imp = ev["impact"]
# hàng xóm ra hành lang sau tiếng "rầm"
APPEAR = {"MRS_LEE": imp + 0.3, "TYLER": imp + 0.6, "DEB": imp + 1.6, "BRIANNA": imp + 1.9, "OKAFOR": imp + 1.6, "RAY": imp + 2.7}
for k, t in APPEAR.items():
    pfl["characters"][k]["appear"] = r3(t)
for q, (a, b) in {"weg-tyler": (imp + 0.6, imp + 2.6), "weg-okafor": (imp + 1.6, imp + 6.6)}.items():
    qq = path(pfl, q)
    qq["t0"], qq["t1"], qq["time"] = r3(a), r3(b), fmt(a, b)
W = ev["walks"]
SHOTS4B = {"A1": (0.0, PZ["myknock_buzz"]["start"]), "A2": (PZ["myknock_buzz"]["start"], PZ["walk"]["start"]),
           "A3": (PZ["walk"]["start"], W["weg-tuer"][1]), "A4": (W["weg-schrank"][0], PZ["ring"]["start"]),
           "A5": (PZ["ring"]["start"], pi["start"]), "A6": (pi["start"], pi["end"])}
SHOTSFL = {"F0": (W["weg-4c"][0], PZ["walk"]["end"]), "F1": (PZ["walk"]["end"], PZ["chain"]["start"]),
           "F2": (PZ["chain"]["start"], W["weg-zurueck"][1]), "F3": (pi["end"], END1)}
for plan, shots in ((p4b, SHOTS4B), (pfl, SHOTSFL)):
    for cam in plan["cameras"]:
        if cam["id"] in shots:
            a, b = shots[cam["id"]]
            cam["t0"], cam["t1"], cam["time"] = r3(a), r3(b), fmt(a, b)
for plan, pth in ((p4b, P4B), (pfl, PFL)):
    pth.write_text(json.dumps(plan, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    r = subprocess.run(["python3", "-I", str(ROOT / "scripts/plan_tool.py"), str(pth.parent)], capture_output=True, text=True)
    print((r.stdout.strip().splitlines() or [r.stderr])[0])
    if r.returncode:
        raise SystemExit(r.stdout + r.stderr)
print(f"→ sfx.json: {len(ev['steps'])} bước chân, tiếng rầm {imp} s (im lặng {ev['silence_before_impact']}) · lips.json: "
      f"{sum(len(v) for v in lips.values())} câu có khớp môi")
