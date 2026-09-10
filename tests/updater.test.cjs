const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createUpdater } = require('../src/updater.cjs');

// autoUpdater giả: đủ để bơm sự kiện và đếm lời gọi, không đụng mạng.
function fakeAutoUpdater() {
  const em = new EventEmitter();
  em.calls = { check: 0, download: 0, install: 0 };
  em.checkForUpdates = () => { em.calls.check++; return Promise.resolve(); };
  em.downloadUpdate = () => { em.calls.download++; return Promise.resolve(); };
  em.quitAndInstall = () => { em.calls.install++; };
  return em;
}

function make({ packaged = true, canInstall = () => null } = {}) {
  const autoUpdater = fakeAutoUpdater();
  let changes = 0;
  const u = createUpdater({
    app: { isPackaged: packaged },
    autoUpdater,
    onChange: () => { changes++; },
    canInstall,
  });
  return { u, autoUpdater, changes: () => changes };
}

test('chạy từ mã nguồn thì không có gì để cập nhật, và nói thẳng', () => {
  const { u, autoUpdater } = make({ packaged: false });
  assert.equal(u.snapshot().supported, false);
  const r = u.install();
  assert.equal(r.ok, false);
  assert.match(r.error, /đã cài đặt/);
  u.check(); u.start();
  assert.equal(autoUpdater.calls.check, 0, 'chưa đóng gói thì không được gọi checkForUpdates');
});

test('không bao giờ tự tải và không bao giờ tự cài lúc thoát', () => {
  const { autoUpdater } = make();
  assert.equal(autoUpdater.autoDownload, false, 'gói hơn 100 MB, tải ngầm là thô lỗ');
  assert.equal(autoUpdater.autoInstallOnAppQuit, false, 'không cài lén khi người dùng thoát');
});

test('trạng thái đi đúng đường: có bản mới → tải → sẵn sàng', () => {
  const { u, autoUpdater } = make();
  assert.equal(u.snapshot().status, 'idle');

  autoUpdater.emit('checking-for-update');
  assert.equal(u.snapshot().status, 'checking');

  autoUpdater.emit('update-available', { version: '0.7.0' });
  assert.deepEqual(
    { status: u.snapshot().status, version: u.snapshot().version },
    { status: 'available', version: '0.7.0' });

  assert.equal(u.download().ok, true);
  assert.equal(autoUpdater.calls.download, 1);

  autoUpdater.emit('download-progress', { percent: 42.7 });
  assert.equal(u.snapshot().percent, 43, 'phần trăm phải làm tròn');

  autoUpdater.emit('update-downloaded', { version: '0.7.0' });
  assert.equal(u.snapshot().status, 'ready');
  assert.equal(u.snapshot().percent, 100);
});

test('không tải khi chưa có bản mới, không cài khi chưa tải xong', () => {
  const { u, autoUpdater } = make();
  let r = u.download();
  assert.equal(r.ok, false);
  assert.match(r.error, /Chưa có bản mới/);
  assert.equal(autoUpdater.calls.download, 0);

  autoUpdater.emit('update-available', { version: '0.7.0' });
  r = u.install();
  assert.equal(r.ok, false);
  assert.match(r.error, /chưa tải xong/);
  assert.equal(autoUpdater.calls.install, 0);
});

test('LUẬT: không cài giữa phiên tập trung', () => {
  const ly_do = 'Đang chạy phiên tập trung.';
  const { u, autoUpdater } = make({ canInstall: () => ly_do });
  autoUpdater.emit('update-downloaded', { version: '0.7.0' });
  assert.equal(u.snapshot().status, 'ready');

  const r = u.install();
  assert.equal(r.ok, false);
  assert.equal(r.error, ly_do);
  assert.equal(autoUpdater.calls.install, 0, 'đã gọi quitAndInstall giữa phiên — mất credit của người dùng');
});

test('LUẬT: không cài trong chế độ khóa', () => {
  const ly_do = 'Đang trong chế độ khóa.';
  const { u, autoUpdater } = make({ canInstall: () => ly_do });
  autoUpdater.emit('update-downloaded', { version: '0.7.0' });
  assert.equal(u.install().ok, false);
  assert.equal(autoUpdater.calls.install, 0);
});

test('hết lý do chặn thì cài được', async () => {
  let chan = 'Đang chạy phiên tập trung.';
  const { u, autoUpdater } = make({ canInstall: () => chan });
  autoUpdater.emit('update-downloaded', { version: '0.7.0' });
  assert.equal(u.install().ok, false);

  chan = null;
  assert.equal(u.install().ok, true);
  await new Promise(r => setImmediate(r));
  assert.equal(autoUpdater.calls.install, 1);
});

test('lỗi cập nhật được ghi lại chứ không ném ra ngoài', () => {
  const { u, autoUpdater } = make();
  assert.doesNotThrow(() => autoUpdater.emit('error', new Error('mạng hỏng')));
  assert.equal(u.snapshot().status, 'error');
  assert.match(u.snapshot().error, /mạng hỏng/);

  // Kiểm lại được sau khi lỗi, và lỗi cũ phải được xóa đi.
  u.check();
  autoUpdater.emit('checking-for-update');
  assert.equal(u.snapshot().error, null);
});

test('không có bản mới thì quay về idle và xóa số phiên bản cũ', () => {
  const { u, autoUpdater } = make();
  autoUpdater.emit('update-available', { version: '0.7.0' });
  autoUpdater.emit('update-not-available');
  assert.deepEqual(
    { status: u.snapshot().status, version: u.snapshot().version, percent: u.snapshot().percent },
    { status: 'idle', version: null, percent: 0 });
});

test('giao diện được báo mỗi lần trạng thái đổi', () => {
  const { autoUpdater, changes } = make();
  const truoc = changes();
  autoUpdater.emit('update-available', { version: '0.7.0' });
  autoUpdater.emit('download-progress', { percent: 10 });
  autoUpdater.emit('update-downloaded', { version: '0.7.0' });
  assert.equal(changes() - truoc, 3);
});

test('onChange ném lỗi cũng không làm hỏng bộ cập nhật', () => {
  const autoUpdater = fakeAutoUpdater();
  const u = createUpdater({
    app: { isPackaged: true }, autoUpdater,
    onChange: () => { throw new Error('cửa sổ đóng rồi'); },
    canInstall: () => null,
  });
  assert.doesNotThrow(() => autoUpdater.emit('update-available', { version: '0.7.0' }));
  assert.equal(u.snapshot().status, 'available');
});
