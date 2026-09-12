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
// Bật ngày 11/9/2026, sau khi verify() gọi thật được /licenses/activate và một mã
// mua thử đã kích hoạt thành công trên máy thật. Đừng bật lại bằng tay ở nơi nào
// khác: đây là chỗ duy nhất quyết định.
const SELLING = true;
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// CỔNG THANH TOÁN. Lemon Squeezy đứng tên merchant of record: họ thu tiền, xuất
// hóa đơn, nộp thuế thay. Ba endpoint dưới đây là endpoint CÔNG KHAI — không cần
// API key, nên không có bí mật nào phải nhét vào app.asar. Điều đó quan trọng:
// mọi thứ trong asar đều giải nén đọc được bằng một câu lệnh.
const API = 'https://api.lemonsqueezy.com/v1/licenses';
const TIMEOUT = 15000;

// Mã sản phẩm trên Lemon Squeezy, lấy từ URL trang sản phẩm trong dashboard:
// app.lemonsqueezy.com/products/1353919. Mã này là duy nhất trên toàn hệ thống —
// chính cái URL đó chứng minh: nó không có đoạn nào chỉ cửa hàng mà vẫn tra ra
// đúng một sản phẩm.
//
// PHẢI điền trước khi bật SELLING. Bỏ trống nghĩa là không biết mã vừa kích hoạt
// là mã mua cái gì, tức mọi mã của mọi cửa hàng Lemon Squeezy trên đời đều mở khóa
// được app này. tests/license.test.cjs canh đúng chuyện đó.
const PRODUCT_ID = 1353919;

// Lớp phòng thủ thêm, không bắt buộc: để 0 thì bỏ qua. Chỉ có ích nếu một ngày nào
// đó mã sản phẩm bị dùng lại — điều chưa từng xảy ra, nhưng kiểm thêm không tốn gì.
const STORE_ID = 0;
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
    // Bằng đúng HISTORY_DAYS trong engine.cjs, tức là "tất cả những gì còn lưu".
    // Engine không xoá gì theo thời gian nữa, nên bậc Pro xem lại được từ ngày cài.
    // tests/engine.test.cjs canh hai con số này khớp nhau.
    historyDays: 3700,
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
  // Không viết "3700 ngày" — đó là chốt chặn kỹ thuật, không phải lời hứa. Thứ người
  // dùng thật sự nhận được là: tất cả, từ ngày cài.
  { key:'historyDays',label:'Lịch sử xem lại được',    free:`${PLANS.free.historyDays} ngày`, pro:'Toàn bộ, từ ngày cài' },
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

// ─── Link kích hoạt ──────────────────────────────────────────────────────────
// Sau khi trả tiền, Lemon Squeezy gửi khách tới một trang trên website mình, trang
// đó mở ứng dụng bằng link thebrainproject://activate?key=... — để khách không phải
// gõ lại mã bằng tay.
//
// Đây là dữ liệu từ bên ngoài đi thẳng vào ứng dụng, nên không tin gì cả: chỉ lấy
// đúng một tham số, và chỉ nhận nếu nó đúng hình dạng mã. Mọi thứ khác trong link
// đều bị bỏ qua.
const PROTOCOL = 'thebrainproject';

function keyFromUrl(raw) {
  const v = String(raw == null ? '' : raw).trim();
  if (!v.toLowerCase().startsWith(PROTOCOL + '://')) return null;
  let u;
  try { u = new URL(v); } catch { return null; }
  if (u.hostname.toLowerCase() !== 'activate') return null;
  const k = u.searchParams.get('key');
  return validFormat(k) ? normalizeKey(k) : null;
}

