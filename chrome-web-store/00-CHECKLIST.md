# Checklist nộp Chrome Web Store — việc Nhat phải tự làm

Mọi thứ chuẩn bị được đã xong. Dưới đây là những bước **chỉ bạn làm được** (tài khoản, tiền, upload, bấm nút).

Thời gian ước tính: **35–50 phút** nếu privacy page deploy trơn.

---

## Trước khi mở Developer Dashboard

**1. Deploy lại website.**
File mới `website/privacy.html` đã được tạo nhưng **chưa online**. Deploy Vercel, rồi mở `https://the-brain-project.vercel.app/privacy` trong tab ẩn danh và xác nhận nó tải được.
→ Không có bước này thì đơn bị từ chối ở vòng kiểm tra tự động. Đây là lý do từ chối phổ biến nhất.

**2. Kiểm tra ZIP nạp sạch — 3 phút, đừng bỏ qua.**
Manifest đã bị sửa (bỏ quyền `tabs`), nên phải xác nhận bằng mắt:

- Giải nén `chrome-web-store/the-brain-project-focus-bridge-0.6.0.zip` ra một thư mục tạm.
- `chrome://extensions` → bật Developer mode → **Load unpacked** → chọn thư mục đó.
- Xác nhận: **không có dòng lỗi đỏ nào**, tên hiện là "The Brain Project · Focus Bridge", version 0.6.0.
- Mở app Windows, dán mã ghép nối vào popup, và thử vào `youtube.com`. Phải ra trang chặn.
- Gỡ bản unpacked này ra sau khi thử xong.

Nếu bước này hỏng, dừng lại — đừng nộp. Việc bỏ quyền `tabs` là thay đổi duy nhất có rủi ro hành vi.

---

## Trên Chrome Web Store Developer Dashboard

**3. Đăng ký tài khoản developer.**
Vào https://chrome.google.com/webstore/devconsole với tài khoản Google bạn muốn **gắn vĩnh viễn** với tiện ích này.
→ Cân nhắc: tên tài khoản này hiện công khai trên trang store. `minhnhat.hoang1003@gmail.com` là tài khoản cá nhân. Nếu sau này muốn chuyển sang tài khoản công ty thì việc chuyển quyền sở hữu item là phiền. Quyết định bây giờ, không phải sau.

**4. Trả phí đăng ký 5 USD.**
Một lần, không hoàn lại, cần thẻ quốc tế (Visa/Mastercard). Trả xong mới nộp được item nào.
→ Thẻ nội địa VN thường bị từ chối. Nếu thẻ hỏng, đây là chỗ mất nhiều thời gian nhất trong cả quy trình — chuẩn bị trước một thẻ có thanh toán quốc tế.

**5. Xác minh danh tính / địa chỉ email.**
Google có thể yêu cầu xác minh email liên hệ trước khi cho publish. Làm luôn ở tab **Account** để không bị chặn ở phút chót.

**6. Tạo item mới, upload ZIP.**
`+ New item` → upload `chrome-web-store/the-brain-project-focus-bridge-0.6.0.zip`.
SHA-256 để đối chiếu: `1bbd45dc03887b7aa17a20e71a29c6777db93cdd487b6783ca71d2e9ba9f725b`

**7. Điền tab Store listing.**
Copy từ `02-NOI-DUNG-NIEM-YET-VI.md`:
- Mô tả chi tiết
- Category: **Productivity**
- Language: **Tiếng Việt**
- Upload 5 screenshot + store icon từ `chrome-web-store/assets/`
- Support URL: `https://the-brain-project.vercel.app`
- Support email: `minhnhat.hoang1003@gmail.com`

**8. Thêm bản dịch English.** (khuyến nghị, không bắt buộc)
Trong Store listing → thêm ngôn ngữ English → dán nội dung từ `03-NOI-DUNG-NIEM-YET-EN.md`.
→ Không có bước này thì gần như toàn bộ người dùng ngoài Việt Nam sẽ không tìm thấy hoặc không hiểu tiện ích.

**9. Điền tab Privacy practices — đây là chỗ hay kẹt nhất.**
Copy từng ô từ `04-PRIVACY-VA-QUYEN.md`:
- Single purpose (mục A)
- Justification cho `declarativeNetRequest`, `storage`, `alarms`, `<all_urls>` (mục B)
- Remote code: **No** (mục B.5)
- Data usage: **không tick ô nào** (mục C — đọc phần giải thích về "Web history" trước khi tick)
- Tick cả **3 tuyên bố bắt buộc** (mục D)
- Privacy policy URL: `https://the-brain-project.vercel.app/privacy`
- **Notes for reviewer** (mục F) — đừng để trống. Ô này giải thích WebSocket localhost và `<all_urls>` trước khi reviewer phải hỏi.

**10. Distribution.**
- Visibility: **Public**
- Regions: **All regions** (trừ khi có lý do cụ thể để giới hạn)
- Pricing: **Free**

**11. Submit for review.**
`Submit for review`. Không tick "Publish immediately after review" ở lần đầu nếu bạn muốn kiểm tra lại trang trước khi nó lên — nhưng với sản phẩm này thì publish ngay là hợp lý.

---

## Sau khi nộp — thứ nằm ngoài tầm kiểm soát của bạn

**Thời gian duyệt: vài ngày tới vài tuần.** Không có cách nào đẩy nhanh. Không có kênh liên hệ để hỏi tiến độ.

Extension xin `<all_urls>` **luôn** rơi vào luồng review thủ công chậm hơn — chuẩn bị tinh thần chờ ở đầu trên của khoảng đó, không phải đầu dưới.

Nếu bị từ chối, email từ chối sẽ nêu mã vi phạm cụ thể. Hai kịch bản có xác suất cao nhất và cách xử lý:

| Nếu bị từ chối vì | Làm gì |
|---|---|
| **Permission scope / "Request minimum permissions"** | Đổi `action.type` trong `rulesFor()` từ `redirect` sang `block`, bỏ `host_permissions` khỏi manifest, nộp lại. Mất trang chặn có thương hiệu, đổi lấy việc gần như chắc chắn được duyệt. Chi tiết ở `01-MANIFEST-AUDIT.md`. |
| **"Functionality không kiểm chứng được"** (reviewer không cài được app Windows) | Trả lời email bằng cách gửi link tải trực tiếp bộ cài + một mã ghép nối test + video 60 giây quay lại luồng hoạt động. Đây là rủi ro thật với mọi extension phụ thuộc native app. |

**Đừng bấm publish rồi ngồi F5.** Việc có giá trị nhất trong lúc chờ là quay video demo và ký số bộ cài Windows — cả hai đều là ma sát chuyển đổi thật sự, và cả hai đều đang bị hoãn.

---

## Việc tôi KHÔNG làm (theo đúng yêu cầu)

Không tạo tài khoản, không thanh toán, không upload, không nộp bất cứ thứ gì. Chỉ chuẩn bị file.
