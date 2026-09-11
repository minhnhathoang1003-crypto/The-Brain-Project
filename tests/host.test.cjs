const test = require('node:test');
const assert = require('node:assert/strict');
const { hostOf, Engine, initial } = require('../src/engine.cjs');

test('lấy được tên miền từ link thật, không chỉ từ tên miền trần', () => {
  const cap = [
    ['https://github.com/minhnhathoang1003-crypto/The-Brain-Project', 'github.com'],
    ['https://www.youtube.com/watch?v=abc123&t=90s', 'youtube.com'],
    ['http://reddit.com:8080/r/vietnam#top', 'reddit.com'],
    ['https://user:pass@facebook.com/groups/xyz', 'facebook.com'],
    ['REDDIT.COM/', 'reddit.com'],
    ['  https://Example.COM.  ', 'example.com'],
    ['tiktok.com', 'tiktok.com'],
    ['https://vnexpress.net', 'vnexpress.net'],
    // Dấu gạch ngược: Windows hay dán nhầm kiểu này.
    ['https://youtube.com\\watch', 'youtube.com'],
  ];
  for (const [vao, ra] of cap) assert.equal(hostOf(vao), ra, `hostOf(${JSON.stringify(vao)})`);
});

test('không ngã với đầu vào rác', () => {
  for (const rac of ['', '   ', null, undefined, 42, 'không phải link', '://', 'https://']) {
    assert.doesNotThrow(() => hostOf(rac), JSON.stringify(rac));
  }
  assert.equal(hostOf(null), '');
  assert.equal(hostOf(undefined), '');
});

test('giữ nguyên tên miền con — tiện ích vốn đã chặn cả tên miền con', () => {
  // Cắt "m." thành "facebook.com" là đoán ý người dùng; mà đoán sai thì chặn
  // nhầm cả một trang khác. Thêm "facebook.com" là đã phủ "m.facebook.com" rồi.
  assert.equal(hostOf('https://m.facebook.com/x'), 'm.facebook.com');
  assert.equal(hostOf('https://docs.github.com/en'), 'docs.github.com');
});

test('dán link đầy đủ vào ứng dụng thì thêm đúng tên miền gốc', () => {
  const e = new Engine(initial(), () => Date.now(), () => {});
  e.s.targets = [];
  e.action('targetAdd', { domain: 'https://github.com/minhnhathoang1003-crypto/The-Brain-Project' });
  assert.deepEqual(e.s.targets.map(t => t.domain), ['github.com']);

  // Dán link khác của cùng trang thì báo trùng, không tạo mục thứ hai.
  assert.throws(() => e.action('targetAdd', { domain: 'https://github.com/settings' }), /đã có trong danh sách/);
  assert.equal(e.s.targets.length, 1);
});

test('vẫn từ chối thứ không phải tên miền, và nói rõ phải làm gì', () => {
  const e = new Engine(initial(), () => Date.now(), () => {});
  for (const rac of ['không phải link', 'localhost', 'abc', '...', 'http://']) {
    assert.throws(() => e.action('targetAdd', { domain: rac }), /Không đọc được tên miền/, rac);
  }
});
