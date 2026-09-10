# Bán hàng — quyết định và trạng thái

Đã chốt hướng. Chưa bán, và chưa có tính năng nào bị khóa.

## Sự thật phải chấp nhận trước

Electron đóng gói bằng asar, giải nén bằng một lệnh. Mọi kiểm tra license nằm trong app đều vá được trong mười phút. Đừng tiêu tiền vào obfuscation hay chống crack — nó chỉ làm chậm người dùng thật. Mục tiêu là **trả tiền dễ hơn đi tìm bản crack**, không phải là không thể bẻ.

## Đường thu tiền

**Lemon Squeezy** hoặc **Paddle**, không tự dựng máy chủ.

- Họ đứng tên merchant of record, tự lo VAT và thuế bán hàng từng nước. Bán từ Việt Nam ra toàn cầu mà không phải đăng ký thuế ở đâu.
- Họ có sẵn API license key: tạo, kích hoạt, giới hạn số máy, thu hồi. Đây mới là lý do chính — nó cắt bỏ hoàn toàn phần backend.

Stripe rẻ hơn về phí nhưng phải tự chịu thuế từng nước và tự viết hệ thống key. Với một người làm một mình, đó là lựa chọn sai.

## Cách kiểm tra, hợp với app local-first

1. Dán key một lần → gọi `activate` → nhận `instance_id` → lưu bằng `safeStorage` như dữ liệu hiện tại.
2. Sau đó kiểm tra offline bằng kết quả đã lưu. Khoảng 14 ngày mới gọi `validate` lại một lần.
3. Không có mạng thì ân hạn 30 ngày.
4. Quá ân hạn → tụt về bậc `free`, **không khóa app**.

Ba quy tắc đóng đinh, vì đây là app kỷ luật chứ không phải app giải trí:

- License hỏng không bao giờ làm mất credit người dùng đã kiếm.
- License hỏng không bao giờ làm bộ chặn ngừng chặn — họ trả tiền để bị chặn.
- License hỏng không bao giờ làm app không mở được.

## Ranh giới Free / Pro — đã chốt

| Free (vĩnh viễn) | Pro |
|---|---|
| Trọn vòng lặp credit: tập trung → credit → mở khóa | Chặn tối đa 50 website |
| Chặn tối đa 5 website | Chặn ứng dụng và game Windows |
| Lịch sử 7 ngày | Chế độ khóa không tự gỡ được |
| Tỉ lệ 5:1 cố định | Lịch sử đầy đủ 180 ngày |

Bốn dòng bên cột Pro là **toàn bộ** những gì Pro có, và cả bốn đều đã tồn tại trong mã. Bảng này từng
liệt kê thêm "báo cáo tuần", "tỉ lệ tùy chỉnh", "sao lưu, đồng bộ" — không thứ nào trong đó được xây,
và `customRatio` cùng `sync` nằm trong `PLANS` mà không dòng nào trong `src/` đọc tới. Đã gỡ cả ba khỏi
đây lẫn khỏi mã. Từ nay: **không đưa gì vào bảng giá trước khi nó chạy được.**

Nguyên tắc: **vòng lặp cốt lõi miễn phí vĩnh viễn.** Nó là thứ khiến người ta kể cho bạn bè; đưa nó vào sau tường phí là giết kênh lan truyền duy nhất hiện có.

Chế độ khóa là thứ đáng tiền nhất trong nhóm sản phẩm này. Hiện ai cũng mở Task Manager tắt app là xong; người nghiêm túc sẽ trả tiền để **không tự gỡ được**.

## Đã làm

**Cả bốn tính năng Pro đều đã xây xong.** Chế độ khóa ở 0.4.0; chặn ứng dụng và game Windows cùng lịch sử
theo ngày ở 0.5.0. Không còn phải xây gì trước khi bán.

**Cổng chặn cũng đã nối xong hết.** `engine.cjs` gọi `limits()` ở đúng bốn chỗ tương ứng: `appBlocking`
chặn `appAdd`, `maxTargets` chặn `targetAdd`, `lockedMode` chặn `lock`, và `historyDays` cắt lịch sử
trong `snapshot()`. `snapshot()` cũng lộ `tier`, `maxTargets`, `lockedMode`, `appBlocking` ra cho giao diện.

**Bản quyền nằm ở file riêng `brain-license.enc`, cố ý không nằm trong `brain-data.enc`.** Nút "Xóa toàn bộ
dữ liệu" gọi `initial()`; để chung là người đã trả tiền reset dữ liệu sẽ mất luôn thứ họ mua. Cùng lý do mà
quà 15 credit được giữ ngoài `initial()`. Có kiểm thử chạy trên ứng dụng thật cho đúng điều này: xóa dữ liệu
xong, credit về 0 mà mã bản quyền vẫn còn.

