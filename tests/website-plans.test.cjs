// Trang giá trên website là HTML tĩnh, nằm ngoài ứng dụng, nên nó có thể lệch khỏi
// hạn mức thật mà không ai để ý — đúng kiểu lỗi đã để "tỉ lệ tùy chỉnh" và "đồng bộ"
// nằm trong lời chào hàng suốt nhiều bản. Bài này khoá hai nơi lại với nhau.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DIFFERENCES, PLANS } = require('../src/license.cjs');

const FILE = path.resolve(__dirname, '../website/gia.html');
const html = fs.readFileSync(FILE, 'utf8');

// Ô đánh dấu có/không trên web dùng ký hiệu, ở đây quy về boolean để so được.
const asValue = cell => {
  const text = cell.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  if (text === '✓') return true;
  if (text === '—') return false;
  return text;
};

function webRows() {
  const body = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  assert.ok(body, 'không tìm thấy <tbody> của bảng so sánh trong gia.html');
  return [...body[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m => {
    const cells = [...m[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map(c => c[1]);
    assert.equal(cells.length, 3, 'mỗi dòng phải có đúng ba ô: tên, Free, Pro');
    return { label: asValue(cells[0]), free: asValue(cells[1]), pro: asValue(cells[2]) };
  });
}

test('bảng giá trên website khớp từng dòng với license.cjs', () => {
  const rows = webRows();
  assert.equal(rows.length, DIFFERENCES.length,
    `website có ${rows.length} dòng, license.cjs có ${DIFFERENCES.length}`);

  DIFFERENCES.forEach((d, i) => {
    assert.equal(rows[i].label, d.label, `dòng ${i + 1}: tên tính năng lệch nhau`);
    assert.deepEqual(rows[i].free, d.free, `dòng ${i + 1} (${d.label}): cột Free lệch nhau`);
    assert.deepEqual(rows[i].pro, d.pro, `dòng ${i + 1} (${d.label}): cột Pro lệch nhau`);
  });
});

test('website không hứa tính năng nào ngoài những thứ PLANS thật sự có', () => {
  const chuLoi = ['tỉ lệ tùy chỉnh', 'đồng bộ', 'sao lưu', 'báo cáo tuần'];
  const thuong = html.toLowerCase();
  for (const cum of chuLoi) {
    assert.equal(thuong.includes(cum), false,
      `gia.html nhắc tới "${cum}" — tính năng này không tồn tại trong PLANS`);
  }
});

test('trang giá nói đúng số ngày ân hạn và chu kỳ kiểm tra lại', () => {
  const { GRACE_DAYS, RECHECK_DAYS } = require('../src/license.cjs');
  assert.ok(html.includes(`${GRACE_DAYS}</strong> ngày`) || html.includes(`${GRACE_DAYS} ngày`),
    `trang giá phải nói ân hạn ${GRACE_DAYS} ngày`);
  assert.ok(html.includes(`${RECHECK_DAYS} ngày`),
    `trang giá phải nói kiểm tra lại mỗi ${RECHECK_DAYS} ngày`);
});

test('trang giá nêu đúng hạn mức số mục của cả hai bậc', () => {
  assert.ok(html.includes(`${PLANS.free.maxTargets} mục`), 'thiếu hạn mức Free');
  assert.ok(html.includes(`${PLANS.pro.maxTargets} mục`), 'thiếu hạn mức Pro');
});
