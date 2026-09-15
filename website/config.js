/* Hai chỗ duy nhất cần sửa bằng tay trên trang web này.
   Sửa xong thì deploy lại — không phải đụng vào file nào khác. */

window.SITE_CONFIG = {
  // Link tải file cài đặt. Để trống thì nút Tải về biến thành nút cuộn xuống
  // phần hướng dẫn cài từ mã nguồn — trang không bao giờ có link chết.
  // Sau khi tạo GitHub Release, dán link dạng:
  // https://github.com/<tên-bạn>/the-brain-project/releases/download/v0.8.0/The-Brain-Project-Setup-0.8.0.exe
  downloadUrl: 'https://github.com/minhnhathoang1003-crypto/The-Brain-Project/releases/download/v0.8.0/The-Brain-Project-Setup-0.8.0.exe',

  // Endpoint nhận email danh sách chờ (Formspree, Getform, Basin...).
  // Để trống thì cả khối đăng ký email được ẩn đi.
  // Formspree cho miễn phí 50 lượt gửi/tháng: https://formspree.io
  // Link có dạng: https://formspree.io/f/xxxxxxxx
  formEndpoint: 'https://formspree.io/f/mljeokde',

  version: '0.8.0',
  fileSize: '107 MB',
  sha256: 'B89435679F800576CB5423D153153CEA657A78C566D5DDD465C49B80408A5797',

  // Link trang tiện ích trên Chrome Web Store. Để trống thì phần Cài đặt giữ nguyên
  // hướng dẫn nạp thủ công (Developer mode → Load unpacked); điền vào thì nó tự đổi
  // sang ba bước và bỏ hẳn hai bước Developer mode.
  // Dạng chỉ-ID: https://chromewebstore.google.com/detail/<id-32-ký-tự>
  // Đừng kèm slug tên tiện ích — slug đổi theo tên, ID thì không.
  // Nhớ điền cả EXTENSION_URL trong src/main.cjs — ứng dụng không đọc được file này.
  extensionUrl: 'https://chromewebstore.google.com/detail/coiphhfihfbpecbbmlacejgjbcgikhhn',

  // Link tới mã nguồn. Để trống thì các link "mã nguồn" bị ẩn.
  repoUrl: 'https://github.com/minhnhathoang1003-crypto/The-Brain-Project',

  // ── Bán hàng ──────────────────────────────────────────────────────────────
  // Trang /gia có ba trạng thái, tự chọn theo hai trường dưới:
  //   không price, không checkoutUrl → "chưa mở bán", không nói giá nào
  //   có price, chưa có checkoutUrl  → hiện giá kèm "sắp mở bán", chưa có nút mua
  //   có cả hai                      → hiện nút mua thật
  // Chỉ điền checkoutUrl khi đã thật sự bán được — và nhớ bật SELLING trong
  // src/license.cjs, nếu không thì web đòi tiền trong khi ứng dụng vẫn cho không.
  price: '390.000₫',         // để trống thì trang không nói giá nào
  priceNote: 'Trả một lần, dùng vĩnh viễn. Không thuê bao.',
  checkoutUrl: 'https://the-brain-project.lemonsqueezy.com/checkout/buy/aeff41f6-c9bd-4e9a-8a3a-cfa80cabd592',
  refundDays: 30             // số ngày hoàn tiền vô điều kiện
};
