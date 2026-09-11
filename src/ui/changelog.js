// SINH TỰ ĐỘNG TỪ CHANGELOG.md — đừng sửa tay.
// Ứng dụng cần lịch sử phiên bản để hiện trong mục Giới thiệu, nhưng nguồn sự
// thật vẫn là CHANGELOG.md. tests/changelog.test.cjs đọc lại file gốc và báo đỏ
// nếu hai nơi lệch nhau, nên không thể quên cập nhật chỗ này.
const CHANGELOG=[
  {v:"0.7.4", items:[
    "<b>Dán link nào cũng chặn được.</b> Trước đây dán <code>github.com/ai-đó/repo</code> thì ứng dụng báo lỗi và bắt bạn tự gõ lại tên miền. Nay dán cả đường link dài — có tham số, có cổng, có gì đi nữa — ứng dụng tự nhận ra tên miền gốc và chặn đúng nó.",
    "<b>Thống kê tách thành cửa sổ riêng.</b> Bấm vào dải bảy ngày ở màn hình chính để mở: tổng thời gian, số phiên hoàn tất, số phiên bỏ dở, credit đã kiếm, số ngày có tập trung, trung bình mỗi ngày, và bảng 30 ngày gần nhất.",
    "<b>Danh sách chặn chia thành hai nhóm rõ ràng:</b> Website, và Ứng dụng và game — kèm số lượng từng nhóm. Trước đây hai loại này trộn chung một danh sách, dù website thì tiện ích chặn nên vẫn chạy khi tắt ứng dụng, còn ứng dụng thì cần ứng dụng đang mở.",
    "<b>Thêm mục Giới thiệu</b> trong ⚙: bản đang chạy, tóm tắt quyền riêng tư, và danh sách \"Có gì mới\" của bốn bản gần nhất — không phải lên website mới xem được.",
    "<b>Cửa sổ Cài đặt không còn nhảy kích thước</b> mỗi lần bạn chuyển tab.",
    "<b>Ô nhập số phút tùy ý</b> bỏ nút tăng giảm mặc định của Windows và trông hợp với phần còn lại của ứng dụng."
  ]},
  {v:"0.7.3", items:[
    "<b>Cài đặt chia thành bảy mục, không phải cuộn dài nữa.</b> Thanh mục bên trái đứng yên — Bộ chặn, Phiên, Chế độ khóa, Tiến bộ, Giao diện, Bản quyền, Ứng dụng — và chỉ phần nội dung bên phải cuộn. Trước đây mọi thứ nằm chung một cột nên phải kéo rất sâu mới tới mục cuối.",
    "<b>Chữ trong ứng dụng to và rõ hơn.</b> Cỡ chữ nền tăng, phần mô tả trong Cài đặt tăng nhiều nhất vì đó là chỗ khó đọc nhất.",
    "<b>Logo, tên sản phẩm và nút ⚙ trên thanh đầu đều to hơn</b>, và nút ⚙ chuyển sang màu đen cho dễ thấy.",
    "<b>Ứng dụng và tiện ích nay dùng chung phông chữ với website.</b> Trang chặn trong trình duyệt cũng chuyển sang đơn sắc như phần còn lại của sản phẩm, và có chế độ tối lần đầu."
  ]},
  {v:"0.7.2", items:[
    "<b>Nút phản hồi ngay lúc bạn nhấn.</b> Trước đây nút chỉ đổi màu khi rê chuột, nhấn xuống thì không có gì xảy ra cho tới lúc nhả — nút có cảm giác chết. Nay nút co nhẹ ngay khi bạn nhấn.",
    "<b>Tôn trọng thiết lập trợ năng của Windows.</b> Bật \"giảm chuyển động\" thì bỏ mọi hiệu ứng trượt và phóng, nhưng vẫn giữ mờ dần để bạn biết chuyện gì vừa xảy ra. Tắt \"hiệu ứng trong suốt\" thì nền hộp thoại đặc hơn. Bật \"tương phản cao\" thì viền dày và màu đậm hơn."
  ]},
  {v:"0.7.1", items:[
    "<b>Có chỗ để góp ý.</b> Trong ⚙ giờ có mục <b>Góp ý</b> với hai nút: gửi email hoặc mở GitHub. Nút email điền sẵn phiên bản ứng dụng, phiên bản Windows và trạng thái kết nối tiện ích — ba thứ luôn phải hỏi tới hỏi lui mỗi lần báo lỗi. Bạn nhìn thấy toàn bộ nội dung trước khi bấm gửi; ứng dụng không tự gửi gì đi đâu cả."
  ]},
  {v:"0.7.0", items:[
    "<b>Ứng dụng tự báo khi có bản mới.</b> Từ bản này trở đi, không phải tự vào website xem có gì mới nữa — ứng dụng tự kiểm tra và hiện trong ⚙. Bản mới <b>không tự tải về</b>: bạn bấm mới tải, để không tốn dung lượng mạng ngoài ý muốn.",
    "<b>Không bao giờ cài đè giữa chừng.</b> Cài bản mới phải đóng ứng dụng, nên nó từ chối cài trong hai trường hợp: đang chạy phiên tập trung (đóng giữa phiên là mất hết credit đang tích lũy) và đang trong chế độ khóa (lúc ứng dụng tắt, phần chặn ứng dụng Windows sẽ ngừng hoạt động). Cũng không tự cài lén lúc bạn thoát ứng dụng.",
    "<b>Xem ranh giới Free/Pro ngay trong ⚙.</b> Có bảng so sánh và ô nhập mã bản quyền. Hiện <b>chưa bán và chưa ai bị giới hạn gì</b> — mọi tính năng vẫn mở cho tất cả mọi người.",
    "Mã bản quyền được lưu ở file riêng, nên <b>nút \"Xóa toàn bộ dữ liệu\" không làm mất bản quyền</b> bạn đã mua."
  ]},
  {v:"0.6.0", items:[
    "<b>Mở được nhiều mục cùng lúc.</b> Trước đây chỉ mở được một thứ tại một thời điểm, nên chặn cả trình duyệt lẫn YouTube là rơi vào ngõ cụt: trả credit mở trình duyệt xong thì không mở nổi YouTube bên trong, mà màn hình đếm ngược cũng không cho đổi thêm. Nay mở trình duyệt rồi mở tiếp website bên trong bình thường, mỗi mục vẫn trả credit riêng.",
    "<b>Màn hình đếm ngược không còn là ngõ cụt.</b> Khi đang có mục mở, giao diện vẫn giữ hai cột: bên trái liệt kê những mục đang mở kèm thời gian còn lại và nút kết thúc riêng từng mục, bên phải vẫn đổi credit được như thường."
  ]},
  {v:"0.5.3", items:[
    "<b>Nút trên lớp phủ nay thật sự đóng ứng dụng bị chặn.</b> Trước đây bấm \"Quay lại làm việc\" thì lớp phủ biến mất nhưng ứng dụng vẫn dùng được thoải mái. Nay ứng dụng được yêu cầu thoát như khi bạn bấm dấu X, và nếu nó không chịu thoát thì lớp phủ quay lại sau vài giây. Nút được đổi tên thành <b>Đóng ứng dụng, quay lại làm việc</b> cho đúng việc nó làm."
  ]},
  {v:"0.5.2", items:[
    "<b>Mở ứng dụng bằng credit ngay trên lớp phủ.</b> Nút mở hoạt động đúng, bấm lặp không trừ thêm credit; thiếu credit có thông báo tại chỗ. Lớp phủ không tự biến mất khi nhận focus và giữ nguyên thời lượng đang chọn.",
    "<b>Hủy chọn ứng dụng không làm mất nút xác nhận.</b> Cả nút Quay lại và phím Escape đều dùng được; danh sách tải chậm không ghi đè hộp xác nhận tiếp theo.",
    "<b>Đóng cửa sổ chính là thoát hẳn ứng dụng</b>, kể cả sau khi lớp phủ đã xuất hiện. Nếu đang tập trung, vẫn được chọn tiếp tục hoặc đóng và hủy phiên."
  ]}
];
