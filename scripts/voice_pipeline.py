#!/usr/bin/env python3
"""Stimmen-Pipeline für eine Szene (ElevenLabs).

  1. voices   – sucht in der ElevenLabs-Stimmbibliothek Stimmen in der Sprache der Szene,
                weist JEDER Figur eine eigene Stimme zu (Alter, Geschlecht, Persönlichkeit)
                und speichert die Auswahl in scenes/<id>/voices.json
  2. generate – erzeugt jede Dialogzeile mit dem neuesten Modell, das Audio (TTS) kann
  3. verify   – transkribiert jede Datei und erzeugt Zeilen neu, bei denen Wörter fehlen
                oder falsch sind (bis zu --max-tries Versuche)

Sicherheit: Der Schlüssel kommt aus der Umgebungsvariable ELEVENLABS_API_KEY oder – in der Cloud –
als Netzwerk-Secret, das der Proxy in den Header xi-api-key einsetzt (dann steht im Code nur ein Platzhalter).
Er wird nie ausgegeben, nie geloggt und nie in eine Datei geschrieben.

Eingabe (Szenen-Ordner), eines von beiden:
  a) scene.json + script.md   (Zeilen "@SPRECHER [tags]: Text")
  b) lines.json               {"language": "vi", "voices": {"SPRECHER": "<voice_id>"|Platzhalter},
                               "lines": [["id", "SPRECHER", "[tag] Text"], ...]}
     Echte voice_ids werden übernommen; Platzhalter (z. B. "voice-id-1") oder fehlende Sprecher
     werden per Bibliothekssuche besetzt. Stimmprofile: scene.json → speakers, sonst scenes/speakers.json.

Aufruf:  python3 scripts/voice_pipeline.py all scenes/klassenzimmer
         python3 scripts/voice_pipeline.py parse scenes/klassenzimmer-vi   (offline, nur Zeilen prüfen)
"""
from __future__ import annotations

import argparse
import difflib
import json
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

API = "https://api.elevenlabs.io"
ROOT = Path(__file__).resolve().parent.parent

# Reihenfolge = neuestes zuerst. Es wird das erste genommen, das das Konto anbietet,
# TTS kann und die Sprache der Szene unterstützt.
CHANNEL_LANGUAGE = "en"  # Kanal-Regel (ab 25.11.2026): alle Figuren sprechen Englisch (US-Akzent)
CHANNEL_ACCENT = "american"
TTS_PREFERENCE = ["eleven_v4", "eleven_v3", "eleven_multilingual_v2", "eleven_flash_v2_5", "eleven_turbo_v2_5"]
STT_PREFERENCE = ["scribe_v2", "scribe_v1"]
# Modelle, die Audio-Tags wie [scared] verstehen – bei anderen werden Tags entfernt
TAG_MODELS = {"eleven_v4", "eleven_v3"}
# Emotions-Tags stehen im Skript auf Deutsch; eleven_v3 versteht Audio-Tags zuverlässig nur auf Englisch.
# Unbekannte Tags werden NICHT an das Modell geschickt (sonst liest es sie evtl. vor) → Warnung.
TAG_DE_EN = {
    "verzweifelt": "desperate", "schreiend": "shouting", "gedämpft": "muffled", "panisch": "panicked",
    "zitternd vor kälte": "shivering", "bestimmt": "firm", "müde": "tired", "aufgebracht": "upset",
    "ruhig": "calm", "kalt": "cold", "genervt": "annoyed", "ins funkgerät": "talking into a radio",
    "verwirrt": "confused", "geschockt": "shocked", "leise": "quietly", "sachlich": "matter-of-fact",
    "ängstlich": "scared", "flehend": "pleading", "angespannt": "tense", "flüsternd": "whispers",
    "entsetzt": "horrified", "scharf": "sharp", "unsicher": "unsure", "liest vom handy ab": "reading aloud",
    "langsam": "slowly", "misstrauisch": "suspicious", "zu ruhig": "unnervingly calm", "verängstigt": "afraid",
    "drohend": "threatening", "zittrige stimme": "shaky voice", "schwach": "weak", "weinend": "crying",
    "stimme bricht": "voice breaking", "eindringlich": "urgent", "voller angst": "terrified", "bebend": "trembling",
    "hin- und hergerissen": "torn", "besorgt": "worried", "ungläubig": "disbelieving", "murmelnd": "muttering",
    "fröstelnd": "shivering", "nervös": "nervous", "nachdenklich": "thoughtful", "ungeduldig": "impatient",
    "aufgeregt": "excited", "entschlossen": "determined", "mitleidig": "sympathetic", "fassungslos": "stunned",
    "enttäuscht": "disappointed", "frustriert": "frustrated", "erschüttert": "shaken", "drängend": "pressing",
}


