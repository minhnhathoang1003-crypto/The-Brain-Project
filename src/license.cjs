// Đường nối cho việc bán hàng.
//
// Module này cố ý KHÔNG require electron: tests/engine.test.cjs nạp nó bằng node trần.
// Việc đọc/ghi file bản quyền nằm ở main.cjs, rồi bơm vào đây qua load().
//
// Bản quyền cũng cố ý KHÔNG nằm trong state của engine. Nút "Xóa toàn bộ dữ liệu" gọi
// initial(), nên để bản quyền ở đó thì người đã trả tiền reset dữ liệu là mất luôn thứ
// họ mua. Cùng lý do mà quà 15 credit được giữ ngoài initial().
//
// Ba quy tắc phải giữ, vì đây là app kỷ luật chứ không phải app giải trí:
//   1. License hỏng không bao giờ làm mất credit người dùng đã kiếm.
//   2. License hỏng không bao giờ làm bộ chặn ngừng chặn — họ trả tiền để bị chặn.
//   3. License hỏng không bao giờ làm app không mở được; chỉ tụt xuống bậc 'free'.

// ─────────────────────────────────────────────────────────────────────────────
// CÔNG TẮC BÁN HÀNG. Đây là chỗ duy nhất quyết định có ai bị giới hạn hay không.
//
// false → mọi người đều ở bậc 'pro', không ai bị khóa gì. Đây là trạng thái hôm nay.
// true  → không có bản quyền hợp lệ thì tụt xuống 'free'.
//
// Đừng bật cho tới khi verify() dưới đây thật sự gọi được cổng thanh toán. Bật sớm là
// khóa tính năng của những người đang dùng miễn phí mà chẳng có cách nào để họ mua.
const SELLING = false;
// ─────────────────────────────────────────────────────────────────────────────

// Chỉ liệt kê những hạn mức mà engine thật sự đọc. Từng có thêm customRatio và
// sync ở đây, nhưng không dòng nào trong src/ đọc chúng và tính năng thì chưa
// tồn tại — giữ lại chỉ khiến bảng giá hứa thứ không có. Xây tới đâu thêm tới đó.
const PLANS = {
  free: {
    maxTargets: 5,        // đủ cho YouTube, Facebook, TikTok, Instagram và một cái nữa
    historyDays: 7,
    appBlocking: false,   // chặn ứng dụng & game Windows, có từ 0.5.0
    lockedMode: false,    // khóa cứng không tự gỡ được, có từ 0.4.0
  },
  pro: {
    maxTargets: 50,
    historyDays: 180,   // bằng đúng số ngày engine lưu trên đĩa
    appBlocking: true,
    lockedMode: true,
  },
};

// Bốn dòng này là toàn bộ khác biệt giữa hai bậc. Giao diện đọc thẳng từ đây nên
// bảng so sánh trong ⚙ không bao giờ lệch khỏi thứ engine thật sự áp dụng.
const DIFFERENCES = [
  { key:'maxTargets', label:'Số mục chặn được',        free:`${PLANS.free.maxTargets} mục`,  pro:`${PLANS.pro.maxTargets} mục` },
  { key:'appBlocking',label:'Chặn ứng dụng và game Windows', free:false,                     pro:true },
  { key:'lockedMode', label:'Chế độ khóa không tự gỡ được',  free:false,                     pro:true },
  { key:'historyDays',label:'Lịch sử xem lại được',    free:`${PLANS.free.historyDays} ngày`, pro:`${PLANS.pro.historyDays} ngày` },
];

// Vòng lặp cốt lõi miễn phí vĩnh viễn. Nó là thứ khiến người ta kể cho bạn bè.
const ALWAYS_FREE = [
  'Trọn vòng lặp credit: tập trung → credit → mở khóa',
  'Chặn website qua tiện ích trình duyệt',
  'Tỉ lệ 5 phút = 1 credit, cố định',
  'Dữ liệu nằm trên máy bạn và được mã hóa',
];

