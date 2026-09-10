// Tự cập nhật qua GitHub Releases.
//
// Ba luật riêng của sản phẩm này, không có trong hành vi mặc định của electron-updater:
//
//  1. Không tải ngầm. Gói cài hơn 100 MB; tải về mà không hỏi là thô lỗ với người
//     dùng mạng tính theo dung lượng. Người dùng bấm thì mới tải.
//  2. Không cài trong lúc đang chạy phiên tập trung. Cài đặt phải đóng ứng dụng,
//     mà đóng ứng dụng giữa phiên là mất toàn bộ credit đang tích lũy.
//  3. Không cài trong lúc chế độ khóa còn hiệu lực. Chặn website do tiện ích giữ
//     nên vẫn sống khi ứng dụng tắt, nhưng CHẶN ỨNG DỤNG WINDOWS thì không —
//     nó cần ứng dụng đang chạy. Cài đặt giữa lúc khóa là mở một lỗ hổng thật.
//
// Và một luật chung với license: hỏng cập nhật không bao giờ làm app không mở được,
// cũng không bao giờ làm bộ chặn ngừng chặn. Mọi lỗi ở đây chỉ ghi lại rồi thôi.

const KIEM_TRA_SAU = 8000;        // chờ app ổn định rồi mới hỏi, đừng tranh khởi động
const KIEM_TRA_LAI_MOI = 6 * 3600 * 1000;  // 6 tiếng một lần cho phiên chạy dài

function createUpdater({ app, autoUpdater, onChange, canInstall }) {
  // trạng thái: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error'
  let state = { status: 'idle', version: null, percent: 0, error: null, supported: true };

  const publish = () => { try { onChange(); } catch { /* giao diện đóng rồi */ } };
  const set = next => { state = { ...state, ...next }; publish(); };

  // Chưa đóng gói thì autoUpdater ném lỗi vì không có app-update.yml. Đó là chuyện
  // bình thường lúc chạy `npm start`, không phải lỗi cần báo cho ai.
  if (!app.isPackaged) {
    state = { status: 'idle', version: null, percent: 0, error: null, supported: false };
    return { snapshot: () => ({ ...state }), check(){}, download(){}, install(){ return { ok:false, error:'Chỉ cập nhật được ở bản đã cài đặt.' }; }, start(){} };
  }

  autoUpdater.autoDownload = false;          // luật 1
  autoUpdater.autoInstallOnAppQuit = false;  // không cài lén lúc người dùng thoát
  autoUpdater.logger = null;

  autoUpdater.on('checking-for-update', () => set({ status: 'checking', error: null }));
  autoUpdater.on('update-not-available', () => set({ status: 'idle', version: null, percent: 0 }));
  autoUpdater.on('update-available', info => set({ status: 'available', version: info?.version || null, percent: 0 }));
  autoUpdater.on('download-progress', p => set({ status: 'downloading', percent: Math.round(p?.percent || 0) }));
  autoUpdater.on('update-downloaded', info => set({ status: 'ready', version: info?.version || state.version, percent: 100 }));
  autoUpdater.on('error', err => set({ status: 'error', error: String(err?.message || err) }));

  const check = () => { autoUpdater.checkForUpdates().catch(err => set({ status:'error', error:String(err?.message||err) })); };

  return {
    snapshot: () => ({ ...state }),
    check,
    start() {
      setTimeout(check, KIEM_TRA_SAU);
      setInterval(check, KIEM_TRA_LAI_MOI).unref?.();
    },
    download() {
      if (state.status !== 'available') return { ok:false, error:'Chưa có bản mới nào để tải.' };
      set({ status: 'downloading', percent: 0 });
      autoUpdater.downloadUpdate().catch(err => set({ status:'error', error:String(err?.message||err) }));
      return { ok:true };
    },
    install() {
      if (state.status !== 'ready') return { ok:false, error:'Bản mới chưa tải xong.' };
      // Luật 2 và 3 được quyết ở main.cjs, nơi nhìn thấy state của engine.
      const chan = canInstall();
      if (chan) return { ok:false, error: chan };
      setImmediate(() => autoUpdater.quitAndInstall(false, true));
      return { ok:true };
    },
  };
}

module.exports = { createUpdater, KIEM_TRA_SAU, KIEM_TRA_LAI_MOI };
