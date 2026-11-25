# Xem lại như một người xem đang chán – „The Neighbor Next Door" tập 1

Cách làm: đọc bản nháp 1 (`script_v1.md`) như một người đang lướt YouTube lúc nửa đêm, ngón tay đặt sẵn trên nút "bỏ qua".
Mỗi chỗ tôi muốn lướt đi được ghi lại kèm cách sửa trong `script.md`.

| # | Thời điểm (bản 1) | Người xem chán nghĩ gì | Sửa trong bản cuối |
|---|---|---|---|
| 1 | 0–4 s | "Every night at 3 AM…" – lại một giọng kể lể. Tiếng gõ tới giây thứ 4, quá trễ. | Tiếng gõ ở **0,2 s**, khung ảnh trên tường nảy lên theo từng tiếng. Khung 0 đã có điện thoại sáng "3:03" và bức tường đang rung. |
| 2 | 4–25 s | Cuộc gọi chủ nhà kéo dài 6 câu, toàn chào hỏi ("Who is this?", "Sorry to call so late"). | Còn **2 câu** của chủ nhà. Giữ một câu gieo cho cú lật cuối: "Nobody has a key but me." |
| 3 | ~15 s | Tôi không biết nhân vật sợ mất gì. Chỉ là "ồn ào ban đêm". | Thêm điều có thể mất ở ~14 s: "I put every dollar into this deposit. I can't just leave." |
| 4 | ~27 s | "I have a weird feeling someone is watching me" – NÓI ra cú lật, không CHO THẤY. | TÔI gõ lại ba tiếng → tin nhắn lạ: "Don't knock back." → "Nice green hoodie. Go to sleep." Người xem tự hiểu là bị nhìn. |
| 5 | 27–45 s | Nhân vật chỉ ngồi nghe, thụ động. | TÔI **hành động**: gõ lại vào tường, rồi tự đi ra cửa 4C. |
| 6 | ~40 s | "It's padlocked" – thì sao? | Ổ khoá **mới tinh** + tay nắm sạch bụi + ánh sáng xanh dưới khe cửa: ba chi tiết cụ thể chứng minh "bỏ trống" là nói dối. |
| 7 | 45–65 s | Rosa tự giới thiệu ("Rosa, from 4A, thirty years") – thông tin thừa. | Bỏ phần giới thiệu, tên hiện trong phụ đề. Vào thẳng: "Every new tenant in 4B does. For about a month." |
| 8 | ~60 s | "Nobody ever saw her again" – mơ hồ, không có cảm xúc. | Cử chỉ nhỏ: vòng cổ mèo "PICKLE – 4B" đưa qua khe xích. Rosa khóc: "She knocked on my door. I didn't open it." |
| 9 | ~70 s | Đầu báo khói là camera – từ trên trời rơi xuống. | **Gieo** đèn đỏ ở 8 s và mẩu giấy vàng ở 10 s. Người xem thấy đèn đỏ nháy lúc tin nhắn tới (TÔI không thấy). **Gặt** ở 64 s: "It's not a smoke detector. – J". |
| 10 | ~75 s | Không có nguyên nhân lớn, chỉ "một kẻ biến thái". | Nguyên nhân lớn: danh sách Wi-Fi "4C_CAM_4B", "4C_CAM_4A"… camera ở **mọi** căn. Rồi cú lật 5: chủ nhà gọi lại, biết TÔI ra hành lang. |
| 11 | 80–90 s | "Call the police or open the door" – lựa chọn trống rỗng, không có giá phải trả. | Lựa chọn có giá cụ thể: cảnh sát còn **25 phút**, các camera đang tắt từng cái, bằng chứng về Jenna đang bị xoá. Đồng hồ 24:59 đếm ngược trên thẻ kết. |
| 12 | cả bài | Thẻ cảm xúc chung chung ("nervous", "scared"). | Sau tiếng gõ đầu tiên, mọi câu đều có thẻ rõ: `[whispers]` vì đang trốn, `[crying]` ở đỉnh cảm xúc của Rosa, `[breathing fast]`. |

## Kiểm tra theo yêu cầu
- Câu hỏi trung tâm và điều có thể mất nằm ở đầu `script.md`, và người xem biết được trước giây 15.
- **Nhịp thoại:** 25 câu, ước tính 2–4 s mỗi câu kể cả các khoảng lặng. Thời lượng thật đo sau khi có giọng (`build_timeline.py`), dự kiến khoảng 1:30–1:35.
- **Cú lật:** ~17 s, ~33 s, ~50 s, ~64 s, ~77 s, tức cứ 13–17 s một cú, trong khoảng 15–20 s đã đặt.
- **Gieo/gặt:** đèn đỏ ở 8 s → 64 s · mẩu giấy vàng ở 10 s → 64 s · "Nobody has a key but me" ở 12 s → ổ khoá mới ở 35 s, chủ nhà ở 77 s · "green hoodie" (tay áo trong hình ngay từ khung 0) → 23 s.
- **Kết:** "WHAT WOULD YOU DO?" với 2 lựa chọn (gọi cảnh sát và chờ / tự phá cửa 4C).
- **30 giây đầu sạch:** không từ thô tục, không bạo lực, không nội dung nhạy cảm.
- **Âm thanh có nguồn:** tiếng gõ (khung ảnh rung), giọng qua loa điện thoại, xích cửa, bước chân. Không có nhạc nền.

## Còn lệch so với CLAUDE.md (do yêu cầu riêng của tập này)
- Độ dài 1:30 thay vì 1:45–2:15.
- Không có đám đông 15–25 câu: 3 giờ sáng trên hành lang chỉ có Rosa. Thêm tiếng người vô hình là phạm luật "không có âm thanh không có nguồn".