# ---------------------------------------------------------------- HTTP ----
class ApiError(RuntimeError):
    pass


def _key() -> str:
    k = os.environ.get("ELEVENLABS_API_KEY", "")
    if not k:
        # Cloud-Umgebung: Netzwerk-Secret für api.elevenlabs.io ersetzt diesen Platzhalter im Header.
        # Der Schlüssel wird nie aus Dateien gelesen.
        return "proxy-injected"
    return k


def _request(method: str, path: str, *, params=None, body: bytes | None = None, ctype: str | None = None,
             accept: str = "application/json", retries: int = 3) -> bytes:
    url = API + path + ("?" + urllib.parse.urlencode(params, doseq=True) if params else "")
    for attempt in range(retries + 1):
        req = urllib.request.Request(url, data=body, method=method)
        req.add_header("xi-api-key", _key())  # Wert wird nirgends ausgegeben
        req.add_header("Accept", accept)
        if ctype:
            req.add_header("Content-Type", ctype)
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            detail = e.read()[:400].decode("utf-8", "replace")
            if e.code in (429, 500, 502, 503) and attempt < retries:
                time.sleep(2 * (attempt + 1))
                continue
            # Fehlertext von ElevenLabs enthält den Schlüssel nicht; Header werden nie ausgegeben
            raise ApiError(f"{method} {path} → HTTP {e.code}: {detail}") from None
        except urllib.error.URLError as e:
            if attempt < retries:
                time.sleep(2 * (attempt + 1))
                continue
            raise ApiError(f"{method} {path} → {e.reason}") from None
    raise ApiError("unreachable")


def get_json(path, params=None):
    return json.loads(_request("GET", path, params=params))


def post_json(path, payload, params=None, accept="application/json"):
    return _request("POST", path, params=params, body=json.dumps(payload).encode(), ctype="application/json", accept=accept)


