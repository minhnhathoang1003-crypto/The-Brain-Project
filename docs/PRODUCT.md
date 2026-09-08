# Phạm vi bản 0.5.0

Nguồn yêu cầu gốc `the_brain_project_questions.md` được giữ nguyên, không sửa.

## Mục đích duy nhất

Vấn đề số 1 (§2.2), điểm khác biệt cốt lõi (§21) và MVP (§24) trong bộ câu hỏi đều trỏ về một cơ chế: **tập trung → credit → mở tạm website**. Bản 0.2.0 cắt mọi thứ khác. Bản 0.3.0 không thêm tính năng mới nào; nó chỉ sửa năm chỗ khiến cơ chế đó khó nhận ra hoặc khó dùng.

## Sáu thay đổi trong 0.3.0

**Bố cục hai cột.** 0.2.0 là một cột 460 px, phóng toàn màn hình thì để trống 76 % chiều ngang. Nay trái là nghi thức, phải là ranh giới, dưới 860 px thì xếp chồng. Trong lúc chạy phiên hoặc đang mở website, màn hình chuyển về một cột duy nhất.

**Đơn sắc.** Bỏ hết màu, chỉ còn đen trắng và xám, phân cấp bằng nét mảnh và khoảng trống thay vì khung thẻ. Theo §18.1–18.2: Notion, minimal, monochrome.

**Dải quy đổi credit.** Luật cốt lõi từng nằm ở dòng chú thích 10,5 px màu xám dưới nút bấm. Nay là một dải ba ô ngay trên nút — `25 phút → 5 credit → 5 phút` — và đổi số theo thời lượng đang chọn. Bảng đối chiếu đầy đủ nằm trong Cài đặt.

**Credit tăng dần theo thời gian thực.** Trong phiên, người dùng thấy số credit đang tích lũy nhích lên từng giây. Nó không vào ví cho tới khi phiên trọn vẹn, nên ngay dưới là dòng "dừng lúc này là mất cả X credit" — cùng một con số, dùng cho cả động lực lẫn răn đe. Tỉ lệ 5:1 không đổi.

**Chế độ tối.** Ba lựa chọn: theo hệ thống, sáng, tối. Điều khiển bằng `data-theme` ở phía renderer vì `nativeTheme.themeSource` của Electron 44 không đổi được `prefers-color-scheme` trong renderer đang chạy.

**Màn hình mở đầu bắt buộc ghép nối.** Chưa ghép nối thì app không cho vào màn hình chính — vì lúc đó nó không chặn được gì và credit vô nghĩa. Chỉ chặn ở lần đầu; nếu sau này rớt kết nối thì chỉ cảnh báo, không nhốt người dùng khỏi credit đã kiếm. Thanh trạng thái nói hậu quả ("Chưa chặn được website nào") thay vì trạng thái kỹ thuật ("Chưa kết nối").

## Thêm trong 0.3.1

**Khung thời gian do người dùng đặt.** 25 / 50 / 90 chỉ còn là mặc định. Trong ⚙ có thể bỏ và thêm mốc, giữ từ 1 đến 4 mốc, mỗi mốc 1–180 phút; danh sách luôn được sắp tăng dần và ô “Khác” vẫn còn nguyên. Nếu mốc đang chọn bị xoá, màn hình chính tự lùi về mốc đầu tiên.

**Bảng cài đặt thay vì hộp thoại cuộn.** Tiêu đề và hàng nút đứng yên, chỉ phần giữa cuộn, thanh cuộn mảnh không nền và chỉ hiện khi con trỏ ở trong vùng cuộn. Sửa luôn một lỗi thật: `#setup{display:flex}` từng ghi đè `dialog:not([open]){display:none}` của trình duyệt, khiến bảng cài đặt vẫn phủ lên ứng dụng sau khi bấm Đóng.

## Thêm trong 0.3.2

