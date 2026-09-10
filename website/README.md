# Trang giới thiệu The Brain Project

Trang tĩnh, không build, không framework.

| Trang | File | Script riêng |
|---|---|---|
| `/` | `index.html` | `app.js` |
| `/gia` | `gia.html` | `gia.js` |
| `/quyen-rieng-tu` | `quyen-rieng-tu.html` | `privacy.js` |

Dùng chung `styles.css`, `config.js` và `theme.js` (công tắc sáng/tối). Ngoài ra có `robots.txt`,
`sitemap.xml` và `vercel.json`.

## Sửa nội dung

Chữ nằm thẳng trong file HTML, sửa trực tiếp. Riêng những giá trị lặp lại ở nhiều nơi thì nằm trong
`config.js`, để không bao giờ có hai chỗ nói hai số khác nhau:

| Trường | Để trống thì sao |
|---|---|
| `downloadUrl` | Nút chính đổi thành “Xem hướng dẫn cài đặt” và cuộn xuống phần cài từ mã nguồn. Không bao giờ có link chết. |
| `formEndpoint` | Khối đăng ký email bị ẩn hoàn toàn. |
| `price` | Trang `/gia` không nói giá nào, hiện “chưa mở bán”. |
| `checkoutUrl` | Có giá nhưng chưa có link thì nút mua đổi thành lối vào danh sách chờ, không phải nút chết. |
| `repoUrl` | Các link “mã nguồn” và “mở issue” bị ẩn. |
| `version`, `fileSize`, `sha256` | Hiện ở dòng dưới nút tải và ở chân trang. |
| `refundDays` | Số ngày hoàn tiền trên `/gia`. |

**Lưu ý:** thẻ `og:` và `canonical` phải viết tuyệt đối ngay trong HTML — trình thu thập của mạng xã hội
không chạy JS nên không đọc được `config.js`.

## Phát hành một bản mới

Vercel không phục vụ được file hơn 100 MB, nên file cài đặt nằm ở GitHub Releases (miễn phí, tối đa
2 GB mỗi file).

Ở thư mục gốc của dự án:

1. Tăng `version` trong `package.json`.
2. Thêm mục mới vào `CHANGELOG.md`.
3. `npm.cmd run build`.
4. Lấy mã băm:
   ```bash
   node -e "const c=require('crypto'),f=require('fs');const p='release/The-Brain-Project-Setup-<VER>.exe';console.log(c.createHash('sha256').update(f.readFileSync(p)).digest('hex').toUpperCase())"
   ```
5. Vào **Releases → Draft a new release**, đặt tag `v<VER>`, và đính **cả ba file** từ `release/`:

   | File | Vì sao cần |
   |---|---|
   | `The-Brain-Project-Setup-<VER>.exe` | bản cài đặt |
   | **`latest.yml`** | **thiếu là không ai tự cập nhật được.** `electron-updater` đọc đúng file này để biết có bản mới; không có nó thì ứng dụng im lặng báo “đang dùng bản mới nhất” mãi mãi |
   | `The-Brain-Project-Setup-<VER>.exe.blockmap` | cho phép tải phần chênh lệch, bản cập nhật nhẹ hơn nhiều |

6. **Publish release.**
7. Quay lại `config.js`, sửa `downloadUrl`, `version`, `sha256`, và `fileSize` nếu đổi.

Link tải sẽ có dạng:

```
https://github.com/<tên-bạn>/<repo>/releases/download/v<VER>/The-Brain-Project-Setup-<VER>.exe
```

**Dung lượng ghi theo MiB**, vì đó là con số GitHub hiển thị cạnh file. 112.055.721 byte là `107 MB`
trên trang web chứ không phải 112 MB, để người tải không tưởng là tải nhầm file.

### Kiểm sau khi publish

```bash
curl -sIL "<downloadUrl>" | grep -i -E "^HTTP|^content-length"
curl -sL "https://github.com/<tên-bạn>/<repo>/releases/download/v<VER>/latest.yml"
```

`content-length` phải khớp kích thước file thật, và `latest.yml` phải ghi đúng `version` mới. Nếu muốn
chắc chắn, tải hẳn file về rồi đối chiếu SHA-256 với con số trong `config.js` — đó là toàn bộ lý do
công bố mã băm.

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
