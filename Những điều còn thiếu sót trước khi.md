Những điều còn thiếu sót trước khi Deploy:

* Chặn hẳn việc thu tiền

  * Không có bất kỳ cơ chế bán nào. Không license key, không kích hoạt, không giới hạn dùng thử. Hiện tại ai tải cũng dùng đầy đủ, vĩnh viễn. §19 chọn "Subscription + Lifetime" nhưng chưa có một dòng code nào cho việc đó.
  * Không có máy chủ cấp/kiểm license. Kể cả bán lifetime cũng cần chỗ phát key và chặn key bị chia sẻ tràn lan.
  * Chưa chọn cổng thanh toán. Với người bán lẻ ở Việt Nam ra quốc tế, Paddle hoặc Lemon Squeezy đứng tên merchant-of-record và lo VAT hộ; Stripe thì bạn tự chịu thuế từng nước.
  * Không có Điều khoản sử dụng, Chính sách riêng tư, chính sách hoàn tiền. Cổng thanh toán sẽ hỏi, Chrome Web Store cũng hỏi — nhất là khi tiện ích đọc URL của mọi tab.
  * Chưa có pháp nhân / hóa đơn. Bán được vài đồng thì chưa sao, bán nghiêm túc thì phải có.
* Chặn người dùng cài được

  * Binary chưa ký số. signExecutable: false. Mỗi lần cài, SmartScreen báo "Windows protected your PC" — đây là thứ giết tỉ lệ cài đặt mạnh nhất. Cần chứng chỉ ký code OV hoặc EV (EV có uy tín SmartScreen ngay lập tức).
  * Tiện ích chưa lên Chrome Web Store. Bắt người mua bật Developer mode rồi Load unpacked là bất khả thi với người không rành máy. Tệ hơn: Chrome hiện cảnh báo "Tắt tiện ích ở chế độ nhà phát triển" mỗi lần mở trình duyệt. Đây là rào cản số 1.
  * Không có trang web, không có ảnh/video demo, không có kênh hỗ trợ.
* Lỗ hổng sản phẩm

  * Không có cập nhật tự động. Bán xong là không vá được gì nữa. Người mua kẹt ở bản lỗi cho tới khi họ tự đi tải lại.
  * Không lưu lịch sử gì cả. Engine chỉ giữ lastSession và số phút hôm nay. Người trả tiền muốn thấy tiến bộ theo tuần/tháng — hiện không có. Chỉ số North Star ở §23 cũng không đo được.
  * Chặn quá dễ lách. Mở Task Manager tắt app, hoặc tắt tiện ích một cú click, là xong. Cold Turkey và Freedom có "locked mode" không tự gỡ được — đó chính là thứ người ta trả tiền để mua.
  * Không có trên điện thoại. Cơn nghiện nằm ở điện thoại. Chặn YouTube trên máy tính trong khi cái điện thoại nằm ngay cạnh làm hỏng lời hứa cốt lõi. Theo tôi đây là khoảng cách lớn nhất giữa sản phẩm và vấn đề nó nói mình giải quyết.
  * Chưa chặn ứng dụng và game Windows — §4.1 muốn có. Kế hoạch đã có ở docs/APP\_BLOCKING.md, code thì chưa.
  * Chưa tách được Shorts khỏi YouTube. §2.2 nói kẻ thù là nội dung ngắn, không phải YouTube. Chặn cả YouTube thì người cần học trên đó phải tắt bộ chặn — và họ sẽ không bật lại.
  * Mất sạch dữ liệu khi cài lại máy. Không xuất, không nhập, không sao lưu, không đồng bộ. Người đã tích 300 credit mà đổi máy là mất trắng.
  * Chưa có ranh giới Free / Pro. §19.1 và §19.2 trong bộ câu hỏi vẫn để trống. Không biết bán cái gì thì không bán được.
* Hạ tầng vận hành

  * Chưa có git. not a git repository — toàn bộ dự án không có lịch sử, không quay lui được, không rẽ nhánh. Đây là rủi ro âm thầm lớn nhất hiện giờ: một lệnh xóa nhầm là mất hết.
  * Không có CI. Toàn bộ kiểm thử chạy tay trên đúng một máy, một phiên bản Windows.
  * Không có báo lỗi từ thực địa. App sập ở máy người dùng thì bạn không bao giờ biết.
  * Chỉ có Windows x64. Chưa có ARM64 (Snapdragon X đang bán ra), chưa có macOS.
  * Chưa có changelog cho người dùng.
  * Giao diện chỉ có tiếng Việt. Bán ra ngoài Việt Nam cần i18n.
* Rủi ro nền tảng

  * Tiện ích xin <all\_urls> và quyền tabs. Chrome Web Store sẽ soi kỹ; cần giải trình rõ mục đích, có thể phải thu hẹp quyền, và thời gian duyệt nằm ngoài tầm kiểm soát của bạn.
  * Quảng cáo là "chặn" trong khi lách được bằng một cú click có thể bị coi là mô tả sai sự thật khi có người đòi hoàn tiền.

