# Mein POV-Kanal

> Toàn bộ quy trình từng bước: **`QUY-TRINH.md`** (đọc trước khi bắt đầu dự án/video mới).

## Kommunikation
- Antworten an mich immer auf **Vietnamesisch** (tiếng Việt).

## Format
- Horizontal 16:9, 1920 × 1080, **30 fps**
- Ngôn ngữ nhân vật trong video: **tiếng Anh, giọng Mỹ** (từ 25.11.2026, thay cho tiếng Đức). Bối cảnh truyện đặt ở nước nói tiếng Anh (Mỹ): tên người, địa danh, đơn vị (°F, dặm), chữ trên màn hình đều theo kiểu Mỹ.
- Ghi chú, chú thích trong kịch bản, tài liệu dự án: viết **tiếng Việt**. Chỉ lời thoại, phụ đề và chữ trong hình là tiếng Anh.
- Ich-Perspektive mit 0.5x-Fisheye
- Länge: 1:45 bis 2:15
- Nie mit schwarzem Bild starten. Die Gefahr ist schon in Frame 0 sichtbar.
- Erster Knall vor Sekunde 5.
- Alle 2 bis 4 s eine Dialogzeile.
- Ende mit Dilemma: „Was würdest du tun?“ mit 2 Optionen.

## Quy tắc sản xuất & Tuân thủ YouTube
- **Định dạng:** Khung ngang 16:9 (`1920x1080`).
- **Chống trùng lặp:** Mỗi video phải có cốt truyện riêng, góc quay và nhịp dựng khác biệt, lời thoại có cảm xúc; không sản xuất rập khuôn hàng loạt.
- **An toàn nội dung (Phim giật gân/Hoạt hình):** Không máu me cận cảnh, bạo lực cực đoan, tự hại, thù ghét, gợi dục hay nội dung độc hại cho trẻ em. 30 giây đầu tuyệt đối sạch (không từ thô tục, không yếu tố nhạy cảm) để đảm bảo bật kiếm tiền xanh.
- **Bản quyền:** Chỉ dùng hình ảnh, giọng nói, nhạc và SFX tự tạo hoặc miễn phí bản quyền; không giả giọng người thật hay dùng nhân vật có bản quyền.
- **Metadata & Nhãn AI:** Tiêu đề/mô tả/tags phải đúng nội dung video; nhắc tôi bật nhãn "Nội dung đã chỉnh sửa hoặc tổng hợp" (AI) khi đăng lên YouTube Studio nếu có yếu tố chân thực.

### Cách áp dụng trong dự án
- Mỗi video có file `scenes/<id>/metadata.md`: tiêu đề, mô tả, tags (khớp nội dung) + dòng nhắc bật nhãn AI.
- Trước khi xuất bản: kiểm tra 30 giây đầu (lời thoại, phụ đề, hình ảnh) không có từ thô tục hay yếu tố nhạy cảm.
- SFX trong dự án được tự tạo bằng code (`scripts/*_assets.py`). Giọng ElevenLabs chỉ dùng giọng trong thư viện, **không** dùng giọng mô phỏng người thật hoặc người nổi tiếng.
- Video mới phải khác video trước về cốt truyện, địa điểm/góc quay và nhịp dựng (so với các `scenes/*/timeline.json` đã có).

## Stil
Fester Kanal-Stil: **D · Comic-Linie** (abgeleitet aus `references/` Bild 11–16, nur Stil). Gewählt am 24.11.2026, ersetzt B · Soft-3D.
Code: `src/stile/richtungen.ts` → `KANAL_STIL` (Eintrag `comic-linie`). Figuren, Turnarounds und Szenen verwenden automatisch diesen Stil. Werte unten sind verbindlich.
Stilprobe neu rendern: `npm run render:stile -- comic-linie` → `out/stile/tafel-comic-linie.png`.

