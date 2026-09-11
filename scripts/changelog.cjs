// Sinh src/ui/changelog.js từ CHANGELOG.md.
//
// Ứng dụng cần lịch sử phiên bản để hiện trong mục Giới thiệu, nhưng nguồn sự thật
// phải là CHANGELOG.md — chép tay hai nơi thì sớm muộn cũng lệch. Chạy:
//
//     node scripts/changelog.cjs
//
// tests/changelog.test.cjs đọc lại cả hai và báo đỏ nếu chúng khác nhau, nên quên
// chạy script này là biết ngay.
const fs = require('node:fs');
const path = require('node:path');

const goc = path.resolve(__dirname, '..');
const md = fs.readFileSync(path.join(goc, 'CHANGELOG.md'), 'utf8');

// Cách đọc này phải khớp từng bước với docMd() trong tests/changelog.test.cjs.
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

// Markdown rất hạn chế: chỉ **đậm** và `mã`. Escape trước, đổi sau — ngược lại là
// tự tay mở đường cho HTML lọt vào giao diện.
const sang = t => t
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/`(.+?)`/g, '<code>$1</code>');

const ban = docMd(md);
const than = ban.map(b =>
  `  {v:${JSON.stringify(b.v)}, items:[\n` +
  b.items.map(i => `    ${JSON.stringify(sang(i))},`).join('\n') +
  `\n  ]},`
).join('\n');

const ra = `// SINH TỰ ĐỘNG TỪ CHANGELOG.md — đừng sửa tay.
// Ứng dụng cần lịch sử phiên bản để hiện trong mục Giới thiệu, nhưng nguồn sự
// thật vẫn là CHANGELOG.md. tests/changelog.test.cjs đọc lại file gốc và báo đỏ
// nếu hai nơi lệch nhau, nên không thể quên cập nhật chỗ này.
// Chạy lại bằng: node scripts/changelog.cjs
const CHANGELOG=[
${than}
];
`;

fs.writeFileSync(path.join(goc, 'src/ui/changelog.js'), ra, 'utf8');
console.log(`changelog.js: ${ban.length} bản, mới nhất ${ban[0].v}`);
