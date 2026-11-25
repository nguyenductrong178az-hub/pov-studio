# Quy trình sản xuất video POV (lời thoại tiếng Anh – Mỹ)

Tài liệu này gom **mọi bước và quy tắc** đã thống nhất. Dự án mới: sao chép mẫu `pov-studio`, đọc `CLAUDE.md` (quy tắc bắt buộc) và làm theo thứ tự dưới đây.
Giao tiếp với chủ kênh: **tiếng Việt**. Nhân vật trong video nói: **tiếng Anh giọng Mỹ** (từ 25.11.2026). Ghi chú, tài liệu: tiếng Việt.

---

## 0. Thiết lập dự án
- Công cụ: Node.js, Python 3, FFmpeg (kiểm tra: `node -v`, `python3 --version`, `ffmpeg -version`; thiếu thì cài).
- Thư viện: `remotion`, `@remotion/cli`, `@remotion/three`, `three`, `@react-three/fiber`, `react`, `react-dom`, TypeScript (`npm install`).
- `remotion.config.ts`: OpenGL `angle`, codec `h264`.
- Định dạng: **1920 × 1080 (Full HD, 16:9), 30 fps, dài 1:45–2:15**.
- Xuất thử 3 giây để chắc chắn mọi thứ chạy: `SECONDS_ONLY=3 bash scripts/build-<cảnh>.sh`.

## 1. Quy tắc kênh (chi tiết trong `CLAUDE.md`)
- Góc nhìn thứ nhất (POV), fisheye 0.5x.
- Không bao giờ mở đầu bằng màn hình đen; **nguy hiểm phải thấy ngay ở khung hình 0**.
- **Tiếng nổ/động đầu tiên trước giây thứ 5.**
- **Cứ 2–4 giây có một câu thoại.**
- Kết thúc bằng lựa chọn khó: „Was würdest du tun?“ + 2 phương án.
- Tay trong khung hình luôn đang làm gì đó (điện thoại, cửa, lan can) – không bao giờ đứng yên.
- Tuân thủ YouTube: mỗi video cốt truyện/góc quay/nhịp dựng riêng; không máu me, bạo lực cực đoan, tự hại, thù ghét, gợi dục, nội dung hại trẻ em; **30 giây đầu tuyệt đối sạch**; chỉ dùng hình/giọng/nhạc/SFX tự tạo hoặc miễn phí bản quyền; không giả giọng người thật, không dùng nhân vật có bản quyền; metadata đúng nội dung; nhắc bật nhãn AI.

## 2. Tham chiếu phong cách
1. Ảnh tham chiếu **phải là file** trong `references/` (tải qua GitHub). Ảnh gửi trong chat không phải file.
2. Phân tích từng ảnh: outline (độ dày, màu), bảng màu, kiểu đổ bóng, điểm sáng, tỉ lệ, chất liệu → `references/STILANALYSE.md` (kèm bảng màu đo bằng pixel).
3. **Chỉ lấy phong cách, không chép nhân vật.**
4. Làm thử nhiều hướng: `npm run render:stile` → mỗi hướng một tấm (toàn thân, cận mặt, bảng màu, khung POV) trong `out/stile/`. Chủ kênh chọn → ghi thông số chính xác vào `CLAUDE.md` mục „Stil“.
5. Phong cách cố định hiện tại: **D · Comic-Linie** (`KANAL_STIL` trong `src/stile/richtungen.ts`): viền nâu đậm `#2d2622`, phẳng 2 tông, không bóng, vân giấy, má hồng.

## 3. Nhân vật
1. Viết trước bảng so sánh với **Figuren-Register** trong `CLAUDE.md`: mỗi nhân vật mới phải khác **mọi** nhân vật cũ ở ≥ 4/6 đặc điểm (dáng đầu/tóc, màu tóc, màu áo, màu nhấn, phụ kiện, vóc dáng) + khác tông da hoặc màu mắt.
2. Tạo dữ liệu trong `src/cast/cast.ts` (bộ dựng `src/cast/Figure.tsx`: kiểu tóc, mũ, kính, áo, quần, phụ kiện, biểu cảm, tư thế đứng/ngồi/đi).
3. Render **turnaround (trước, 3/4, nghiêng) + cận mặt** ở phong cách cố định (D): `npm run render:cast -- <id>` → `out/cast/`.
4. Chủ kênh duyệt → ghi vào Figuren-Register với trạng thái „freigegeben“. **Chưa duyệt thì không đưa vào video.**