### Outline
- **Jede Form hat eine Outline** (Inverted Hull, an der Normalen aufgeblasene Rückseiten).
- Dicke Figuren: **0.012 Figuren-Einheiten** (Gesichtsteile ×0.45). Dicke Raum/Möbel: **0.015 m**.
- Farbe: **`#2d2622`** (warmes Dunkelbraun) – **nie reines Schwarz**, nie aus der Teilfarbe abgeleitet.
- **Dünne, dunkle Teile ohne Outline** (`outline={0}`): Brillengestelle, Kabel, Bügel – sonst werden sie zu dicken Balken.

### Licht & Schatten
- **Flach, genau 2 Töne:** `steps: 2`, Übergangsbreite **0.012** → harte, aber nicht gezackte Kante. Kein Verlauf.
- Hauptlicht-Richtung: `[-0.5, 0.75, 0.8]` (oben links vorne).
- Schatten-Multiplikator (linear): **`[0.82, 0.72, 0.74]`** → Schatten warm-rosa, nie grau oder blau.
- **Keine Randlichter** (`rim: 0`, keine `rimLights`).

### Glanzlichter
- Körper, Kleidung, Haare: **kein Glanz** (Stärke 0.001).
- Nur Augen: kleiner scharfer Lichtpunkt (Stärke 0.9, Exponent 90, Härte 0.8) + weißer Punkt oben links, 11 % der Augenbreite.

### Texturen
- **Papierkorn 0.05** auf allen Flächen (außer Augen). Keine Hautunebenheit (Bump 0), kein Strickmuster (Stoff 0), kein Halbton.

### Farbkorrektur (auf das fertige Bild)
- CSS-Filter `saturate(0.95) contrast(1.04)` – gilt für Turnarounds und POV-Szenen gleich.

### Farbpalette (Licht → Schatten)
| Element | Licht | Schatten |
|---|---|---|
| Hintergrund Turnaround | Verlauf `#f1e9dc` → `#e9dfcf` (Papier) | – |
| Himmel in POV-Szenen | Verlauf `#a9c6d6` → `#d3e1e2` → `#efe9dc` | – |
| Beschriftung / Linie | `#2d2622` | `#281f1c` |
| Papier | `#efe7da` | `#dbc8bf` |
| Senf | `#b97e2c` | `#a96c25` |
| Dunkelgrün | `#2d3128` | `#282922` |
| Lachs | `#e48c74` | `#d17865` |
| Rot (Signal) | `#b52330` | `#a61d29` |
| Jeans | `#5a7aa0` | `#52698b` |
| Wangenröte | `#e8907a`, Deckkraft **36 %** (blush 0.6 × 0.6) | `#d47c6a` |
| Mund | `#a4524b` | – |
| Augenweiß | `#f8f5ef` | – |
| Pupille | `#140f0c` | – |

Figurenfarben (Kleidung, Haare, Iris) legt jede Figur selbst fest → siehe Figuren-Register.
Regel: gedämpfte, erdige Töne + **genau eine** kräftige Akzentfarbe pro Figur. **Helle Haare nicht beige/hautnah wählen**: der warme Schatten macht sie sonst hautfarben (Fehler bei der Stilprobe).

### Hauttöne (Licht → Schatten in diesem Licht)
| Stufe | Licht | Schatten |
|---|---|---|
| 1 hell | `#f6dcc8` | `#e1beaf` |
| 2 hell-warm | `#efc4a6` | `#dba991` |
| 3 mittel | `#dba783` | `#c99072` |
| 4 gebräunt | `#c68a62` | `#b57755` |
| 5 braun | `#a0663f` | `#925736` |
| 6 dunkel | `#6e4429` | `#643a23` |
- Nase: Hautton etwas röter (z. B. Stufe 2 → `#eab093`).

