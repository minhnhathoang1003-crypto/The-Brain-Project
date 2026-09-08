# Kiểm chứng bản 0.4.0

## Đã chạy trên máy này

- `npm.cmd test` — 30 kiểm thử engine và luật tiện ích. Ngoài các bài của 0.2.0: chủ đề có đúng ba giá trị, đổi được giữa phiên trong khi ngưỡng idle vẫn bị khóa; khung thời gian được sắp tăng dần, giữ được đúng một mốc, và từ chối mọi đầu vào hỏng (rỗng, 5 mốc, 0, 181, số lẻ, trùng, chuỗi, null) mà không đụng vào dữ liệu đang có; nâng cấp v3 → v5 và v4 → v5 chỉ thêm trường mới, giữ chủ đề đã chọn và **không** biến người chưa ghép nối thành đã ghép nối; `settings` rỗng bị từ chối.

  Riêng chế độ khóa có ba bài: đóng mọi lối thoát trong engine và hết giờ thì tự mở; không bật được khóa khi đang có website mở, và khi khóa thì `rules()` phải trả `grants` rỗng kể cả lúc dữ liệu còn sót grant; bậc `free` bị từ chối với thông báo "thuộc bản Pro". Phía tiện ích có thêm một bài: đang khóa thì `usableGrants` rỗng và `rulesFor` chặn hết, hết hạn thì grant có hiệu lực trở lại mà không cần ứng dụng nói gì.
- `npm.cmd run test:ui` — Electron thật, một lượt chạy liền mạch:
  - lần chạy đầu có sẵn **15 credit** và màn hình mở đầu nói rõ điều đó;
  - lần chạy đầu dừng ở màn hình mở đầu, không vào được màn hình chính, thanh trạng thái ghi "Chưa chặn được website nào";
  - cầu nối từ chối origin lạ và token sai, và **token sai không được tính là đã ghép nối**;
  - ghép nối đúng thì màn hình mở đầu tự nhường chỗ cho bố cục hai cột, hai cột nằm cạnh nhau và không tràn ngang;
  - dải quy đổi hiển thị đúng `TẬP TRUNG 25 phút → NHẬN ĐƯỢC 5 credit → ĐỔI RA 5 phút`, và đổi sang `0,2 credit` khi chọn 1 phút;
  - ba chủ đề: chọn Tối thì nền body thành `rgb(11,11,11)`, Theo hệ thống thì bỏ `data-theme`, Sáng thì nền `rgb(255,255,255)`;
  - khung thời gian: bỏ mốc 50, thêm mốc 15, dữ liệu thành `[15,25,90]` đã sắp tăng dần và hàng nút trên màn hình chính đổi theo ngay;
  - bảng cài đặt: chỉ `#setup-body` có `overflow-y: auto`, hộp thoại thì không — tiêu đề và hàng nút đứng yên;
  - thêm `https://WWW.Reddit.com/` được chuẩn hóa thành `reddit.com` rồi xóa được;
  - trong phiên, số credit tích lũy **lớn hơn 0 sau 3 giây** và dòng cảnh báo mất credit hiển thị đúng cùng con số; hủy phiên thì số dư về 0;
  - một phiên trọn vẹn 60 giây cộng đúng 0,2 credit; 0,2 credit không đủ để mở 1 phút;
  - **chế độ khóa**: bật 30 phút từ Cài đặt rồi kiểm cả năm lối thoát — nút Mở bị tắt, nút bỏ chặn biến mất, nút Xóa toàn bộ bị tắt, không còn nút khóa thêm, và gọi thẳng `redeem` / `targetDelete` / `lock` / `system('reset')` qua IPC đều bị từ chối với đúng thông báo;
  - luật gửi cho tiện ích lúc khóa: `lockUntil` có giá trị, `grants` rỗng, `targets` vẫn đủ bốn;
  - **khóa sống sót qua việc đóng và mở lại ứng dụng** — sau khi khởi động lại, `lockUntil` vẫn ở tương lai và `redeem` vẫn bị từ chối;
  - dữ liệu trên đĩa không chứa tên miền ở dạng rõ;
  - **mất kết nối tiện ích không đẩy người dùng ngược về màn hình mở đầu**;
  - sau khi đóng và mở lại: số dư, danh sách, số phút hôm nay, chủ đề, khung thời gian và trạng thái đã ghép nối đều còn nguyên.

  Bài này bắt được một lỗi thật: `#setup{display:flex}` ghi đè `dialog:not([open]){display:none}` của trình duyệt, khiến bảng cài đặt vẫn phủ lên ứng dụng và chặn mọi cú bấm sau khi người dùng bấm Đóng. Đã sửa bằng `#setup[open]{display:flex}`.
