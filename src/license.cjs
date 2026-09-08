// Đường nối cho việc bán hàng sau này.
//
// Hôm nay app miễn phí và mọi người dùng đều ở bậc 'pro' — không ai bị giới hạn gì.
// Nhưng ranh giới Free/Pro được đóng đinh ở đây ngay từ bây giờ, để khi gắn cổng
// thanh toán vào thì chỉ phải thay thân hàm tier(), không phải sờ lại từng file.
//
// Khi gắn Lemon Squeezy / Paddle, tier() sẽ đọc kết quả kích hoạt đã lưu bằng safeStorage.
// Ba quy tắc phải giữ, vì đây là app kỷ luật chứ không phải app giải trí:
//   1. License hỏng không bao giờ làm mất credit người dùng đã kiếm.
//   2. License hỏng không bao giờ làm bộ chặn ngừng chặn — họ trả tiền để bị chặn.
//   3. License hỏng không bao giờ làm app không mở được; chỉ tụt xuống bậc 'free'.

const PLANS = {
  free: {
    maxTargets: 5,        // đủ cho YouTube, Facebook, TikTok, Instagram và một cái nữa
    historyDays: 7,
    customRatio: false,
    appBlocking: false,   // chặn ứng dụng & game Windows — chưa xây, xem docs/APP_BLOCKING.md
    lockedMode: false,    // khóa cứng không tự gỡ được
    sync: false,          // sao lưu và đồng bộ nhiều máy — chưa xây
  },
  pro: {
    maxTargets: 50,
    historyDays: 180,   // bằng đúng số ngày engine lưu trên đĩa
    customRatio: true,
    appBlocking: true,
    lockedMode: true,
    sync: true,
  },
};

// Đặt BRAIN_TIER=free để xem thử trải nghiệm bản Free trước khi thực sự bán.
function tier() {
  const forced = process.env.BRAIN_TIER;
  return Object.hasOwn(PLANS, forced || '') ? forced : 'pro';
}

const limits = () => PLANS[tier()];

module.exports = { PLANS, tier, limits };