## 4. Địa điểm (trước khi viết bất kỳ cảnh nào)
1. Tạo `locations/<địa-điểm>/plan.json`: kích thước, từng bức tường, từng cửa (**hướng mở vào/ra**, bản lề), từng cửa sổ, cầu thang, từng món nội thất, chỗ ngồi, đường đi của từng nhân vật (có thời điểm bắt đầu `t0`), đồ đạc di chuyển (`moves`), xoay người khi ngồi, vị trí máy quay cho từng góc quay.
2. Kiểm tra + sinh tài liệu: `python3 scripts/plan_tool.py locations/<địa-điểm>` → `plan.md` + `plan.png`.
   - Đường đi được dò từng cm, tính bán kính thân người: **không xuyên tường, không xuyên đồ đạc** (chỉ qua tường ở chỗ có cửa).
   - Có lỗi → `plan.md` không được ghi; sửa plan trước rồi mới viết cảnh.
3. Cảnh dựng dùng **đúng toạ độ trong `plan.json`**.

## 5. Kịch bản
- **Trước khi viết: đọc mục „Kịch tính & nhịp truyện“ trong `CLAUDE.md`** (3 giây đầu, cú lật mỗi 20–30 s, gieo/gặt, hồi hộp hơn bất ngờ, thẻ cảm xúc sau va chạm, camera biết thở). Ghi cho mỗi beat: cú lật, thứ được gieo/gặt, điều người xem biết mà nhân vật chưa biết.
- `scenes/<id>/script.md`: dòng `@SPRECHER [tags]: Text` (tiếng Đức), hoặc `lines.json` (`{"language":"de","voices":{...},"lines":[["id","SPRECHER","[tag] Text"]]}`).
- `scenes/<id>/timeline.json`: **nguồn thời gian duy nhất** cho hình, phụ đề và âm thanh (thời điểm từng câu, sự kiện như tiếng nổ, đường đi).
- Kiểm tra nhịp: mỗi câu 2–4 s, khoảng trống giữa các câu nhỏ.

## 6. Giọng nói (ElevenLabs)
- Khoá: **chỉ** từ biến môi trường `ELEVENLABS_API_KEY`; **không bao giờ in ra, không bao giờ ghi vào file**.
  Trên cloud: khoá lưu dạng network secret cho `api.elevenlabs.io` với header **`xi-api-key`** (không dùng Bearer).
- Mỗi câu thoại có **thẻ cảm xúc tiếng Đức**; câu xì xào đám đông để trong `crowd.md`.
- Chạy: `npm run voices -- scenes/<id>`
  1. tìm giọng **tiếng Đức** trong thư viện ElevenLabs;
  2. mỗi nhân vật **một giọng riêng**, hợp tuổi/giới tính/tính cách (hồ sơ trong `scenes/speakers.json`); không trùng giọng;
  3. lưu lựa chọn vào `scenes/<id>/voices.json`; nhân vật cũ giữ giọng cũ;
  4. tạo từng câu bằng **model mới nhất hỗ trợ TTS** (ví dụ `eleven_v3` với thẻ cảm xúc);
  5. **chuyển giọng nói thành chữ** từng file, so sánh từng từ; thiếu/sai từ → tạo lại (tối đa 4 lần) → `out/audio/<id>/report.json`.
- Dựng dòng thời gian theo **độ dài thật** của file âm thanh: `python3 scripts/build_timeline.py scenes/<id>` → `timeline.json` + `dialog_mix.wav`.