- `npm.cmd run test:migrate` — ghi một file mã hóa v1 thật (12 task, 8 habit, sổ credit, hai lượt mở, target kiểu app và một website đang tắt) rồi mở bằng bản mới: nâng lên v5, giữ mã ghép nối và ngưỡng idle, hoàn đúng một lần phần thời gian chưa dùng, giữ lượt mở website còn hiệu lực, chỉ giữ 9 website đang bật, bỏ hết task/habit/ledger/session/reflection, có bản sao `brain-data.enc.backup`, và **không bắt người dùng cũ đi qua màn hình mở đầu**. Bố cục kiểm ở bốn kích thước — 1000 × 720, 1005 × 734, 900 × 600, 520 × 640: hai cột khi rộng và một cột ở 520 px, không tràn ngang, tối đa một hành động chính, và **không khối nào cắt mất nội dung của chính nó**. Bài kiểm cắt chữ này đã được thử ngược lại: bỏ bản sửa CSS ra thì nó báo `rule 0<50`, nên nó thật sự bắt lỗi chứ không chỉ chạy qua.
- `npm.cmd run test:browser` — tiện ích chạy trong Edge thật với profile tạm: ghép nối, chặn điều hướng, mở tạm, hết hạn thì đẩy tab đang mở về trang chặn, mất kết nối vẫn chặn, ngắt ghép nối thì gỡ luật. Giao thức không đổi so với 0.2.0.
- `npm.cmd run test:restart` — ứng dụng Electron thật + tiện ích thật trong Edge: ghép nối một lần, đóng ứng dụng, mở lại, rồi chờ **mà không đụng vào popup**. Kết quả: không quay lại màn hình mở đầu, tiện ích tự kết nối lại sau **1,8 s** (trước bản sửa: 27,0 s), example.com bị chặn trở lại, và lệnh đổi credit bị từ chối vì *thiếu credit* chứ không phải vì *thiếu tiện ích* — bằng chứng cầu nối đã sống lại.
- `node tests/packaged.cjs` — chạy binary đã build: khởi động ở màn hình mở đầu với đúng 15 credit, `paired: false`, chủ đề `system`, đúng bốn website mặc định, tiện ích được sao chép sang thư mục dữ liệu.

Đo trực tiếp, không suy luận từ code: mã ghép nối được giữ nguyên qua các lần khởi động lại ứng dụng.

Ảnh chụp trong `test-results/`: `main.png`, `gate.png`, `settings.png`, `dark.png`, `locked.png`, `unlocked.png`, `narrow.png`, `disconnected.png`, `browser-blocked.png`.

## Logo

Đã kiểm bằng mắt trên ảnh chụp thật, không chỉ đọc code:

- Thanh tiêu đề trong app hiện đúng file logo người dùng cung cấp, không còn khung viền bao quanh, ở cả chế độ sáng lẫn tối (chế độ tối đảo màu nên nền bo tròn chìm vào nền, chỉ còn nét bộ não trắng).
- Trang chặn của tiện ích hiện logo mới.
- Icon nhúng trong `The Brain Project.exe` và `The-Brain-Project-Setup-0.4.0.exe` đã được trích ra và xem — đúng logo bộ não.

Chưa kiểm được bằng mắt: icon trên taskbar sau khi cài, và icon tiện ích trên thanh công cụ Chrome. Cả hai đều cần cài thật. Bản sửa `setAppUserModelId` là để Windows ghép cửa sổ với shortcut đã ghim; tôi đọc được id trong mã nguồn nhưng không kiểm chứng được hành vi taskbar nếu không cài.

## Số đo tốc độ khởi động

| | Đến khi cửa sổ hiện ra | Đến khi màn hình sẵn sàng |
|---|---|---|
| Portable 0.2.0 | 22,1 s / 23,0 s | — |
| Bản đã cài 0.3.0 | 266 / 288 / 304 ms | 349 / 376 / 379 ms |

Đo ba lần liên tiếp trên cùng máy, mỗi lần một thư mục dữ liệu mới.

## Chưa kiểm chứng

Chế độ khóa **chưa được thử với tiện ích thật trong trình duyệt thật** — bài `test:ui` kiểm phía ứng dụng và nội dung gói tin gửi đi, `npm.cmd test` kiểm logic tiện ích trong sandbox, nhưng chưa có bài nào nạp tiện ích vào Edge rồi khóa và thử ngắt kết nối. Hai đường thoát đã biết cũng chưa đo: gỡ tiện ích khỏi trình duyệt, và vặn đồng hồ hệ thống.

Số đo tốc độ lấy trên thư mục `release/win-unpacked` — đúng những file mà NSIS chép vào máy, nhưng **tôi chưa chạy trình cài đặt trên máy này** để tránh cài phần mềm mà bạn chưa yêu cầu. Hãy chạy `The-Brain-Project-Setup-0.4.0.exe` một lần để xác nhận luồng cài và shortcut.

Bài kiểm thử không đóng ứng dụng, khóa hay ru ngủ máy thật; đầu vào idle được mô phỏng trong bài timer. Chromium kèm Playwright không chạy được trên máy này nên bài extension dùng Edge. Chế độ tối mới chỉ được kiểm bằng giá trị màu tính toán, chưa có ai xem bằng mắt trong phòng tối. Chưa có kiểm thử nhiều ngày và chưa có bằng chứng nào về hiệu quả thay đổi hành vi thực tế.

Không có dữ liệu người dùng thật nào bị đọc hay sửa: mọi bài thử dùng thư mục profile tạm riêng.
