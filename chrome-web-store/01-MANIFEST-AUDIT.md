# Audit manifest.json — Chrome Web Store (9/9/2026)

Đã sửa trực tiếp trong `extension/manifest.json`. Dưới đây là từng thay đổi và lý do.

## Đã sửa

| # | Thay đổi | Lý do |
|---|---|---|
| 1 | **Bỏ quyền `tabs`** | Đây là thứ dễ bị soi nhất. `background.js` chỉ dùng `tabs.query({})` và `tabs.update()`. Với `host_permissions: <all_urls>`, Chrome đã trả về `tab.url` mà không cần quyền `tabs`. Giữ nó là xin thừa — CWS coi quyền thừa là vi phạm "minimum permissions" và Chrome hiển thị thêm cảnh báo "Đọc lịch sử duyệt web" khi cài. Bỏ đi không mất chức năng nào. |
| 2 | **`version` 0.5.1 → 0.6.0** | Khớp với app. CWS chỉ yêu cầu version tăng dần, nhưng lệch số giữa app và tiện ích sẽ gây rối khi hỗ trợ người dùng. |
| 3 | **`description` viết lại** | Bản cũ ("Kết nối với The Brain Project trên Windows để chặn website...") mô tả *cơ chế nội bộ* chứ không mô tả *lợi ích cho người dùng*. CWS yêu cầu mô tả nói rõ tiện ích làm gì. Bản mới: 113/132 ký tự. |
| 4 | **Thêm `short_name`** | "The Brain Project · Focus Bridge" dài 32 ký tự, bị cắt ở nhiều chỗ trong UI Chrome. `short_name` = "Focus Bridge". |
| 5 | **Thêm `homepage_url`** | Trỏ về `https://the-brain-project.vercel.app/`. Không bắt buộc nhưng reviewer luôn tìm bằng chứng sản phẩm có thật — với một tiện ích phụ thuộc app desktop bên ngoài thì đây là điểm cộng đáng kể. |
| 6 | **`web_accessible_resources` rút từ 4 file xuống 1** | Chỉ `blocked.html` cần lộ ra web (nó là đích của luật redirect DNR). `blocked.css`, `blocked.js`, `icon-128.png` là tài nguyên con của một trang extension — chúng nạp bình thường mà không cần WAR. Lộ thừa file = tăng bề mặt để website bất kỳ dò ra bạn đã cài tiện ích (extension fingerprinting), một thứ reviewer có để ý. |

## Kiểm tra đã chạy

- `node --check` trên cả 3 file JS — sạch.
- Mọi đường dẫn trong manifest (`background.js`, `popup.html`, 4 icon, `blocked.html`) đều tồn tại.
- `node --test tests/extension.test.cjs` — 4/4 pass sau khi sửa.
- Không có `eval`, `new Function`, `sourceMappingURL`, không có script từ CDN, không có mã tải từ xa. Đây là yêu cầu cứng của MV3 và tiện ích đã đạt.
- Icon đủ 4 cỡ 16/32/48/128, đều là PNG.
- Không có `content_scripts` — tức là không có quyền chèn mã vào trang, giảm rủi ro review đáng kể.

## `<all_urls>` — điểm rủi ro lớn nhất, và vì sao vẫn giữ

Đây là thứ có thể khiến bản này bị từ chối. Nói thẳng về đánh đổi:

**Vì sao bắt buộc:** luật `declarativeNetRequest` với `action.type: "redirect"` **yêu cầu host permission cho URL bị chuyển hướng**. Người dùng tự nhập tên miền bất kỳ (mặc định là youtube/facebook/tiktok/instagram, nhưng họ thêm gì cũng được), nên không thể liệt kê trước một danh sách host cụ thể. Không có `<all_urls>` thì luật redirect im lặng không chạy.

**Phương án thay thế duy nhất, và cái giá của nó:** đổi `action.type` sang `"block"`. Kiểu `block` **không** cần host permission, và tiện ích có thể chạy chỉ với quyền `declarativeNetRequest` — hết sạch cảnh báo cài đặt. Nhưng khi đó Chrome hiển thị trang lỗi `ERR_BLOCKED_BY_CLIENT` mặc định thay cho `blocked.html`. Mất luôn: thông điệp "Một khoảng dừng", dải quy đổi credit, nút "Thử mở lại", và toàn bộ nhận diện thương hiệu ở đúng khoảnh khắc quan trọng nhất của sản phẩm.

**Khuyến nghị:** giữ `<all_urls>` và nộp với phần justification đã viết sẵn ở `04-PRIVACY-VA-QUYEN.md`. Justification đó nêu rõ ba điểm mà reviewer cần thấy: (a) không có content script, (b) không đọc hay ghi nội dung trang, (c) không có luồng dữ liệu ra Internet. Nếu bị từ chối vì permission scope, phương án B là chuyển sang `"block"` và nộp lại — đó là thay đổi khoảng 3 dòng trong `rulesFor()`.

## Thứ reviewer nhiều khả năng sẽ hỏi

1. **"Tiện ích kết nối tới `ws://127.0.0.1:47831` — đó là gì?"** Đây là dấu hiệu bất thường nhất trong mã. Không cần permission, không vi phạm gì, nhưng phải giải thích chủ động trong ô ghi chú cho reviewer. Câu trả lời đã soạn ở `04`.
2. **"Tiện ích không dùng được nếu không cài phần mềm ngoài."** Đúng, và điều này phải được nói rõ ngay dòng đầu của mô tả chi tiết, nếu không sẽ ăn đánh giá 1 sao ("cài xong không làm gì cả") và có thể bị gắn cờ vì chức năng gây hiểu nhầm. Mô tả đã viết theo hướng đó.
3. **Chưa ký số binary Windows.** Không liên quan tới review CWS, nhưng người dùng bấm link tải từ store sẽ gặp cảnh báo SmartScreen. Đây là ma sát chuyển đổi thật, không phải rủi ro từ chối.