### Augenform
- Bauchige Ellipsoide, aus dem Kopf gewölbt: Augenbreite **48 % des Kopfradius** (Halbachse 24 %), Höhe = Breite × 1.13, Tiefe = Breite × 0.73.
- Abstand: je **±0.34 rad** (≈ 19,5°) von der Gesichtsmitte, auf Augenhöhe (Kopfmitte).
- Iris **58 %** der Augenbreite, Pupille **28 %**, beide leicht zur Nase versetzt.
- Oberlid hautfarben; Lid-Rotation je Figur (−1.2 offen … −0.4 schwer), Standard −0.85.

### Proportionen
- **Kopf : Körper = 1 : 4.5** (Kopfhöhe 0.53 bei 2.35 Gesamthöhe ohne Kopfbedeckung).
- Großer Kopf, **dünner Hals** (Radius 17 % des Kopfradius), lange dünne Beine, klobige Schuhe.
- Erlaubte Abweichung pro Figur: Kopf : Körper zwischen **1 : 4 und 1 : 5.5**.

### Ansichten & Render
- Turnaround: orthografische Kamera, Figur von y≈130 px bis y≈1010 px (bei 1080p), Papier-Hintergrund.
- Nahaufnahme: Perspektive, FOV 20°, Kamera 3.1–3.4 Einheiten vor dem Kopf, Kopf samt Haar ganz im Bild.
- Einzelbilder mit `--scale=2` (3840 × 2160), 3D in 4K immer `--concurrency=1`.
- POV-Szenen: Raum und Möbel bekommen dieselbe Outline (0.015 m); Himmel und Farbkorrektur wie oben.

## Figuren-Regeln
1. **Jede neue Figur bekommt in diesem Stil zuerst einen Turnaround (frontal, 3/4, seitlich) und eine Nahaufnahme des Gesichts, bevor sie in einem Video eingesetzt wird.** Erst nach Freigabe ins Register eintragen.
2. **Keine zwei Figuren dürfen sich ähneln.** Jede neue Figur muss sich von **jeder** Figur im Register in mindestens **4 der 6** Merkmale unterscheiden:
   1. Silhouette (Kopfbedeckung bzw. Frisurform)
   2. Haarfarbe
   3. Hauptfarbe der Kleidung (Oberteil)
   4. Akzentfarbe
   5. Markenzeichen-Accessoire
   6. Körperbau und Proportion (Kopf:Körper, Größe, Statur)
   Zusätzlich: andere Hautton-Stufe **oder** andere Augenfarbe.
3. Vor dem Rendern einer neuen Figur den Vergleich mit dem Register hinschreiben.
4. Keine Figur aus `references/` kopieren – nur Stil.

