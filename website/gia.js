/* Trang giá. Chỉ hai việc: chọn chủ đề, và bật đúng một trong hai trạng thái
   "chưa mở bán" / "đã mở bán" tùy theo config.js. */

(function () {
  'use strict';

  var CFG = window.SITE_CONFIG || {};
  var $ = function (s) { return document.querySelector(s); };
  function all(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }

  /* ── Chủ đề ── */

  var STORE = 'brain-site-theme';
  var root = document.documentElement;

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

  /* ── Giá trị từ config ── */

  all('[data-bind]').forEach(function (el) {
    var v = CFG[el.dataset.bind];
    if (v !== undefined && v !== null && v !== '') el.textContent = v;
  });

  /* ── Chưa mở bán hay đã mở bán ──
     Chỉ coi là đã mở bán khi có ĐỦ cả giá lẫn link thanh toán. Thiếu một trong hai
     thì trang sẽ hoặc hứa giá mà không cho mua, hoặc có nút mua mà không nói giá —
     cả hai đều tệ hơn là nói thẳng rằng chưa bán. */

  var banned = !!(CFG.price && CFG.checkoutUrl);

  if (banned) {
    $('#selling').hidden = false;
    $('#price-amount').textContent = CFG.price;
    $('#price-note').textContent = CFG.priceNote || '';
    var buy = $('#buy');
    buy.href = CFG.checkoutUrl;
  } else {
    $('#not-selling').hidden = false;
  }

  /* ── Link liên hệ ── */

  if (CFG.repoUrl) {
    var el = $('#contact');
    if (el) {
      var a = document.createElement('a');
      a.href = CFG.repoUrl.replace(/\/+$/, '') + '/issues';
      a.rel = 'noopener';
      a.textContent = 'hãy mở một issue trên kho mã nguồn';
      el.textContent = '';
      el.appendChild(a);
    }
  }
})();