def post_multipart(path, fields: dict, file_field: str, file_path: Path):
    b = uuid.uuid4().hex
    parts = []
    for k, v in fields.items():
        parts.append(f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    parts.append(
        f'--{b}\r\nContent-Disposition: form-data; name="{file_field}"; filename="{file_path.name}"\r\n'
        f"Content-Type: audio/mpeg\r\n\r\n".encode() + file_path.read_bytes() + b"\r\n"
    )
    parts.append(f"--{b}--\r\n".encode())
    return json.loads(_request("POST", path, body=b"".join(parts), ctype=f"multipart/form-data; boundary={b}"))


# ------------------------------------------------------------- Skript ----
LINE_RE = re.compile(r"^@(?P<spk>[A-ZÄÖÜ_]+)\s*(?:\[(?P<tags>[^\]]*)\])?\s*:\s*(?P<text>.+)$")


BEAT_RE = re.compile(r"^##\s*Beat\s*(\d+)", re.I)


def parse_script(scene_dir: Path, scene: dict) -> list[dict]:
    """scene["script"]: eine Datei oder Liste. Erste Datei = Dialog (IDs 01, 02 …),
    weitere = Gemurmel/Hintergrund (IDs M01, M02 …, kind="crowd")."""
    files = scene["script"] if isinstance(scene["script"], list) else [scene["script"]]
    lines = []
    for fi, fname in enumerate(files):
        beat, k = 0, 0
        for raw in (scene_dir / fname).read_text(encoding="utf-8").splitlines():
            b = BEAT_RE.match(raw.strip())
            if b:
                beat = int(b.group(1))
                continue
            m = LINE_RE.match(raw.strip())
            if not m:
                continue
            spk = m["spk"]
            if spk not in scene["speakers"]:
                sys.exit(f"Sprecher @{spk} fehlt in scene.json → speakers")
            tags = [t.strip() for t in (m["tags"] or "").split(",") if t.strip()]
            k += 1
            lid = f"{k:02d}" if fi == 0 else f"M{k:02d}"
            lines.append({"n": len(lines) + 1, "id": lid, "speaker": spk, "tags": tags, "text": m["text"].strip(),
                          "beat": beat, "kind": "dialog" if fi == 0 else "crowd"})
    return lines


PLACEHOLDER_RE = re.compile(r"^(voice[-_ ]?id[-_ ]?\d*|todo|tbd|)$", re.I)
TAG_PREFIX_RE = re.compile(r"^\s*((?:\[[^\]]*\]\s*)+)")


def load_scene(scene_dir: Path) -> dict:
    """Vereinheitlicht beide Eingabeformate zu: id, language, speakers (Profile), fixed_voices, lines."""
    shared = ROOT / "scenes" / "speakers.json"
    profiles = json.loads(shared.read_text(encoding="utf-8"))["speakers"] if shared.exists() else {}
    if (scene_dir / "lines.json").exists():
        d = json.loads((scene_dir / "lines.json").read_text(encoding="utf-8"))
        lines = []
        for n, (lid, spk, raw) in enumerate(d["lines"], 1):
            m = TAG_PREFIX_RE.match(raw)
            tags = re.findall(r"\[([^\]]*)\]", m.group(1)) if m else []
            text = raw[m.end():].strip() if m else raw.strip()
            lines.append({"n": n, "id": lid, "speaker": spk, "tags": [t.strip() for t in tags], "text": text})
        fixed = {k: v for k, v in d.get("voices", {}).items() if not PLACEHOLDER_RE.match(str(v).strip())}
        scene = {"id": scene_dir.name, "language": d["language"], "speakers": profiles, "fixed_voices": fixed}
    else:
        sc = json.loads((scene_dir / "scene.json").read_text(encoding="utf-8"))
        STT_ALIASES.update({k.lower(): v.lower() for k, v in sc.get("stt_aliases", {}).items()})
        scene = {"id": sc["id"], "language": sc["language"], "speakers": sc.get("speakers") or profiles,
                 "fixed_voices": sc.get("voices", {}), "avoid_voices": sc.get("avoid_voices", [])}
        lines = parse_script(scene_dir, sc | {"speakers": scene["speakers"]})
    # Kanal-Regel (CLAUDE.md): alle Stimmen im Video sind Englisch (US)
    if scene["language"] != CHANNEL_LANGUAGE:
        sys.exit(f"Sprache '{scene['language']}' nicht erlaubt: alle Stimmen im Kanal sind '{CHANNEL_LANGUAGE}' (Englisch, US). "
                 f"In der Szenen-Datei \"language\": \"{CHANNEL_LANGUAGE}\" setzen und die Zeilen auf Englisch schreiben.")
    scene["accent"] = CHANNEL_ACCENT
    used = sorted({l["speaker"] for l in lines}, key=[l["speaker"] for l in lines].index)
    missing = [s for s in used if s not in scene["speakers"] and s not in scene["fixed_voices"]]
    if missing:
        sys.exit(f"Kein Stimmprofil für {missing} – in scenes/speakers.json ergänzen")
    scene["lines"], scene["used_speakers"] = lines, used
    return scene


def spoken_words(text: str) -> list[str]:
    """Normalisiert Text zum Wortvergleich: ohne [Tags], Satzzeichen, Groß/Klein."""
    t = re.sub(r"\[[^\]]*\]", " ", text)
    t = unicodedata.normalize("NFC", t).lower()
    t = re.sub(r"[^\wäöüß]+", " ", t)
    return t.split()


# ----------------------------------------------------------- 1 voices ----
def pick_voice(spk: str, prof: dict, lang: str, used: set[str]) -> dict:
    """Sucht in der öffentlichen Stimmbibliothek, bewertet nach Alter/Geschlecht/Persönlichkeit."""
    cands = {}
    for age in prof["age"]:
        params = {"page_size": 100, "language": lang, "accent": CHANNEL_ACCENT, "gender": prof["gender"], "age": age, "sort": "cloned_by_count"}
        for v in get_json("/v1/shared-voices", params).get("voices", []):
            cands[v["voice_id"]] = v
    if not cands:  # Fallback: ohne Altersfilter
        params = {"page_size": 100, "language": lang, "accent": CHANNEL_ACCENT, "gender": prof["gender"], "sort": "cloned_by_count"}
        for v in get_json("/v1/shared-voices", params).get("voices", []):
            cands[v["voice_id"]] = v
    if not cands:
        raise ApiError(f"Keine {lang}-Stimme ({prof['gender']}) für @{spk} gefunden")

    def score(v):
        hay = " ".join(str(v.get(k) or "") for k in ("descriptive", "use_case", "description", "name", "accent")).lower()
        s = sum(3 for kw in prof["keywords"] if kw in hay)
        s += 4 if v.get("age") in prof["age"] else 0
        s += 2 if (v.get("language") or "").lower() == lang else 0
        s += 3 if CHANNEL_ACCENT in (v.get("accent") or "").lower() else -10
        s += min(5, (v.get("cloned_by_count") or 0) ** 0.25)  # beliebt = meist sauber aufgenommen
        return s

    for v in sorted(cands.values(), key=score, reverse=True):
        if v["voice_id"] not in used:
            return v | {"_score": round(score(v), 2)}
    raise ApiError(f"Alle passenden Stimmen für @{spk} sind schon vergeben")


def cmd_voices(scene_dir: Path, scene: dict) -> dict:
    out = scene_dir / "voices.json"
    lang = scene["language"]
    fixed = scene.get("fixed_voices", {})
    if len(set(fixed.values())) != len(fixed):
        sys.exit("Fehler: dieselbe voice_id ist mehreren Figuren zugewiesen – jede Figur braucht eine eigene Stimme")
    # avoid_voices: Stimmen anderer Figuren aus früheren Videos – neue Figuren dürfen nicht gleich klingen
    used: set[str] = set(fixed.values()) | set(scene.get("avoid_voices", []))
    result = {"scene": scene["id"], "language": lang, "speakers": {}}
    for spk in scene["used_speakers"]:
        prof = scene["speakers"].get(spk, {"figure": spk.lower(), "persona": "–"})
        if spk in fixed:
            info = {}
            try:
                info = get_json(f"/v1/voices/{fixed[spk]}")
            except ApiError:
                pass
            result["speakers"][spk] = {"figure": prof["figure"], "voice_id": fixed[spk], "source": "vorgegeben",
                                       "name": info.get("name"), "labels": info.get("labels"), "persona": prof["persona"]}
            print(f"  @{spk:8s} → vorgegeben: {info.get('name') or fixed[spk]}")
            continue
        v = pick_voice(spk, prof, lang, used)
        used.add(v["voice_id"])
        # Öffentliche Stimme ins eigene Konto übernehmen, damit TTS sie nutzen darf
        new_name = f"pov-{scene['id']}-{prof['figure']}"
        try:
            added = json.loads(post_json(f"/v1/voices/add/{v['public_owner_id']}/{v['voice_id']}", {"new_name": new_name}))
            voice_id = added.get("voice_id", v["voice_id"])
        except ApiError as e:
            msg = str(e).lower()
            if "already" in msg:
                voice_id = v["voice_id"]
            elif "voices_write" in msg or "missing_permissions" in msg:
                # Schlüssel ohne voices_write: Bibliotheksstimme direkt per ID nutzen (TTS funktioniert damit)
                voice_id = v["voice_id"]
            else:
                raise
        result["speakers"][spk] = {
            "figure": prof["figure"], "voice_id": voice_id, "source": "bibliothek", "library_voice_id": v["voice_id"],
            "public_owner_id": v["public_owner_id"], "name": v.get("name"), "gender": v.get("gender"),
            "age": v.get("age"), "accent": v.get("accent"), "language": v.get("language"),
            "descriptive": v.get("descriptive"), "persona": prof["persona"], "score": v["_score"],
            "preview_url": v.get("preview_url"),
        }
        print(f"  @{spk:8s} → {v.get('name')} ({v.get('gender')}, {v.get('age')}, {v.get('accent')})")
    assert len({s["voice_id"] for s in result["speakers"].values()}) == len(result["speakers"]), "Stimme doppelt vergeben"
    out.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"→ {out.relative_to(ROOT)}")
    return result


