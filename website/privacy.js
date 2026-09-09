/* Trang quyền riêng tư: chỉ cần nút chủ đề và hai link liên hệ.
   Cố ý không nạp app.js — trang này không có bộ ảnh, dải quy đổi hay form. */

(function () {
  'use strict';

  var CFG = window.SITE_CONFIG || {};
  var root = document.documentElement;
  var STORE = 'brain-site-theme';

  function all(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }

  function applyTheme(v) {
    if (v === 'light' || v === 'dark') root.setAttribute('data-theme', v);
    else root.removeAttribute('data-theme');
    all('[data-theme-set]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.themeSet === v));
    });
  }

  var saved = 'system';
  try { saved = localStorage.getItem(STORE) || 'system'; } catch (e) { /* chế độ riêng tư */ }
  applyTheme(saved);

  all('[data-theme-set]').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.dataset.themeSet;
      applyTheme(v);
      try { localStorage.setItem(STORE, v); } catch (e) { /* bỏ qua */ }
    });
  });

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
