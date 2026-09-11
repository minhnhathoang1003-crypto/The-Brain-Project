# Có gì mới

## 0.7.4

- **Dán link nào cũng chặn được.** Trước đây dán `github.com/ai-đó/repo` thì ứng dụng báo lỗi và bắt bạn tự gõ lại tên miền. Nay dán cả đường link dài — có tham số, có cổng, có gì đi nữa — ứng dụng tự nhận ra tên miền gốc và chặn đúng nó.
- **Thống kê tách thành cửa sổ riêng.** Bấm vào dải bảy ngày ở màn hình chính để mở: tổng thời gian, số phiên hoàn tất, số phiên bỏ dở, credit đã kiếm, số ngày có tập trung, trung bình mỗi ngày, và bảng 30 ngày gần nhất.
- **Danh sách chặn chia thành hai nhóm rõ ràng:** Website, và Ứng dụng và game — kèm số lượng từng nhóm. Trước đây hai loại này trộn chung một danh sách, dù website thì tiện ích chặn nên vẫn chạy khi tắt ứng dụng, còn ứng dụng thì cần ứng dụng đang mở.
- **Thêm mục Giới thiệu** trong ⚙: bản đang chạy, tóm tắt quyền riêng tư, và danh sách "Có gì mới" của bốn bản gần nhất — không phải lên website mới xem được.
- **Cửa sổ Cài đặt không còn nhảy kích thước** mỗi lần bạn chuyển tab.
- **Ô nhập số phút tùy ý** bỏ nút tăng giảm mặc định của Windows và trông hợp với phần còn lại của ứng dụng.

## 0.7.3

- **Cài đặt chia thành bảy mục, không phải cuộn dài nữa.** Thanh mục bên trái đứng yên — Bộ chặn, Phiên, Chế độ khóa, Tiến bộ, Giao diện, Bản quyền, Ứng dụng — và chỉ phần nội dung bên phải cuộn. Trước đây mọi thứ nằm chung một cột nên phải kéo rất sâu mới tới mục cuối.
- **Chữ trong ứng dụng to và rõ hơn.** Cỡ chữ nền tăng, phần mô tả trong Cài đặt tăng nhiều nhất vì đó là chỗ khó đọc nhất.
- **Logo, tên sản phẩm và nút ⚙ trên thanh đầu đều to hơn**, và nút ⚙ chuyển sang màu đen cho dễ thấy.
- **Ứng dụng và tiện ích nay dùng chung phông chữ với website.** Trang chặn trong trình duyệt cũng chuyển sang đơn sắc như phần còn lại của sản phẩm, và có chế độ tối lần đầu.

## 0.7.2

- **Nút phản hồi ngay lúc bạn nhấn.** Trước đây nút chỉ đổi màu khi rê chuột, nhấn xuống thì không có gì xảy ra cho tới lúc nhả — nút có cảm giác chết. Nay nút co nhẹ ngay khi bạn nhấn.
- **Tôn trọng thiết lập trợ năng của Windows.** Bật "giảm chuyển động" thì bỏ mọi hiệu ứng trượt và phóng, nhưng vẫn giữ mờ dần để bạn biết chuyện gì vừa xảy ra. Tắt "hiệu ứng trong suốt" thì nền hộp thoại đặc hơn. Bật "tương phản cao" thì viền dày và màu đậm hơn.

## 0.7.1

- **Có chỗ để góp ý.** Trong ⚙ giờ có mục **Góp ý** với hai nút: gửi email hoặc mở GitHub. Nút email điền sẵn phiên bản ứng dụng, phiên bản Windows và trạng thái kết nối tiện ích — ba thứ luôn phải hỏi tới hỏi lui mỗi lần báo lỗi. Bạn nhìn thấy toàn bộ nội dung trước khi bấm gửi; ứng dụng không tự gửi gì đi đâu cả.

## 0.7.0

- **Ứng dụng tự báo khi có bản mới.** Từ bản này trở đi, không phải tự vào website xem có gì mới nữa — ứng dụng tự kiểm tra và hiện trong ⚙. Bản mới **không tự tải về**: bạn bấm mới tải, để không tốn dung lượng mạng ngoài ý muốn.
- **Không bao giờ cài đè giữa chừng.** Cài bản mới phải đóng ứng dụng, nên nó từ chối cài trong hai trường hợp: đang chạy phiên tập trung (đóng giữa phiên là mất hết credit đang tích lũy) và đang trong chế độ khóa (lúc ứng dụng tắt, phần chặn ứng dụng Windows sẽ ngừng hoạt động). Cũng không tự cài lén lúc bạn thoát ứng dụng.
- **Xem ranh giới Free/Pro ngay trong ⚙.** Có bảng so sánh và ô nhập mã bản quyền. Hiện **chưa bán và chưa ai bị giới hạn gì** — mọi tính năng vẫn mở cho tất cả mọi người.
- Mã bản quyền được lưu ở file riêng, nên **nút "Xóa toàn bộ dữ liệu" không làm mất bản quyền** bạn đã mua.

## 0.6.0

