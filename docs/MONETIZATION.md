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
| Trọn vòng lặp credit: tập trung → credit → mở khóa | Không giới hạn số website (50) |
| Chặn tối đa 5 website | Lịch sử đầy đủ + báo cáo tuần |
| Lịch sử 7 ngày | Chặn ứng dụng và game Windows |
| Tỉ lệ 5:1 cố định | Chế độ khóa không tự gỡ được |
| | Tỉ lệ tùy chỉnh, sao lưu, đồng bộ |

Nguyên tắc: **vòng lặp cốt lõi miễn phí vĩnh viễn.** Nó là thứ khiến người ta kể cho bạn bè; đưa nó vào sau tường phí là giết kênh lan truyền duy nhất hiện có.

Chế độ khóa là thứ đáng tiền nhất trong nhóm sản phẩm này. Hiện ai cũng mở Task Manager tắt app là xong; người nghiêm túc sẽ trả tiền để **không tự gỡ được**.

## Đã làm

`src/license.cjs` — đường nối. `tier()` trả về `'free'` hoặc `'pro'`, `limits()` trả về hạn mức của bậc đó. Engine đọc `limits().maxTargets` thay vì số 50 viết cứng, và `snapshot()` lộ ra `tier` cùng `maxTargets` cho giao diện.

Hôm nay `tier()` luôn trả `'pro'`, nên **không người dùng nào bị giới hạn gì**. App vẫn miễn phí hoàn toàn.

Đặt `BRAIN_TIER=free` để xem thử trải nghiệm bản Free:

```bash
BRAIN_TIER=free npm.cmd start
```

Bậc lạ hoặc không đặt đều rơi về `'pro'` — hỏng cấu hình không bao giờ khóa ai lại. Có kiểm thử cho cả hai bậc và cho các giá trị rác.

## Chưa làm, theo thứ tự

1. Xây thứ đáng bán: chế độ khóa, lịch sử và báo cáo tuần. Hiện Pro chưa có tính năng riêng nào tồn tại.
2. Tạo tài khoản Lemon Squeezy, dựng sản phẩm và giá.
3. Gắn `activate` / `validate` vào thân hàm `tier()`. Đây là chỗ duy nhất phải sửa.
4. Màn hình nhập key và trang so sánh Free/Pro trong ⚙.
5. Chốt giá. Tham khảo đối thủ (khoảng, nên kiểm lại trước khi định giá): Cold Turkey Blocker ~39 USD trọn đời, Freedom ~9 USD/tháng hoặc ~40 USD/năm, Forest ~4 USD trọn đời.

§19.3 trong bộ câu hỏi ghi: *"giai đoạn đầu thứ tôi cần là lôi cuốn người dùng thay vì tiền."* Thứ tự trên tôn trọng điều đó — không có gì bị khóa lại cho tới khi có thứ thật sự đáng bán.