// Windows đưa link vào qua argv, lẫn giữa các tham số khác của Electron.
function keyFromArgv(argv) {
  if (!Array.isArray(argv)) return null;
  for (const a of argv) { const k = keyFromUrl(a); if (k) return k; }
  return null;
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

// ─── Lớp mạng ────────────────────────────────────────────────────────────────
// Tách ra một chỗ để test thay được, và để mọi lỗi mạng đi qua đúng một cửa.
let transport = (url, init) => fetch(url, init);
function setTransport(fn) {
  transport = typeof fn === 'function' ? fn : (url, init) => fetch(url, init);
}

// Tên máy, để chính bạn nhận ra nên gỡ máy nào khi hết ba lượt kích hoạt. Đây là
// thứ duy nhất rời khỏi máy ngoài chính mã bản quyền — không kèm dữ liệu tập trung,
// không kèm danh sách chặn, không kèm gì khác.
function instanceName() {
  try { return String(require('node:os').hostname() || 'máy tính').slice(0, 60); }
  catch { return 'máy tính'; }
}

// Trả về một trong ba dạng:
//   { answered:false }                  — không nối được, hoặc máy chủ lỗi. KHÔNG phải phán quyết.
//   { answered:true, http, data }       — máy chủ đã trả lời rõ ràng.
async function call(path, body) {
  let res;
  try {
    res = await transport(`${API}/${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body).toString(),
      signal: AbortSignal.timeout(TIMEOUT),
    });
  } catch { return { answered: false }; }
  // 5xx là máy chủ hỏng, không phải câu trả lời "mã của bạn sai". Phân biệt hai thứ
  // này là lý do người dùng không bị tụt bậc vì Lemon Squeezy sập một buổi chiều.
  if (res.status >= 500) return { answered: false };
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  if (!data || typeof data !== 'object') return { answered: false };
  return { answered: true, http: res.status, data };
}

// Mã có đúng là của sản phẩm này không. Thiếu bước này thì mã mua bất kỳ thứ gì
// trên Lemon Squeezy cũng mở khóa được app.
function ownedByUs(meta) {
  // Chưa điền mã sản phẩm: không kiểm được. Chỉ xảy ra khi SELLING còn tắt, lúc đó
  // ai cũng là 'pro' nên chẳng có gì để lách.
  if (!PRODUCT_ID) return true;
  if (Number(meta && meta.product_id) !== PRODUCT_ID) return false;
  return STORE_ID ? Number(meta && meta.store_id) === STORE_ID : true;
}

// Lemon Squeezy trả lỗi bằng tiếng Anh. Dịch những lỗi người dùng thật sự gặp,
// kèm cách xử lý — báo lỗi mà không nói phải làm gì thì bằng không.
function refusal(data) {
  const raw = String((data && data.error) || '').toLowerCase();
  if (raw.includes('activation limit'))
    return 'Mã này đã dùng hết lượt kích hoạt. Mỗi mã dùng được cho 3 máy. Nếu bạn đã cài lại Windows hoặc đổi máy, nhắn cho tác giả để gỡ bớt một máy cũ.';
  if (raw.includes('not found'))
    return 'Không tìm thấy mã này. Kiểm tra lại xem đã dán đủ cả mã chưa — mã có 5 khối, dạng XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX.';
  if (raw.includes('disabled'))
    return 'Mã này đã bị vô hiệu hóa. Nếu bạn cho rằng đây là nhầm lẫn, nhắn cho tác giả kèm email bạn đã dùng để mua.';
  if (raw.includes('expired'))
    return 'Mã này đã hết hạn.';
  return (data && data.error)
    ? `Máy chủ bản quyền từ chối mã này: ${data.error}`
    : 'Không kích hoạt được mã này.';
}

// Kích hoạt lần đầu. Người dùng chủ động bấm, nên ở đây báo lỗi thẳng là đúng —
// khác hẳn revalidate() phía dưới, nơi im lặng mới là đúng.
async function verify(key, now = Date.now()) {
  if (!validFormat(key))
    return { ok: false, error: 'Mã bản quyền sai định dạng. Mã có dạng XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX.' };
  const k = normalizeKey(key);
  const r = await call('activate', { license_key: k, instance_name: instanceName() });
  if (!r.answered)
    return { ok: false, error: 'Không nối được tới máy chủ bản quyền. Kiểm tra mạng rồi thử lại — mã của bạn vẫn còn nguyên.' };
  const d = r.data;
  if (!d.activated) return { ok: false, error: refusal(d) };
  if (!ownedByUs(d.meta))
    return { ok: false, error: 'Mã này thuộc về một sản phẩm khác, không mở khóa được The Brain Project.' };

  const lk = d.license_key || {};
  const dung = Number(lk.activation_usage), toi_da = Number(lk.activation_limit);
  const con = Number.isFinite(dung) && Number.isFinite(toi_da)
    ? ` Máy này là lượt ${dung} trên ${toi_da}.` : '';
  return {
    ok: true, wired: true,
    record: { key: k, instanceId: (d.instance && d.instance.id) || null, status: 'active', checkedAt: now },
    message: `Đã kích hoạt bản Pro.${con}`,
  };
}

// Tới hạn gọi lại máy chủ chưa.
function needsRecheck(r, now = Date.now()) {
  if (!r || !r.key || r.status !== 'active') return false;
  return now - (typeof r.checkedAt === 'number' ? r.checkedAt : 0) >= RECHECK_DAYS * DAY;
}

// Kiểm lại định kỳ. Quy tắc quan trọng nhất của hàm này: KHÔNG nối được thì không
// đụng gì vào bản ghi. Người trả tiền rồi mà mất mạng hai tuần vẫn phải là 'pro' —
// 30 ngày ân hạn lo phần đó. Chỉ hạ bậc khi máy chủ trả lời rõ ràng rằng mã hết
// hiệu lực (hoàn tiền, thu hồi, chargeback).
async function revalidate(now = Date.now()) {
  const r = record;
  if (!needsRecheck(r, now)) return { changed: false, reason: 'chưa tới hạn' };
  const body = r.instanceId ? { license_key: r.key, instance_id: r.instanceId } : { license_key: r.key };
  const res = await call('validate', body);
  if (!res.answered) return { changed: false, reason: 'không nối được' };
  const d = res.data;
  if (d.valid && ownedByUs(d.meta))
    return { changed: true, record: { ...r, status: 'active', checkedAt: now } };
  return { changed: true, reason: refusal(d), record: { ...r, status: 'revoked', checkedAt: now } };
}

// Trả lại lượt kích hoạt cho máy chủ khi người dùng gỡ mã khỏi máy này. Thiếu bước
// này thì gỡ mã ba lần là hết sạch ba lượt dù chỉ có một máy.
// Không bao giờ để lỗi mạng chặn việc gỡ: người dùng bảo gỡ thì phải gỡ được.
async function deactivate() {
  const r = record;
  if (!r || !r.key || !r.instanceId) return { freed: false };
  const res = await call('deactivate', { license_key: r.key, instance_id: r.instanceId });
  return { freed: !!(res.answered && res.data && res.data.deactivated) };
}

module.exports = {
  PLANS, DIFFERENCES, ALWAYS_FREE, SELLING, RECHECK_DAYS, GRACE_DAYS,
  STORE_ID, PRODUCT_ID, API, PROTOCOL,
  tier, limits, load, stored, activation,
  verify, revalidate, deactivate, needsRecheck, setTransport,
  normalizeKey, validFormat, maskKey, healthy, keyFromUrl, keyFromArgv,
};
