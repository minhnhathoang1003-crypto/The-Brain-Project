/* Trang quyền riêng tư: chỉ cần hai link liên hệ. Công tắc chủ đề nằm ở theme.js.
   Cố ý không nạp app.js — trang này không có bộ ảnh, dải quy đổi hay form. */

(function () {
  'use strict';

  var CFG = window.SITE_CONFIG || {};
  function all(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }

  // Link liên hệ lấy từ repoUrl, để không phải sửa hai chỗ khi đổi kho mã nguồn.
  // Không có repoUrl thì giữ nguyên câu chữ sẵn có trong HTML.
  if (CFG.repoUrl) {
    var issues = CFG.repoUrl.replace(/\/+$/, '') + '/issues';

    function setContact(sel, truoc, chuLink, sau) {
      var el = document.querySelector(sel);
      if (!el) return;
      var a = document.createElement('a');
      a.href = issues;
      a.rel = 'noopener';
      a.textContent = chuLink;
      el.textContent = truoc;
      el.appendChild(a);
      el.appendChild(document.createTextNode(sau));
    }

    setContact('#contact',
      'Có câu hỏi hoặc phát hiện điều gì không khớp với chính sách này, hãy ',
      'mở một issue trên kho mã nguồn', '.');
    setContact('#contact-en',
      'Questions, or something that does not match this policy? Please ',
      'open an issue on the source repository', '.');
  }
})();
