# Trang giới thiệu The Brain Project

Trang tĩnh, không build, không framework. Bốn file: `index.html`, `styles.css`, `app.js`, `config.js`.

## Sửa nội dung

Hai thứ duy nhất cần điền nằm trong `config.js`:

| Trường | Để trống thì sao |
|---|---|
| `downloadUrl` | Nút chính đổi thành “Xem hướng dẫn cài đặt” và cuộn xuống phần cài từ mã nguồn. Không bao giờ có link chết. |
| `formEndpoint` | Khối đăng ký email bị ẩn hoàn toàn. |

Chữ trên trang nằm thẳng trong `index.html`, sửa trực tiếp.

## Đưa file cài đặt lên GitHub Releases (miễn phí, tối đa 2 GB/file)

Vercel không phục vụ được file 107 MB, nên file cài đặt phải nằm chỗ khác.

1. Tạo repo trên <https://github.com/new>. Repo có thể để **Private** — release vẫn tải được nếu bạn chọn public repo; muốn giữ mã nguồn kín thì tạo một repo riêng chỉ để chứa bản phát hành.
2. Vào tab **Releases → Draft a new release**, đặt tag `v0.6.0`.
3. Kéo thả `release/The-Brain-Project-Setup-0.6.0.exe` vào ô Attach binaries.
4. **Publish release**, rồi chuột phải vào file đã upload → Copy link address.
5. Dán link đó vào `downloadUrl` trong `config.js`.

Link sẽ có dạng:

```
https://github.com/<tên-bạn>/<repo>/releases/download/v0.6.0/The-Brain-Project-Setup-0.6.0.exe
```

## Thu email (miễn phí)

1. Đăng ký <https://formspree.io> — gói miễn phí cho 50 lượt gửi mỗi tháng.
2. Tạo một form, lấy endpoint dạng `https://formspree.io/f/xxxxxxxx`.
3. Dán vào `formEndpoint` trong `config.js`. Khối đăng ký sẽ tự hiện ra.

Đổi sang Getform hay Basin cũng được — trang gửi JSON `{ email, nguon }` bằng `POST`, dịch vụ nào nhận JSON đều chạy.

## Deploy lên Vercel

### Cách 1 — CLI, không cần GitHub

```bash
npm i -g vercel
cd website
vercel
```

Lần đầu nó hỏi vài câu (đăng nhập, tên project, thư mục gốc — nhấn Enter hết). Xong sẽ có link dạng
`https://<tên-project>.vercel.app`. Deploy bản chính thức:

```bash
vercel --prod
```

### Cách 2 — nối với GitHub, tự deploy mỗi lần push

1. Push cả repo lên GitHub.
2. <https://vercel.com/new> → chọn repo.
3. **Root Directory** đặt là `website`. Framework Preset để **Other**. Không cần build command.
4. Deploy.

Cả hai cách đều miễn phí và cho sẵn tên miền `.vercel.app` kèm HTTPS. Không cần mua tên miền.

## Xem thử tại máy

Mở thẳng `index.html` bằng trình duyệt là đủ — trang không cần máy chủ.
