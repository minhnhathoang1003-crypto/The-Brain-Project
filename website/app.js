/* The Brain Project — trang giới thiệu.
   Không framework, không build. Sửa link tải và endpoint email trong config.js. */

(function () {
  'use strict';

  var CFG = window.SITE_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

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

  /* ── Dòng giá trên trang chủ ──
     Chỉ hiện khi config có giá, để trang không bao giờ nói một câu trống. */

  if (CFG.price) {
    var homePrice = $('#home-price');
    if (homePrice) homePrice.hidden = false;
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
      src: 'images/main-932.webp', w: 932, h: 646,
      srcset: 'images/main-466.webp 466w, images/main-932.webp 932w, images/main-1864.webp 1864w',
      sizes: '(min-width: 1024px) 932px, 86vw',
      max: 932,
      alt: 'Màn hình chính: số dư 15 credit, các mốc 25 / 50 / 90 phút, dải quy đổi và danh sách bốn website đang bị chặn.',
      cap: 'Hai cột: bên trái là nghi thức, bên phải là ranh giới. Cửa sổ hẹp thì hai cột xếp chồng thành một.'
    },
    focus: {
      src: 'images/focus-932.webp', w: 932, h: 646,
      srcset: 'images/focus-466.webp 466w, images/focus-932.webp 932w, images/focus-1864.webp 1864w',
      sizes: '(min-width: 1024px) 932px, 86vw',
      max: 932,
      alt: 'Phiên tập trung đang chạy: đồng hồ đếm ngược 22:54 còn lại, ô "đang tích lũy" ghi 0,42 trên 5 credit, và nút Dừng phiên.',
      cap: 'Trong lúc chạy phiên, hai cột biến mất — cả màn hình chỉ còn một thứ để nhìn. Số credit nhích lên từng giây, và ngay dưới là dòng nhắc bạn sẽ mất đúng chừng đó nếu dừng: cùng một con số, dùng cho cả động lực lẫn răn đe.'
    },
    blocked: {
      src: 'images/browser-blocked-932.webp', w: 932, h: 524,
      srcset: 'images/browser-blocked-466.webp 466w, images/browser-blocked-932.webp 932w, images/browser-blocked-1864.webp 1864w',
      sizes: '(min-width: 1024px) 932px, 86vw',
      max: 932,
      alt: 'Trang chặn hiện trong trình duyệt với dòng chữ "Một khoảng dừng. Một lựa chọn tốt hơn."',
      cap: 'Trang chặn của tiện ích. Nó nói cho bạn biết cái giá — 5 phút tập trung đổi 1 phút — thay vì chỉ báo lỗi.'
    },
    overlay: {
      src: 'images/overlay-932.webp', w: 932, h: 583,
      srcset: 'images/overlay-466.webp 466w, images/overlay-932.webp 932w, images/overlay-1864.webp 1864w',
      sizes: '(min-width: 1024px) 932px, 86vw',
      max: 932,
      alt: 'Lớp phủ chặn ứng dụng che kín màn hình: chữ "Đang bị chặn", tên ứng dụng, ô chọn 5 phút · 5 credit, nút Đổi credit để mở và nút Đóng ứng dụng, quay lại làm việc.',
      cap: 'Khi ứng dụng bị chặn lên tiền cảnh, lớp phủ này che kín nó — không tiến trình nào bị giết, nên bạn không mất dữ liệu đang làm dở. Hai lựa chọn: trả credit để mở, hoặc đóng ứng dụng đó và quay lại làm việc.'
    },
    locked: {
      src: 'images/locked-932.webp', w: 932, h: 646,
      srcset: 'images/locked-466.webp 466w, images/locked-932.webp 932w, images/locked-1864.webp 1864w',
      sizes: '(min-width: 1024px) 932px, 86vw',
      max: 932,
      alt: 'Bảng cài đặt đang ở chế độ khóa, còn 30 phút, kèm bảng đối chiếu 25 phút đổi 5 credit.',
      cap: 'Chế độ khóa: không hủy, không rút ngắn — kể cả bằng cách xóa dữ liệu. Tiện ích tự giữ hạn khóa nên tắt ứng dụng cũng vô ích.'
    },
    gate: {
      src: 'images/gate-932.webp', w: 932, h: 646,
      srcset: 'images/gate-466.webp 466w, images/gate-932.webp 932w, images/gate-1864.webp 1864w',
      sizes: '(min-width: 1024px) 932px, 86vw',
      max: 932,
      alt: 'Màn hình mở đầu với tiêu đề "Còn một bước nữa: bật bộ chặn", khung tặng 15 credit, bốn bước ghép nối và dòng chờ tiện ích kết nối.',
      cap: 'Lần chạy đầu tiên dừng ở đây, chưa vào được màn hình chính — vì chưa ghép nối thì credit không có tác dụng gì. Chỉ chặn ở lần đầu; về sau rớt kết nối thì app chỉ cảnh báo chứ không nhốt bạn khỏi credit đã kiếm.'
    },
    settings: {
      src: 'images/settings-932.webp', w: 932, h: 646,
      srcset: 'images/settings-466.webp 466w, images/settings-932.webp 932w, images/settings-1864.webp 1864w',
      sizes: '(min-width: 1024px) 932px, 86vw',
      max: 932,
      alt: 'Bảng cài đặt: mục bộ chặn website với bốn bước ghép nối tiện ích, ba lựa chọn giao diện, và hàng khung thời gian 15 / 25 / 90 phút.',
      cap: 'Toàn bộ cài đặt nằm trong một bảng: bốn bước ghép nối tiện ích, ba lựa chọn giao diện, và các mốc thời gian bạn tự đặt. Tiêu đề và hàng nút đứng yên, chỉ phần giữa cuộn.'
    },
    dark: {
      src: 'images/dark-932.webp', w: 932, h: 646,
      srcset: 'images/dark-466.webp 466w, images/dark-932.webp 932w, images/dark-1864.webp 1864w',
      sizes: '(min-width: 1024px) 932px, 86vw',
      max: 932,
      alt: 'Ứng dụng ở chế độ tối với bảng cài đặt đang mở.',
      cap: 'Ba lựa chọn giao diện: theo hệ thống, sáng, tối. Mặc định đi theo cài đặt của Windows.'
    },
    narrow: {
      src: 'images/narrow-780.webp', w: 780, h: 960,
      srcset: 'images/narrow-390.webp 390w, images/narrow-780.webp 780w, images/narrow-1560.webp 1560w',
      sizes: '(min-width: 1024px) 780px, 86vw',
      max: 780,
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
      // Gỡ srcset trước khi đổi src: nếu để lại bộ cũ, trình duyệt vẫn chọn ứng viên
      // của ảnh trước và src mới bị bỏ qua.
      gImg.removeAttribute('srcset');
      gImg.src = s.src;
      // sizes phải đặt trước srcset: ảnh cửa sổ hẹp chỉ rộng 780 CSS px thật, nếu vẫn
      // khai 932 thì trình duyệt thấy ứng viên 780w không đủ và kéo bản 1560w về cho một
      // ô chỉ cần 916 điểm ảnh.
      gImg.sizes = s.sizes;
      gImg.srcset = s.srcset;
      // Ảnh nhỏ hơn ô thì đứng đúng bề rộng của mình chứ không bị kéo giãn cho mờ.
      gImg.style.maxWidth = s.max + 'px';
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

  /* ── Cài đặt: hai đường đi ──
     Có link cửa hàng thì ba bước; không có thì giữ nguyên năm bước nạp thủ công.
     Mặc định trong HTML là đường thủ công, nên không có JS vẫn ra hướng dẫn đúng. */

  var oStore = $('[data-install="store"]'), oManual = $('[data-install="manual"]');

  if (oStore && oManual && CFG.extensionUrl) {
    var link = $('#ext-store');
    link.href = CFG.extensionUrl;
    oStore.hidden = false;
    oManual.hidden = true;
    var tieuDe = $('#install-title');
    if (tieuDe) tieuDe.innerHTML = 'Ba bước. <span class="dim">Làm một lần duy nhất.</span>';
  }

  /* ── Đoạn phim ở hero ──
     Thẻ <video> để preload="none": chưa có JS thì nó đứng yên ở poster, không tốn
     một byte nào cho phần phim. Chỉ khi máy không bật "giảm chuyển động" và khung
     phim thật sự lọt vào màn hình thì mới tải và chạy.
     Phim lặp vô hạn nên theo WCAG 2.2.2 phải có cách dừng — nút Tạm dừng chỉ xuất
     hiện khi phim thật sự chạy được. */

  var hv = $('#hero-video'), hvBtn = $('#hero-video-toggle');

  if (hv && hvBtn) {
    var itMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var nguoiDung = false;   // người xem đã tự bấm thì tôn trọng, đừng tự chạy lại

    var doiNut = function () {
      var dang = !hv.paused && !hv.ended;
      hvBtn.textContent = dang ? 'Tạm dừng' : 'Phát';
      hvBtn.setAttribute('aria-label', dang ? 'Tạm dừng đoạn phim' : 'Phát đoạn phim');
    };

    var chay = function () {
      if (hv.preload === 'none') { hv.preload = 'auto'; hv.load(); }
      var p = hv.play();
      if (p && p.catch) p.catch(function () { doiNut(); });
    };

    hvBtn.hidden = false;
    doiNut();

    hvBtn.addEventListener('click', function () {
      nguoiDung = true;
      if (hv.paused) chay(); else hv.pause();
      doiNut();   // đổi chữ ngay, đừng đợi sự kiện play/pause xếp hàng
    });
    hv.addEventListener('play', doiNut);
    hv.addEventListener('pause', doiNut);

    var tuChay = function () {
      if (nguoiDung || (itMotion && itMotion.matches)) return;
      chay();
    };

    if ('IntersectionObserver' in window) {
      // Ngưỡng phải rất thấp. Trên màn hình thấp (900px chẳng hạn) đoạn phim nằm dưới
      // tiêu đề và nút tải, nên lúc vào trang chỉ ló ra chừng 200px — đòi 25% là nó
      // không bao giờ chạy cho tới khi người ta cuộn xuống.
      var ioV = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) tuChay();
          else if (!hv.paused) hv.pause();   // khuất mắt thì thôi, đỡ tốn pin
        });
      }, { threshold: 0.01 });
      ioV.observe(hv);
    } else {
      tuChay();
    }

    // Người xem đổi ý giữa chừng ở cài đặt hệ thống thì làm theo ngay.
    if (itMotion && itMotion.addEventListener) {
      itMotion.addEventListener('change', function (e) {
        if (e.matches && !hv.paused) hv.pause();
      });
    }
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
