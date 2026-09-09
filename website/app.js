/* The Brain Project — trang giới thiệu.
   Không framework, không build. Sửa link tải và endpoint email trong config.js. */

(function () {
  'use strict';

  var CFG = window.SITE_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ── Chủ đề: hệ thống / sáng / tối, giống ba lựa chọn trong ứng dụng ── */

  var STORE = 'brain-site-theme';
  var root = document.documentElement;

  function applyTheme(v) {
    if (v === 'light' || v === 'dark') root.setAttribute('data-theme', v);
    else root.removeAttribute('data-theme');
    $$('[data-theme-set]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.themeSet === v));
    });
  }

  var saved = 'system';
  try { saved = localStorage.getItem(STORE) || 'system'; } catch (e) { /* chế độ riêng tư */ }
  applyTheme(saved);

  $$('[data-theme-set]').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.dataset.themeSet;
      applyTheme(v);
      try { localStorage.setItem(STORE, v); } catch (e) { /* bỏ qua */ }
    });
  });

  /* ── Điền các giá trị từ config ── */

  $$('[data-bind]').forEach(function (el) {
    var v = CFG[el.dataset.bind];
    if (v) el.textContent = v;
  });

  /* ── Nút tải về ── */

  var btn = $('#download-btn');
  var label = $('#download-label');
  var meta = $('#download-meta');

  if (CFG.downloadUrl) {
    btn.href = CFG.downloadUrl;
    btn.setAttribute('download', '');
    label.textContent = 'Tải về cho Windows';
    meta.innerHTML =
      'Bản ' + esc(CFG.version || '') + ' · ' + esc(CFG.fileSize || '') +
      ' · File chưa ký số nên SmartScreen sẽ cảnh báo lần đầu — chọn <em>Thông tin khác → Vẫn chạy</em>.';
  } else {
    btn.href = '#install';
    label.textContent = 'Xem hướng dẫn cài đặt';
  }

  /* ── Link mã nguồn ── */

  if (CFG.repoUrl) {
    var repo = $('#repo-link');
    repo.href = CFG.repoUrl;
    repo.hidden = false;
  }

  /* ── Dải quy đổi: 5 phút tập trung = 1 credit, 1 credit = 1 phút ── */

  var rFocus = $('#r-focus'), rCredit = $('#r-credit'), rOut = $('#r-out');

  function fmt(n) {
    // Một chữ số thập phân, dấu phẩy kiểu Việt Nam, bỏ ",0" thừa.
    var s = (Math.round(n * 10) / 10).toFixed(1);
    if (s.slice(-2) === '.0') s = s.slice(0, -2);
    return s.replace('.', ',');
  }

  function setMinutes(min) {
    var credit = min / 5;
    rFocus.textContent = min + ' phút';
    rCredit.textContent = fmt(credit) + ' credit';
    rOut.textContent = fmt(credit) + ' phút';
  }

  $$('.calc-tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.calc-tabs button').forEach(function (o) {
        o.classList.remove('is-on');
        o.setAttribute('aria-pressed', 'false');
      });
      b.classList.add('is-on');
      b.setAttribute('aria-pressed', 'true');
      setMinutes(Number(b.dataset.min));
    });
  });

  /* ── Bộ ảnh chụp màn hình ── */

  var SHOTS = {
    main: {
      src: 'images/main.png',
      alt: 'Màn hình chính: số dư 15 credit, các mốc 25 / 50 / 90 phút, dải quy đổi và danh sách bốn website đang bị chặn.',
      cap: 'Hai cột: bên trái là nghi thức, bên phải là ranh giới. Cửa sổ hẹp thì hai cột xếp chồng thành một.'
    },
    blocked: {
      src: 'images/browser-blocked.png',
      alt: 'Trang chặn hiện trong trình duyệt với dòng chữ "Một khoảng dừng. Một lựa chọn tốt hơn."',
      cap: 'Trang chặn của tiện ích. Nó nói cho bạn biết cái giá — 5 phút tập trung đổi 1 phút — thay vì chỉ báo lỗi.'
    },
    locked: {
      src: 'images/locked.png',
      alt: 'Bảng cài đặt đang ở chế độ khóa, còn 30 phút, kèm bảng đối chiếu 25 phút đổi 5 credit.',
      cap: 'Chế độ khóa: không hủy, không rút ngắn — kể cả bằng cách xóa dữ liệu. Tiện ích tự giữ hạn khóa nên tắt ứng dụng cũng vô ích.'
    },
    dark: {
      src: 'images/dark.png',
      alt: 'Ứng dụng ở chế độ tối với bảng cài đặt đang mở.',
      cap: 'Ba lựa chọn giao diện: theo hệ thống, sáng, tối. Mặc định đi theo cài đặt của Windows.'
    },
    narrow: {
      src: 'images/narrow.png',
      alt: 'Ứng dụng ở cửa sổ hẹp, hai cột xếp chồng thành một cột.',
      cap: 'Dưới 860 px, hai cột xếp chồng lại. Không khối nào bị cắt mất chữ — có bài kiểm thử riêng cho việc này.'
    }
  };

  var gImg = $('#gallery-img'), gCap = $('#gallery-cap');

  $$('.gallery-tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      var s = SHOTS[b.dataset.shot];
      if (!s) return;
      $$('.gallery-tabs button').forEach(function (o) { o.setAttribute('aria-selected', 'false'); });
      b.setAttribute('aria-selected', 'true');
      gImg.src = s.src;
      gImg.alt = s.alt;
      gCap.textContent = s.cap;
    });
  });

  // Nạp trước để đổi tab không bị chớp.
  Object.keys(SHOTS).forEach(function (k) { new Image().src = SHOTS[k].src; });

  /* ── Đăng ký email ── */

  var wl = $('#waitlist');

  if (CFG.formEndpoint) {
    wl.hidden = false;

    var form = $('#wl-form'), input = $('#wl-email'), msg = $('#wl-msg');
    var sending = false;

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (sending) return;

      var email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        msg.textContent = 'Địa chỉ email trông chưa đúng. Kiểm tra lại giúp tôi.';
        msg.classList.add('is-err');
        input.focus();
        return;
      }

      sending = true;
      msg.classList.remove('is-err');
      msg.textContent = 'Đang gửi…';

      fetch(CFG.formEndpoint, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, nguon: 'trang-gioi-thieu' })
      }).then(function (res) {
        if (!res.ok) throw new Error(String(res.status));
        form.hidden = true;
        msg.textContent = 'Xong. Sẽ báo bạn khi có bản mới — chỉ khi có bản mới.';
      }).catch(function () {
        msg.textContent = 'Gửi không thành công. Thử lại sau ít phút giúp tôi.';
        msg.classList.add('is-err');
      }).then(function () {
        sending = false;
      });
    });
  }

  /* ── Hiện dần khi cuộn tới ── */

  var targets = $$('.section > h2, .section-lede, .steps, .grid, .calc, .limits, .install, .install-note, .gift, .source, .shot, .gallery-tabs, .wl');

  if ('IntersectionObserver' in window) {
    targets.forEach(function (el) { el.classList.add('reveal'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    targets.forEach(function (el) { io.observe(el); });
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
})();