**Logo mới.** Bộ não nét đen thay cho chữ `b°` cũ, ở tất cả những chỗ từng dùng logo cũ: icon của ứng dụng và trình cài đặt (`assets/icon.ico`, `.png` — lấy trực tiếp từ file `.ico` người dùng cung cấp, 8 cỡ từ 16 đến 256 px), thanh tiêu đề trong app, trang chặn và popup của tiện ích, và icon của tiện ích trên thanh Chrome (trước đây là mảnh ghép mặc định).

`scripts/icon.cjs` — script sinh icon từ chữ `b°` — đã bị xóa vì nay nguồn logo là file `.ico` do người dùng cung cấp; chạy lại nó sẽ ghi đè mất logo thật. Thay bằng `scripts/ico.cjs` để đọc và tách các khung ảnh trong file `.ico`.

## Sửa trong 0.5.0

**Icon trên taskbar không đổi theo.** `app.setAppUserModelId` bị thiếu. NSIS gắn id `com.humanos.brain` lên shortcut, nhưng app đang chạy không khai báo id nào, nên Windows coi cửa sổ là một chương trình lạ và không ghép nó với shortcut đã ghim — kết quả là taskbar giữ icon cũ. Đã khai báo id khớp với `appId`.

**Logo trong app không giống logo gốc.** Hai lý do, cả hai đều là lỗi thật:

- Mark trong thanh tiêu đề là SVG tôi vẽ tay mô phỏng lại logo, không phải logo gốc. Nay dùng thẳng file ảnh người dùng cung cấp (`src/ui/logo.png`, tách từ khung 128 px của `.ico`), và trang chặn cùng popup của tiện ích cũng vậy. Dark mode xử lý bằng `filter: invert(1)` qua biến `--mark-filter`, nên hình dạng luôn đúng bản gốc.
- Có **hai** rule CSS cùng tên `.mark` — một cho logo thương hiệu, một cho ô chữ cái đầu tên miền trong danh sách chặn. Rule sau thắng, nên logo bị bọc khung viền 24 px. Đã đổi tên rule logo thành `.brand-mark`. Đây là lần thứ hai một va chạm tên class kiểu này lọt qua, sau `.actions.left` ở 0.3.0.

`assets/icon.svg` đã xóa vì không còn chỗ nào dùng.

## Sửa trong 0.5.0

**Mở lại ứng dụng tưởng như phải ghép nối lại.** Mã ghép nối vốn đã được giữ nguyên qua các lần khởi động lại — không có lỗi ở đó. Lỗi là ở độ trễ: báo thức của Chrome không xuống dưới 30 giây, nên sau khi ứng dụng khởi động lại, tiện ích mất tới **27 giây** mới kết nối lại. Suốt quãng đó thanh trên ghi "Chưa chặn được website nào" và lệnh đổi credit bị từ chối, khiến người dùng tưởng phải dán mã mới.

Tiện ích nay thử kết nối lại ngay trong lúc service worker còn thức, giãn dần 2 → 4 → 8 → … → 30 giây, và vẫn giữ báo thức 30 giây làm lưới đỡ khi service worker đã ngủ. Đo lại: **27,0 s → 1,8 s**.

Ứng dụng cũng nói rõ điều này thay vì để người dùng đoán: khung cảnh báo và mục Cài đặt đều ghi tiện ích tự kết nối lại và **không phải ghép nối lại**, mã ghép nối không đổi.

Thêm `npm.cmd run test:restart` — chạy ứng dụng thật và tiện ích thật, ghép nối một lần, khởi động lại ứng dụng rồi đo độ trễ kết nối lại mà không đụng vào popup.

## Thêm trong 0.5.0

**Tặng 15 credit cho lần chạy đầu tiên.** Người mới cài có sẵn 15 phút để dùng khi cần gấp, chưa phải hoàn thành một phiên nào. Màn hình mở đầu nói rõ món quà này.

