/* Trang giá. Chỉ hai việc: chọn chủ đề, và bật đúng một trong hai trạng thái
   "chưa mở bán" / "đã mở bán" tùy theo config.js. */

(function () {
  'use strict';

  var CFG = window.SITE_CONFIG || {};
  var $ = function (s) { return document.querySelector(s); };
  function all(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }

  /* ── Giá trị từ config ── */

  all('[data-bind]').forEach(function (el) {
    var v = CFG[el.dataset.bind];
    if (v !== undefined && v !== null && v !== '') el.textContent = v;
  });

  /* ── Ba trạng thái ──
     Chỉ có nút mua khi có ĐỦ cả giá lẫn link thanh toán: nút mua mà không nói giá,
     hoặc giá mà bấm vào không mua được, đều tệ hơn là nói thẳng chưa bán.
     Có giá nhưng chưa có link thì vẫn nói giá — giấu con số đã chốt là phí. */

  var coGia = !!CFG.price, coCheckout = !!CFG.checkoutUrl;

  if (coGia) {
    $('#selling').hidden = false;
    $('#price-amount').textContent = CFG.price;
    $('#price-note').textContent = CFG.priceNote || '';

    var buy = $('#buy');
    if (coCheckout) {
      buy.href = CFG.checkoutUrl;
    } else {
      // Chưa bán được: đổi nút mua thành lối vào danh sách chờ, đừng để nút chết.
      buy.href = '/#waitlist';
      buy.textContent = 'Báo tôi khi mở bán';
      buy.classList.remove('btn-primary');
      buy.classList.add('btn-ghost');
      $('#soon').hidden = false;
      $('#payment-note').hidden = true;
    }
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
