# Ảnh và icon cho trang niêm yết

## Yêu cầu chính thức của Chrome Web Store

| Mục | Kích thước | Định dạng | Bắt buộc? |
|---|---|---|---|
| Store icon | **128 × 128** | PNG (24-bit, có kênh alpha) | **Bắt buộc** |
| Screenshot | **1280 × 800** hoặc 640 × 400 | **PNG hoặc JPEG** | **Bắt buộc — tối thiểu 1, tối đa 5** |
| Small promo tile | 440 × 280 | PNG hoặc JPEG | Không |
| Marquee promo tile | 1400 × 560 | PNG hoặc JPEG | Không |

Hai điều dễ vấp:

1. **WebP không được chấp nhận.** Cả 10 ảnh trong `website/images/` đều là `.webp` hoặc sai tỉ lệ. Không upload thẳng được file nào.
2. **Không được có viền/khung thừa hoặc chữ nhỏ khó đọc.** Screenshot phải lấp đầy đúng khung 1280×800, không để dải đen.

---

## Đã chuẩn bị sẵn — dùng ngay

Nằm trong `chrome-web-store/assets/`. Tất cả đều là PNG, đúng kích thước, đã kiểm tra.

| File | Kích thước | Nguồn | Vai trò trong listing |
|---|---|---|---|
| `store-icon-128x128.png` | 128×128 | `website/images/icon.png` (256×256, thu nhỏ Lanczos) | **Store icon** |
| `1-trang-chan-trong-trinh-duyet-1280x800.png` | 1280×800 | `browser-blocked.webp` (1280×720) | **Screenshot #1.** Đặt đầu tiên — đây là thứ duy nhất trong bộ ảnh thật sự xảy ra *trong trình duyệt*. Người xem trang store đang tìm một tiện ích Chrome, không phải một app Windows. |
| `2-man-hinh-chinh-1280x800.png` | 1280×800 | `main.webp` | Screenshot #2 — vòng lặp credit |
| `3-ghep-noi-tien-ich-1280x800.png` | 1280×800 | `gate.webp` | Screenshot #3 — **đừng bỏ ảnh này.** Nó cho thấy trước rằng phải cài app Windows, chặn bớt đánh giá 1 sao kiểu "cài xong không làm gì cả". |
| `4-dang-tap-trung-1280x800.png` | 1280×800 | `focus.webp` | Screenshot #4 — phiên tập trung đang chạy |
| `5-che-do-khoa-1280x800.png` | 1280×800 | `locked.webp` | Screenshot #5 — chế độ khóa |

Ảnh gốc 1233×854 không đúng tỉ lệ 16:10 nên đã được thu nhỏ giữ nguyên tỉ lệ rồi đặt giữa khung 1280×800, nền lấy đúng màu viền của ảnh gốc để không thấy đường ghép. Không cắt xén, không kéo méo, không mất chữ.

---

## Ảnh trong `website/images/` — dùng được gì

| File | Kích thước | Kết luận |
|---|---|---|
| `browser-blocked.webp` | 1280×720 | ✅ Đã dùng làm screenshot #1 |
| `main.webp` | 1233×854 | ✅ Đã dùng #2 |
| `gate.webp` | 1233×854 | ✅ Đã dùng #3 |
| `focus.webp` | 1233×854 | ✅ Đã dùng #4 |
| `locked.webp` | 1233×854 | ✅ Đã dùng #5 |
| `icon.png` | 256×256 | ✅ Đã dùng làm store icon |
| `settings.webp` | 1233×854 | 🔸 Dự phòng. Đã đủ 5 ảnh nên không dùng — màn hình cài đặt là ảnh yếu nhất về mặt bán hàng. |
| `dark.webp` | 1233×854 | 🔸 Dự phòng. Có thể thay #4 nếu muốn khoe dark mode. |
| `narrow.webp` | 650×800 | ❌ Quá hẹp, phóng lên 1280×800 sẽ để hai dải trống lớn hai bên. |
| `overlay.webp` | 1280×803 | ❌ Đây là lớp phủ chặn **ứng dụng Windows** — không liên quan gì tới tiện ích trình duyệt. Đưa vào chỉ làm reviewer bối rối về "single purpose". |
| `main.png` | 1233×854 | ❌ Trùng nội dung với `main.webp`. |
| `logo.webp` | 128×128 | ❌ Đúng cỡ nhưng là WebP, và store icon đã có bản PNG tốt hơn. |

---

## Còn thiếu — nhưng đều không bắt buộc

| Mục | Cần gì | Có nên làm hôm nay? |
|---|---|---|
| **Small promo tile 440×280** | Ảnh có logo + dòng chữ ngắn, nền đơn sắc | **Không.** Chỉ dùng khi Google chọn bạn vào mục quảng bá. Nộp thiếu không sao. Làm sau nếu có traffic. |
| **Marquee promo tile 1400×560** | Như trên, khổ rộng | **Không.** Chỉ dành cho tiện ích được đưa lên trang chủ store. |
| **Video YouTube** | Clip 30–60 giây | **Không.** Nhưng đây là thứ có tác động chuyển đổi cao nhất khi bạn quay lại tối ưu listing — cơ chế credit khó hiểu qua ảnh tĩnh. |

Nói thẳng: đừng dừng việc nộp hôm nay để làm promo tile. Nó không ảnh hưởng tới việc được duyệt, và cũng gần như không ảnh hưởng tới lượt cài đặt ở giai đoạn 0 người dùng.