Quà được cộng ở `main.cjs` khi **chưa có file dữ liệu**, cố tình không nằm trong `initial()` của engine. Lý do: `initial()` cũng là thứ mà nút "Xóa toàn bộ dữ liệu" dùng. Nếu quà nằm trong đó thì xóa-dữ-liệu-rồi-ghép-nối-lại trở thành cách kiếm 15 credit vô hạn, đúng thứ mà toàn bộ sản phẩm tồn tại để ngăn. Sau khi reset, số dư về 0.

Cài lại hoàn toàn ứng dụng và xóa thư mục dữ liệu thì vẫn nhận quà lần nữa — không chặn được điều đó nếu không có tài khoản trên máy chủ, và ma sát của việc đó đã đủ lớn.

Thêm `scripts/grant.cjs` để cộng credit vào dữ liệu thật khi thử nghiệm. Nó nằm ngoài danh sách `files` nên không đi vào bản đóng gói, và từ chối chạy khi ứng dụng đang mở để tránh bị ghi đè.

## Sửa trong 0.5.0

**Dải quy đổi bị cắt mất chữ.** Cột trái là flex dọc; khi nội dung cao hơn cửa sổ — dễ xảy ra nhất lúc khung cảnh báo "chưa chặn được website nào" hiện ra — flex co tất cả các khối lại thay vì để pane cuộn. `.rule` có `overflow:hidden` (cần cho bo góc) nên bị co là mất chữ, không phải thu nhỏ. Đo được: khối bị ép còn `clientHeight` 0 trong khi nội dung cao 50 px.

Sửa bằng `.left>*,.right>*{flex:none}`: nội dung giữ nguyên chiều cao, pane cuộn khi cần.

`test:migrate` nay kiểm ở bốn kích thước cửa sổ và khẳng định không khối nào trong hai cột có `scrollHeight` lớn hơn `clientHeight`. Đã xác nhận bài kiểm này thật sự bắt được lỗi: bỏ dòng CSS ra thì nó báo `rule 0<50`.

## Đóng gói

Chuyển từ portable sang trình cài NSIS ở mức tài khoản người dùng. File portable là gói tự bung, mỗi lần mở giải nén ~250 MB ra thư mục tạm: đo được **22,1 s** mỗi lần khởi động. Bản đã cài chạy trong **0,27–0,30 s**.

## Không đổi

Tỉ lệ 5 phút = 1 credit; 1 credit = 1 phút. Hủy phiên, đóng ứng dụng, ngủ/khóa máy, đổi đồng hồ hoặc vượt ngưỡng không hoạt động đều mất toàn bộ credit của phiên. Chỉ một lượt mở tại một thời điểm, trừ credit ngay, kết thúc sớm không hoàn. Không tập trung khi đang có lượt mở. Dữ liệu local và mã hóa. Giao thức giữa ứng dụng và tiện ích giữ nguyên nên tiện ích không phải sửa và người dùng cũ không phải ghép nối lại.

## Chế độ khóa — 0.5.0

Tính năng Pro đầu tiên, và cũng là bản vá cho lỗ hổng lớn nhất của sản phẩm: trước đây tắt ứng dụng bằng Task Manager là hết chặn.

Bật từ ⚙ với các mốc 30 phút / 1 giờ / 2 giờ / 4 giờ, trần 12 tiếng. **Không hủy, không rút ngắn được.** Trong lúc khóa:

- không đổi được credit;
- không bỏ chặn được website nào;
- không xóa được dữ liệu (nếu không chặn, đây là nút thoát chỉ bằng một cú click);
- không ngắt được tiện ích từ popup;
- vẫn tập trung và tích credit bình thường — khóa là ranh giới, không phải hình phạt;
- vẫn thêm được website: siết chặt hơn thì luôn cho phép.

**Răng thật nằm ở tiện ích, không nằm ở ứng dụng.** Tiện ích tự lưu `lockUntil` vào `chrome.storage.local` và tự bỏ qua mọi grant khi còn khóa. Nên tắt ứng dụng, ngắt kết nối, hay khởi động lại trình duyệt đều không mở khóa được — quyền chặn nằm ở nơi mà ứng dụng không cần có mặt.