## Figuren-Register
| Figur | Status | Silhouette | Haare | Oberteil | Akzent | Accessoire | Körper | Haut | Augen |
|---|---|---|---|---|---|---|---|---|---|
| **Juno** (`src/juno/Juno.tsx`) | in Stil B freigegeben – neuer Turnaround in Stil D nötig | Strickmütze `#c99a2e` mit orangem Anstecker `#d9632f`, Bob | dunkelbraun `#2e211b` | Strickpullover rost `#b5532a`, Cargohose oliv `#5f6446` | Senfgelb `#c99a2e` / `#d2a23a` | runde Brille `#2a2421`, Sofortbildkamera, Kopfhörer, Umhängetasche `#3f4a33` | 1 : 4.5, schlank | Stufe 2 `#efc4a6` + Sommersprossen `#b4704f` | haselbraun `#6b5a2e` |
| **Frau Weber** (Lehrerin) | Turnaround in Stil D fertig, wartet auf Freigabe | hoher Dutt | aschgrau `#9a948c` | Strickjacke pflaume `#6e4058` über Bluse `#efe6d6`, langer Rock `#3a393f` | Petrol `#3f8a83` | eckige Brille, Schal, Tasse, Marker, Uhr | 1 : 5.5, groß | Stufe 1 `#f6dcc8` | graublau `#627585` |
| **Carol** | Turnaround in Stil D fertig, wartet auf Freigabe | lange glatte Haare + Haarreif | rotblond `#b8572f` | Hoodie lavendel `#a99bd0`, Jeans hell `#8daccc` | Koralle `#ef7b6b` | Haarreif, Scrunchie | 1 : 4, klein, zierlich | Stufe 1 `#f6dcc8` | grün `#4f8a5b` |
| **Rafa** | Turnaround in Stil D fertig, wartet auf Freigabe | Afro | schwarzbraun `#1d1713` | College-Jacke blau `#2f4f9a`, Ärmel creme `#ece3d2` | Rot `#c8433a` | Silberkette, Uhr, rote High-Tops | 1 : 5, groß, schlaksig | Stufe 5 `#a0663f` | dunkelbraun `#3d2618` |
| **Leo** | Turnaround in Stil D fertig, wartet auf Freigabe | Cap verkehrt herum | blond `#d9b46a` | offenes Hemd khaki `#b9925e` über weißem Shirt, schwarze Jeans | Schwarz `#24242a` | Cap, ein Ohrstöpsel | 1 : 4.5, breit | Stufe 3 `#dba783` | blau `#4b7fb0` |
| **Bia** | Turnaround in Stil D fertig, wartet auf Freigabe | zwei Haar-Puffs | dunkelbraun `#2b1d16` | Sweatshirt mint `#8fd1b4`, Jogger grau `#b9b6b0` | Lila `#7a5cc8` | goldene Creolen, lila Haargummis | 1 : 4, klein, rund | Stufe 4 `#c68a62` | dunkelbraun `#4a2e1c` |
| **Mika** (Testfigur Stilprobe, `src/stile/richtungen.ts`) | Turnaround in Stil D fertig, wartet auf Freigabe | zerzaustes Kurzhaar, keine Kopfbedeckung | silber-flieder `#c9c3d6` | Pullover ochsenblut `#7a2e35`, Cargohose sand `#b8a27c` | Kobalt `#3b5bd6` | Uhr, kobaltblaues Handy, kobalt Socken | 1 : 5, mittel | Stufe 3 `#dba783` | graugrün `#7d8f6a` |
| **Thiago** | Turnaround in Stil D fertig, wartet auf Freigabe | langer schräger Pony über dem rechten Auge, Kapuze hinten | blauschwarz `#1c1f2a` | Hoodie dunkelgrün `#2f4a3a`, Cargohose `#34343a` | Cyan `#4fb3c8` | Kabel-Kopfhörer, cyan Socken | 1 : 5, groß, dünn | Stufe 6 `#6e4429` | bernstein `#9a6a2a` |

Code: `src/cast/cast.ts` (Daten), `src/cast/Figure.tsx` (Baukasten). Render: `npm run render:cast` → `out/cast/`.

## Orte – vor jeder Szene
- **Bevor eine Szene geschrieben wird**, bekommt jeder Ort einen Plan: `locations/<ort>/plan.json` → daraus `plan.md` + `plan.png`.
- Inhalt: Maße, jede Wand, jede Tür (**inkl. Aufschlagrichtung nach innen/außen**), jedes Fenster, jede Treppe, jedes Möbelstück, die Wege jeder Figur und die Kameraposition für jede Einstellung.
- Prüfen: `python3 scripts/plan_tool.py locations/<ort>`. Wege werden zentimeterweise mit Körperradius geprüft: **nie durch Wände oder Möbel** (Wände nur durch Türöffnungen). Bei Fehlern wird `plan.md` nicht geschrieben – erst den Plan korrigieren, dann die Szene.
- Szene und Animation verwenden genau die Koordinaten aus `plan.json` (Sitzplätze, Wege, Kameras).

