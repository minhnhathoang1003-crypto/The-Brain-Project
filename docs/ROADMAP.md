# Đường tới 1.0

Ba cột mốc, mỗi cột mốc là **một câu phải đúng**, không phải một danh sách tính năng.
Đếm tính năng là cách dễ nhất để ra 1.0 mà vẫn không ai mua được.

Trạng thái: **0.7.9**. Đã mở bán, tiện ích đã lên Chrome Web Store.

---

## 0.8 — Người lạ cài được mà không thấy sợ

> Một người không quen biết tôi, tải về từ trang web, cài xong và trả tiền, **không có
> bước nào khiến họ nghĩ phần mềm này đáng ngờ.**

Hôm nay câu đó sai, vì đúng một lý do.

| Việc | Ai làm | Chặn ở đâu |
|---|---|---|
| **Ký số binary** | Nhat | Smart App Control **chặn cứng** bản cài chưa ký — không phải cảnh báo bỏ qua được. Đã tự dính trên máy phát triển với 0.7.2. Máy không bật SAC thì SmartScreen vẫn hiện cảnh báo đỏ. |
| Tiện ích 0.7.1 lên cửa hàng | Nhat | đang chờ duyệt |
| Bản niêm yết tiếng Anh | Nhat | `03-NOI-DUNG-NIEM-YET-EN.md` đã soạn, chưa nộp. Không có nó thì người ngoài Việt Nam không tìm ra. |
| Mua thử một lượt thật | Nhat | Chưa ai đi trọn đường mua → nhận key → kích hoạt trên một máy sạch. `tests/license.test.cjs` kiểm logic, không kiểm được cái đường tiền đi. |

**Ký số là việc có tỉ lệ đổi tiền cao nhất trong toàn bộ tài liệu này**, và nó không phải
việc viết mã. Giá và vì sao Việt Nam không dùng được Azure Artifact Signing:
[COMPETITORS.md](COMPETITORS.md#1-binary-chưa-ký-số).

Lưu ý khi đặt kỳ vọng: ký số **bắt đầu đồng hồ xây uy tín**, không bấm một công tắc. Phần
mềm mới vẫn có thể bị Smart App Control chặn cho tới khi đủ người cài an toàn.

Không có nó thì mọi thứ phía dưới đều là tô điểm cho một sản phẩm không ai cài nổi.

---

## 0.9 — Bộ chặn không hỏng trong im lặng

> **Không có cách nào để việc chặn ngừng hoạt động mà người dùng không biết.**

Đây là lời hứa cốt lõi. Hôm nay nó thủng ở bốn chỗ, và ba chỗ là *im lặng*.

| Chỗ thủng | Hôm nay | Cần làm |
|---|---|---|
| **Đóng cửa sổ là thoát app** | chặn ứng dụng và lớp phủ tắt theo, không báo gì | Đóng thì thu về khay hệ thống. Cặp đôi tự nhiên của mục "chạy cùng Windows" đã có ở 0.7.8. **Đổi cách ứng dụng sống** — đụng vào quyết định `win.on('closed') → app.quit()` đã cân nhắc kỹ để "Tiếp tục tập trung" được tôn trọng. Cần chốt trước khi làm. |
| **Gỡ tiện ích** | app chỉ ghi "Chưa chặn được website nào" — giống hệt lúc đang kết nối lại | Phân biệt *đang kết nối lại* với *đã mất hẳn*. Mất quá N phút thì nói thẳng: bộ chặn đang tắt, đã tắt bao lâu. |
| **Vặn đồng hồ về sau** | thoát được chế độ khóa | Khó chữa ngoại tuyến: ngủ máy hai tiếng và vặn đồng hồ hai tiếng trông giống hệt nhau. Đối thủ nào chữa được đều chạy service hoặc driver. Ít nhất phải **phát hiện và ghi lại**. |
| **Firefox** | 0.7.8 đã cảnh báo, chưa chặn | Chữa tận gốc cần ký AMO + port MV3 cho Gecko. Cùng loại rào cản với cửa hàng Chrome. |

Kèm theo, thứ duy nhất trong danh mục mà mọi đối thủ có còn ta không:

**Lịch khóa** — "chặn 9–17 mọi ngày trong tuần". Hợp triết lý: chế độ khóa đã tồn tại,
lịch chỉ là hẹn giờ cho nó, không phải cơ chế thứ hai. Khoảng 150 dòng.

---

## 1.0 — Không cần tôi đứng cạnh

> **Người dùng thứ một trăm tự đi hết được, và tôi biết chắc điều đó vì đã có chín mươi
> chín người đi trước.**

1.0 không phải là số tính năng. Nó là bằng chứng.

| Việc | Vì sao nó thuộc về 1.0 |
|---|---|
| **Bỏ bước chép–dán mã ghép nối** | Đây là bước yếu nhất trong cả quy trình: một chuỗi 64 ký tự, chép từ app sang popup. Tiện ích tự xin mã qua deep link là bỏ hẳn được bước này. |
| **Trang gỡ rối** | Tiện ích không kết nối, SmartScreen chặn, PowerShell bị khoá, mua rồi mà chưa kích hoạt được. Bốn câu hỏi này sẽ đến, và mỗi lần đến mà không có chỗ chỉ tới là một email. |
| **Câu chuyện gỡ cài đặt** | Gỡ app rồi thì tiện ích còn lại gì? Nó vẫn chặn theo danh sách cũ hay tự buông? Chưa ai trả lời. |
| **Tín hiệu dùng thật** | Không có cách nào biết ngoài việc hỏi — app không đo đạc gì, và đó là lựa chọn đúng. Nên tín hiệu phải đến từ người dùng nói ra: email góp ý, đánh giá trên cửa hàng, đơn hàng. |

---

## Cố ý **không** đưa vào đường tới 1.0

Bốn thứ này hay được coi là "phải có", và đều sai với sản phẩm này:

- **Điện thoại / đồng bộ.** Đụng tới việc phải có tài khoản và máy chủ — tức là bỏ luôn
  điểm "dữ liệu chỉ nằm trên máy bạn", một trong bốn thứ miễn phí vĩnh viễn.
- **macOS.** Toàn bộ phần chặn ứng dụng viết bằng PowerShell.
- **AI.** Không có câu hỏi nào ở đây cần tới nó.
- **Chống crack.** Đã chốt ở [MONETIZATION.md](MONETIZATION.md): asar giải nén bằng một
  lệnh, mục tiêu là trả tiền dễ hơn đi tìm crack, không phải là không thể bẻ.

## Thứ tự nếu chỉ làm được một việc mỗi lần

1. Ký số (0.8) — chặn mọi thứ phía sau nó
2. Lịch khóa (0.9) — khoảng trống tính năng lớn nhất mà làm được ngay
3. Thu về khay hệ thống (0.9) — cần chốt cách ứng dụng sống trước
4. Bỏ bước chép–dán mã (1.0)

Bảng đối chiếu với Cold Turkey, Freedom, RescueTime ở [COMPETITORS.md](COMPETITORS.md).
