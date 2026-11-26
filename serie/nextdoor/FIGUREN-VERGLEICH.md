# So sánh nhân vật mới với Figuren-Register (viết TRƯỚC khi render)

Quy tắc: mỗi nhân vật mới khác **mọi** nhân vật đã có (Register + 4 nhân vật Tàu đêm) ở ≥ 4/6 đặc điểm
(1 dáng đầu/tóc · 2 màu tóc · 3 màu áo · 4 màu nhấn · 5 phụ kiện đặc trưng · 6 vóc dáng) **và** khác tông da hoặc màu mắt.
Tập 1 chỉ cần 7 người có mặt trong hình. Pruitt (chỉ có giọng qua điện thoại) và Jenna (chưa xuất hiện) sẽ làm khi tập sau cần.

## Bảy nhân vật mới (code: `src/cast/nextdoor.ts`)
| Nhân vật | 1 Dáng đầu | 2 Tóc | 3 Áo | 4 Nhấn | 5 Phụ kiện | 6 Vóc dáng | Da | Mắt |
|---|---|---|---|---|---|---|---|---|
| **Rosa Alvarez** (4A, ~70) | khăn trùm xanh két + 3 lô cuốn tóc hồng | đen muối tiêu `#3a3633` | áo choàng ngủ hồng đất `#c48a92` | xanh ngọc `#2f8f5b` (đai áo) | kính tròn, dây chuyền | 1 : 4, thấp, tròn | bậc 3 | hổ phách `#9a6a2a` |
| **Mrs. Lee** (4D, ~80) | bob ngắn bạc | bạc lạnh `#d9dbe2` | áo len xanh xám `#8aa58a` | hồng `#d9708f` | kính chữ nhật, đồng hồ | 1 : 4, nhỏ, gầy | bậc 2 | nâu đen `#3a2a20` |
| **Tyler** (~28) | tóc ngắn rối, đầu trần | đen `#1e1a18` | hoodie xám `#8f9396`, quần pyjama đỏ | cam `#e07b2a` | râu lún phún, điện thoại cam | 1 : 5, cao | bậc 4 | nâu `#4a3020` |
| **Ray** (~45) | tóc ngắn | muối tiêu `#6a6660` | áo flannel mở xanh két `#2f5f66` | vàng `#e3b53a` | râu lún phún, đồng hồ, điện thoại vàng | 1 : 5, vai rộng | bậc 5 | xanh ô liu `#6a7a45` |
| **Deb** (~50) | bob | nâu đỏ `#7a3a22` | áo phao xanh đá `#4d6480`, quần pyjama hồng | hồng sẫm `#c2457a` | đồng hồ | 1 : 5, trung bình | bậc 1 | nâu hạt dẻ `#7a6a3a` |
| **Brianna** (~25) | búi cao | đen `#151212` | hoodie xanh da trời `#8fb8de` | xanh cốm `#9bc53d` | điện thoại xanh cốm, tất xanh cốm | 1 : 4.5, mảnh | bậc 5 | nâu hổ phách `#7a4a20` |
| **Mr. Okafor** (~65) | tóc ngắn bạc | xám `#9a9a9e` | áo choàng ngủ xanh navy `#2c3a5a` | đỏ rượu `#8c2f39` (đai áo) | kính chữ nhật, râu bạc | 1 : 5, đậm | bậc 6 | nâu đen `#2a1a12` |

## Các cặp dễ giống nhất (✓ = khác, ✗ = giống/gần)
| Mới ↔ Cũ | 1 | 2 | 3 | 4 | 5 | 6 | Số khác | Da/mắt |
|---|---|---|---|---|---|---|---|---|
| Rosa ↔ Bia (cùng thấp, tròn) | ✓ khăn vs hai búi | ✓ | ✓ | ✓ | ✓ | ✗ | 5/6 | da khác (3 vs 4) |
| Rosa ↔ Juno (cùng kính tròn, mũ) | ✓ khăn + lô vs mũ len | ✓ | ✓ | ✓ | ✗ kính tròn | ✓ | 5/6 | da + mắt khác |
| Mrs. Lee ↔ Weber (cùng tóc xám, kính chữ nhật) | ✓ bob vs búi cao | ✗ | ✓ | ✓ | ✗ | ✓ nhỏ vs cao | 4/6 | da + mắt khác |
| Mrs. Lee ↔ Carol (cùng nhỏ) | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | 5/6 | da + mắt khác |
| Tyler ↔ Thiago (cùng cao, hoodie) | ✓ | ✓ đen vs xanh đen | ✓ xám vs xanh lá | ✓ | ✓ | ✗ | 5/6 | da + mắt khác |
| Tyler ↔ Bia (cùng da bậc 4) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 6/6 | mắt khác |
| Ray ↔ Rafa (cùng da bậc 5) | ✓ ngắn vs afro | ✓ | ✓ | ✓ | ✓ | ✓ rộng vs gầy | 6/6 | mắt khác |
| Ray ↔ Leo (cùng áo mở, vai rộng) | ✓ đầu trần vs mũ | ✓ | ✓ xanh két vs kaki | ✓ | ✓ | ✗ | 5/6 | da + mắt khác |
| Ray ↔ Hanna (cùng áo mở) | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | 5/6 | da + mắt khác |
| Deb ↔ Juno (cùng bob) | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | 5/6 | da + mắt khác |
| Deb ↔ Weber (cùng da bậc 1) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 6/6 | mắt khác |
| Deb ↔ Lotte (cùng áo phao) | ✓ | ✓ | ✓ vàng chanh vs xanh đá | ✓ | ✓ | ✓ | 6/6 | da + mắt khác |
| Brianna ↔ Weber (cùng búi cao) | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | 5/6 | da + mắt khác |
| Brianna ↔ Rafa / Lotte (cùng da bậc 5) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 6/6 | mắt khác |
| Okafor ↔ Thiago (cùng da bậc 6) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 6/6 | mắt khác |
| Okafor ↔ Brandt (cùng tóc bạc, áo dài) | ✓ đầu trần vs mũ beret | ✗ | ✓ navy vs nâu | ✓ | ✓ | ✗ | 4/6 | da + mắt khác |

Giữa 7 nhân vật mới với nhau: không ai cùng màu áo hay màu nhấn. Hai người mặc áo choàng ngủ (Rosa, Okafor) khác hẳn về màu, khăn trùm và vóc dáng. Ray và Brianna cùng da bậc 5 nhưng khác mắt, khác giới tính và vóc dáng.
**Kết luận:** cả 7 đạt quy tắc → render bản xoay (frontal, 3/4, nghiêng) và cận mặt để chờ duyệt.

## Phần code mới cho các nhân vật này
- Khăn trùm có lô cuốn tóc (`headwear: "headscarf"`) và áo choàng ngủ dài có đai (`top: "robe"`) trong `src/cast/Figure.tsx`.
