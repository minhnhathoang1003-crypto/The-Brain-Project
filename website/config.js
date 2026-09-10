/* Hai chỗ duy nhất cần sửa bằng tay trên trang web này.
   Sửa xong thì deploy lại — không phải đụng vào file nào khác. */

window.SITE_CONFIG = {
  // Link tải file cài đặt. Để trống thì nút Tải về biến thành nút cuộn xuống
  // phần hướng dẫn cài từ mã nguồn — trang không bao giờ có link chết.
  // Sau khi tạo GitHub Release, dán link dạng:
  // https://github.com/<tên-bạn>/the-brain-project/releases/download/v0.6.0/The-Brain-Project-Setup-0.6.0.exe
  downloadUrl: 'https://github.com/minhnhathoang1003-crypto/The-Brain-Project/releases/download/v0.6.0/The-Brain-Project-Setup-0.6.0.exe',

  // Endpoint nhận email danh sách chờ (Formspree, Getform, Basin...).
  // Để trống thì cả khối đăng ký email được ẩn đi.
  // Formspree cho miễn phí 50 lượt gửi/tháng: https://formspree.io
  // Link có dạng: https://formspree.io/f/xxxxxxxx
  formEndpoint: 'https://formspree.io/f/mljeokde',

  version: '0.6.0',
  fileSize: '107 MB',
  sha256: '20E49EC407C7A59BB012061BA6A657C7F180B10F57DDE819EE4F26D2BE6CFE35',

  // Link tới mã nguồn. Để trống thì các link "mã nguồn" bị ẩn.
  repoUrl: 'https://github.com/minhnhathoang1003-crypto/The-Brain-Project',

  // ── Bán hàng ──────────────────────────────────────────────────────────────
  // Để trống `price` thì trang /gia hiện trạng thái "chưa mở bán": vẫn có bảng
  // so sánh và chính sách hoàn tiền, nhưng không có nút mua và không hứa giá nào.
  // Điền vào chỉ khi đã thật sự mở bán — và nhớ bật SELLING trong src/license.cjs,
  // nếu không thì trang web đòi tiền trong khi ứng dụng vẫn cho không tất cả.
  price: '',                 // ví dụ: '390.000₫' hoặc '19 USD'
  priceNote: 'Trả một lần, dùng vĩnh viễn. Không thuê bao.',
  checkoutUrl: '',           // link Lemon Squeezy; trống thì nút mua bị ẩn
  refundDays: 30             // số ngày hoàn tiền vô điều kiện
};