# ------------------------------------------------------------ Modelle ----
def choose_models(lang: str) -> tuple[str, str]:
    models = get_json("/v1/models")
    avail = {}
    for m in models:
        langs = {(l.get("language_id") or "").lower() for l in m.get("languages", [])}
        if m.get("can_do_text_to_speech") and (not langs or lang in langs):
            avail[m["model_id"]] = m
    tts = next((mid for mid in TTS_PREFERENCE if mid in avail), None) or next(iter(avail), None)
    if not tts:
        raise ApiError(f"Kein TTS-Modell mit Sprache {lang} verfügbar")
    stt = STT_PREFERENCE[0]
    return tts, stt


# --------------------------------------------------------- 2 generate ----
def model_tags(tags: list[str]) -> list[str]:
    out = []
    for t in tags:
        k = t.strip().lower()
        if k in TAG_DE_EN:
            out.append(TAG_DE_EN[k])
        elif re.fullmatch(r"[a-z ,'-]+", k):  # schon Englisch
            out.append(k)
        else:
            print(f"    Warnung: Tag [{t}] unbekannt – wird nicht an das Modell geschickt (TAG_DE_EN ergänzen)")
    return out


def tts_text(line: dict, model: str) -> str:
    tags = model_tags(line["tags"]) if model in TAG_MODELS else []
    if tags:
        return " ".join(f"[{t}]" for t in tags) + " " + line["text"]
    return line["text"]


