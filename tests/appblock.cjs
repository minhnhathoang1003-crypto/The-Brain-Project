// Chặn ứng dụng Windows, chạy trên ứng dụng Electron thật.
// Không mở game thật; thay vào đó bơm thẳng sự kiện "cửa sổ tiền cảnh đã đổi" vào tiến trình
// chính, đúng thứ mà bộ theo dõi PowerShell phát ra, rồi kiểm lớp phủ có hiện đúng lúc không.
const {_electron:electron}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'brain-appblock-'));
const env={...process.env,BRAIN_TEST_DIR:dir,BRAIN_TEST_PORT:'47852'};delete env.ELECTRON_RUN_AS_NODE;

const focus = (app,exe) => app.evaluate(({BrowserWindow},exe)=>{
  // Bộ theo dõi được giữ trong biến module; gọi lại đúng listener mà main.cjs đã đăng ký.
  global.__brainWatcher.current={exe,title:exe};
  global.__brainWatcher.emit('change',{exe,title:exe});
  return new Promise(r=>setTimeout(r,250));
},exe);
const overlayVisible = app => app.evaluate(({BrowserWindow})=>
  BrowserWindow.getAllWindows().some(w=>w.isVisible()&&!w.isDestroyed()&&w.webContents.getURL().includes('overlay.html')));

(async()=>{
  let app;
  try{
    app=await electron.launch({args:[root],env});
    const page=await app.firstWindow();await page.locator('.gate').waitFor();

    // Thêm một "game" vào danh sách chặn.
    const added=await page.evaluate(()=>window.brain.action('appAdd',{exe:'fakegame.exe',name:'Game Giả Lập'}));
    assert.equal(added.ok,true,added.error);
    assert.equal(added.state.targets.at(-1).id,'app:fakegame');
    assert.equal((await page.evaluate(()=>window.brain.get())).targets.length,5);

    assert.equal(await overlayVisible(app),false,'chưa có gì ở tiền cảnh thì chưa phủ');

    // Ứng dụng bị chặn lên tiền cảnh → lớp phủ hiện.
    await focus(app,'fakegame');
    assert.equal(await overlayVisible(app),true,'ứng dụng bị chặn lên trước thì phải phủ');

    // Chuyển sang ứng dụng không bị chặn → lớp phủ biến mất.
    await focus(app,'notepad');
    assert.equal(await overlayVisible(app),false,'ứng dụng không bị chặn thì không phủ');

    // Đổi credit cho ứng dụng: không cần tiện ích trình duyệt, vì việc này không liên quan trình duyệt.
    await focus(app,'fakegame');
    assert.equal(await overlayVisible(app),true);
    const paid=await page.evaluate(()=>window.brain.action('redeem',{id:'app:fakegame',minutes:5}));
    assert.equal(paid.ok,true,`đổi credit cho ứng dụng không được đòi tiện ích: ${paid.error}`);
    assert.equal(paid.state.credits,10,'trừ 5 trong 15 credit tặng ban đầu');
    await focus(app,'fakegame');
    assert.equal(await overlayVisible(app),false,'đã trả credit thì được vào');

    // Kết thúc sớm → chặn lại ngay.
    await page.evaluate(()=>window.brain.action('endGrant'));
    await focus(app,'fakegame');
    assert.equal(await overlayVisible(app),true,'hết lượt mở là chặn lại');

    // Chế độ khóa thắng cả credit: không đổi được nữa.
    await page.evaluate(()=>window.brain.action('lock',{minutes:30}));
    const blocked=await page.evaluate(()=>window.brain.action('redeem',{id:'app:fakegame',minutes:5}));
    assert.equal(blocked.ok,false);assert.match(blocked.error,/chế độ khóa/);
    await focus(app,'fakegame');
    assert.equal(await overlayVisible(app),true,'đang khóa thì vẫn phủ');

    // Tiện ích trình duyệt không bao giờ nhận mục ứng dụng.
    const wire=await app.evaluate(()=>global.__brainEngine.rules());
    assert.equal(wire.targets.length,4);
    assert(!wire.targets.some(t=>t.id.startsWith('app:')),'ứng dụng không lên dây tới trình duyệt');

    console.log('PASS: chặn ứng dụng Windows — lớp phủ hiện đúng lúc, biến mất khi đổi ứng dụng, đổi credit không cần tiện ích, hết lượt là chặn lại, chế độ khóa thắng credit, và ứng dụng không bao giờ gửi tới trình duyệt.');
  } finally { if(app)await app.close(); console.log('Thư mục dữ liệu thử nghiệm: '+dir); }
})().catch(e=>{console.error(e);process.exitCode=1;});