## Stimmen (ElevenLabs) – für jedes Video
- **Mọi giọng trong video nói tiếng Anh giọng Mỹ** (`"language": "en"`, `CHANNEL_ACCENT = "american"` trong `voice_pipeline.py`). Pipeline dừng nếu ngôn ngữ khác; tìm giọng thư viện có lọc accent american.
- **Schlüssel:** nur aus der Umgebungsvariable `ELEVENLABS_API_KEY`. **Niemals ausgeben, niemals in eine Datei schreiben** (auch nicht in Logs, `.env`, `voices.json` oder Commits).
  - In der Cloud-Umgebung liegt der Schlüssel als **Netzwerk-Secret für `api.elevenlabs.io` im Header `xi-api-key`** (nicht `Authorization: Bearer` – das lehnt ElevenLabs ab). Der Code schickt dann nur den Platzhalter `proxy-injected`, der Proxy setzt den echten Wert ein.
- Szene anlegen: `scenes/<id>/script.md` (Zeilen `@SPRECHER [tags]: Text`) + `scenes/<id>/scene.json` (Sprache, Sprecher → Figur, Geschlecht, Alter, Persönlichkeit).
  - Alternativ `scenes/<id>/lines.json`: `{"language": "vi", "voices": {"SPRECHER": "<voice_id>"}, "lines": [["id", "SPRECHER", "[tag] Text"]]}`. Echte voice_ids werden übernommen, Platzhalter wie `voice-id-1` per Suche besetzt.
  - Stimmprofile (Geschlecht, Alter, Persönlichkeit) je Sprecher: `scenes/speakers.json`.
- **Thẻ cảm xúc bằng tiếng Anh** ở mỗi câu (`@LEXI [panicked]: …`), gửi thẳng cho mô hình. (Kịch bản tiếng Đức cũ dùng `TAG_DE_EN`.)
- **Gemurmel/Hintergrundstimmen** in eigener Datei (`crowd.md`, IDs `M01…`, `## Beat N` = Abschnitt), eigene Sprecher mit eigenen Stimmen; in `scene.json` → `"script": ["script.md", "crowd.md"]`.
- **Zeitleiste aus echten Audiolängen:** `python3 scripts/build_timeline.py scenes/<id>` → `timeline.json` + `out/audio/<id>/dialog_mix.wav` (misst Sprachbeginn/-ende, prüft 2–4 s pro Zeile und 1:45–2:15).
- Ablauf: `python3 scripts/voice_pipeline.py all scenes/<id>`
  1. In der ElevenLabs-Stimmbibliothek nach Stimmen **in der Sprache des Videos** suchen.
  2. **Jede Figur bekommt eine eigene Stimme** (passend zu Alter, Geschlecht, Persönlichkeit), keine Stimme doppelt.
  3. Auswahl in `scenes/<id>/voices.json` speichern.
  4. Jede Zeile mit dem **neuesten Modell, das Audio (TTS) kann** und die Sprache unterstützt (Rangfolge in `TTS_PREFERENCE`, z. B. `eleven_v3` mit Audio-Tags).
  5. Jede Datei **transkribieren** und mit dem Skript vergleichen. Zeilen mit fehlenden oder falschen Wörtern **neu erzeugen** (bis 4 Versuche). Bericht: `out/audio/<id>/report.json`.
