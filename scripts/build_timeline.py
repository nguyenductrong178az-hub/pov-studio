#!/usr/bin/env python3
"""Baut die Zeitleiste einer Szene aus der ECHTEN Länge jeder Audiodatei.

  python3 scripts/build_timeline.py scenes/nachtzug-01 [--start 0.5] [--gap 0.3] [--beat-gap 0.6] [--card 8]

Eingabe: out/audio/<id>/report.json (von voice_pipeline.py) + die mp3-Dateien.
- Pro Datei wird per FFmpeg-silencedetect gemessen, wo die Sprache beginnt/endet (Stille am Rand zählt nicht).
- Dialogzeilen (01, 02 …) liegen nacheinander: Sprechbeginn = Ende der vorigen Sprache + gap
  (+ beat-gap an jedem neuen „## Beat“).
- Gemurmel (M01 …) liegt leise unter dem Dialog im eigenen Beat, ohne sich gegenseitig zu überlappen.
- Danach die Endkarte (--card Sekunden).
Ausgabe: scenes/<id>/timeline.json (einzige Zeitquelle für Bild, Untertitel, Ton)
         out/audio/<id>/dialog_mix.wav (Dialog + Gemurmel, zum Anhören/Prüfen)
Pausen: Zeile „#! pause <s> <label>“ im Skript direkt vor einer Dialogzeile → stille Lücke vor dieser Zeile,
         reserviert für ein Geräusch mit sichtbarer Quelle (knock, radio, buzz, impact, walk). Liegt eine Pause am
         Beat-Anfang, ersetzt sie die Beat-Lücke. → timeline.json "pauses" (Szene + Geräusche lesen dieselben Zeiten).
Prüft: jede Dialogzeile ≤ 4 s (sonst bis ×1.08 beschleunigt), Takt Zeilenbeginn→Zeilenbeginn ≥ 2 s, Gesamtlänge 1:45–2:15.
"""
import argparse
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def measure(path: Path, noise_db=-42, min_sil=0.12):
    """→ (Dateilänge, Sprachbeginn, Sprachende) in Sekunden."""
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                               capture_output=True, text=True, check=True).stdout.strip())
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", f"silencedetect=n={noise_db}dB:d={min_sil}", "-f", "null", "-"],
                       capture_output=True, text=True)
    starts = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", r.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    s0 = ends[0] if starts and starts[0] <= 0.02 and ends else 0.0
    e0 = dur
    if starts and starts[-1] > s0 and (len(ends) < len(starts) or ends[-1] >= dur - 0.05):
        e0 = starts[-1]
    return round(dur, 3), round(s0, 3), round(e0, 3)


PAUSE_RE = re.compile(r"^#!\s*pause\s+([\d.]+)\s+(\w+)")