Vẫn còn hai đường thoát, và tài liệu phải nói thẳng: **gỡ tiện ích trong `chrome://extensions`**, và **vặn đồng hồ hệ thống về sau**. Hạn khóa là mốc thời gian thực nên đổi đồng hồ sẽ kết thúc sớm. Chống lại chuyện đó cần đếm theo thời gian đã trôi, mà như vậy thì đóng ứng dụng lại thành ra kéo dài khóa — bẫy người dùng theo cách tệ hơn. Đây là đánh đổi có chủ ý.

## Chặn ứng dụng Windows — 0.5.0

Giai đoạn A trong [APP_BLOCKING.md](APP_BLOCKING.md), đúng như đã đề xuất: **không giết tiến trình nào.**

Bộ theo dõi cửa sổ tiền cảnh là một tiến trình PowerShell chạy nền khai báo ba hàm `user32`. Cố tình không dùng thư viện native — đổi lại là không có bước biên dịch, không lệ thuộc ABI của Electron, và không có file `.node` nào để phần mềm diệt virus phải soi. Máy nào chặn PowerShell thì phần này im lặng không bật, chặn website vẫn chạy.

Mục ứng dụng có `exe` thay vì `domain`, nên `rules()` lọc ra và **tiện ích trình duyệt không bao giờ thấy chúng**. Đổi credit cho ứng dụng cũng không đòi tiện ích phải kết nối — việc này không liên quan gì tới trình duyệt.

Khi ứng dụng bị chặn lên tiền cảnh, một `BrowserWindow` toàn màn hình luôn-trên-cùng phủ lên trên với đúng giao diện trang chặn website. Người dùng đổi credit để mở, hoặc chọn quay lại làm việc — khi đó cửa sổ kia bị thu nhỏ và ứng dụng đó được bỏ qua cho tới lần chuyển cửa sổ tiếp theo, để lớp phủ không bật lên lại ngay lập tức.

Giới hạn phải nói thẳng: đổi tên file `.exe` là qua mặt được; game chạy toàn màn hình độc quyền có thể không bị lớp phủ che; và tắt ứng dụng vẫn gỡ được phần chặn ứng dụng — khác với chặn website, vốn do tiện ích giữ nên sống sót khi ứng dụng tắt.

## Lịch sử — 0.5.0

Dữ liệu lên v7. Trường `today` cũ chỉ đếm số phút hôm nay; nay là `history`, mỗi ngày một dòng gồm số phút, số phiên hoàn tất, số phiên dở và credit nhận được. Đây là nguồn duy nhất cho cả bộ đếm hôm nay lẫn biểu đồ nên hai con số không thể lệch nhau. Engine lưu 180 ngày, bậc license quyết định xem được bao nhiêu.

## Bán hàng

Chưa bán. Chế độ khóa được đánh dấu là tính năng Pro trong `license.cjs` nhưng hiện `tier()` trả `pro` cho tất cả nên ai cũng dùng được. Đã dựng sẵn đường nối `src/license.cjs`: ranh giới Free/Pro đóng đinh ở một chỗ duy nhất, `tier()` hiện luôn trả `pro`. Quyết định, cách thu tiền và thứ tự việc còn lại ở [MONETIZATION.md](MONETIZATION.md).

## Chưa triển khai

Chặn ứng dụng Windows — hướng đề nghị và các hướng đã loại nằm ở [APP_BLOCKING.md](APP_BLOCKING.md).

Đưa tiện ích lên Chrome Web Store (cách chữa tận gốc cho việc ghép nối; cần thời gian duyệt). Tiện ích tự xin mã, bỏ bước sao chép–dán. Tỉ lệ 1:1 và slider. Credit hết hạn lúc nửa đêm. Bỏ kiểm tra idle. Tách riêng Shorts. Đồng bộ. AI. Ký số binary.