const DAY = 86400000;
const RECHECK_DAYS = 14;   // khoảng cách giữa hai lần gọi validate
const GRACE_DAYS = 30;     // mất mạng bao lâu thì vẫn còn là 'pro'

// Bản ghi kích hoạt đang có hiệu lực, do main.cjs đọc từ đĩa và bơm vào.
let record = null;

function load(next) { record = next && typeof next === 'object' ? next : null; }
function stored() { return record; }

// Chuẩn hóa key người dùng dán vào: bỏ khoảng trắng thừa, viết hoa.
// Không đụng vào dấu gạch ngang vì Lemon Squeezy phát key theo dạng có gạch.
function normalizeKey(raw) {
  return String(raw == null ? '' : raw).trim().replace(/\s+/g, '').toUpperCase();
}

// Chỉ kiểm hình dạng, không kiểm tính hợp lệ — điều đó chỉ máy chủ mới biết.
// Lemon Squeezy phát key dạng UUID v4: 8-4-4-4-12 chữ số hex.
function validFormat(raw) {
  return /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/.test(normalizeKey(raw));
}

// Chỉ để hiện lên màn hình: giữ khối đầu và khối cuối, giấu phần giữa.
function maskKey(raw) {
  const k = normalizeKey(raw);
  const parts = k.split('-');
  return parts.length === 5 ? `${parts[0]}-••••-••••-••••-${parts[4]}` : k.slice(0, 8) + '…';
}

// Bản ghi còn hiệu lực hay không, xét cả thời gian ân hạn khi mất mạng.
function healthy(r, now = Date.now()) {
  if (!r || r.status !== 'active' || !r.key) return false;
  const seen = typeof r.checkedAt === 'number' ? r.checkedAt : 0;
  return now - seen <= GRACE_DAYS * DAY;
}

function tier() {
  // Cửa hậu để tự xem thử trải nghiệm từng bậc; giá trị lạ luôn rơi về 'pro'.
  const forced = process.env.BRAIN_TIER;
  if (Object.hasOwn(PLANS, forced || '')) return forced;
  if (!SELLING) return 'pro';
  return healthy(record) ? 'pro' : 'free';
}

const limits = () => PLANS[tier()];

// Thứ giao diện được phép nhìn thấy. Không trả key thô ra renderer.
function activation(now = Date.now()) {
  return {
    selling: SELLING,
    tier: tier(),
    hasKey: !!(record && record.key),
    maskedKey: record && record.key ? maskKey(record.key) : null,
    status: record ? record.status : null,
    checkedAt: record ? record.checkedAt || null : null,
    // Còn bao nhiêu ngày ân hạn nếu máy chủ không trả lời được nữa.
    graceDaysLeft: record && typeof record.checkedAt === 'number'
      ? Math.max(0, Math.ceil((record.checkedAt + GRACE_DAYS * DAY - now) / DAY)) : null,
    recheckDays: RECHECK_DAYS,
    graceDays: GRACE_DAYS,
  };
}

// CHƯA NỐI. Khi có tài khoản Lemon Squeezy, đây là hàm duy nhất phải viết lại:
// gọi /v1/licenses/activate, lấy instance_id, rồi trả về bản ghi để lưu.
// Cho tới lúc đó nó nói thẳng là chưa xác minh được, thay vì giả vờ đã xác minh.
async function verify(key, now = Date.now()) {
  if (!validFormat(key)) return { ok:false, error:'Mã bản quyền sai định dạng. Mã có dạng XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX.' };
  return {
    ok: true,
    wired: false,
    record: { key: normalizeKey(key), instanceId: null, status: 'unverified', checkedAt: now },
    message: 'Đã lưu mã trên máy này. Chưa xác minh được vì cổng thanh toán chưa được nối — hiện mọi tính năng vẫn đang mở cho tất cả mọi người.',
  };
}

module.exports = {
  PLANS, DIFFERENCES, ALWAYS_FREE, SELLING, RECHECK_DAYS, GRACE_DAYS,
  tier, limits, load, stored, activation, verify,
  normalizeKey, validFormat, maskKey, healthy,
};
