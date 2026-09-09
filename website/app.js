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

  // w/h đi kèm từng ảnh vì các ảnh chụp không cùng tỉ lệ. Thiếu chúng thì
  // đổi tab làm khung ảnh co giãn đột ngột, đẩy phần dưới trang nhảy lên
  // xuống — đúng thứ mà Cumulative Layout Shift trừ điểm.
  var SHOTS = {
    main: {
      src: 'images/main.webp', w: 1233, h: 854,
      alt: 'Màn hình chính: số dư 15 credit, các mốc 25 / 50 / 90 phút, dải quy đổi và danh sách bốn website đang bị chặn.',
      cap: 'Hai cột: bên trái là nghi thức, bên phải là ranh giới. Cửa sổ hẹp thì hai cột xếp chồng thành một.'
    },
    blocked: {
      src: 'images/browser-blocked.webp', w: 1280, h: 720,
      alt: 'Trang chặn hiện trong trình duyệt với dòng chữ "Một khoảng dừng. Một lựa chọn tốt hơn."',
      cap: 'Trang chặn của tiện ích. Nó nói cho bạn biết cái giá — 5 phút tập trung đổi 1 phút — thay vì chỉ báo lỗi.'
    },
    locked: {
      src: 'images/locked.webp', w: 1233, h: 854,
      alt: 'Bảng cài đặt đang ở chế độ khóa, còn 30 phút, kèm bảng đối chiếu 25 phút đổi 5 credit.',
      cap: 'Chế độ khóa: không hủy, không rút ngắn — kể cả bằng cách xóa dữ liệu. Tiện ích tự giữ hạn khóa nên tắt ứng dụng cũng vô ích.'
    },
    gate: {
      src: 'images/gate.webp', w: 1233, h: 854,
      alt: 'Màn hình mở đầu với tiêu đề "Còn một bước nữa: bật bộ chặn", khung tặng 15 credit, bốn bước ghép nối và dòng chờ tiện ích kết nối.',
      cap: 'Lần chạy đầu tiên dừng ở đây, chưa vào được màn hình chính — vì chưa ghép nối thì credit không có tác dụng gì. Chỉ chặn ở lần đầu; về sau rớt kết nối thì app chỉ cảnh báo chứ không nhốt bạn khỏi credit đã kiếm.'
    },
    settings: {
      src: 'images/settings.webp', w: 1233, h: 854,
      alt: 'Bảng cài đặt: mục bộ chặn website với bốn bước ghép nối tiện ích, ba lựa chọn giao diện, và hàng khung thời gian 15 / 25 / 90 phút.',
      cap: 'Toàn bộ cài đặt nằm trong một bảng: bốn bước ghép nối tiện ích, ba lựa chọn giao diện, và các mốc thời gian bạn tự đặt. Tiêu đề và hàng nút đứng yên, chỉ phần giữa cuộn.'
    },
    dark: {
      src: 'images/dark.webp', w: 1233, h: 854,
      alt: 'Ứng dụng ở chế độ tối với bảng cài đặt đang mở.',
      cap: 'Ba lựa chọn giao diện: theo hệ thống, sáng, tối. Mặc định đi theo cài đặt của Windows.'
    },
    narrow: {
      src: 'images/narrow.webp', w: 650, h: 800,
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
      // Đặt aspect-ratio inline chứ không chỉ width/height: khi đổi src,
      // Chromium giữ ảnh cũ trên màn hình cho tới khi ảnh mới giải mã xong,
      // và tỉ lệ nội tại của ảnh cũ thắng thuộc tính. aspect-ratio thì thắng
      // cả hai, nên khung đổi kích thước ngay lúc bấm thay vì giật về sau.
      gImg.style.aspectRatio = s.w + ' / ' + s.h;
      gImg.width = s.w;
      gImg.height = s.h;
      gImg.src = s.src;
      gImg.alt = s.alt;
      gCap.textContent = s.cap;
    });
  });

  // Không nạp trước cả bộ ảnh nữa: bốn ảnh chưa ai bấm tới từng giành
  // băng thông với ảnh hero ngay lúc vào trang, làm LCP xấu đi để đổi lấy
  // một cú chớp mà phần lớn khách không bao giờ gặp.

  /* ── Đăng ký email ── */

  var wl = $('#waitlist');

  if (CFG.formEndpoint) {
    wl.hidden = false;

    var form = $('#wl-form'), input = $('#wl-email'), msg = $('#wl-msg');
    var trap = $('#wl-trap');
    var sending = false;

    // Không có JS thì khối này vốn đã ẩn, nhưng cứ gắn action để form
    // vẫn gửi được nếu fetch bị chặn.
    form.action = CFG.formEndpoint;
    form.method = 'POST';

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (sending) return;

      // Bẫy bot: người thật không bao giờ điền ô này vì nó không hiện ra.
      if (trap && trap.value) { form.hidden = true; msg.textContent = 'Xong.'; return; }

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
        body: JSON.stringify({
          email: email,
          nguon: 'trang-gioi-thieu',
          _subject: 'Đăng ký nhận tin — The Brain Project'
        })
      }).then(function (res) {
        if (res.ok) {
          form.hidden = true;
          msg.textContent = 'Xong. Sẽ báo bạn khi có bản mới — chỉ khi có bản mới.';
          return;
        }
        // Formspree trả chi tiết lỗi trong body. Người dùng không cần đọc
        // tiếng Anh của họ, nhưng tôi cần nó khi đi tìm nguyên nhân.
        return res.json().catch(function () { return null; }).then(function (body) {
          throw new Error(res.status + ' ' + JSON.stringify(body));
        });
      }).catch(function (err) {
        console.error('[waitlist]', err);
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
