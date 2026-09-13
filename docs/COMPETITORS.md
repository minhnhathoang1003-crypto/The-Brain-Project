# So với các phần mềm cùng danh mục

Đối chiếu với những cái bán chạy nhất trong nhóm "chặn xao nhãng" trên Windows:
**Cold Turkey Blocker** (mua đứt, khoảng 59 USD), **Freedom** (thuê bao, khoảng 40 USD/năm),
**RescueTime**, **Serene**, và nhóm tiện ích miễn phí **StayFocusd / LeechBlock**.

Xếp theo mức thiệt hại thật, không theo mức dễ làm.

## Bậc 1 — chặn thẳng việc bán, và không sửa được bằng mã

### 1. Binary chưa ký số

Windows Smart App Control **chặn cứng** trình cài đặt chưa ký — không phải cảnh báo bỏ qua được,
mà là không cho chạy. Đã tự dính đúng chuyện này khi cài bản 0.7.2 trên chính máy phát triển.
Máy nào không bật SAC thì SmartScreen vẫn hiện cảnh báo đỏ ở lần chạy đầu.

Cold Turkey, Freedom, RescueTime đều ký số. Không ai trả 390.000₫ cho phần mềm mà Windows nói là
nguy hiểm.

Cách chữa: Azure Trusted Signing (khoảng 10 USD/tháng, cần danh tính đã xác minh) hoặc chứng chỉ OV
(200–400 USD/năm). **Đây là việc có tỉ lệ đổi tiền cao nhất trong toàn bộ danh sách này**, và nó
không phải việc viết mã.

### 2. Tiện ích chưa lên Chrome Web Store

Hiện tại người dùng phải: bật Developer mode → Load unpacked → chép mã ghép nối → dán. Bốn bước, và
Chrome hiện một thông báo "Tắt tiện ích ở chế độ nhà phát triển" mỗi lần mở trình duyệt. Máy do công
ty quản lý thì chặn hẳn chế độ đó.

Đối thủ: một cú bấm từ cửa hàng.

Thư mục `chrome-web-store/` đã chuẩn bị sẵn nội dung niêm yết. Việc còn thiếu là nộp và chờ duyệt.

## Bậc 2 — thiếu năng lực thật

### 3. Firefox và họ Gecko

Tiện ích chặn là tiện ích Chromium: chạy trong Chrome, Edge, Brave, Vivaldi, Opera — không chạy trong
Firefox. Cài Firefox rồi mở YouTube ở đó là đi vòng qua toàn bộ danh sách chặn, mất ba mươi giây.

Cold Turkey chặn ở tầng hệ thống nên mọi trình duyệt đều dính.

Từ 0.7.8 ứng dụng **nói thẳng điều này** ngay khi một trình duyệt như vậy lên tiền cảnh, và bản Pro
chặn được nó như một ứng dụng. Đó là giảm nhẹ, không phải chữa. Chữa tận gốc cần ký AMO và một bản
port MV3 cho Gecko — cùng loại rào cản với mục 2.

### 4. Không có lịch

Đây là tính năng được dùng nhiều nhất trong cả danh mục: "chặn 9–17 mọi ngày trong tuần". Mọi đối thủ
đều có. Ứng dụng này hoàn toàn bị động — phải tự mở ra và tự bấm.

**Hợp với triết lý một cơ chế.** Chế độ khóa đã là "khóa cứng N tiếng, không gỡ được"; lịch chỉ là
đúng thứ đó chạy theo giờ. Không phải cơ chế thứ hai, chỉ là hẹn giờ cho cơ chế đã có.

Đây là khoảng trống tính năng lớn nhất mà làm được ngay.

### 5. Đóng cửa sổ là thoát hẳn ứng dụng

Không có icon khay hệ thống. Đóng cửa sổ → thoát → phần chặn ứng dụng và lớp phủ tắt theo. Cold Turkey
và Freedom chạy nền, đóng cửa sổ chỉ là thu về khay.

0.7.8 đã thêm "chạy cùng Windows" (tắt mặc định), nhưng cặp đôi tự nhiên của nó là "đóng thì thu về
khay". Việc này **đổi cách ứng dụng sống**, và nó đụng vào một quyết định đã cân nhắc kỹ trước đây
(`win.on('closed') → app.quit()`, để lựa chọn "Tiếp tục tập trung" được tôn trọng). Cần chốt trước
khi làm.

### 6. Chỉ có Windows

Freedom đồng bộ Windows / macOS / iOS / Android. Điện thoại mới là nơi phần lớn xao nhãng xảy ra.
Đầu tư lớn, và đụng tới việc phải có tài khoản và máy chủ — tức là bỏ luôn điểm "dữ liệu chỉ nằm trên
máy bạn".

## Bậc 3 — nhỏ hơn

- **Không có danh sách chặn dựng sẵn.** Đối thủ ship sẵn nhóm "mạng xã hội", "tin tức", "video".
  Ở đây bắt đầu với bốn tên miền.
- **Không xuất được dữ liệu.** RescueTime và Cold Turkey có CSV.
- **Vặn đồng hồ hệ thống vẫn phá được chế độ khóa.** Đã ghi rõ trong README. Thật ra khó chữa ngoại
  tuyến: ngủ máy hai tiếng và vặn đồng hồ tới hai tiếng trông giống hệt nhau từ phía ứng dụng. Đối thủ
  nào chữa được đều chạy một service hoặc driver.
- **Không có người đồng hành / báo cáo qua email.**

## Thứ mình có mà họ không có

Phải nói cả chiều này, không thì bảng trên thành danh sách tự chê.

- **Phải kiếm mới có giải trí.** Cold Turkey có "allowance" — được phát sẵn X phút mỗi ngày. Ở đây
  phải đổi bằng thời gian tập trung thật. Đó là toàn bộ điểm khác biệt, và không đối thủ nào làm.
- **Mua đứt,** không phải thuê bao như Freedom.
- **Không tài khoản, không máy chủ, không đo đạc gì về người dùng.** Dữ liệu mã hóa theo tài khoản
  Windows, nằm trên máy.
- **Tự khai ra chỗ hở của chính mình** trong README và trong ứng dụng. Hiếm.

## Thứ tự đề nghị

1. Ký số (không phải mã — nhưng chặn mọi thứ phía sau nó).
2. Nộp tiện ích lên Chrome Web Store.
3. Lịch khóa.
4. Đóng thì thu về khay hệ thống.
5. Danh sách chặn dựng sẵn.
