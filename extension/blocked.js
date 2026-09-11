/* Màn hình chặn website.
   Ngoài việc dừng người dùng lại, nó còn cho đổi credit ngay tại chỗ — giống hệt
   lớp phủ chặn ứng dụng trên Windows đã làm từ 0.5.0. Mọi luật vẫn do ứng dụng
   quyết: chế độ khóa, đang trong phiên tập trung, không đủ credit. Trang này chỉ
   hỏi và hiện câu trả lời. */
(() => {
  'use strict';

  // blocked.html nằm trong web_accessible_resources, nên một trang bất kỳ có thể
  // nhúng nó vào iframe vô hình rồi dụ người dùng bấm nút đổi credit mà không biết
  // mình đang bấm gì. Trong khung thì không làm gì cả.
  if (window.top !== window) {
    document.documentElement.textContent = '';
    return;
  }

  const $ = id => document.getElementById(id);
  const host = new URLSearchParams(location.search).get('host');
  const hopLe = /^(?:[a-z0-9-]+\.)+[a-z]{2,63}$/.test(host || '');
  if (hopLe) {
    $('host').textContent = host;
    $('host-2').textContent = host;
  }
  const moLai = () => { if (hopLe) location.href = 'https://' + host; };
  $('retry').onclick = moLai;
  if (!hopLe) return;

  const hoi = msg => new Promise(resolve => {
    try { chrome.runtime.sendMessage(msg, r => { void chrome.runtime.lastError; resolve(r || null); }); }
    catch { resolve(null); }
  });

  const phut = n => n === 1 ? '1 phút' : `${n} phút`;

  function loi(text) {
    const el = $('doi-loi');
    el.textContent = text;
    el.hidden = !text;
  }

  async function ve() {
    const s = await hoi({ type: 'status' });
    // Không nối được ứng dụng: giữ nguyên màn hình chặn cũ, đừng bày ra một khu
    // đổi credit không bấm được.
    if (!s || !s.connected) return;

    // Tên miền này phải thật sự nằm trong danh sách, và ta cần đúng id của nó.
    const target = (s.targets || []).find(t => t.domain === host);
    if (!target) return;

    // Chế độ khóa thắng tất cả. Nói rõ còn bao lâu thay vì hiện nút rồi báo lỗi.
    if (s.lockUntil) {
      const con = Math.ceil((s.lockUntil - Date.now()) / 60000);
      $('note').innerHTML = `Bạn đang trong <strong>chế độ khóa</strong>. Không đổi được credit trong ${con} phút nữa.<br>Đó là điều bạn đã chủ động chọn.`;
      return;
    }
    if (s.session) {
      $('note').innerHTML = 'Bạn đang trong một <strong>phiên tập trung</strong>. Hoàn tất phiên rồi hãy đổi credit — bỏ dở là mất sạch số credit đang tích.';
      return;
    }

    const packs = (s.packs || []).filter(n => Number.isFinite(n) && n > 0);
    if (!packs.length) return;

    $('so-du').textContent = Number.isInteger(s.credits) ? s.credits : s.credits.toFixed(1);
    const box = $('goi');
    box.textContent = '';
    for (const n of packs) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pack';
      b.textContent = phut(n);
      // Không đủ credit thì vẫn hiện, nhưng mờ đi và nói rõ giá — để người dùng
      // thấy mình còn thiếu bao nhiêu, chứ không phải một nút biến mất bí ẩn.
      if (s.credits < n) {
        b.disabled = true;
        b.title = `Cần ${n} credit, bạn đang có ${s.credits}`;
      } else {
        b.onclick = () => doi(target.id, n, b);
      }
      box.appendChild(b);
    }
    $('note').innerHTML = 'Đổi credit ở đây, hoặc mở ứng dụng The Brain Project để bắt đầu một phiên tập trung.';
    $('doi').hidden = false;
  }

  let dangGui = false;
  async function doi(targetId, minutes, btn) {
    if (dangGui) return;
    dangGui = true;
    loi('');
    const chu = btn.textContent;
    btn.textContent = 'Đang mở…';
    for (const b of document.querySelectorAll('.pack')) b.disabled = true;

    const r = await hoi({ type: 'redeem', targetId, minutes });
    if (r && r.ok) {
      // Ứng dụng đã cấp quyền và đẩy luật mới xuống tiện ích. Vào thẳng trang.
      btn.textContent = 'Đang mở…';
      moLai();
      return;
    }
    dangGui = false;
    btn.textContent = chu;
    loi((r && r.error) || 'Không đổi được credit. Hãy thử lại.');
    // Số dư có thể đã đổi (đổi ở máy khác, hoặc vừa hết giờ khóa) — vẽ lại cho đúng.
    ve();
  }

  ve();
})();