def synth(line: dict, voice_id: str, model: str, path: Path, seed: int | None):
    payload = {"text": tts_text(line, model), "model_id": model}
    if seed is not None:
        payload["seed"] = seed
    audio = post_json(f"/v1/text-to-speech/{voice_id}", payload, params={"output_format": "mp3_44100_128"}, accept="audio/mpeg")
    path.write_bytes(audio)


# ----------------------------------------------------------- 3 verify ----
def transcribe(path: Path, stt_models: list[str], lang: str) -> tuple[str, str]:
    last = None
    for m in stt_models:
        try:
            r = post_multipart("/v1/speech-to-text", {"model_id": m, "language_code": lang}, "file", path)
            return r.get("text", ""), m
        except ApiError as e:
            last = e
            if "HTTP 4" in str(e) and "model" in str(e).lower():
                continue  # Modell nicht verfügbar → nächstes
            raise
    raise last or ApiError("Kein STT-Modell verfügbar")


# Gleich gesprochene Schreibvarianten (kein echter Fehler der Stimme, nur der Transkription)
SPELLING_EQUIV = {"so was": "sowas", "irgend was": "irgendwas", "gibt's": "gibts",
                  "gonna": "going to", "wanna": "want to", "okay": "ok", "o k": "ok", "mr": "mister", "two 00": "two"}
NUM_WORDS = {"0": "null", "1": "eins", "2": "zwei", "3": "drei", "4": "vier", "5": "fünf", "6": "sechs", "7": "sieben",
             "8": "acht", "9": "neun", "10": "zehn", "15": "fünfzehn", "20": "zwanzig", "30": "dreißig", "90": "neunzig"}
NUM_WORDS_EN = {"2": "two", "10": "ten", "30": "thirty", "5": "five", "1": "one", "3": "three", "4": "four", "20": "twenty", "25": "twenty five", "6": "six"}
STT_ALIASES: dict[str, str] = {}  # pro Szene aus scene.json "stt_aliases" (z. B. Namens-Homophone: brand → brandt)


def _canon(words: list[str]) -> list[str]:
    nums = NUM_WORDS_EN if CHANNEL_LANGUAGE == "en" else NUM_WORDS
    t = " " + " ".join(nums.get(w, STT_ALIASES.get(w, w)) for w in words) + " "
    for k, v in SPELLING_EQUIV.items():
        t = t.replace(f" {k} ", f" {v} ")
    return t.split()


