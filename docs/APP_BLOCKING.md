# Hướng chặn ứng dụng Windows — bản kế hoạch, chưa triển khai

§4.1 trong bộ câu hỏi muốn chặn cả ứng dụng desktop và game, không chỉ website. Đây là hướng tôi đề nghị và lý do loại các hướng khác. Chưa có dòng code nào cho phần này.

## Điều phải nói trước

Không có cách nào để một ứng dụng chạy ở quyền người dùng thường trên Windows chặn tuyệt đối một phần mềm khác. Người dùng luôn có thể mở Task Manager và tắt The Brain Project. Điều này đúng cả với bộ chặn website hiện tại: tắt tiện ích là hết chặn.

Vì vậy lời hứa của sản phẩm không phải "nhà tù không phá được" mà là **ma sát và sổ sách**: mở thứ gây nghiện phải trả giá bằng credit, và mọi lần phá rào đều là một hành động có ý thức chứ không phải phản xạ. Bất kỳ hướng nào dưới đây cũng nằm trong khuôn đó.

## Hướng đề nghị — giai đoạn A: lớp phủ khi ứng dụng lên foreground

Không giết tiến trình. Theo dõi cửa sổ đang ở tiền cảnh; khi đó là một ứng dụng trong danh sách chặn và không có lượt mở nào đang chạy, hiện một cửa sổ luôn-trên-cùng phủ toàn màn hình với đúng giao diện như trang chặn website: tên ứng dụng, số dư credit, nút đổi credit để mở tạm.

Vì sao chọn hướng này:

- Không cần quyền quản trị, không sửa registry máy, không đụng vào tiến trình của người khác — nên không bị phần mềm diệt virus xếp cùng nhóm với malware.
- Dùng lại nguyên vòng lặp credit và nguyên giao diện đã có. Người dùng thấy một cơ chế thống nhất giữa website và ứng dụng.
- Không có nguy cơ mất dữ liệu. Giết tiến trình Photoshop hay một trận game đang dở là làm hỏng việc của người dùng, và họ sẽ gỡ app ngay.
- Chọn ứng dụng bằng danh sách cửa sổ đang mở, hiện tên thân thiện ("Liên Minh Huyền Thoại") thay vì bắt người dùng đi tìm file `.exe`.

Việc kỹ thuật cần làm:

1. Lấy tiến trình của cửa sổ tiền cảnh. Electron không có API này. Cách gọn nhất là một thư viện FFI có sẵn bản biên dịch trước cho win32-x64 (`koffi`) gọi `GetForegroundWindow` → `GetWindowThreadProcessId` → `QueryFullProcessImageNameW`. Không cần trình biên dịch trên máy người dùng.
2. Poll khoảng 1 giây, cùng nhịp với vòng `tick` sẵn có.
3. Mở rộng `targets` thành hai loại: `site` (như hiện nay) và `app` (khớp theo tên file thực thi). Engine, sổ credit và luật một-lượt-mở giữ nguyên.
4. Cửa sổ phủ: `alwaysOnTop`, `fullscreen`, `skipTaskbar`, và thu nhỏ cửa sổ bị chặn khi hiện lên.

Giới hạn phải ghi rõ trong app: đổi tên file `.exe` là qua mặt được; game chạy toàn màn hình độc quyền có thể không bị lớp phủ che; tắt The Brain Project là hết chặn.

## Giai đoạn B, nếu người dùng muốn mạnh hơn — chặn ngay lúc khởi chạy

Windows có sẵn cơ chế Image File Execution Options: đặt khóa `Debugger` cho một tên `.exe` thì Windows chạy chương trình khác thay vì chương trình gốc. Đặt trỏ về một stub nhỏ của chúng ta là chặn được ngay tại thời điểm bấm mở, không cần lớp phủ.

Đây là hướng mạnh hơn nhưng phải trả giá: cần quyền quản trị vì khóa nằm trong `HKLM`, và cùng kỹ thuật này bị malware dùng nên phần mềm diệt virus có thể cảnh báo. Chỉ nên làm khi người dùng chủ động bật, có màn hình giải thích rõ ứng dụng sẽ ghi gì vào registry và một nút gỡ sạch.

## Đã loại

**Giết tiến trình theo chu kỳ.** Đây chính là thứ bản 0.1.1 từng làm và đã bị cắt. Mất dữ liệu của người dùng, chạy đua với ứng dụng tự khởi động lại, không giết được tiến trình chạy quyền cao, và hành vi "quét tiến trình rồi kết thúc" là chữ ký kinh điển của malware.

**AppLocker / Software Restriction Policies.** Chỉ có trên bản Windows Enterprise và cần quyền quản trị. Máy đang dùng là Windows 11 Home Single Language nên không dùng được, và đa số người dùng mục tiêu cũng vậy.

**Driver kernel để chặn tạo tiến trình.** Đây là cách duy nhất chặn thật sự triệt để, nhưng cần chứng chỉ ký driver EV và quy trình chứng nhận của Microsoft. Ngoài tầm của một sản phẩm indie, và một lỗi trong driver là màn hình xanh cho người dùng.

**Chặn mạng bằng tường lửa thay vì chặn ứng dụng.** Có thể cân nhắc sau như một bổ sung: game online và mạng xã hội mất mạng là gần như vô dụng. Nhưng vẫn cần quyền quản trị, luật gắn theo đường dẫn nên di chuyển file là qua mặt, và game offline không bị ảnh hưởng.

## Thứ tự đề nghị

Làm giai đoạn A trước và đo xem có bao nhiêu người thực sự dùng nó. Nếu phần lớn người dùng chỉ chặn website thì không cần đi tiếp. Giai đoạn B chỉ đáng làm khi có người thật sự yêu cầu mức chặn mạnh hơn và chấp nhận đánh đổi.
