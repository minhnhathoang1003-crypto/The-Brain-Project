const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../src/license.cjs');

const KEY = '1A2B3C4D-5E6F-7A8B-9C0D-1E2F3A4B5C6D';
const DAY = 86400000;

test.afterEach(() => L.load(null));

test('công tắc bán hàng còn tắt: không ai bị giới hạn gì', () => {
  assert.equal(L.SELLING, false, 'bật SELLING là khóa tính năng của người đang dùng miễn phí');
  L.load(null);
  assert.equal(L.tier(), 'pro', 'chưa có bản quyền vẫn phải là pro khi chưa bán');
  assert.equal(L.limits().appBlocking, true);
  assert.equal(L.limits().lockedMode, true);
});

test('bảng so sánh chỉ liệt kê hạn mức mà engine thật sự đọc', () => {
  const keys = L.DIFFERENCES.map(d => d.key);
  assert.deepEqual(keys, ['maxTargets', 'appBlocking', 'lockedMode', 'historyDays']);
  for (const k of keys) {
    assert.ok(Object.hasOwn(L.PLANS.free, k), `PLANS.free thiếu ${k}`);
    assert.ok(Object.hasOwn(L.PLANS.pro, k), `PLANS.pro thiếu ${k}`);
  }
  // Không hạn mức nào trong PLANS được vắng mặt khỏi bảng — đó chính là cách ba
  // tính năng ma từng lọt vào lời chào hàng mà không ai để ý.
  for (const k of Object.keys(L.PLANS.pro)) {
    assert.ok(keys.includes(k), `${k} có trong PLANS nhưng không có dòng nào trong bảng so sánh`);
  }
});

test('hai bậc thật sự khác nhau ở cả bốn hạn mức', () => {
  for (const d of L.DIFFERENCES) {
    assert.notDeepEqual(L.PLANS.free[d.key], L.PLANS.pro[d.key], `${d.key} giống nhau ở cả hai bậc`);
  }
});

test('BRAIN_TIER ép được bậc, giá trị rác luôn rơi về pro', () => {
  const saved = process.env.BRAIN_TIER;
  try {
    process.env.BRAIN_TIER = 'free';
    assert.equal(L.tier(), 'free');
    assert.equal(L.limits().maxTargets, 5);
    assert.equal(L.limits().historyDays, 7);
    for (const rac of ['rác', '', 'PRO', 'undefined', '0']) {
      process.env.BRAIN_TIER = rac;
      assert.equal(L.tier(), 'pro', `giá trị ${JSON.stringify(rac)} phải rơi về pro`);
    }
  } finally {
    if (saved === undefined) delete process.env.BRAIN_TIER; else process.env.BRAIN_TIER = saved;
  }
});

test('định dạng mã: nhận UUID, bỏ khoảng trắng, không phân biệt hoa thường', () => {
  assert.ok(L.validFormat(KEY));
  assert.ok(L.validFormat('  ' + KEY.toLowerCase() + '  '), 'phải chấp nhận chữ thường và khoảng trắng thừa');
  assert.equal(L.normalizeKey(' 1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d '), KEY);
  for (const xau of ['', 'abc', KEY.slice(0, -1), KEY + 'X', KEY.replace(/-/g, ''), 'ZZZZZZZZ-5E6F-7A8B-9C0D-1E2F3A4B5C6D', null, undefined, 42]) {
    assert.equal(L.validFormat(xau), false, `phải từ chối ${JSON.stringify(xau)}`);
  }
});

test('mã hiện lên màn hình luôn bị che phần giữa', () => {
  const masked = L.maskKey(KEY);
  assert.match(masked, /^1A2B3C4D-•+-•+-•+-1E2F3A4B5C6D$/);
  assert.ok(!masked.includes('5E6F'), 'không được lộ khối giữa');
});

test('activation() không bao giờ trả mã thô ra giao diện', () => {
  L.load({ key: KEY, status: 'active', checkedAt: Date.now() });
  const a = L.activation();
  assert.equal(JSON.stringify(a).includes(KEY), false, 'mã thô lọt ra renderer');
  assert.equal(a.hasKey, true);
  assert.match(a.maskedKey, /•/);
});

test('ân hạn 30 ngày khi mất mạng, quá hạn thì hết hiệu lực', () => {
  const now = Date.now();
  assert.equal(L.healthy({ key: KEY, status: 'active', checkedAt: now }, now), true);
  assert.equal(L.healthy({ key: KEY, status: 'active', checkedAt: now - 29 * DAY }, now), true);
  assert.equal(L.healthy({ key: KEY, status: 'active', checkedAt: now - 31 * DAY }, now), false);
  assert.equal(L.healthy({ key: KEY, status: 'expired', checkedAt: now }, now), false);
  assert.equal(L.healthy({ status: 'active', checkedAt: now }, now), false, 'thiếu key thì không hợp lệ');
  assert.equal(L.healthy(null, now), false);
});

test('graceDaysLeft đếm ngược đúng', () => {
  const now = Date.now();
  L.load({ key: KEY, status: 'active', checkedAt: now - 10 * DAY });
  assert.equal(L.activation(now).graceDaysLeft, 20);
  L.load({ key: KEY, status: 'active', checkedAt: now - 40 * DAY });
  assert.equal(L.activation(now).graceDaysLeft, 0, 'không bao giờ âm');
});

test('verify() từ chối mã sai định dạng và nói thẳng là chưa nối cổng thanh toán', async () => {
  const xau = await L.verify('không-phải-mã');
  assert.equal(xau.ok, false);
  assert.match(xau.error, /định dạng/);

  const tot = await L.verify(KEY.toLowerCase());
  assert.equal(tot.ok, true);
  assert.equal(tot.wired, false, 'chưa nối thì phải nói là chưa nối');
  assert.equal(tot.record.key, KEY, 'mã phải được chuẩn hóa trước khi lưu');
  assert.equal(tot.record.status, 'unverified');
  assert.match(tot.message, /[Cc]hưa xác minh/);
});

test('mã chưa xác minh không tự biến thành pro khi bật bán', () => {
  const now = Date.now();
  L.load({ key: KEY, status: 'unverified', checkedAt: now });
  assert.equal(L.healthy(L.stored(), now), false, 'unverified không được tính là active');
});
