// SINH TỰ ĐỘNG TỪ CHANGELOG.md — đừng sửa tay.
// Ứng dụng cần lịch sử phiên bản để hiện trong mục Giới thiệu, nhưng nguồn sự
// thật vẫn là CHANGELOG.md. tests/changelog.test.cjs đọc lại file gốc và báo đỏ
// nếu hai nơi lệch nhau, nên không thể quên cập nhật chỗ này.
// Chạy lại bằng: node scripts/changelog.cjs
const CHANGELOG=[
  {v:"0.7.7", items:[
    "<b>Mục Bản quyền gọn lại.</b> Trước đây nó kể cả những thứ bạn không cần biết: lần xác minh gần nhất, bao lâu ứng dụng kiểm lại một lần, còn bao nhiêu ngày dùng được nếu mất mạng. Cái cuối cùng còn trông như đồng hồ đếm ngược tới lúc mất bản quyền, dù chẳng có gì sắp xảy ra. Nay chỉ còn ba dòng: bạn đang ở bản nào, mã nào, và đổi máy ở đâu.",
    "<b>Cảnh báo chỉ hiện khi thật sự cần.</b> Nếu ứng dụng không kết nối được tới máy chủ bản quyền nhiều ngày liền và sắp hết thời gian dùng ngoại tuyến, lúc đó nó mới nói — kèm cách xử lý.",
    "<b>Câu \"xóa dữ liệu không làm mất bản quyền\" chuyển xuống ngay cạnh nút Xóa toàn bộ,</b> đúng chỗ bạn cần đọc nó.",
  ]},
  {v:"0.7.6", items:[
    "<b>Lịch sử tập trung không còn bị xóa nữa.</b> Từ trước tới nay ứng dụng âm thầm hủy dữ liệu của những ngày quá 180 ngày trước. Nay nó giữ lại tất cả, và bản Pro xem lại được từ ngày bạn cài. Lưu ý thẳng thắn: những ngày đã bị xóa ở các bản trước thì không lấy lại được — bản này chỉ ngăn chuyện đó xảy ra tiếp.",
    "<b>Màn hình Thống kê chọn được khoảng thời gian:</b> 7 ngày, 30 ngày, 90 ngày, hoặc toàn bộ. Bảng theo ngày trước đây cắt cứng ở 30 dòng, nay hiện đủ mọi ngày trong khoảng bạn chọn.",
    "<b>Lưới nhịp tập trung.</b> Mỗi ô là một ngày, ô càng đậm càng nhiều phút. Nó cho thấy thứ mà bảng số không nói ra: bạn đều đặn hay bùng nổ rồi bỏ.",
    "<b>Chuỗi ngày liên tiếp,</b> cả chuỗi hiện tại lẫn chuỗi dài nhất. Hôm nay chưa kịp tập trung thì chuỗi vẫn được tính là còn — ngày vẫn còn dài.",
    "<b>So sánh với kỳ trước, và ngày nhiều nhất.</b> Tổng thời gian quá một giờ thì hiện thành giờ và phút thay vì một con số phút dài loằng ngoằng.",
    "<b>Nút gỡ mã bản quyền bớt chắn đường.</b> Nó từng là một nút đỏ nằm ngay dưới dòng trạng thái, nên mỗi lần mở ra chỉ để xem còn hạn không thì bạn lại nhìn thẳng vào nút xóa bản quyền. Nay là một dòng nhỏ ở cuối mục, và có hỏi lại trước khi gỡ.",
  ]},
  {v:"0.7.5", items:[
    "<b>Đổi credit ngay trên màn hình chặn website.</b> Trước đây gặp trang bị chặn thì phải đi tìm ứng dụng mới mở tạm được. Nay chọn số phút ngay tại chỗ là vào thẳng trang. Không luật nào được nới: đang khóa, đang trong phiên tập trung hay chưa đủ credit thì vẫn không đổi được — nhưng giờ màn hình chặn nói rõ lý do thay vì để bạn bấm rồi mới biết.",
    "<b>Ứng dụng nói rõ khi bạn chạm trần bản Free.</b> Nhóm \"Ứng dụng và game\" trước đây biến mất hoàn toàn với người chưa mua; nay nó vẫn hiện kèm giải thích. Danh sách website ghi rõ đang dùng bao nhiêu trên bao nhiêu, và khi đầy thì nói trước chứ không để bạn gõ xong mới báo lỗi.",
    "<b>Màn hình thống kê nói rõ đang tính trên bao nhiêu ngày,</b> và nhắc rằng dữ liệu của những ngày cũ hơn vẫn nằm trên máy bạn, không bị xóa.",
    "<b>Kích hoạt bản Pro bằng một cú bấm.</b> Sau khi mua, bấm nút trong email là ứng dụng tự mở lên và tự kích hoạt — không phải gõ lại mã dài 36 ký tự. Nếu nút không chạy được, trang kích hoạt vẫn hiện mã ra để chép tay.",
    "<b>Mục Bản quyền nói rõ tình trạng mã của bạn:</b> đang hoạt động, xác minh lần cuối ngày nào, còn bao nhiêu ngày dùng được nếu mất mạng. Gỡ mã khỏi máy này cũng trả lại một lượt kích hoạt để bạn dùng cho máy khác.",
    "<b>Bắt đầu mở bán.</b> Vòng lặp cốt lõi — tập trung để kiếm credit, đổi credit để mở, chặn website qua tiện ích — vẫn miễn phí vĩnh viễn và không bao giờ nằm sau tường phí.",
  ]},
  {v:"0.7.4", items:[
    "<b>Dán link nào cũng chặn được.</b> Trước đây dán <code>github.com/ai-đó/repo</code> thì ứng dụng báo lỗi và bắt bạn tự gõ lại tên miền. Nay dán cả đường link dài — có tham số, có cổng, có gì đi nữa — ứng dụng tự nhận ra tên miền gốc và chặn đúng nó.",
    "<b>Thống kê tách thành cửa sổ riêng.</b> Bấm vào dải bảy ngày ở màn hình chính để mở: tổng thời gian, số phiên hoàn tất, số phiên bỏ dở, credit đã kiếm, số ngày có tập trung, trung bình mỗi ngày, và bảng 30 ngày gần nhất.",
    "<b>Danh sách chặn chia thành hai nhóm rõ ràng:</b> Website, và Ứng dụng và game — kèm số lượng từng nhóm. Trước đây hai loại này trộn chung một danh sách, dù website thì tiện ích chặn nên vẫn chạy khi tắt ứng dụng, còn ứng dụng thì cần ứng dụng đang mở.",
    "<b>Thêm mục Giới thiệu</b> trong ⚙: bản đang chạy, tóm tắt quyền riêng tư, và danh sách \"Có gì mới\" của bốn bản gần nhất — không phải lên website mới xem được.",
    "<b>Cửa sổ Cài đặt không còn nhảy kích thước</b> mỗi lần bạn chuyển tab.",
    "<b>Ô nhập số phút tùy ý</b> bỏ nút tăng giảm mặc định của Windows và trông hợp với phần còn lại của ứng dụng.",
  ]},
  {v:"0.7.3", items:[
    "<b>Cài đặt chia thành bảy mục, không phải cuộn dài nữa.</b> Thanh mục bên trái đứng yên — Bộ chặn, Phiên, Chế độ khóa, Tiến bộ, Giao diện, Bản quyền, Ứng dụng — và chỉ phần nội dung bên phải cuộn. Trước đây mọi thứ nằm chung một cột nên phải kéo rất sâu mới tới mục cuối.",
    "<b>Chữ trong ứng dụng to và rõ hơn.</b> Cỡ chữ nền tăng, phần mô tả trong Cài đặt tăng nhiều nhất vì đó là chỗ khó đọc nhất.",
    "<b>Logo, tên sản phẩm và nút ⚙ trên thanh đầu đều to hơn</b>, và nút ⚙ chuyển sang màu đen cho dễ thấy.",
    "<b>Ứng dụng và tiện ích nay dùng chung phông chữ với website.</b> Trang chặn trong trình duyệt cũng chuyển sang đơn sắc như phần còn lại của sản phẩm, và có chế độ tối lần đầu.",
  ]},
  {v:"0.7.2", items:[
    "<b>Nút phản hồi ngay lúc bạn nhấn.</b> Trước đây nút chỉ đổi màu khi rê chuột, nhấn xuống thì không có gì xảy ra cho tới lúc nhả — nút có cảm giác chết. Nay nút co nhẹ ngay khi bạn nhấn.",
    "<b>Tôn trọng thiết lập trợ năng của Windows.</b> Bật \"giảm chuyển động\" thì bỏ mọi hiệu ứng trượt và phóng, nhưng vẫn giữ mờ dần để bạn biết chuyện gì vừa xảy ra. Tắt \"hiệu ứng trong suốt\" thì nền hộp thoại đặc hơn. Bật \"tương phản cao\" thì viền dày và màu đậm hơn.",
  ]},
  {v:"0.7.1", items:[
    "<b>Có chỗ để góp ý.</b> Trong ⚙ giờ có mục <b>Góp ý</b> với hai nút: gửi email hoặc mở GitHub. Nút email điền sẵn phiên bản ứng dụng, phiên bản Windows và trạng thái kết nối tiện ích — ba thứ luôn phải hỏi tới hỏi lui mỗi lần báo lỗi. Bạn nhìn thấy toàn bộ nội dung trước khi bấm gửi; ứng dụng không tự gửi gì đi đâu cả.",
  ]},
  {v:"0.7.0", items:[
    "<b>Ứng dụng tự báo khi có bản mới.</b> Từ bản này trở đi, không phải tự vào website xem có gì mới nữa — ứng dụng tự kiểm tra và hiện trong ⚙. Bản mới <b>không tự tải về</b>: bạn bấm mới tải, để không tốn dung lượng mạng ngoài ý muốn.",
    "<b>Không bao giờ cài đè giữa chừng.</b> Cài bản mới phải đóng ứng dụng, nên nó từ chối cài trong hai trường hợp: đang chạy phiên tập trung (đóng giữa phiên là mất hết credit đang tích lũy) và đang trong chế độ khóa (lúc ứng dụng tắt, phần chặn ứng dụng Windows sẽ ngừng hoạt động). Cũng không tự cài lén lúc bạn thoát ứng dụng.",
    "<b>Xem ranh giới Free/Pro ngay trong ⚙.</b> Có bảng so sánh và ô nhập mã bản quyền. Hiện <b>chưa bán và chưa ai bị giới hạn gì</b> — mọi tính năng vẫn mở cho tất cả mọi người.",
    "Mã bản quyền được lưu ở file riêng, nên <b>nút \"Xóa toàn bộ dữ liệu\" không làm mất bản quyền</b> bạn đã mua.",
  ]},
  {v:"0.6.0", items:[
    "<b>Mở được nhiều mục cùng lúc.</b> Trước đây chỉ mở được một thứ tại một thời điểm, nên chặn cả trình duyệt lẫn YouTube là rơi vào ngõ cụt: trả credit mở trình duyệt xong thì không mở nổi YouTube bên trong, mà màn hình đếm ngược cũng không cho đổi thêm. Nay mở trình duyệt rồi mở tiếp website bên trong bình thường, mỗi mục vẫn trả credit riêng.",
    "<b>Màn hình đếm ngược không còn là ngõ cụt.</b> Khi đang có mục mở, giao diện vẫn giữ hai cột: bên trái liệt kê những mục đang mở kèm thời gian còn lại và nút kết thúc riêng từng mục, bên phải vẫn đổi credit được như thường.",
  ]},
  {v:"0.5.3", items:[
    "<b>Nút trên lớp phủ nay thật sự đóng ứng dụng bị chặn.</b> Trước đây bấm \"Quay lại làm việc\" thì lớp phủ biến mất nhưng ứng dụng vẫn dùng được thoải mái. Nay ứng dụng được yêu cầu thoát như khi bạn bấm dấu X, và nếu nó không chịu thoát thì lớp phủ quay lại sau vài giây. Nút được đổi tên thành <b>Đóng ứng dụng, quay lại làm việc</b> cho đúng việc nó làm.",
  ]},
  {v:"0.5.2", items:[
    "<b>Mở ứng dụng bằng credit ngay trên lớp phủ.</b> Nút mở hoạt động đúng, bấm lặp không trừ thêm credit; thiếu credit có thông báo tại chỗ. Lớp phủ không tự biến mất khi nhận focus và giữ nguyên thời lượng đang chọn.",
    "<b>Hủy chọn ứng dụng không làm mất nút xác nhận.</b> Cả nút Quay lại và phím Escape đều dùng được; danh sách tải chậm không ghi đè hộp xác nhận tiếp theo.",
    "<b>Đóng cửa sổ chính là thoát hẳn ứng dụng</b>, kể cả sau khi lớp phủ đã xuất hiện. Nếu đang tập trung, vẫn được chọn tiếp tục hoặc đóng và hủy phiên.",
  ]},
  {v:"0.5.1", items:[
    "<b>Sửa lỗi không mở được ứng dụng sau khi cập nhật.</b> Bản 0.5.0 báo \"Phiên bản dữ liệu không tương thích\" với người dùng đến từ 0.3.5 – 0.4.0. Dữ liệu không hề bị mất; ứng dụng chỉ từ chối mở. Cài bản này là vào được như cũ, giữ nguyên credit và mã ghép nối.",
  ]},
  {v:"0.5.0", items:[
    "<b>Chặn ứng dụng và game Windows.</b> Chọn từ danh sách ứng dụng đang mở — thấy tên quen thuộc chứ không phải đi tìm file <code>.exe</code>. Khi ứng dụng bị chặn hiện lên, một lớp phủ che nó lại; đổi credit để mở, hoặc quay lại làm việc và cửa sổ đó bị thu nhỏ. Không giết tiến trình nào nên không mất dữ liệu đang làm dở.",
    "<b>Lịch sử và tiến bộ.</b> Dải bảy ngày trên màn hình chính, bảng 14 ngày gần nhất trong Cài đặt. Mỗi ngày ghi số phút, số phiên hoàn tất, số phiên dở và credit nhận được.",
  ]},
  {v:"0.4.0", items:[
    "<b>Chế độ khóa.</b> Khóa cứng 30 phút, 1 giờ, 2 giờ hoặc 4 giờ. Không hủy, không rút ngắn. Trong lúc khóa: không đổi credit, không bỏ chặn website, không xóa dữ liệu, không ngắt tiện ích. Vẫn tập trung và tích credit bình thường. Tiện ích tự giữ hạn khóa nên tắt ứng dụng không mở khóa được.",
    "Ranh giới Free/Pro được đóng đinh trong mã nguồn. Hiện chưa bán và chưa ai bị giới hạn.",
  ]},
  {v:"0.3.6", items:[
    "Sửa dải quy đổi credit bị cắt mất chữ khi cửa sổ thấp.",
  ]},
  {v:"0.3.5", items:[
    "Tặng 15 credit cho lần chạy đầu tiên.",
  ]},
  {v:"0.3.4", items:[
    "Mở lại ứng dụng: tiện ích kết nối lại sau ~2 giây thay vì 27 giây. Không phải ghép nối lại; mã ghép nối không bao giờ đổi.",
  ]},
  {v:"0.3.3", items:[
    "Logo mới ở mọi nơi: icon ứng dụng, thanh tiêu đề, trang chặn, popup và thanh công cụ trình duyệt.",
    "Sửa icon trên taskbar không cập nhật.",
  ]},
  {v:"0.3.1", items:[
    "Tự chọn khung thời gian tập trung trong Cài đặt, giữ từ 1 đến 4 mốc.",
    "Bảng cài đặt mới: tiêu đề và nút đứng yên, chỉ phần giữa cuộn.",
    "Sửa lỗi bảng cài đặt vẫn phủ lên ứng dụng sau khi bấm Đóng.",
  ]},
  {v:"0.3.0", items:[
    "Bố cục hai cột: nghi thức bên trái, ranh giới bên phải.",
    "Giao diện đơn sắc, thêm chế độ tối với ba lựa chọn.",
    "Dải quy đổi credit đặt ngay trên nút bắt đầu.",
    "Credit tăng dần theo thời gian thực trong lúc chạy phiên.",
    "Màn hình hướng dẫn ghép nối cho lần chạy đầu.",
    "Chuyển sang trình cài đặt: mở ứng dụng nhanh hơn 66 lần.",
  ]},
  {v:"0.2.0", items:[
    "Cắt còn một màn hình duy nhất: tập trung → credit → mở website.",
  ]},
];
