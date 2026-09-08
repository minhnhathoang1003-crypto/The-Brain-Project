# Có gì mới

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