- Dieselbe Figur behält in allen Videos ihre Stimme (aus früherer `voices.json` übernehmen).
- **Neuestes Modell zuerst** (`TTS_PREFERENCE`): aktuell `eleven_v4` (Deutsch, versteht Audio-Tags, liest sie nicht vor), dann `eleven_v3`. Vor jedem Video `/v1/models` prüfen und neue Modelle oben eintragen.
- **Stimmnamen prüfen:** keine Bibliotheksstimme, deren Name/Beschreibung eine reale Person, einen Star oder eine geschützte Filmfigur nachahmt (z. B. „Niander Wallace“ verworfen) – dann manuell eine passende andere wählen und in `voices.json` als „manuell nachgewählt“ markieren.
- Schlüssel ohne Berechtigung `voices_write`: Bibliotheksstimmen werden direkt per `voice_id` genutzt (funktioniert für TTS).
- **Transkript-Vergleich:** gleich klingende Schreibweisen sind kein Fehler (`so was`=`sowas`, `30`=`dreißig`, Namens-Homophone über `scene.json` → `"stt_aliases": {"brand": "brandt"}`). Echte Wortfehler (z. B. `macht → mach`) → Zeile neu erzeugen; bleibt der Fehler nach 4 Versuchen, die Zeile umformulieren und nur sie neu machen: `voice_pipeline.py audio scenes/<id> --only M18`.
- Zeitleiste: Zeilen > 4 s werden um höchstens ×1.08 beschleunigt (Tonhöhe bleibt); nach kurzen Ausrufen bekommt die nächste Zeile mindestens 2 s Abstand.

## Âm thanh (hiệu ứng)
- **Không có âm thanh nào không có nguồn nhìn thấy được**: không gió nền, không tiếng ù, không nhạc, không tiếng boom; tiếng xì xào chỉ khi người nói xuất hiện trong hình.
- **Hiệu ứng chỉ nằm giữa các câu thoại.** Trong kịch bản dùng `#! pause <giây> <nhãn>` trước câu thoại để chừa khoảng lặng; `build_timeline.py` ghi vào `timeline.json → pauses`.
- **Một giây im lặng tuyệt đối trước cú va chạm lớn** (nhãn `impact`; phần mix bị tắt hẳn về 0 trong khoảng đó).
- **Bước chân cho mỗi bước máy quay đi**, khớp mặt sàn (ví dụ toa tàu: thảm cao su trên sàn thép); máy quay nhún đúng lúc chân chạm sàn.
- Hình và tiếng dùng **cùng một file thời gian** (`scenes/<id>/sfx.json`, tạo bởi `scripts/<ort>_timing.py`): tay đập kính, rung lắc, bước chân khớp từng khung hình. Script asset kiểm tra lại trên dạng sóng thật và dừng nếu có hiệu ứng đè lên thoại.
- **Phụ đề nhỏ** (34 px, tên người nói 28 px), hiện đúng lúc bắt đầu nói, tắt 0,12 giây sau khi nói xong.

## Kịch tính & nhịp truyện (bắt buộc từ tập 2, ghi ngày 25.11.2026)
> Lý do: chủ kênh đánh giá Tàu đêm tập 1 "không kịch tính, không hồi hộp". Tập 1 giữ nguyên; mọi tập sau phải theo mục này.
> Lỗi của tập 1 cần tránh: góc máy đứng yên quá lâu (0–42 s gần như một khung), mối nguy nhỏ và bình thản, thoại kín không có khoảng lặng, cú lật được NÓI ra thay vì cho THẤY, không có đồng hồ đếm ngược nhìn thấy được.

### Truyện
- **3 giây đầu quyết định tất cả.** Mối nguy đã hiện sẵn trên màn hình ở khung 0: tin nhắn lạ, tiếng báo động, tiếng hét, chiếc máy bay ngoài cửa sổ. Không mở đầu chậm, không màn hình đen.
- **Trong 15 giây đầu** người xem phải biết: ai đó muốn một điều và có thể mất một điều (cái gì đang bị đe dọa).
- **Cứ 20–30 giây một cú lật**: điều gì đó thay đổi những gì người xem tin. To hơn không phải là cú lật.
- **Gieo trước, gặt sau:** thứ sẽ quan trọng xuất hiện sớm một cách tình cờ (một tấm thẻ, chiếc đồng hồ, một tin nhắn).
- **Hồi hộp hơn bất ngờ:** cho người xem thấy mối nguy mà nhân vật chưa thấy → từng giây đều nhói.
- **Cụ thể, không mơ hồ:** "Flight 417", "in ten seconds" thay vì "something weird".
- **Một nguyên nhân lớn và bất ngờ**, hé lộ từng chút (người ngoài hành tinh, bí mật của chính phủ, điều không ai ngờ).
- **Cảm xúc từ cử chỉ nhỏ:** một bức ảnh, tin nhắn không được trả lời, ai đó gọi một cái tên.
- Trong kịch bản ghi rõ cho mỗi beat: cú lật là gì, thứ gì được gieo/gặt, người xem biết gì mà nhân vật chưa biết.

