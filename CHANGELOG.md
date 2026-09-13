# Có gì mới

## 0.7.9

- **Mục Bộ chặn im lặng khi mọi thứ đang chạy.** Trước đây mở ⚙ → Bộ chặn ra là bị dạy lại cách cài tiện ích — kèm nút đen "Sao chép mã ghép nối" to nhất màn hình — dù tiện ích đã chạy ngon từ lâu. Nay khi đang chạy, mục này chỉ còn một dòng: đang chặn bao nhiêu website và tiện ích bản nào. Các bước cài gập lại sau dòng *Cài tiện ích trên trình duyệt khác, hoặc ghép nối lại* — vẫn ở đó vì hai việc ấy có thật, chỉ là hiếm. Rớt kết nối thì các bước hiện ra ngay, không bắt bạn đi tìm.
- **Bỏ một nút bấm thừa.** Khi chưa kết nối, phần nạp tiện ích thủ công lặp lại đúng nút *Sao chép mã ghép nối* đã có ngay phía trên. Hai nút y hệt trên cùng một bảng chỉ làm người ta phân vân không biết chúng có khác nhau không.
- **Ứng dụng lấy đúng kết nối mới nhất khi đọc phiên bản tiện ích.** Lúc tiện ích nối lại sau khi cập nhật, dây cũ còn thoi thóp thêm một nhịp; trước đây ứng dụng có thể đọc nhầm nó và báo số bản cũ trong khi bản mới đã nối xong.

## 0.7.8

- **Ứng dụng nói cho bạn biết khi bộ chặn không với tới được trình duyệt bạn đang mở.** Tiện ích chặn chạy trong Chrome, Edge và các trình duyệt cùng nhân Chromium — nhưng không chạy được trong Firefox và họ Gecko, vì Firefox không cho cài tiện ích chưa ký một cách vĩnh viễn. Từ trước tới nay mở Firefox ra là đi vòng qua toàn bộ danh sách chặn, và ứng dụng im lặng. Nay khi một trình duyệt như vậy lên tiền cảnh, màn hình chính nói thẳng điều đó. Bản Pro chặn được luôn trình duyệt đó như một ứng dụng, ngay từ trong dòng cảnh báo. Bấm **Bỏ qua** thì nó im hẳn với trình duyệt đó.
- **Chạy cùng Windows,** bật trong ⚙ → Ứng dụng. Mặc định tắt. Không bật thì sau mỗi lần khởi động lại máy, phần chặn ứng dụng và lớp phủ không hoạt động cho tới khi bạn tự mở ứng dụng — chặn website thì không ảnh hưởng vì tiện ích tự giữ danh sách. Khi Windows tự chạy, cửa sổ mở ra ở dạng thu nhỏ chứ không ẩn hẳn: một tiến trình vô hình mà chính bạn cũng không biết đang chạy thì không phải kiểu phần mềm này.
- **Ứng dụng biết tiện ích của bạn là bản nào.** Tiện ích tự khai phiên bản khi ghép nối, và ⚙ → Bộ chặn hiện nó ra. Trước đây ứng dụng chỉ thấy "đã kết nối" — đúng cái lỗ hổng khiến bản trên Chrome Web Store kẹt ở 0.6.0 suốt mà không ai phát hiện. Tiện ích cũ hơn vẫn chặn đúng và vẫn giữ hạn chế độ khóa; ứng dụng nói rõ cái gì còn chạy chứ không chỉ cái gì hỏng.
- **Tiện ích đã lên Chrome Web Store, và đường cài ngắn lại còn hai bước:** bấm **Cài tiện ích**, dán mã ghép nối. Hết. Không còn Developer mode, không còn Load unpacked, không còn dòng "Tắt tiện ích ở chế độ nhà phát triển" mỗi lần mở Chrome. Cách nạp thủ công vẫn còn nguyên cho người chạy từ mã nguồn — chỉ gập lại một dòng.
- **Gói tiện ích nhẹ đi 26KB.** Trang chặn đóng gói sẵn ba subset font, trong đó `latin-ext` 85KB không có một ký tự nào thuộc riêng nó — mà vẫn thắng quyền vẽ chữ Việt, chỉ vì được khai sau. Bỏ đi: 114KB còn 88KB, chữ không đổi một nét.
- **README nói đúng lại.** Ba câu đã sai từ lâu: "ứng dụng lưu 180 ngày" (từ 0.7.6 nó không xoá lịch sử nữa), "không cập nhật tự động" (có từ 0.7.0), và "chưa chặn ứng dụng Windows" (có từ 0.5.0). Thêm một bảng nói thẳng bộ chặn với tới đâu và không với tới đâu.

## 0.7.7