def script_pauses(sdir: Path, scene: dict) -> dict:
    """→ {Zeilen-ID: (Sekunden, Label)} aus „#! pause“-Zeilen der Dialogdatei."""
    files = scene["script"] if isinstance(scene["script"], list) else [scene["script"]]
    out, k, pend = {}, 0, None
    for raw in (sdir / files[0]).read_text(encoding="utf-8").splitlines():
        m = PAUSE_RE.match(raw.strip())
        if m:
            pend = (float(m.group(1)), m.group(2))
        elif raw.strip().startswith("@"):
            k += 1
            if pend:
                out[f"{k:02d}"] = pend
                pend = None
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("scene_dir")
    ap.add_argument("--start", type=float, default=0.5, help="Sprechbeginn der ersten Zeile (Knall/Klopfen bei 0)")
    ap.add_argument("--gap", type=float, default=0.3)
    ap.add_argument("--beat-gap", type=float, default=0.6)
    ap.add_argument("--card", type=float, default=8.0, help="Länge der Endkarte „Was würdest du tun?“")
    ap.add_argument("--crowd-vol", type=float, default=0.22)
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--max-tempo", type=float, default=1.08, help="max. Beschleunigung für Zeilen > 4 s")
    a = ap.parse_args()
    sdir = (ROOT / a.scene_dir).resolve()
    scene = json.loads((sdir / "scene.json").read_text(encoding="utf-8"))
    adir = ROOT / "out" / "audio" / scene["id"]
    rep = json.loads((adir / "report.json").read_text(encoding="utf-8"))
    names = {k: v.get("name", k.title()) for k, v in scene.get("display_names", {}).items()}

    dialog = [l for l in rep["lines"] if l.get("kind", "dialog") == "dialog"]
    pauses_in = script_pauses(sdir, scene)
    pauses = []
    prev_end = 0.0
    crowd = [l for l in rep["lines"] if l.get("kind") == "crowd"]
    warnings = []

    # ---- Dialog
    t, beat, beats, out_lines = a.start, None, {}, []
    for l in dialog:
        dur, s0, e0 = measure(ROOT / l["file"])
        pz = pauses_in.get(l["id"])
        if beat is not None and l.get("beat") != beat and not pz:
            t += a.beat_gap
        if pz:
            p0 = prev_end + 0.05 if out_lines else 0.05
            t = max(t, p0 + pz[0] + 0.05)
            pauses.append({"before": l["id"], "label": pz[1], "start": round(p0, 3), "end": round(t - 0.05, 3)})
        if l.get("beat") != beat:
            beats[l.get("beat")] = round(t, 2)
            beat = l.get("beat")
        speech = e0 - s0
        src = ROOT / l["file"]
        tempo = 1.0
        if speech > 4.0 and speech <= 4.0 * a.max_tempo:
            # leicht beschleunigen (Tonhöhe bleibt), damit die Zeile in 2–4 s passt
            tempo = round(speech / 3.98, 4)
            fit = src.with_name(src.stem + "_fit.wav")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-af", f"atempo={tempo}", str(fit)], check=True)
            dur, s0, e0 = measure(fit)
            speech = e0 - s0
            l = {**l, "file": str(fit.relative_to(ROOT))}
        start = t - s0  # Datei so legen, dass die Sprache genau bei t beginnt
        out_lines.append({"id": l["id"], "speaker": l["speaker"], "name": names.get(l["speaker"], l["speaker"].title()),
                          "tags": l["tags"], "text": l["text"], "file": l["file"], "beat": l.get("beat"),
                          "file_start": round(start, 3), "start": round(t, 3), "end": round(t + speech, 3),
                          "speech_s": round(speech, 2), "tempo": tempo, "ok_transcript": l.get("ok")})
        if speech > 4.0:
            warnings.append(f"Zeile {l['id']} ({l['speaker']}): {speech:.2f} s gesprochen – länger als 4 s")
        prev_end = t + speech
        # Takt: nächste Zeile frühestens 2 s nach Beginn dieser Zeile (kurze Ausrufe bekommen eine Pause)
        t += max(speech + a.gap, 2.0)
    dialog_end = out_lines[-1]["end"] if out_lines else 0
    card_start = round(dialog_end + 0.8, 2)
    total = round(card_start + a.card, 2)

    # ---- Gemurmel: im eigenen Beat, nacheinander, leise
    beat_keys = sorted(beats)
    out_crowd, cursor = [], {}
    for l in crowd:
        dur, s0, e0 = measure(ROOT / l["file"])
        b = l.get("beat")
        b0 = beats.get(b, 0.0)
        nxt = next((beats[k] for k in beat_keys if k > b), card_start)
        t0 = max(cursor.get(b, b0 + 1.2), b0 + 1.2)
        if t0 + (e0 - s0) > nxt:
            warnings.append(f"Gemurmel {l['id']} ragt über Beat {b} hinaus ({t0:.1f}–{t0 + e0 - s0:.1f} s, Beat endet {nxt:.1f} s)")
        out_crowd.append({"id": l["id"], "speaker": l["speaker"], "text": l["text"], "file": l["file"], "beat": b,
                          "file_start": round(t0 - s0, 3), "start": round(t0, 3), "end": round(t0 + e0 - s0, 3),
                          "volume": a.crowd_vol, "pan": -0.6 if int(l["id"][1:]) % 2 else 0.6})
        cursor[b] = t0 + (e0 - s0) + 1.0

    gaps = [round(b["start"] - x["end"], 2) for x, b in zip(out_lines, out_lines[1:])]
    cadence = [round(b["start"] - x["start"], 2) for x, b in zip(out_lines, out_lines[1:])]
    plen = {p["before"]: p["end"] - p["start"] for p in pauses}
    bad = [(x["id"], c) for x, b, c in zip(out_lines, out_lines[1:], cadence)
           if not 1.99 <= c <= 4.0 + a.gap + max(a.beat_gap, plen.get(b["id"], 0)) + 0.15]
    for lid, c in bad:
        warnings.append(f"Takt nach Zeile {lid}: {c:.2f} s bis zur nächsten Zeile")
    if not 105 <= total <= 135:
        warnings.append(f"Gesamtlänge {total:.1f} s außerhalb 1:45–2:15")
    tl = {
        "fps": a.fps, "duration_s": total, "source": "echte Audiolängen (build_timeline.py)",
        "lines": [{k: v for k, v in x.items()} for x in out_lines],
        "crowd": out_crowd,
        "beats": {str(k): v for k, v in beats.items()},
        "pauses": pauses,
        "events": {"knock": 0.0, "endcard": [card_start, total]},
        "checks": {"line_count": len(out_lines), "crowd_count": len(out_crowd), "max_gap_s": max(gaps) if gaps else 0, "cadence_s": [min(cadence), max(cadence)] if cadence else None,
                   "first_line_s": out_lines[0]["start"] if out_lines else None, "warnings": warnings},
    }
    (sdir / "timeline.json").write_text(json.dumps(tl, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # ---- Prüf-Mix
    inputs, filt = [], []
    for i, x in enumerate(out_lines + out_crowd):
        inputs += ["-i", str(ROOT / x["file"])]
        d = max(0, int(x["file_start"] * 1000))
        vol = x.get("volume", 1.0)
        pan = x.get("pan", 0.0)
        filt.append(f"[{i}:a]aresample=44100,aformat=channel_layouts=stereo,adelay={d}|{d},volume={vol},"
                    f"pan=stereo|c0={1 - max(0, pan):.2f}*c0|c1={1 + min(0, pan):.2f}*c1[a{i}]")
    n = len(out_lines) + len(out_crowd)
    filt.append("".join(f"[a{i}]" for i in range(n)) + f"amix=inputs={n}:normalize=0,apad,atrim=0:{total}[m]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(filt), "-map", "[m]",
                    str(adir / "dialog_mix.wav")], check=True)

    print(f"Dialog: {len(out_lines)} Zeilen, Ende Sprache {dialog_end:.1f} s · Endkarte {card_start:.1f}–{total:.1f} s")
    print(f"Gemurmel: {len(out_crowd)} Zeilen · Beats: {tl['beats']}")
    print(f"Gesamtlänge: {total:.1f} s ({int(total // 60)}:{total % 60:04.1f})")
    for w in warnings:
        print("  ⚠", w)
    print(f"→ {(sdir / 'timeline.json').relative_to(ROOT)} · {(adir / 'dialog_mix.wav').relative_to(ROOT)}")


if __name__ == "__main__":
    main()