### Giọng nói & thẻ cảm xúc
- `[whispers]`: lúc trốn, bí mật, khoảnh khắc ngay trước cú hù.
- `[shouting]`: báo động, vụ nổ, gọi ai đó ở xa.
- `[crying]`: mất mát, lời chia tay, đỉnh điểm cảm xúc.
- `[out of breath]`: chạy, sau cuộc rượt đuổi, leo cầu thang.
- **Giọng bình thường trước sự kiện. Sau cú va chạm cảm xúc đổi ngay**: sốc, sợ hãi, tuyệt vọng. Không ai bình tĩnh sau thảm họa → **mọi câu sau cú va chạm đều có thẻ cảm xúc**.
- **Tiếng xì xào đám đông: 15–25 câu ngắn** làm nền để căn phòng có cảm giác đông người (vẫn theo luật âm thanh: những người nói phải có mặt trong cảnh).
- **Không bao giờ cắt mất âm tiết cuối:** câu tiếp theo bắt đầu ít nhất **0,3 s sau khi file âm thanh thật sự kết thúc** (không chỉ sau điểm hết tiếng đo được).
- **Môi khớp theo âm thanh:** đọc từng file giọng, tạo chuyển động miệng theo âm lượng/âm tiết của chính file đó.

### Camera & tay
- Ống kính mắt cá 0.5x như chế độ siêu rộng của điện thoại: người xem thấy đôi tay của mình và căn phòng xung quanh.
- **Camera biết thở:** nhún nhẹ theo mỗi bước, nhìn xuống sàn, lên trần, nhìn mọi người. Không bao giờ dán chặt vào ai như camera trò chơi; không giữ một khung đứng yên quá ~8 s.
- **Tay luôn làm gì đó:** vung theo mỗi bước, cầm điện thoại, đẩy cửa, nắm tay vịn.
- **Điện thoại sống trong túi:** rung → tay lấy ra → mắt đọc → cất lại.
- **Sự kiện lớn nhanh và cảm nhận được:** máy bay vụt qua cửa sổ trong nửa giây, cả căn phòng rung lên.
- **Không có cảnh ngôi thứ ba.** Muốn góc nhìn khác → chuyển sang mắt của nhân vật khác, tên họ hiện nhỏ ở trên cùng khung hình.

### Địa điểm
- Vẽ sơ đồ mặt bằng trước khi viết code cảnh (xem "Orte – vor jeder Szene").
- **Mỗi cửa và cửa sổ cho thấy một nơi có thật phía sau; mỗi hành lang, cầu thang dẫn đến nơi nhìn thấy được.**
- Nghĩ đến mọi thứ thật sự có ở đó vào thời điểm và giờ đó; tìm ảnh tham khảo (lưu thành file trong `references/`).

### Kiểm tra khung hình (đừng dựa vào cảm giác) – checklist cho `review_video.py`
- Không ai đi xuyên tường, cửa hay người khác.
- Chân đặt trên sàn, không lún vào sàn.
- Cầu thang thật sự đi xuống, từng bậc một.
- Đồ vật trên tay có kích thước thật và đi theo bàn tay.
- Không ai biến mất giữa khung hình.
- Người đang nói có mặt trên màn hình, miệng cử động.
- Không có hai diễn viên phụ nào trông hay di chuyển giống nhau.
- Đám đông tản ra khác nhau: một người chạy, một người đứng sững, một người giúp đỡ.
- Không có bề mặt nhấp nháy hay đường kẻ chạy ngang tường.
- Mối nguy nằm ở giữa khung hình.

