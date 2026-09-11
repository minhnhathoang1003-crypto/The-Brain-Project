/* Trang kích hoạt. Lemon Squeezy gửi khách tới đây kèm mã trong địa chỉ:
   /kich-hoat?key=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX

   Nhiệm vụ duy nhất: biến mã đó thành một cú bấm mở được phần mềm, và luôn có
   đường lùi nếu cú bấm đó không chạy. Trang này không gửi mã đi đâu cả — nó chỉ
   nằm trong trình duyệt của khách. */
(function () {
  'use strict';

  var PROTOCOL = 'thebrainproject';
  // Cùng một hình dạng mà src/license.cjs chấp nhận. Lệch nhau thì trang web bảo
  // "xong rồi" trong khi phần mềm từ chối mã.
  var HINH_DANG = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/;

  function docMa() {
    var raw;
    try { raw = new URLSearchParams(location.search).get('key'); }
    catch (e) { return null; }
    if (!raw) return null;
    var k = String(raw).trim().replace(/\s+/g, '').toUpperCase();
    // Lemon Squeezy không thay biến [license_key] khi xem thử link — lúc đó nó tới
    // đây nguyên văn. Bắt kiểm tra hình dạng là tự lọc luôn trường hợp đó.
    return HINH_DANG.test(k) ? k : null;
  }

  var ma = docMa();
  var coMa = document.getElementById('co-ma');
  var khongMa = document.getElementById('khong-ma');

  if (!ma) { khongMa.hidden = false; return; }
  coMa.hidden = false;

  // textContent chứ không phải innerHTML: mã đến từ địa chỉ, tức là từ bên ngoài.
  // Dù đã lọc qua HINH_DANG, không có lý do gì để dựng HTML từ dữ liệu ngoài.
  var oMa = document.getElementById('ma');
  oMa.textContent = ma;

  var nut = document.getElementById('mo-app');
  nut.href = PROTOCOL + '://activate?key=' + encodeURIComponent(ma);

  var chep = document.getElementById('chep');
  chep.addEventListener('click', function () {
    var xong = function () {
      chep.textContent = 'Đã chép';
      setTimeout(function () { chep.textContent = 'Chép mã'; }, 2000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ma).then(xong, boiDen);
    } else boiDen();
  });

  // Trình duyệt không cho chép (trang không bảo mật, quyền bị chặn, trình duyệt cũ):
  // bôi đen sẵn để khách chỉ cần Ctrl+C. Không bao giờ để họ mắc kẹt.
  function boiDen() {
    try {
      var r = document.createRange();
      r.selectNodeContents(oMa);
      var s = window.getSelection();
      s.removeAllRanges();
      s.addRange(r);
      chep.textContent = 'Nhấn Ctrl+C';
    } catch (e) {
      chep.textContent = 'Hãy chép thủ công';
    }
  }
})();
