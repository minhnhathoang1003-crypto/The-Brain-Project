# Nộp tiện ích lên Chrome Web Store

Trạng thái: chưa nộp. Trang chính sách quyền riêng tư đã có, các phần còn lại là việc điền form.

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
| Ảnh chụp | ít nhất 1, cỡ **1280×800** hoặc 640×400 | chưa — ảnh hiện có là 1233×854 và 1280×803, đều không khớp |
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