- **Mở được nhiều mục cùng lúc.** Trước đây chỉ mở được một thứ tại một thời điểm, nên chặn cả trình duyệt lẫn YouTube là rơi vào ngõ cụt: trả credit mở trình duyệt xong thì không mở nổi YouTube bên trong, mà màn hình đếm ngược cũng không cho đổi thêm. Nay mở trình duyệt rồi mở tiếp website bên trong bình thường, mỗi mục vẫn trả credit riêng.
- **Màn hình đếm ngược không còn là ngõ cụt.** Khi đang có mục mở, giao diện vẫn giữ hai cột: bên trái liệt kê những mục đang mở kèm thời gian còn lại và nút kết thúc riêng từng mục, bên phải vẫn đổi credit được như thường.

## 0.5.3

- **Nút trên lớp phủ nay thật sự đóng ứng dụng bị chặn.** Trước đây bấm "Quay lại làm việc" thì lớp phủ biến mất nhưng ứng dụng vẫn dùng được thoải mái. Nay ứng dụng được yêu cầu thoát như khi bạn bấm dấu X, và nếu nó không chịu thoát thì lớp phủ quay lại sau vài giây. Nút được đổi tên thành **Đóng ứng dụng, quay lại làm việc** cho đúng việc nó làm.

## 0.5.2

- **Mở ứng dụng bằng credit ngay trên lớp phủ.** Nút mở hoạt động đúng, bấm lặp không trừ thêm credit; thiếu credit có thông báo tại chỗ. Lớp phủ không tự biến mất khi nhận focus và giữ nguyên thời lượng đang chọn.
- **Hủy chọn ứng dụng không làm mất nút xác nhận.** Cả nút Quay lại và phím Escape đều dùng được; danh sách tải chậm không ghi đè hộp xác nhận tiếp theo.
- **Đóng cửa sổ chính là thoát hẳn ứng dụng**, kể cả sau khi lớp phủ đã xuất hiện. Nếu đang tập trung, vẫn được chọn tiếp tục hoặc đóng và hủy phiên.

## 0.5.1

- **Sửa lỗi không mở được ứng dụng sau khi cập nhật.** Bản 0.5.0 báo "Phiên bản dữ liệu không tương thích" với người dùng đến từ 0.3.5 – 0.4.0. Dữ liệu không hề bị mất; ứng dụng chỉ từ chối mở. Cài bản này là vào được như cũ, giữ nguyên credit và mã ghép nối.

## 0.5.0

- **Chặn ứng dụng và game Windows.** Chọn từ danh sách ứng dụng đang mở — thấy tên quen thuộc chứ không phải đi tìm file `.exe`. Khi ứng dụng bị chặn hiện lên, một lớp phủ che nó lại; đổi credit để mở, hoặc quay lại làm việc và cửa sổ đó bị thu nhỏ. Không giết tiến trình nào nên không mất dữ liệu đang làm dở.
- **Lịch sử và tiến bộ.** Dải bảy ngày trên màn hình chính, bảng 14 ngày gần nhất trong Cài đặt. Mỗi ngày ghi số phút, số phiên hoàn tất, số phiên dở và credit nhận được.

## 0.4.0

- **Chế độ khóa.** Khóa cứng 30 phút, 1 giờ, 2 giờ hoặc 4 giờ. Không hủy, không rút ngắn. Trong lúc khóa: không đổi credit, không bỏ chặn website, không xóa dữ liệu, không ngắt tiện ích. Vẫn tập trung và tích credit bình thường. Tiện ích tự giữ hạn khóa nên tắt ứng dụng không mở khóa được.
- Ranh giới Free/Pro được đóng đinh trong mã nguồn. Hiện chưa bán và chưa ai bị giới hạn.

## 0.3.6

- Sửa dải quy đổi credit bị cắt mất chữ khi cửa sổ thấp.

## 0.3.5

- Tặng 15 credit cho lần chạy đầu tiên.

## 0.3.4

- Mở lại ứng dụng: tiện ích kết nối lại sau ~2 giây thay vì 27 giây. Không phải ghép nối lại; mã ghép nối không bao giờ đổi.

## 0.3.3

- Logo mới ở mọi nơi: icon ứng dụng, thanh tiêu đề, trang chặn, popup và thanh công cụ trình duyệt.
- Sửa icon trên taskbar không cập nhật.

## 0.3.1

- Tự chọn khung thời gian tập trung trong Cài đặt, giữ từ 1 đến 4 mốc.
- Bảng cài đặt mới: tiêu đề và nút đứng yên, chỉ phần giữa cuộn.
- Sửa lỗi bảng cài đặt vẫn phủ lên ứng dụng sau khi bấm Đóng.

## 0.3.0

- Bố cục hai cột: nghi thức bên trái, ranh giới bên phải.
- Giao diện đơn sắc, thêm chế độ tối với ba lựa chọn.
- Dải quy đổi credit đặt ngay trên nút bắt đầu.
- Credit tăng dần theo thời gian thực trong lúc chạy phiên.
- Màn hình hướng dẫn ghép nối cho lần chạy đầu.
- Chuyển sang trình cài đặt: mở ứng dụng nhanh hơn 66 lần.

## 0.2.0

- Cắt còn một màn hình duy nhất: tập trung → credit → mở website.