- **Mục Bản quyền gọn lại.** Trước đây nó kể cả những thứ bạn không cần biết: lần xác minh gần nhất, bao lâu ứng dụng kiểm lại một lần, còn bao nhiêu ngày dùng được nếu mất mạng. Cái cuối cùng còn trông như đồng hồ đếm ngược tới lúc mất bản quyền, dù chẳng có gì sắp xảy ra. Nay chỉ còn ba dòng: bạn đang ở bản nào, mã nào, và đổi máy ở đâu.
- **Cảnh báo chỉ hiện khi thật sự cần.** Nếu ứng dụng không kết nối được tới máy chủ bản quyền nhiều ngày liền và sắp hết thời gian dùng ngoại tuyến, lúc đó nó mới nói — kèm cách xử lý.
- **Câu "xóa dữ liệu không làm mất bản quyền" chuyển xuống ngay cạnh nút Xóa toàn bộ,** đúng chỗ bạn cần đọc nó.

## 0.7.6

- **Lịch sử tập trung không còn bị xóa nữa.** Từ trước tới nay ứng dụng âm thầm hủy dữ liệu của những ngày quá 180 ngày trước. Nay nó giữ lại tất cả, và bản Pro xem lại được từ ngày bạn cài. Lưu ý thẳng thắn: những ngày đã bị xóa ở các bản trước thì không lấy lại được — bản này chỉ ngăn chuyện đó xảy ra tiếp.
- **Màn hình Thống kê chọn được khoảng thời gian:** 7 ngày, 30 ngày, 90 ngày, hoặc toàn bộ. Bảng theo ngày trước đây cắt cứng ở 30 dòng, nay hiện đủ mọi ngày trong khoảng bạn chọn.
- **Lưới nhịp tập trung.** Mỗi ô là một ngày, ô càng đậm càng nhiều phút. Nó cho thấy thứ mà bảng số không nói ra: bạn đều đặn hay bùng nổ rồi bỏ.
- **Chuỗi ngày liên tiếp,** cả chuỗi hiện tại lẫn chuỗi dài nhất. Hôm nay chưa kịp tập trung thì chuỗi vẫn được tính là còn — ngày vẫn còn dài.
- **So sánh với kỳ trước, và ngày nhiều nhất.** Tổng thời gian quá một giờ thì hiện thành giờ và phút thay vì một con số phút dài loằng ngoằng.
- **Nút gỡ mã bản quyền bớt chắn đường.** Nó từng là một nút đỏ nằm ngay dưới dòng trạng thái, nên mỗi lần mở ra chỉ để xem còn hạn không thì bạn lại nhìn thẳng vào nút xóa bản quyền. Nay là một dòng nhỏ ở cuối mục, và có hỏi lại trước khi gỡ.

## 0.7.5

- **Đổi credit ngay trên màn hình chặn website.** Trước đây gặp trang bị chặn thì phải đi tìm ứng dụng mới mở tạm được. Nay chọn số phút ngay tại chỗ là vào thẳng trang. Không luật nào được nới: đang khóa, đang trong phiên tập trung hay chưa đủ credit thì vẫn không đổi được — nhưng giờ màn hình chặn nói rõ lý do thay vì để bạn bấm rồi mới biết.
- **Ứng dụng nói rõ khi bạn chạm trần bản Free.** Nhóm "Ứng dụng và game" trước đây biến mất hoàn toàn với người chưa mua; nay nó vẫn hiện kèm giải thích. Danh sách website ghi rõ đang dùng bao nhiêu trên bao nhiêu, và khi đầy thì nói trước chứ không để bạn gõ xong mới báo lỗi.
- **Màn hình thống kê nói rõ đang tính trên bao nhiêu ngày,** và nhắc rằng dữ liệu của những ngày cũ hơn vẫn nằm trên máy bạn, không bị xóa.
- **Kích hoạt bản Pro bằng một cú bấm.** Sau khi mua, bấm nút trong email là ứng dụng tự mở lên và tự kích hoạt — không phải gõ lại mã dài 36 ký tự. Nếu nút không chạy được, trang kích hoạt vẫn hiện mã ra để chép tay.
- **Mục Bản quyền nói rõ tình trạng mã của bạn:** đang hoạt động, xác minh lần cuối ngày nào, còn bao nhiêu ngày dùng được nếu mất mạng. Gỡ mã khỏi máy này cũng trả lại một lượt kích hoạt để bạn dùng cho máy khác.
- **Bắt đầu mở bán.** Vòng lặp cốt lõi — tập trung để kiếm credit, đổi credit để mở, chặn website qua tiện ích — vẫn miễn phí vĩnh viễn và không bao giờ nằm sau tường phí.

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
