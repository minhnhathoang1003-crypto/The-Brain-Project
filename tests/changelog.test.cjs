// src/ui/changelog.js được sinh từ CHANGELOG.md. Hai nơi lệch nhau thì mục
// "Có gì mới" trong ứng dụng sẽ nói sai về chính bản đang chạy — mà không ai
// phát hiện, vì chẳng có gì hỏng để thấy. Bài này khoá chúng lại với nhau.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const goc = path.resolve(__dirname, '..');
const md = fs.readFileSync(path.join(goc, 'CHANGELOG.md'), 'utf8');
const js = fs.readFileSync(path.join(goc, 'src/ui/changelog.js'), 'utf8');

// changelog.js khai báo một biến toàn cục, không export — chạy trong hộp cát.
const box = {};
vm.createContext(box);
vm.runInContext(js + ';globalThis.__cl=CHANGELOG;', box);
const trongApp = box.__cl;

// Đọc lại CHANGELOG.md theo đúng cách script sinh đã làm.
function docMd(text) {
  return text.split(/^## /m).slice(1).map(khoi => {
    const dong = khoi.trim().split('\n');
    const items = [];
    for (const d of dong.slice(1)) {
      const t = d.trim();
      if (t.startsWith('- ')) items.push(t.slice(2).trim());
      else if (items.length && t) items[items.length - 1] += ' ' + t;
    }
    return { v: dong[0].trim(), items };
  });
}

const sang = t => t
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/`(.+?)`/g, '<code>$1</code>');

const trongMd = docMd(md);

test('changelog.js là mảng phiên bản hợp lệ', () => {
  assert.ok(Array.isArray(trongApp), 'CHANGELOG phải là mảng');
  assert.ok(trongApp.length >= 3, `phải có ít nhất 3 bản, đang có ${trongApp.length}`);
  for (const b of trongApp) {
    assert.match(b.v, /^\d+\.\d+\.\d+$/, `số phiên bản lạ: ${b.v}`);
    assert.ok(Array.isArray(b.items) && b.items.length, `${b.v} không có mục nào`);
  }
});

test('bản mới nhất trong app khớp package.json', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(goc, 'package.json'), 'utf8'));
  assert.equal(trongApp[0].v, pkg.version,
    `app hiện bản ${trongApp[0].v} nhưng package.json là ${pkg.version} — chạy lại script sinh changelog`);
});

test('từng mục trong app khớp từng chữ với CHANGELOG.md', () => {
  trongApp.forEach((ban, i) => {
    const goc2 = trongMd[i];
    assert.ok(goc2, `CHANGELOG.md không có khối thứ ${i + 1}`);
    assert.equal(ban.v, goc2.v, `thứ tự phiên bản lệch ở vị trí ${i + 1}`);
    assert.equal(ban.items.length, goc2.items.length, `${ban.v}: số mục lệch nhau`);
    ban.items.forEach((it, j) => {
      assert.equal(it, sang(goc2.items[j]), `${ban.v} mục ${j + 1} lệch nội dung`);
    });
  });
});

test('không lọt thẻ HTML thô nào từ markdown', () => {
  for (const ban of trongApp) for (const it of ban.items) {
    const conLai = it.replace(/<\/?(b|code)>/g, '');
    assert.equal(/[<>]/.test(conLai), false, `${ban.v}: còn dấu ngoặc nhọn chưa thoát trong "${it}"`);
    assert.equal(/\*\*/.test(it), false, `${ban.v}: còn dấu ** chưa đổi thành <b>`);
  }
});
