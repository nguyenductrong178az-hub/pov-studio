#!/usr/bin/env python3
"""Kiểm tra video theo CLAUDE.md.

  python3 scripts/review_video.py out/klassenzimmer/klassenzimmer.mp4 [--every 2] [--at 4,10]

- Xuất khung hình tĩnh mỗi N giây (hoặc đúng các giây trong --at) → <video>_review/frame_XXs.png
- Ghép bảng ảnh tổng hợp có ghi giây → <video>_review/contact_sheet.jpg
- Tự đo: định dạng (1920×1080, 60 fps), độ dài, khung đầu có đen không,
  tiếng nổ đầu tiên (đỉnh âm lượng), khoảng trống giữa các câu thoại.
Phần nhìn (tay, va chạm, phong cách) vẫn phải xem bằng mắt trên bảng ảnh.
"""
import argparse
import json
import subprocess
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageStat

ROOT = Path(__file__).resolve().parent.parent


def probe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate:format=duration",
                        "-of", "json", str(path)], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def grab(path, t, out):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", str(path), "-frames:v", "1", str(out)], check=True)


def first_loud(path, thresh=0.5):
    tmp = Path(path).with_suffix(".review.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-ac", "1", "-ar", "8000", "-c:a", "pcm_s16le", str(tmp)], check=True)
    with wave.open(str(tmp)) as w:
        n, sr = w.getnframes(), w.getframerate()
        data = w.readframes(n)
    tmp.unlink()
    import array
    a = array.array("h", data)
    peak = max(abs(x) for x in a) or 1
    win = sr // 50
    for i in range(0, len(a) - win, win):
        if max(abs(x) for x in a[i:i + win]) >= thresh * 32767:
            return i / sr, peak / 32767
    return None, peak / 32767


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--every", type=float, default=2.0)
    ap.add_argument("--at", default="")
    ap.add_argument("--timeline", default="scenes/klassenzimmer/timeline.json")
    a = ap.parse_args()
    video = (ROOT / a.video).resolve()
    rdir = video.parent / (video.stem + "_review"); rdir.mkdir(exist_ok=True)
    info = probe(video)
    dur = float(info["format"]["duration"])
    vs = next(s for s in info["streams"] if s["codec_type"] == "video")
    num, den = map(int, vs["r_frame_rate"].split("/"))
    times = [float(x) for x in a.at.split(",") if x] or [round(i * a.every, 2) for i in range(int(dur // a.every) + 1)]
    times = [min(t, dur - 0.02) for t in times]
    frames = []
    for t in times:
        f = rdir / f"frame_{t:05.1f}s.png"
        grab(video, t, f)
        frames.append((t, f))
    # Bảng ảnh tổng hợp
    cols = 4
    tw, th = 640, 360
    rows = (len(frames) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw, rows * (th + 34)), "#1b1b1f")
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
    except OSError:
        font = ImageFont.load_default()
    for i, (t, f) in enumerate(frames):
        im = Image.open(f).convert("RGB").resize((tw, th))
        x, y = (i % cols) * tw, (i // cols) * (th + 34)
        sheet.paste(im, (x, y + 34))
        d.text((x + 10, y + 5), f"{t:.1f} s", fill="#ffffff", font=font)
    name = "contact_sheet.jpg" if not a.at else "contact_sheet_recheck.jpg"
    sheet.save(rdir / name, quality=90)
    # Tự đo
    report = {"video": str(video.relative_to(ROOT)), "duration_s": round(dur, 2), "size": f"{vs['width']}x{vs['height']}", "fps": round(num / den, 2)}
    l0 = ImageStat.Stat(Image.open(frames[0][1]).convert("L")).mean[0]
    report["frame0_luma"] = round(l0, 1)
    if any(s["codec_type"] == "audio" for s in info["streams"]):
        t_loud, peak = first_loud(video)
        report["first_bang_s"] = None if t_loud is None else round(t_loud, 2)
        report["audio_peak"] = round(peak, 2)
    else:
        report["first_bang_s"] = None
    tl_path = ROOT / a.timeline
    if tl_path.exists():
        tl = json.loads(tl_path.read_text(encoding="utf-8"))
        lines = tl["lines"]
        gaps = [round(lines[0]["start"], 2)] + [round(b["start"] - a_["end"], 2) for a_, b in zip(lines, lines[1:])] + [round(dur - lines[-1]["end"], 2)]
        report["line_gaps_s"] = gaps
        report["max_gap_s"] = max(gaps)
        report["line_durations_s"] = [round(l["end"] - l["start"], 2) for l in lines]
    (rdir / "auto_checks.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))
    print(f"→ {rdir.relative_to(ROOT)}/{name} ({len(frames)} khung)")


if __name__ == "__main__":
    main()