## Kamera und Hände
- Hände tun immer etwas: Handy, Tür, Geländer. Nie eine erstarrte Hand.

## Fehler, die nie wieder passieren
- **Bilder aus dem Chat sind keine Dateien.** Referenzen immer als Dateien ins Projekt legen (GitHub-Repo), nie nur im Chat.
- **Haarschale kleiner als der Schädel** → Haut sticht am Scheitel durch. Haarschalen immer ≥ 8 % größer als der Kopf.
- **Haarsträhnen enden genau an der Haarschale** → Topfschnitt-Look. Strähnen müssen über die Kante hinausragen.
- **Harter Glanz auf großen Flächen** (Facetten, dunkles Haar) → grauer Fleck. Glanz auf dunklem Haar niedrig halten.
- **Sommersprossen oder Details auf dem Augenweiß** → bei großen Augen Details unterhalb der Augen platzieren.
- **Nahaufnahme zu eng** → Kopfbedeckung abgeschnitten. Vor dem Rendern den Kopf samt Kopfbedeckung ins Bild einpassen.
- **Seitliche Haarspitzen wirken wie Hörner** → Spitzen nach unten fallen lassen, nicht waagerecht abstehen.
- **Kopf sitzt direkt auf dem Oberteil** → Hals muss sichtbar sein.
- **Ohren unter der Haarschale versteckt**, obwohl der Stil abstehende Ohren will → Ohren außerhalb der Haarschale ansetzen.
- **Randlichter zu breit** → halbes Gesicht blau. Randlicht nur als schmale Kante, auf Haut abgeschwächt.
- **Kapuze über dem Kopf wirkt wie ein Helm** (Kugelschale + Ring). Kapuzen nur hinten liegend bauen.
- **Haarschalen unter Kopfbedeckung stechen durch** → unter Kapuze/Mütze nur sichtbare Strähnen bauen.
- **Haar-Kegel um ihre Mitte verankert** → Strähne steht nach oben ab. Strähnen am Ansatz verankern, Spitze in Fallrichtung.
- **ElevenLabs-Schlüssel als `Authorization: Bearer` gespeichert** → „invalid bearer token“. Netzwerk-Secret immer mit Header `xi-api-key`, ohne Präfix. Nach einem Schlüsselwechsel ggf. neue Sitzung starten (Proxy hält den alten Wert).
- **Brille mit Outline im Comic-Stil** → Gestell wird zur Banditenmaske. Dünne dunkle Teile ohne Outline bauen.
- **Helle, beige Haare im 2-Ton-Stil** → warmer Schattenton sieht aus wie Haut, Kopf wirkt halb kahl. Haarfarben mit klarem Abstand zum Hautton wählen.
- **Gefahr hinter Fensterpfosten/Wand versteckt** (schräger Blick vom Sitzplatz zur Tür) → im Plan die Sichtlinie Kamera → Gefahr prüfen: sie muss durch eine Glasfläche gehen. Kamera-Ziel immer auf die Gefahr rechnen (nicht feste Yaw-Werte).
- **Figuren laufen durcheinander durch** → `plan_tool.py` prüft jetzt auch Wege gegen stehende/sitzende Figuren zur selben Zeit; Stehplätze so legen, dass spätere Wege frei bleiben.
- **POV-Hand oder Handy verdeckt die Gefahr** → Handy rechts unten, freie Hand an den Rand (Türkante, Tisch); Prüfbilder je Beat (`scripts/nachtzug-probe.sh`) vor dem Voll-Render.
- **4K-Render mit mehreren parallelen Tabs** (`--concurrency` > 1 bei `--scale=2`) → Software-WebGL liefert kaputte, gekachelte Bilder. 3D-Szenen in 4K immer mit `--concurrency=1` rendern und das Raw-Video vor dem Fisheye prüfen.
