# Nộp tiện ích lên Chrome Web Store

Trạng thái: **đã nộp ngày 10/09/2026, đang chờ duyệt (Pending review).**

- Extension ID: `coiphhfihfbpecbbmlacejgjbcgikhhn`
- Trang store sau khi duyệt: <https://chrome.google.com/webstore/detail/coiphhfihfbpecbbmlacejgjbcgikhhn>
- Bộ hồ sơ đầy đủ hơn nằm ở `chrome-web-store/` — xem mục "Trùng lặp" ở cuối trang.

## Điều đã kiểm, không phải sửa gì

**Extension ID đổi khi cài từ Web Store, và cầu nối vẫn chạy.** `src/main.cjs` kiểm origin bằng
`^chrome-extension:\/\/[a-p]{32}$` — nhận mọi ID hợp lệ, không ghim ID nào. Nên tiện ích cài từ store
ghép nối được y như bản load unpacked.

**Tiện ích không gọi ra Internet.** Chỉ một kết nối duy nhất tới `ws://127.0.0.1:47831`. Qua đó chỉ đi ba
loại tin: mã ghép nối, ping mỗi 10 giây, và một cờ đúng/sai báo đã áp dụng luật. Không URL, không tên miền,
không lịch sử. Kiểm lại bằng `grep -n "fetch\|http" extension/*.js` trước mỗi lần nộp bản mới.

## Chính sách quyền riêng tư

<https://the-brain-project.vercel.app/quyen-rieng-tu>

Có sẵn bản tiếng Anh ở nửa dưới trang, vì người duyệt của Google không đọc tiếng Việt.

## Trả lời tab "Privacy practices"

**Single purpose** — mỗi tiện ích chỉ được có một mục đích duy nhất:

> Chặn các website mà người dùng tự đưa vào danh sách, theo luật do ứng dụng desktop đi kèm gửi sang, và
> tạm mở chúng khi người dùng đổi credit đã kiếm được.

**`declarativeNetRequest`** — chặn và chuyển hướng chính những tên miền người dùng tự thêm. Dùng
declarativeNetRequest thay vì webRequest để tiện ích không bao giờ nhìn thấy nội dung request.

**`storage`** — lưu cục bộ mã ghép nối, danh sách chặn, hạn khóa và trạng thái kết nối, để bộ chặn vẫn hoạt
động khi ứng dụng desktop đang tắt.

**`alarms`** — đánh thức service worker mỗi 30 giây để nối lại với ứng dụng desktop sau khi nó bị Chrome cho
ngủ, và để thu hồi lượt mở đã hết hạn.

**`host_permissions: <all_urls>`** — đây là mục bị soi kỹ nhất, viết cho rõ:

> Danh sách chặn hoàn toàn do người dùng đặt và có thể chứa bất kỳ tên miền nào, nên không thể khai báo
> trước một tập host cụ thể. Quyền này chỉ dùng để đối chiếu hostname của tab với danh sách đó và chuyển
> hướng những trang người dùng đã tự chặn. Không có URL nào được lưu hay truyền đi.

**Remote code** — chọn **No**. Toàn bộ mã nằm trong gói; không nạp script từ xa, không `eval`.

**Data usage** — khai báo **không thu thập** bất kỳ loại dữ liệu nào, rồi tick cả ba cam kết ở cuối trang.
Lưu ý: đọc URL tab trong bộ nhớ mà không lưu, không truyền thì không tính là thu thập; điều quan trọng là
chính sách và phần justification phải nói đúng như vậy.

## Cần chuẩn bị cho phần Store listing

| Mục | Yêu cầu | Đã có |
|---|---|---|
| Icon | 128×128 PNG | `extension/icons/icon-128.png` |
| Ảnh chụp | 1–5 ảnh, cỡ **1280×800** hoặc 640×400, PNG 24-bit không alpha | năm ảnh trong `store-assets/`, xem mục cuối trang |
| Small promo tile | 440×280 | chưa, không bắt buộc |
| Mô tả chi tiết | tối đa 16.000 ký tự | lấy từ README |
| Danh mục | Productivity | |
| Ngôn ngữ | Tiếng Việt | |

Mô tả **phải nói rõ ngay dòng đầu rằng tiện ích cần ứng dụng desktop trên Windows mới hoạt động.** Không nói
rõ thì người duyệt cài thử, thấy nó không chặn được gì, và đánh trượt vì "không hoạt động".

## Sau khi được duyệt — đừng làm trước

Chỉ khi tiện ích đã lên store thật:

1. Đổi màn hình mở đầu trong ứng dụng: bỏ bốn bước "Developer mode → Load unpacked", thay bằng một nút mở
   thẳng trang store rồi dán mã ghép nối. Đây chính là điểm §5 trong `the_brain_project_questions.md`.
2. Đổi mục "Cài đặt" trên website cho khớp.
3. Giữ lại đường load unpacked ở đâu đó cho người dùng Edge hoặc người không vào được store.

Làm sớm hơn là tự phá luồng cài đặt đang chạy được, trong lúc chưa chắc có được duyệt hay không.

## Ảnh chụp đã dựng sẵn

Nằm trong `store-assets/`, đúng **1280×800, PNG 24-bit không kênh alpha** — canvas luôn xuất RGBA
32-bit nên phải tự đóng gói lại PNG color type 2, không thì bị chặn ngay ở bước upload.

| File | Nội dung |
|---|---|
| `1-trang-chan.png` | Trang chặn của chính tiện ích. Để đầu tiên vì đây là thứ duy nhất trong bộ thuộc về tiện ích. |
| `2-man-hinh-chinh.png` | Ứng dụng desktop: số dư credit và danh sách chặn |
| `3-dang-tap-trung.png` | Phiên đang chạy, credit tích lũy theo thời gian thực |
| `4-ghep-noi.png` | Màn hình mở đầu với bốn bước ghép nối |
| `5-cai-dat.png` | Bảng cài đặt |

Không ảnh nào bị cắt cúp: ảnh gốc được thu vừa khung rồi đặt giữa nền trắng, nên không có nội dung nào
bị che đi để trông gọn hơn thực tế.

Bốn trên năm ảnh là ứng dụng desktop, đúng bản chất của một tiện ích đi kèm — nhưng vì vậy phần mô tả
càng phải nói ngay từ dòng đầu rằng tiện ích cần ứng dụng Windows mới hoạt động.

Chưa có ảnh popup của tiện ích: popup cần bối cảnh extension thật mới chạy được, và nó là một khung hẹp
nên đặt vào khung 1280×800 sẽ thừa rất nhiều nền trắng.

## Gói nộp

`store-assets/focus-bridge-0.6.0.zip` — 11 file, `manifest.json` nằm ở gốc.

Đừng dùng `Compress-Archive` của PowerShell 5.1 để đóng gói lại: nó ghi đường dẫn bằng dấu gạch ngược
(`icons\icon-128.png`), trong khi chuẩn ZIP đòi gạch xuôi, nên Chrome có thể không tìm thấy icon. Gói này
được dựng bằng `ZipFileExtensions::CreateEntryFromFile` với tên mục tự đặt, đã kiểm lại không còn dấu
gạch ngược nào.

Mỗi lần lên phiên bản mới, nhớ tăng `version` trong `extension/manifest.json` trước khi đóng gói — store
từ chối bản upload trùng số phiên bản.
