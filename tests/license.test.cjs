const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../src/license.cjs');

const KEY = '1A2B3C4D-5E6F-7A8B-9C0D-1E2F3A4B5C6D';
const DAY = 86400000;

test.afterEach(() => L.load(null));

test('đã bật bán: không bản quyền là free, bản quyền còn hiệu lực là pro', () => {
  const saved = process.env.BRAIN_TIER;
  delete process.env.BRAIN_TIER;
  try {
    assert.equal(L.SELLING, true);
    L.load(null);
    assert.equal(L.tier(), 'free');
    assert.equal(L.limits().appBlocking, false);
    assert.equal(L.limits().lockedMode, false);

    L.load({ key: KEY, status: 'active', checkedAt: Date.now() });
    assert.equal(L.tier(), 'pro');
    assert.equal(L.limits().appBlocking, true);
    assert.equal(L.limits().lockedMode, true);
  } finally { if (saved === undefined) delete process.env.BRAIN_TIER; else process.env.BRAIN_TIER = saved; }
});

test('hết hạn ân hạn thì tụt về free, nhưng hạn mức Free vẫn còn nguyên vòng lặp cốt lõi', () => {
  const saved = process.env.BRAIN_TIER;
  delete process.env.BRAIN_TIER;
  try {
    L.load({ key: KEY, status: 'active', checkedAt: Date.now() - 31 * DAY });
    assert.equal(L.tier(), 'free', 'quá 30 ngày không xác minh được thì hết hiệu lực');
    // Thứ người dùng kiếm được bằng công sức không bao giờ nằm sau tường phí.
    assert.ok(L.limits().maxTargets >= 5, 'bản Free vẫn chặn được ít nhất 5 mục');
    assert.ok(L.limits().historyDays >= 7, 'bản Free vẫn xem lại được ít nhất 7 ngày');
  } finally { if (saved === undefined) delete process.env.BRAIN_TIER; else process.env.BRAIN_TIER = saved; }
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

test('BRAIN_TIER ép được cả hai bậc, giá trị rác bị bỏ qua', () => {
  const saved = process.env.BRAIN_TIER;
  try {
    L.load({ key: KEY, status: 'active', checkedAt: Date.now() });
    process.env.BRAIN_TIER = 'free';
    assert.equal(L.tier(), 'free', 'ép được xuống free dù đang có bản quyền, để tự xem thử');
    assert.equal(L.limits().maxTargets, 5);
    assert.equal(L.limits().historyDays, 7);
    process.env.BRAIN_TIER = 'pro';
    assert.equal(L.tier(), 'pro');
    // Giá trị lạ không được coi là một bậc; phải rơi về đúng thứ bản quyền cho phép.
    for (const rac of ['rác', '', 'PRO', 'undefined', '0']) {
      process.env.BRAIN_TIER = rac;
      assert.equal(L.tier(), 'pro', `có bản quyền, ${JSON.stringify(rac)} phải bị bỏ qua`);
    }
    L.load(null);
    for (const rac of ['rác', '', 'PRO', 'undefined', '0']) {
      process.env.BRAIN_TIER = rac;
      assert.equal(L.tier(), 'free', `không bản quyền, ${JSON.stringify(rac)} không được phát không bản Pro`);
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

// ─── Cổng thanh toán ─────────────────────────────────────────────────────────
// Không test nào ở đây được chạm vào mạng thật. setTransport() thay lớp fetch bằng
// một hàm giả trả về đúng hình dạng Lemon Squeezy trả về.

function gia(body, status = 200) {
  const calls = [];
  L.setTransport(async (url, init) => {
    calls.push({ url, body: Object.fromEntries(new URLSearchParams(init.body)) });
    return { status, json: async () => body };
  });
  return calls;
}
function mangHong(loi = new Error('ECONNREFUSED')) {
  L.setTransport(async () => { throw loi; });
}
const OK_ACTIVATE = {
  activated: true, error: null,
  license_key: { status: 'active', activation_usage: 1, activation_limit: 3 },
  instance: { id: 'inst-abc', name: 'MAY-CUA-TOI' },
  meta: { store_id: 111, product_id: L.PRODUCT_ID },
};

test.afterEach(() => L.setTransport(null));

test('bật SELLING mà quên điền mã cửa hàng là lỗ hổng: mọi mã Lemon Squeezy đều lọt', () => {
  // Nếu có ngày bạn bật SELLING, hai hằng số này bắt buộc phải có giá trị thật.
  // Không có bước kiểm chủ sở hữu thì mã mua bất kỳ thứ gì trên Lemon Squeezy
  // cũng mở khóa được app này.
  if (L.SELLING) assert.ok(L.PRODUCT_ID > 0, 'đã bật bán nhưng PRODUCT_ID còn 0');
});

test('verify() từ chối mã sai định dạng trước khi gọi mạng', async () => {
  const calls = gia(OK_ACTIVATE);
  const xau = await L.verify('không-phải-mã');
  assert.equal(xau.ok, false);
  assert.match(xau.error, /định dạng/);
  assert.equal(calls.length, 0, 'mã sai định dạng không được tốn một lượt gọi mạng');
});

test('verify() kích hoạt được: chuẩn hóa mã, lưu instanceId, không gửi gì thừa', async () => {
  const calls = gia(OK_ACTIVATE);
  const r = await L.verify(KEY.toLowerCase());
  assert.equal(r.ok, true);
  assert.equal(r.wired, true);
  assert.equal(r.record.key, KEY, 'mã phải được chuẩn hóa trước khi lưu');
  assert.equal(r.record.instanceId, 'inst-abc');
  assert.equal(r.record.status, 'active');
  assert.match(r.message, /1 trên 3/);

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/licenses\/activate$/);
  assert.equal(calls[0].body.license_key, KEY);
  // Chỉ được gửi đúng hai trường. Không credit, không danh sách chặn, không lịch sử.
  assert.deepEqual(Object.keys(calls[0].body).sort(), ['instance_name', 'license_key']);
});

test('verify() dịch lỗi của Lemon Squeezy và luôn kèm cách xử lý', async () => {
  for (const [loi, mong] of [
    ['license key activation limit reached', /hết lượt kích hoạt/],
    ['license_key not found', /Không tìm thấy mã/],
    ['license key has been disabled', /vô hiệu hóa/],
    ['license key has expired', /hết hạn/],
  ]) {
    gia({ activated: false, error: loi }, 400);
    const r = await L.verify(KEY);
    assert.equal(r.ok, false);
    assert.match(r.error, mong, `không dịch được lỗi ${JSON.stringify(loi)}`);
  }
});

test('verify() từ chối mã mua sản phẩm khác', async () => {
  assert.ok(L.PRODUCT_ID > 0, 'PRODUCT_ID chưa điền thì không có bước kiểm chủ sở hữu nào cả');
  gia({ ...OK_ACTIVATE, meta: { store_id: 111, product_id: 999999 } });
  const r = await L.verify(KEY);
  assert.equal(r.ok, false);
  assert.match(r.error, /sản phẩm khác/);
});

test('mã đúng sản phẩm thì qua, dù có điền STORE_ID hay không', async () => {
  gia({ ...OK_ACTIVATE, meta: { store_id: L.STORE_ID || 111, product_id: L.PRODUCT_ID } });
  assert.equal((await L.verify(KEY)).ok, true);
});

test('mất mạng lúc kích hoạt: báo lỗi rõ ràng, không giả vờ đã kích hoạt', async () => {
  mangHong();
  const r = await L.verify(KEY);
  assert.equal(r.ok, false);
  assert.match(r.error, /Không nối được/);
  assert.equal(r.record, undefined, 'không được lưu bản ghi khi chưa xác minh được');
});

test('máy chủ lỗi 500 không phải là phán quyết mã sai', async () => {
  gia({ activated: false, error: 'server exploded' }, 503);
  const r = await L.verify(KEY);
  assert.equal(r.ok, false);
  assert.match(r.error, /Không nối được/, '5xx phải được coi là mất liên lạc, không phải mã hỏng');
});

test('revalidate() chỉ gọi mạng khi tới hạn hai tuần', async () => {
  const now = Date.now();
  const calls = gia({ valid: true, meta: { store_id: 111, product_id: L.PRODUCT_ID } });

  L.load({ key: KEY, instanceId: 'inst-abc', status: 'active', checkedAt: now - 13 * DAY });
  assert.equal(L.needsRecheck(L.stored(), now), false);
  assert.equal((await L.revalidate(now)).changed, false);
  assert.equal(calls.length, 0, 'chưa tới hạn mà vẫn gọi mạng');

  L.load({ key: KEY, instanceId: 'inst-abc', status: 'active', checkedAt: now - 15 * DAY });
  const r = await L.revalidate(now);
  assert.equal(r.changed, true);
  assert.equal(r.record.status, 'active');
  assert.equal(r.record.checkedAt, now, 'phải đẩy mốc kiểm tra lên để đồng hồ ân hạn chạy lại');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/licenses\/validate$/);
  assert.equal(calls[0].body.instance_id, 'inst-abc');
});

test('QUY TẮC SỐ MỘT: mất mạng lúc kiểm lại KHÔNG được hạ bậc người đã trả tiền', async () => {
  const now = Date.now();
  const cu = { key: KEY, instanceId: 'inst-abc', status: 'active', checkedAt: now - 20 * DAY };

  for (const hong of [() => mangHong(), () => gia({ valid: false, error: 'gateway down' }, 502)]) {
    hong();
    L.load({ ...cu });
    const r = await L.revalidate(now);
    assert.equal(r.changed, false, 'máy chủ không trả lời mà vẫn sửa bản ghi');
    assert.equal(L.stored().status, 'active', 'bản ghi bị đụng vào');
    assert.equal(L.stored().checkedAt, cu.checkedAt, 'mốc ân hạn bị đẩy lên dù chưa xác minh được');
  }
});

test('máy chủ nói mã không còn hợp lệ thì thu hồi, và revoked không phải là active', async () => {
  const now = Date.now();
  gia({ valid: false, error: 'license key has been disabled' }, 400);
  L.load({ key: KEY, instanceId: 'inst-abc', status: 'active', checkedAt: now - 20 * DAY });
  const r = await L.revalidate(now);
  assert.equal(r.changed, true);
  assert.equal(r.record.status, 'revoked');
  assert.equal(L.healthy(r.record, now), false, 'mã bị thu hồi vẫn tính là hợp lệ');
});

test('gỡ mã trả lại lượt kích hoạt cho máy chủ', async () => {
  const calls = gia({ deactivated: true });
  L.load({ key: KEY, instanceId: 'inst-abc', status: 'active', checkedAt: Date.now() });
  const r = await L.deactivate();
  assert.equal(r.freed, true);
  assert.match(calls[0].url, /\/licenses\/deactivate$/);
  assert.equal(calls[0].body.instance_id, 'inst-abc');
});

test('gỡ mã không bao giờ bị mạng chặn lại', async () => {
  mangHong();
  L.load({ key: KEY, instanceId: 'inst-abc', status: 'active', checkedAt: Date.now() });
  const r = await L.deactivate();
  assert.equal(r.freed, false, 'không nối được thì nói thật là chưa trả được lượt');
  // Quan trọng: không ném lỗi. main.cjs xóa file ngay sau dòng này.
});

test('mã chưa xác minh không tự biến thành pro khi bật bán', () => {
  const now = Date.now();
  L.load({ key: KEY, status: 'unverified', checkedAt: now });
  assert.equal(L.healthy(L.stored(), now), false, 'unverified không được tính là active');
});
