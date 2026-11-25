#!/usr/bin/env python3
"""Mặt bằng địa điểm: kiểm tra va chạm + vẽ sơ đồ + sinh plan.md từ plan.json.

  python3 scripts/plan_tool.py locations/klassenzimmer

Kiểm tra:
  - mọi đồ đạc nằm trong phòng, không chồng lên nhau
  - cửa ra vào / cửa sổ nằm trên tường, không chồng nhau; cánh mở vào trong không va đồ đạc
  - đường đi của nhân vật (tính cả bán kính thân người) không xuyên tường, không xuyên đồ đạc
    (chỉ được đi qua tường ở chỗ có cửa; ghế của chính nhân vật được miễn ở điểm đầu/cuối)
  - máy quay nằm trong phòng, không nằm trong đồ đạc
Nếu có lỗi → exit 1, plan.md KHÔNG được ghi đè.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

STEP = 0.01  # bước lấy mẫu dọc đường đi (1 cm)


def rect_dist(px, py, f):
    """Khoảng cách từ điểm tới hình chữ nhật (0 nếu nằm trong)."""
    dx = max(f["x"] - px, 0, px - (f["x"] + f["w"]))
    dy = max(f["y"] - py, 0, py - (f["y"] + f["d"]))
    return math.hypot(dx, dy)


def overlap(a, b):
    return min(a["x"] + a["w"], b["x"] + b["w"]) - max(a["x"], b["x"]) > 1e-6 and \
           min(a["y"] + a["d"], b["y"] + b["d"]) - max(a["y"], b["y"]) > 1e-6


def wall_axis(p, wall_id):
    W, D = p["size"]["w"], p["size"]["d"]
    return {"nord": ("x", D), "sued": ("x", 0.0), "ost": ("y", W), "west": ("y", 0.0)}[wall_id]


def door_zones(p):
    """Vùng ô cửa (cho phép đi xuyên tường ở đây)."""
    zones = []
    for d in p["doors"]:
        axis, pos = wall_axis(p, d["wall"])
        lo, hi = d["center"] - d["width"] / 2, d["center"] + d["width"] / 2
        zones.append((axis, pos, lo, hi))
    return zones


def validate(p):
    errs, notes = [], []
    W, D = p["size"]["w"], p["size"]["d"]
    F = {f["id"]: f for f in p["furniture"]}
    # 1 Đồ đạc
    for f in p["furniture"]:
        if f["x"] < -1e-9 or f["y"] < -1e-9 or f["x"] + f["w"] > W + 1e-9 or f["y"] + f["d"] > D + 1e-9:
            errs.append(f"Đồ đạc {f['id']} nằm ngoài phòng")
    fl = p["furniture"]
    for i in range(len(fl)):
        for j in range(i + 1, len(fl)):
            if overlap(fl[i], fl[j]):
                errs.append(f"Đồ đạc chồng nhau: {fl[i]['id']} ↔ {fl[j]['id']}")
    # 2 Ô cửa trên tường
    openings = [("cửa", d) for d in p["doors"]] + [("cửa sổ", w) for w in p["windows"]]
    for kind, o in openings:
        axis, _ = wall_axis(p, o["wall"])
        L = W if axis == "x" else D
        if o["center"] - o["width"] / 2 < 0 or o["center"] + o["width"] / 2 > L:
            errs.append(f"{kind} {o['id']} vượt ra ngoài tường {o['wall']}")
    for i in range(len(openings)):
        for j in range(i + 1, len(openings)):
            a, b = openings[i][1], openings[j][1]
            if a["wall"] == b["wall"] and abs(a["center"] - b["center"]) < (a["width"] + b["width"]) / 2:
                errs.append(f"Ô cửa chồng nhau trên tường {a['wall']}: {a['id']} ↔ {b['id']}")
    # 3 Cánh mở vào trong (cửa trượt không có cánh quay → bỏ qua)
    for d in p["doors"]:
        if d.get("inward") and d.get("kind") != "trượt":
            axis, pos = wall_axis(p, d["wall"])
            hinge_c = d["center"] + (d["width"] / 2 if d["hinge"] in ("phía Bắc", "phía Đông") else -d["width"] / 2)
            hx, hy = (hinge_c, pos) if axis == "x" else (pos, hinge_c)
            for f in fl:
                if rect_dist(hx, hy, f) < d["width"]:
                    errs.append(f"Cánh cửa {d['id']} mở vào trong va vào {f['id']}")
    for w in p["windows"]:
        r = w.get("inward_radius", 0)
        axis, pos = wall_axis(p, w["wall"])
        cx, cy = (w["center"], pos) if axis == "x" else (pos, w["center"])
        for f in fl:
            if f["h"] > w["sill"] and rect_dist(cx, cy, f) < r:
                errs.append(f"Cánh cửa sổ {w['id']} va vào {f['id']} (cao {f['h']} m > bậu {w['sill']} m)")
    # 3b Đồ đạc bị dịch chuyển trong cảnh (moves) không được chồng lên đồ khác
    import copy
    def furniture_at(t):
        out = copy.deepcopy(p["furniture"])
        for m in p.get("moves", []):
            if m["at"] <= t:
                f = next(x for x in out if x["id"] == m["id"])
                f["x"] += m["dx"]; f["y"] += m["dy"]
        return out
    for m in p.get("moves", []):
        moved = furniture_at(m["at"])
        f = next(x for x in moved if x["id"] == m["id"])
        for g in moved:
            if g["id"] != f["id"] and overlap(f, g):
                errs.append(f"Đồ {f['id']} sau khi dịch chuyển ({m['at']} s) chồng lên {g['id']}")
        if f["x"] < 0 or f["y"] < 0 or f["x"] + f["w"] > W or f["y"] + f["d"] > D:
            errs.append(f"Đồ {f['id']} bị dịch ra ngoài phòng")
    # 4 Đường đi (với vị trí đồ đạc tại thời điểm bắt đầu đi)
    zones = door_zones(p)
    out_objs = p.get("outside_objects", [])
    for path in p["paths"]:
        if path.get("area") == "ngoài":
            # Đường ngoài trời: không được vào trong toa (thân toa + bán kính), không xuyên vật thể bên ngoài
            r = p["characters"][path["who"]]["radius"]
            hit, length = set(), 0.0
            pts = path["points"]
            for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
                seg = math.hypot(x1 - x0, y1 - y0)
                n = max(1, int(seg / STEP))
                for k in range(n + 1):
                    x, y = x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n
                    wt = max(w["thickness"] for w in p["walls"])
                    if -wt - r < x < W + wt + r and -wt - r < y < D + wt + r:
                        hit.add("thân toa")
                    for o in out_objs:
                        if rect_dist(x, y, o) < r - 1e-9:
                            hit.add(o["id"])
                length += seg
            path["_length"], path["_ok"] = round(length, 2), not hit
            if hit:
                errs.append(f"Đường {path['id']} ({path['who']}) xuyên qua: {', '.join(sorted(hit))}")
            continue
        fl = furniture_at(path.get("t0", 0))
        who = p["characters"][path["who"]]
        r = who["radius"]
        own = who.get("seat")
        if any(m["id"] == own and m["at"] <= path.get("t0", 0) for m in p.get("moves", [])):
            own = None  # ghế đã bị đẩy đi → phải kiểm tra như mọi đồ khác
        pts = path["points"]
        length = 0.0
        hit = set()
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            seg = math.hypot(x1 - x0, y1 - y0)
            n = max(1, int(seg / STEP))
            for k in range(n + 1):
                x, y = x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n
                # tường (trừ ô cửa)
                in_door = any((ax == "y" and abs(x - pos) < 0.6 and lo + r <= y <= hi - r) or
                              (ax == "x" and abs(y - pos) < 0.6 and lo + r <= x <= hi - r) for ax, pos, lo, hi in zones)
                if not in_door and (x < r - 1e-9 or y < r - 1e-9 or x > W - r + 1e-9 or y > D - r + 1e-9):
                    hit.add("tường")
                for f in fl:
                    if f["id"] == own:
                        continue
                    if f.get("mounted", 0) > 1.0:  # treo cao hơn đầu gối → không cản bước chân
                        continue
                    if rect_dist(x, y, f) < r - 1e-9:
                        hit.add(f["id"])
            length += seg
        path["_length"] = round(length, 2)
        path["_ok"] = not hit
        if hit:
            errs.append(f"Đường {path['id']} ({path['who']}) xuyên qua: {', '.join(sorted(hit))}")
    # 4b Người với người: đường đi không được xuyên qua người đang đứng/ngồi yên tại cùng thời điểm
    def where(key, t):
        ch = p["characters"][key]
        if ch.get("offscreen"):
            return None
        if ch.get("appear") is not None and t < ch["appear"]:
            return None  # chưa có mặt trong cảnh (ví dụ hàng xóm chỉ ra hành lang sau tiếng "rầm")
        pos = char_pos(p, key)
        for q in sorted([q for q in p["paths"] if q["who"] == key and q.get("area") != "ngoài"], key=lambda q: q.get("t0", 0)):
            if t >= q.get("t1", q.get("t0", 0)):
                pos = q["points"][-1]
            elif t >= q.get("t0", 0):
                return None  # đang đi – kiểm tra riêng
        return pos
    for path in p["paths"]:
        if path.get("area") == "ngoài" or "t1" not in path:
            continue
        pts, r = path["points"], p["characters"][path["who"]]["radius"]
        segs = [math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(pts, pts[1:])]
        total = sum(segs) or 1
        for k in range(0, 101):
            u, t = k / 100, path["t0"] + (path["t1"] - path["t0"]) * k / 100
            dist, x, y = u * total, pts[0][0], pts[0][1]
            for (a, b), sl in zip(zip(pts, pts[1:]), segs):
                if dist <= sl:
                    x, y = a[0] + (b[0] - a[0]) * dist / sl, a[1] + (b[1] - a[1]) * dist / sl
                    break
                dist -= sl
            for other in p["characters"]:
                if other in (path["who"], "ICH") and path["who"] != "ICH" and other == "ICH":
                    continue
                if other == path["who"]:
                    continue
                pos = where(other, t)
                if pos and math.hypot(pos[0] - x, pos[1] - y) < r + p["characters"][other]["radius"]:
                    errs.append(f"Đường {path['id']} ({path['who']}) đi xuyên qua {other} lúc {t:.1f} s")
                    break
            else:
                continue
            break
    # 5 Máy quay
    for c in p["cameras"]:
        x, y, z = c["pos"]
        for q in c.get("path", []):
            if not (0 < q[0] < W and 0 < q[1] < D):
                errs.append(f"Đường máy quay {c['id']} ra ngoài toa")
        if not (0 < x < W and 0 < y < D and 0 < z < p["size"]["h"]):
            errs.append(f"Máy quay {c['id']} nằm ngoài phòng")
        for f in fl:
            if rect_dist(x, y, f) == 0 and z < f["h"]:
                errs.append(f"Máy quay {c['id']} nằm bên trong {f['id']}")
    # 6 Chỗ ngồi tồn tại
    for k, ch in p["characters"].items():
        if ch.get("seat") and ch["seat"] not in F:
            errs.append(f"Nhân vật {k}: không tìm thấy ghế {ch['seat']}")
    return errs, notes


def char_pos(p, key):
    ch = p["characters"][key]
    if ch.get("offscreen"):
        return ch["start"]
    if ch.get("seat"):
        return next(f for f in p["furniture"] if f["id"] == ch["seat"])["seat"]
    return ch["start"]


def in_view(p, cam):
    """Những nhân vật nằm trong góc nhìn ngang của máy quay."""
    x, y, _ = cam["pos"]
    yaws = cam["yaw"] if isinstance(cam["yaw"], list) else [cam["yaw"], cam["yaw"]]
    lo, hi = min(yaws) - cam["fov"] / 2, max(yaws) + cam["fov"] / 2
    out = []
    for k in p["characters"]:
        if k == "ICH":
            continue
        cx, cy = char_pos(p, k)
        ang = math.degrees(math.atan2(cx - x, cy - y))
        if any(lo <= ang + k <= hi for k in (-360, 0, 360)):
            out.append(f"{k} ({ang:+.0f}°)")
    return out


# ---------------------------------------------------------------- vẽ ----
def draw(p, out_png):
    S = p.get("draw_scale", 110)  # px/m
    W, D = p["size"]["w"], p["size"]["d"]
    ext = p.get("draw_outside", [0, 0, 0, 0])  # Meter außen: links, unten, rechts, oben
    M = 140
    MX0, MY0 = M + ext[0] * S, M + ext[3] * S
    img = Image.new("RGB", (int(W * S + 2 * M + (ext[0] + ext[2]) * S), int(D * S + 2 * M + (ext[1] + ext[3]) * S)), "#f4f1ea")
    g = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)
        big = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
    except OSError:
        font = big = ImageFont.load_default()
    T = lambda x, y: (MX0 + x * S, MY0 + (D - y) * S)  # y hướng lên trên ảnh
    if any(ext):
        g.rectangle([T(-ext[0], D + ext[3]), T(W + ext[2], -ext[1])], fill="#e6ecef")
        g.text((T(-ext[0], D + ext[3])[0] + 6, T(-ext[0], D + ext[3])[1] + 6), "BÊN NGOÀI (tuyết)", fill="#6f8a99", font=font)
    for o in p.get("outside_objects", []):
        g.rectangle([T(o["x"], o["y"] + o["d"]), T(o["x"] + o["w"], o["y"])], fill=o.get("color", "#9fb3a0"), outline="#555")
        g.text((T(o["x"], o["y"] + o["d"])[0] + 3, T(o["x"], o["y"] + o["d"])[1] + 3), o["id"], fill="#2d3324", font=font)
    # sàn
    g.rectangle([T(0, D), T(W, 0)], fill="#ffffff")
    # đồ đạc
    for f in p["furniture"]:
        col = {"Bàn": "#c9b48f", "Ghế": "#8fa3b8", "Lò": "#d9a0a0", "Bảng": "#4a5a6a", "Dãy": "#a89a85", "Móc": "#9aa58a", "Thùng": "#777"}
        c = next((v for k, v in col.items() if f["type"].startswith(k)), "#bbb")
        g.rectangle([T(f["x"], f["y"] + f["d"]), T(f["x"] + f["w"], f["y"])], fill=c, outline="#555")
    # tường
    t = 10
    g.rectangle([T(0, D)[0] - t, T(0, D)[1] - t, T(W, 0)[0] + t, T(W, 0)[1] + t], outline="#2d3324", width=t)
    # cửa sổ
    for w in p["windows"]:
        axis, pos = wall_axis(p, w["wall"])
        a, b = w["center"] - w["width"] / 2, w["center"] + w["width"] / 2
        p0, p1 = (T(pos, a), T(pos, b)) if axis == "y" else (T(a, pos), T(b, pos))
        g.line([p0, p1], fill="#6fb6e8", width=t + 2)
        g.text((p0[0] - 120 if axis == "y" else p0[0], (p0[1] + p1[1]) / 2 - 8), w["id"], fill="#2a6f9e", font=font)
    # cửa + cung mở
    for d in p["doors"]:
        axis, pos = wall_axis(p, d["wall"])
        a, b = d["center"] - d["width"] / 2, d["center"] + d["width"] / 2
        p0, p1 = (T(pos, a), T(pos, b)) if axis == "y" else (T(a, pos), T(b, pos))
        off = t / 2 * (1 if pos > 0 else -1)  # Mitte der Wandlinie
        q0, q1 = ((p0[0] + off, p0[1]), (p1[0] + off, p1[1])) if axis == "y" else ((p0[0], p0[1] - off), (p1[0], p1[1] - off))
        g.line([q0, q1], fill="#f4f1ea", width=t + 6)
        if d.get("kind") == "trượt":
            # hai cánh trượt: vẽ cánh nằm song song tường, mũi tên theo hướng trượt
            inward = 1 if (pos == 0) else -1  # vào trong phòng trên ảnh
            sh = (0, 0)
            if axis == "x":
                yy = q0[1] + inward * (-9 if pos == 0 else 9) * -1
                mid = (q0[0] + q1[0]) / 2
                g.line([(q0[0], yy), (mid - 2, yy)], fill="#b5532a", width=5)
                g.line([(mid + 2, yy), (q1[0], yy)], fill="#b5532a", width=5)
                for xx, dx in ((q0[0] + 6, -1), (q1[0] - 6, 1)):
                    g.polygon([(xx + dx * 14, yy), (xx, yy - 6), (xx, yy + 6)], fill="#b5532a")
                g.text((q0[0], yy + (12 if pos == 0 else -26)), d["id"], fill="#b5532a", font=font)
            else:
                xx = q0[0] + (9 if pos == 0 else -9)
                g.line([(xx, q0[1]), (xx, q1[1])], fill="#b5532a", width=5)
                g.text((xx + (8 if pos == 0 else -110), (q0[1] + q1[1]) / 2 - 8), d["id"], fill="#b5532a", font=font)
            continue
        if axis == "x":
            # cửa trên tường Bắc/Nam: cánh vuông góc với tường, cung 90° vẽ bằng đường gấp khúc
            hinge_x = b if d["hinge"] == "phía Đông" else a
            free_x = a if hinge_x == b else b
            into = -1 if pos > 0 else 1  # hướng vào trong phòng (trục y thế giới)
            dirw = into if d.get("inward") else -into
            leaf = T(hinge_x, pos + dirw * d["width"])
            g.line([T(hinge_x, pos), leaf], fill="#b5532a", width=4)
            pts = [T(hinge_x + (free_x - hinge_x) * math.sin(k / 20 * math.pi / 2),
                     pos + dirw * d["width"] * math.cos(k / 20 * math.pi / 2)) for k in range(21)]
            g.line(pts, fill="#b5532a", width=2)
            g.text((leaf[0] + 4, leaf[1] - (14 if dirw > 0 else 0)), d["id"], fill="#b5532a", font=font)
            continue
        hinge_y = b if d["hinge"] == "phía Bắc" else a
        hx, hy = T(pos, hinge_y)
        R = d["width"] * S
        sign_out = 1 if pos == W else -1  # ra ngoài = khỏi phòng
        sign_out = sign_out if not d.get("inward") else -sign_out
        # cánh cửa mở 90° + cung
        free_y = a if hinge_y == b else b
        fy = T(pos, free_y)[1]
        g.line([(hx, hy), (hx + sign_out * R, hy)], fill="#b5532a", width=4)
        box = [hx - R, hy - R, hx + R, hy + R]
        start = 0 if sign_out > 0 else 180
        if fy > hy:  # cánh nằm phía dưới bản lề trên ảnh
            g.arc(box, start=0 if sign_out > 0 else 90, end=90 if sign_out > 0 else 180, fill="#b5532a", width=2)
        else:
            g.arc(box, start=270 if sign_out > 0 else 180, end=360 if sign_out > 0 else 270, fill="#b5532a", width=2)
        g.text((hx + sign_out * 18 - (90 if sign_out < 0 else 0), (hy + fy) / 2 - 8), d["id"], fill="#b5532a", font=font)
    # đường đi
    pal = ["#c8433a", "#2f4f9a", "#3f8a83", "#7a5cc8"]
    for i, path in enumerate(p["paths"]):
        pts = [T(x, y) for x, y in path["points"]]
        g.line(pts, fill=pal[i % 4], width=5, joint="curve")
        (ex, ey), (sx, sy) = pts[-1], pts[-2]
        ang = math.atan2(ey - sy, ex - sx)
        g.polygon([(ex, ey), (ex - 16 * math.cos(ang - 0.4), ey - 16 * math.sin(ang - 0.4)), (ex - 16 * math.cos(ang + 0.4), ey - 16 * math.sin(ang + 0.4))], fill=pal[i % 4])
        g.text((pts[0][0] + 8, pts[0][1] - 22), path["id"], fill=pal[i % 4], font=font)
    # nhân vật
    for k, ch in p["characters"].items():
        x, y = char_pos(p, k)
        cx, cy = T(x, y)
        r = ch["radius"] * S
        g.ellipse([cx - r, cy - r, cx + r, cy + r], outline="#2d3324", width=3, fill="#ffe9a8" if k == "ICH" else "#fff6e0")
        g.text((cx - 22, cy - 7), k[:7], fill="#2d3324", font=font)
    # máy quay (mũi tên hướng nhìn)
    for c in p["cameras"]:
        x, y, _ = c["pos"]
        cx, cy = T(x, y)
        for yv in (c["yaw"] if isinstance(c["yaw"], list) else [c["yaw"]]):
            a = math.radians(yv)
            ex, ey = cx + 95 * math.sin(a), cy - 95 * math.cos(a)
            g.line([(cx, cy), (ex, ey)], fill="#d9632f", width=2)
            g.text((ex + 3, ey - 7), c["id"], fill="#d9632f", font=font)
    # chú thích
    g.text((M, 30), f"{p['name']} · {W:g} × {D:g} × {p['size']['h']:g} m · nhìn từ trên xuống (Bắc ở trên)", fill="#2d3324", font=big)
    g.text((M, 60), "Đỏ/xanh: đường đi · cam: hướng máy quay · nâu: cửa + chiều mở · xanh nhạt: cửa sổ", fill="#2d3324", font=font)
    for i in range(int(W) + 1):
        g.text((T(i, 0)[0] - 4, T(i, 0)[1] + 18), f"{i}", fill="#888", font=font)
    for i in range(int(D) + 1):
        g.text((MX0 - 40, T(0, i)[1] - 7), f"{i}", fill="#888", font=font)
    img.save(out_png)


# -------------------------------------------------------------- plan.md ----
def fmt(v):
    return f"{v:.2f}".replace(".", ",")


def write_md(p, loc_dir, errs):
    W, D, H = p["size"]["w"], p["size"]["d"], p["size"]["h"]
    L = []
    a = L.append
    a(f"# Mặt bằng: {p['name']}\n")
    a("> File này được **sinh tự động** từ `plan.json` bởi `scripts/plan_tool.py`. Muốn sửa thì sửa `plan.json` rồi chạy lại công cụ.\n")
    a(f"![Mặt bằng](plan.png)\n")
    if p.get("draw_overview"):
        a("![Xung quanh](plan-umgebung.png)\n")
    a("## Kết quả kiểm tra\n")
    a("✅ Không có va chạm: không đường đi nào xuyên tường hay đồ đạc, cửa mở không va đồ, máy quay không nằm trong vật thể.\n" if not errs
      else "❌ **Có lỗi:**\n" + "\n".join(f"- {e}" for e in errs) + "\n")
    a("## Kích thước & hệ toạ độ\n")
    a(f"- Kích thước phòng: **{fmt(W)} m (rộng, Tây→Đông) × {fmt(D)} m (sâu, Nam→Bắc) × {fmt(H)} m (cao)**")
    a(f"- Gốc toạ độ: {p['origin']}")
    a("- Hướng máy quay (yaw): " + p.get("yaw_note", "0° = Bắc (nhìn lên bảng), +90° = Đông (phía cửa ra vào), −90° = Tây (phía cửa sổ)") + "\n")
    a("## Tường\n")
    a("| ID | Tường | Từ → Đến (m) | Dày | Vật liệu | Ghi chú |\n|---|---|---|---|---|---|")
    for w in p["walls"]:
        a(f"| {w['id']} | {w['name']} | ({fmt(w['from'][0])}; {fmt(w['from'][1])}) → ({fmt(w['to'][0])}; {fmt(w['to'][1])}) | {fmt(w['thickness'])} m | {w['material']} | {w['note']} |")
    a("\n## Cửa ra vào\n")
    a("| ID | Tường | Vị trí (tâm) | Rộng × cao | Bản lề | **Hướng mở** | Ghi chú |\n|---|---|---|---|---|---|---|")
    for d in p["doors"]:
        axis = "y" if d["wall"] in ("ost", "west") else "x"
        a(f"| {d['id']} | {d['wall']} | {axis} = {fmt(d['center'])} m | {fmt(d['width'])} × {fmt(d['height'])} m | {d['hinge']} | **{d['swing']}** | {d['note']} |")
    a("\n## Cửa sổ\n")
    a("| ID | Tường | Vị trí (tâm) | Rộng × cao | Bậu cửa | Cách mở | Nhìn ra |\n|---|---|---|---|---|---|---|")
    for w in p["windows"]:
        a(f"| {w['id']} | {w['wall']} | {'x' if w['wall'] in ('nord', 'sued') else 'y'} = {fmt(w['center'])} m | {fmt(w['width'])} × {fmt(w['height'])} m | {fmt(w['sill'])} m | {w['opening']} | {w['view']} |")
    a("\n## Cầu thang\n")
    a(("\n".join(f"- {s}" for s in p["stairs"]) + "\n") if p["stairs"] else f"- Không có. {p['stairs_note']}\n")
    a("## Đồ nội thất (từng món)\n")
    a("| ID | Loại | x từ–đến (m) | y từ–đến (m) | Cao | Ghi chú |\n|---|---|---|---|---|---|")
    for f in p["furniture"]:
        extra = f"chỗ ngồi ({fmt(f['seat'][0])}; {fmt(f['seat'][1])})" if f.get("seat") else f.get("note", "")
        a(f"| {f['id']} | {f['type']} | {fmt(f['x'])}–{fmt(f['x'] + f['w'])} | {fmt(f['y'])}–{fmt(f['y'] + f['d'])} | {fmt(f['h'])} m | {extra} |")
    a("\n## Nhân vật & vị trí\n")
    a("| Nhân vật | Figur | Vị trí (x; y) | Chỗ | Bán kính thân | Ghi chú |\n|---|---|---|---|---|---|")
    for k, ch in p["characters"].items():
        x, y = char_pos(p, k)
        a(f"| {k} | {ch['figure']} | ({fmt(x)}; {fmt(y)}) | {ch.get('seat', 'ngoài khung hình' if ch.get('offscreen') else 'đứng')} | {fmt(ch['radius'])} m | {ch['note']} |")
    if p.get("moves"):
        a("\n## Đồ đạc di chuyển trong cảnh\n")
        a("| Đồ | Lúc | Dịch chuyển | Lý do |\n|---|---|---|---|")
        for m in p["moves"]:
            a(f"| {m['id']} | {fmt(m['at'])} s | x {m['dx']:+.2f} m, y {m['dy']:+.2f} m | {m['note']} |")
    if p.get("seated_turns"):
        a("\n## Xoay người khi ngồi\n")
        a(p["seated_turns"]["_info"] + "\n")
        for k, v in p["seated_turns"].items():
            if k != "_info":
                a(f"- **{k}:** {v}")
    a("\n## Đường di chuyển\n")
    a("Mỗi đường được kiểm tra theo từng cm, tính cả bán kính thân người: không được chạm tường (trừ khi đi qua cửa) và không được chạm đồ đạc.\n")
    a("| ID | Ai | Câu thoại | Thời gian | Các điểm (x; y) | Dài | Kiểm tra | Mô tả |\n|---|---|---|---|---|---|---|---|")
    for w in p["paths"]:
        pts = " → ".join(f"({fmt(x)}; {fmt(y)})" for x, y in w["points"])
        a(f"| {w['id']} | {w['who']} | {w['lines']} | {w['time']} | {pts} | {fmt(w['_length'])} m | {'✅' if w['_ok'] else '❌'} | {w['note']} |")
    a("\n## Vị trí máy quay theo từng góc quay\n")
    a("Toàn bộ là góc nhìn thứ nhất (POV) với ống kính fisheye 0.5x (góc ngang 120°).\n")
    a("| Góc | Câu | Thời gian | Vị trí (x; y; z) | Yaw | Pitch | FOV | Nhân vật trong khung | Thấy gì | Tay làm gì |\n|---|---|---|---|---|---|---|---|---|---|")
    for c in p["cameras"]:
        x, y, z = c["pos"]
        yaw = f"{c['yaw'][0]:+d}° → {c['yaw'][1]:+d}°" if isinstance(c["yaw"], list) else f"{c['yaw']:+d}°"
        a(f"| {c['id']} | {c['lines']} | {c.get('time', '–')} | ({fmt(x)}; {fmt(y)}; {fmt(z)}) | {yaw} | {c['pitch']:+d}° | {c['fov']}° | {', '.join(in_view(p, c)) or '–'} | {c['sees']} | {c['hands']} |")
    if p.get("outside_objects"):
        a("\n## Vật thể bên ngoài\n")
        a("| ID | Loại | x từ–đến (m) | y từ–đến (m) | Cao | Ghi chú |\n|---|---|---|---|---|---|")
        for o in p["outside_objects"]:
            a(f"| {o['id']} | {o['type']} | {fmt(o['x'])}–{fmt(o['x'] + o['w'])} | {fmt(o['y'])}–{fmt(o['y'] + o['d'])} | {fmt(o['h'])} m | {o.get('note', '')} |")
    a("\n## Bên ngoài\n")
    for k, v in p["outside"].items():
        a(f"- **{k}:** {v}")
    (loc_dir / "plan.md").write_text("\n".join(L) + "\n", encoding="utf-8")


def main():
    loc_dir = Path(sys.argv[1]).resolve()
    p = json.loads((loc_dir / "plan.json").read_text(encoding="utf-8"))
    errs, _ = validate(p)
    draw(p, loc_dir / "plan.png")
    if p.get("draw_overview"):
        ov = dict(p, draw_scale=p["draw_overview"]["scale"], draw_outside=p["draw_overview"]["outside"])
        draw(ov, loc_dir / "plan-umgebung.png")
    if errs:
        print("❌ Kiểm tra thất bại – plan.md không được cập nhật:")
        for e in errs:
            print("  -", e)
        sys.exit(1)
    write_md(p, loc_dir, errs)
    print(f"✅ {p['id']}: {len(p['furniture'])} đồ đạc, {len(p['doors'])} cửa, {len(p['windows'])} cửa sổ, "
          f"{len(p['paths'])} đường đi, {len(p['cameras'])} góc quay – không va chạm")
    for w in p["paths"]:
        print(f"   {w['id']}: {w['_length']} m ✅")
    print(f"→ {loc_dir / 'plan.md'}\n→ {loc_dir / 'plan.png'}")


if __name__ == "__main__":
    main()
