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

// Đặt BRAIN_TIER=free để xem thử trải nghiệm bản Free trước khi thực sự bán.
function tier() {
  const forced = process.env.BRAIN_TIER;
  return Object.hasOwn(PLANS, forced || '') ? forced : 'pro';
}

const limits = () => PLANS[tier()];

module.exports = { PLANS, tier, limits };