`src/license.cjs` — đường nối. `tier()` trả về `'free'` hoặc `'pro'`, `limits()` trả về hạn mức của bậc đó.
Module này cố ý không `require` electron để `tests/` nạp được bằng node trần; việc đọc/ghi file nằm ở
`main.cjs` rồi bơm vào qua `load()`.

Hôm nay hằng số `SELLING` trong `license.cjs` bằng `false`, nên `tier()` luôn trả `'pro'` và **không người
dùng nào bị giới hạn gì**. App vẫn miễn phí hoàn toàn. Đừng bật `SELLING` trước khi `verify()` gọi được cổng
thanh toán — bật sớm là khóa tính năng của những người đang dùng miễn phí mà chẳng có cách nào để họ mua.

Đặt `BRAIN_TIER=free` để xem thử trải nghiệm bản Free:

```bash
BRAIN_TIER=free npm.cmd start
```

Bậc lạ hoặc không đặt đều rơi về `'pro'` — hỏng cấu hình không bao giờ khóa ai lại. Có kiểm thử cho cả hai bậc và cho các giá trị rác.

## Chưa làm, theo thứ tự

1. **Kiểm đường rút tiền về Việt Nam trước khi dựng gì.** Lemon Squeezy được chọn vì họ đứng tên merchant
   of record và có sẵn API license key, nhưng phần trả tiền về tài khoản Việt Nam là thứ dễ vỡ nhất và nằm
   ngoài tầm sửa của mã nguồn. Kiểm xong hẵng tạo sản phẩm.
2. Chốt giá. Tham khảo đối thủ (khoảng, nên kiểm lại trước khi định giá): Cold Turkey Blocker ~39 USD trọn
   đời, Freedom ~9 USD/tháng hoặc ~40 USD/năm, Forest ~4 USD trọn đời.
3. Tạo tài khoản Lemon Squeezy, dựng sản phẩm và giá.
4. ~~Màn hình nhập key và trang so sánh Free/Pro trong ⚙.~~ **Xong.** Bảng so sánh đọc thẳng từ
   `DIFFERENCES` trong `license.cjs`, nên nó không thể lệch khỏi thứ engine thật sự áp dụng — thêm một hạn
   mức ở đó là bảng tự có thêm dòng, và có kiểm thử bắt lỗi nếu một hạn mức trong `PLANS` không xuất hiện
   trong bảng.
5. Viết lại thân `license.verify()` để gọi `activate` của Lemon Squeezy, rồi **bật `SELLING = true`**.
   Hai chỗ đó là toàn bộ những gì còn phải sửa trong mã. Hôm nay `verify()` chỉ kiểm định dạng và nói thẳng
   với người dùng là chưa xác minh được, thay vì giả vờ đã xác minh.
6. Trang giá và chính sách hoàn tiền trên website. Mục "Giá" hiện ghi *"Hiện miễn phí toàn bộ"* nên sẽ phải
   viết lại — nhưng lời hứa *"vòng lặp cốt lõi miễn phí vĩnh viễn"* thì giữ nguyên văn.

Hai thứ không chặn đơn hàng đầu tiên nhưng ảnh hưởng thẳng tới tỉ lệ mua:

- **Ký số.** `package.json` đang để `signExecutable: false`. Tải miễn phí mà gặp cảnh báo SmartScreen thì chỉ
  khó chịu; trả tiền xong mới gặp "Windows protected your PC" là mất niềm tin. Chứng chỉ OV khoảng 200–400
  USD/năm và vẫn cần thời gian tích lũy uy tín; EV có uy tín ngay nhưng đắt hơn và cần khóa cứng.
- **Tự cập nhật.** Chưa có `electron-updater` ở đâu trong dự án. Người trả tiền mong bản sửa lỗi tự tới; hiện
  cách duy nhất để họ biết có bản mới là danh sách email trên website.

§19.3 trong bộ câu hỏi ghi: *"giai đoạn đầu thứ tôi cần là lôi cuốn người dùng thay vì tiền."* Thứ tự trên
vẫn tôn trọng điều đó. Bốn tính năng Pro nay đã có thật, nhưng `tier()` vẫn trả `'pro'` cho tất cả mọi người
— chưa ai bị khóa lại, và sẽ không ai bị khóa cho tới khi cả sáu bước trên xong xuôi.