## 7. Dựng cảnh
- Thành phần cảnh: `src/scenes/<id>/Scene.tsx` (phòng từ `plan.json`, nhân vật, máy quay POV, tay POV, ngoại cảnh).
- Dựng: `bash scripts/build-<id>.sh`
  1. kiểm tra lại plan (phải sạch va chạm);
  2. sinh phụ đề `.ass` + SFX tự tạo bằng code;
  3. render hình thô 3840 × 2160 góc rộng 130° (**`--concurrency=1`**, nhiều tiến trình ở 4K làm vỡ hình);
  4. FFmpeg `v360` → fisheye 0.5x, chèn phụ đề (phía trên điện thoại), ghép âm thanh → **1920 × 1080, 30 fps**.

## 7b. Ảnh kiểm tra trước khi render cả video
- Render ảnh fisheye ở các thời điểm then chốt của từng đoạn (ví dụ `bash scripts/nachtzug-probe.sh 0 30 50.5 …`) → kiểm tra: mối nguy ở giữa khung, tay đang làm gì, không ai xuyên đồ vật; sửa rồi mới render cả video (≈ 2,2 s/khung → 2:13 ≈ 2,4 giờ).

## 8. Kiểm tra & sửa lỗi
1. `python3 scripts/review_video.py out/<id>/<id>.mp4 --every 2` → khung hình tĩnh mỗi 2 s + bảng ảnh tổng hợp + số đo tự động (kích thước, fps, độ dài, khung đầu có đen không, tiếng nổ đầu tiên, khoảng trống thoại).
2. Đối chiếu **từng khung** với `CLAUDE.md`; liệt kê **mọi lỗi kèm giây**, **lỗi quan trọng nhất trước**.
3. Sửa → kiểm tra lại đúng những giây đó: `--at 4,10,...`.
4. Mỗi lỗi đã sửa → ghi vào „Fehler, die nie wieder passieren“ trong `CLAUDE.md`.

## 9. Metadata & đăng tải
- `scenes/<id>/metadata.md`: tiêu đề, mô tả, tags **đúng nội dung** (tiếng Đức).
- Checklist: kiểm tra 30 giây đầu; **bật nhãn „Nội dung đã chỉnh sửa hoặc tổng hợp“** trong YouTube Studio nếu có yếu tố trông như thật.

## 10. Lưu trữ
- Container đám mây **sẽ bị xoá** → luôn đẩy dự án lên GitHub (`nguyenductrong178az-hub/pov-studio`; cần cài Claude GitHub App để có quyền ghi) hoặc tải bản nén về máy.
- Không bao giờ đưa khoá API vào Git (`.gitignore` đã chặn `.env`).

---

## Bản đồ thư mục
| Đường dẫn | Nội dung |
|---|---|
| `CLAUDE.md` | Quy tắc bắt buộc (định dạng, YouTube, phong cách D, nhân vật, địa điểm, giọng, lỗi đã gặp) |
| `QUY-TRINH.md` | Tài liệu này |
| `references/` | Ảnh tham chiếu + `STILANALYSE.md` |
| `src/character/` | Shader & phong cách (Fino – bản thử nghiệm đầu) |
| `src/juno/` | Juno + 4 phong cách (bản cũ) |
| `src/stile/` | 4 hướng phong cách + `KANAL_STIL` (D) + nhân vật thử Mika |
| `src/cast/` | Bộ dựng nhân vật + dàn diễn viên lớp học |
| `src/scenes/<id>/` | Cảnh dựng |
| `locations/<địa-điểm>/` | `plan.json` → `plan.md`, `plan.png` |
| `scenes/<id>/` | Kịch bản, timeline, giọng, metadata |
| `scripts/` | `plan_tool.py`, `voice_pipeline.py`, `review_video.py`, `build-*.sh`, `render-*.sh` |

## Lệnh nhanh
```bash
npm install                                              # cài thư viện
npm run studio                                           # xem trước trong trình duyệt
npm run render:cast                                      # turnaround + cận mặt dàn nhân vật
python3 scripts/plan_tool.py locations/<địa-điểm>        # kiểm tra mặt bằng
npm run voices -- scenes/<id>                            # tạo giọng (cần ELEVENLABS_API_KEY)
SECONDS_ONLY=3 bash scripts/build-<id>.sh                # xuất thử 3 giây
bash scripts/build-<id>.sh                               # xuất cả cảnh
python3 scripts/review_video.py out/<id>/<id>.mp4        # kiểm tra mỗi 2 giây
```