def compare(expected: str, heard: str) -> list[str]:
    a, b = _canon(spoken_words(expected)), _canon(spoken_words(heard))
    issues = []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes():
        if op == "delete":
            issues.append(f"fehlt: {' '.join(a[i1:i2])}")
        elif op == "replace":
            issues.append(f"falsch: {' '.join(a[i1:i2])} → {' '.join(b[j1:j2])}")
        elif op == "insert":
            issues.append(f"zusätzlich: {' '.join(b[j1:j2])}")
    return issues


def cmd_audio(scene_dir: Path, scene: dict, max_tries: int, only=None):
    voices = json.loads((scene_dir / "voices.json").read_text(encoding="utf-8"))
    lines = scene["lines"]
    tts, _ = choose_models(scene["language"])
    print(f"TTS-Modell: {tts}")
    adir = ROOT / "out" / "audio" / scene["id"]
    adir.mkdir(parents=True, exist_ok=True)
    rpath = adir / "report.json"
    only = set(only or [])
    old = json.loads(rpath.read_text(encoding="utf-8")) if only and rpath.exists() else None
    report = {"scene": scene["id"], "tts_model": tts, "lines": []}
    for line in lines:
        if only and line["id"] not in only:
            prev = next((x for x in old["lines"] if x["id"] == line["id"]), None) if old else None
            if prev:
                report["lines"].append(prev)
                continue
        v = voices["speakers"][line["speaker"]]
        path = adir / f"{line['id']}-{v['figure']}.mp3"
        entry = {**line, "file": str(path.relative_to(ROOT)), "attempts": []}
        ok = False
        for attempt in range(1, max_tries + 1):
            seed = None if attempt == 1 else 1000 + attempt * 97
            synth(line, v["voice_id"], tts, path, seed)
            heard, stt_model = transcribe(path, STT_PREFERENCE, scene["language"])
            issues = compare(line["text"], heard)
            entry["attempts"].append({"attempt": attempt, "seed": seed, "stt_model": stt_model, "heard": heard, "issues": issues})
            status = "OK" if not issues else "; ".join(issues)
            print(f"  {line['id']} @{line['speaker']:8s} Versuch {attempt}: {status}")
            if not issues:
                ok = True
                break
        entry["ok"] = ok
        report["lines"].append(entry)
    rpath.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    bad = [l["id"] for l in report["lines"] if not l["ok"]]
    print(f"→ {len(lines) - len(bad)}/{len(lines)} Zeilen fehlerfrei" + (f", Problemzeilen: {bad}" if bad else ""))
    return report


# ---------------------------------------------------------------- CLI ----
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["parse", "voices", "audio", "all"])
    ap.add_argument("scene_dir")
    ap.add_argument("--max-tries", type=int, default=4)
    ap.add_argument("--only", default="", help="nur diese Zeilen neu erzeugen, z. B. 19,20,M18 (Rest des Berichts bleibt)")
    a = ap.parse_args()
    scene_dir = (ROOT / a.scene_dir).resolve() if not Path(a.scene_dir).is_absolute() else Path(a.scene_dir)
    scene = load_scene(scene_dir)
    if a.cmd == "parse":
        print(f"Szene {scene['id']} · Sprache {scene['language']} · vorgegebene Stimmen: {sorted(scene['fixed_voices']) or '–'}"
              f" · per Suche zu besetzen: {[s for s in scene['used_speakers'] if s not in scene['fixed_voices']] or '–'}")
        for l in scene["lines"]:
            print(f"{l['id']:>3s} @{l['speaker']:10s} {l['tags']} → {model_tags(l['tags'])} {l['text']}")
        return
    try:
        if a.cmd in ("voices", "all"):
            cmd_voices(scene_dir, scene)
        if a.cmd in ("audio", "all"):
            cmd_audio(scene_dir, scene, a.max_tries, [x.strip() for x in a.only.split(",") if x.strip()])
    except ApiError as e:
        sys.exit(f"ElevenLabs-Fehler: {e}")


if __name__ == "__main__":
    main()
