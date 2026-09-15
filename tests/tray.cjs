// Thu nhỏ xuống khay, và câu hỏi một lần lúc đóng.
//
// Không bấm được vào icon khay thật trong test (nó là vùng của hệ điều hành), nên bài
// này kiểm phần quyết định: cửa sổ ẩn hay đóng, lựa chọn có được nhớ không, và phiên
// tập trung có sống sót qua việc thu nhỏ không.
//
// Hộp thoại hệ thống bị chặn sẵn bằng cách trả lời thay — y như tests/flows.cjs làm.
const {_electron:electron}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');

async function mo(dir){
  const env={...process.env,BRAIN_TEST_DIR:dir,BRAIN_TEST_PORT:'47911',BRAIN_TIER:'pro'};
  delete env.ELECTRON_RUN_AS_NODE;
  const app=await electron.launch({args:[root],env});
  const page=await app.firstWindow();page.setDefaultTimeout(8000);
  await page.waitForFunction(()=>!!document.querySelector('.gate,main.split'));
  await app.evaluate(({ipcMain})=>{
    global.__brainWatcher.stop();
    global.__brainEngine.s.paired=true;global.__brainEngine.commit();
    ipcMain.removeHandler('listApps');ipcMain.handle('listApps',()=>[]);
  });
  await page.locator('main.split').waitFor();
  return {app,page};
}
// Trả lời thay cho mọi hộp thoại hệ thống, và ghi lại câu hỏi để kiểm.
// showMessageBoxSync có HAI dạng gọi: (options) và (window, options). main.cjs dùng
// dạng hai tham số, nên nhận đúng một tham số là ghi nhầm tiêu đề cửa sổ làm câu hỏi.
const traLoi=(app,nut)=>app.evaluate(({dialog},i)=>{
  global.__hoi=global.__hoi||[];
  dialog.showMessageBoxSync=(a,b)=>{
    const o=b||a||{};
    global.__hoi.push(String(o.message||o.title||''));
    return i;
  };
},nut);
const daHoi=app=>app.evaluate(()=>global.__hoi||[]);
const trangThai=app=>app.evaluate(({BrowserWindow})=>{
  const w=BrowserWindow.getAllWindows().find(x=>x.webContents.getURL().includes('index.html'));
  return {con:!!w&&!w.isDestroyed(), hien:!!w&&w.isVisible(), chon:global.__brainEngine.s.closeAction||null,
    phien:!!global.__brainEngine.s.session};
});
const dongCuaSo=app=>app.evaluate(({BrowserWindow})=>{
  BrowserWindow.getAllWindows().find(x=>x.webContents.getURL().includes('index.html')).close();
});

(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'brain-tray-'));
  let app,page;
  try{
    // ── §1 Lần đóng đầu tiên: HỎI, và nhớ câu trả lời ──────────────────────
    ({app,page}=await mo(dir));
    let t=await trangThai(app);
    assert.equal(t.chon,null,'chưa hỏi bao giờ thì chưa có lựa chọn nào được lưu');

    await traLoi(app,0);                        // chọn "Thu nhỏ xuống khay"
    await dongCuaSo(app);
    await page.waitForTimeout(800);
    const hoi=await daHoi(app);
    assert.equal(hoi.length,1,`phải hỏi đúng một lần, đã hỏi ${hoi.length}`);
    assert.match(hoi[0],/thu nhỏ xuống khay hay thoát hẳn/i);
    t=await trangThai(app);
    assert.equal(t.con,true,'chọn thu nhỏ thì cửa sổ không được huỷ');
    assert.equal(t.hien,false,'cửa sổ phải ẩn đi');
    assert.equal(t.chon,'tray','phải nhớ lựa chọn');
    console.log('§1 lần đóng đầu     hỏi một lần, ẩn cửa sổ, nhớ lựa chọn');

    // ── §2 Những lần sau KHÔNG hỏi lại ─────────────────────────────────────
    await app.evaluate(({BrowserWindow})=>{
      const w=BrowserWindow.getAllWindows().find(x=>x.webContents.getURL().includes('index.html'));
      w.show();
    });
    await page.waitForTimeout(300);
    await dongCuaSo(app);
    await page.waitForTimeout(800);
    assert.equal((await daHoi(app)).length,1,'đã trả lời rồi thì đừng hỏi lại mỗi lần đóng');
    assert.equal((await trangThai(app)).hien,false);
    console.log('§2 lần đóng sau     không hỏi lại, ẩn thẳng');

    // ── §3 Phiên tập trung SỐNG SÓT qua việc thu nhỏ ───────────────────────
    // Đây là điểm cốt lõi: thu nhỏ không phải là đóng, nên không được huỷ phiên,
    // và cũng KHÔNG được hỏi "đóng sẽ huỷ phiên" — chẳng có gì bị huỷ cả.
    await app.evaluate(({BrowserWindow})=>{
      BrowserWindow.getAllWindows().find(x=>x.webContents.getURL().includes('index.html')).show();
    });
    await page.waitForTimeout(300);
    await page.getByRole('button',{name:/Bắt đầu tập trung/}).click();
    await page.locator('#timer').waitFor();
    const truoc=(await daHoi(app)).length;
    await dongCuaSo(app);
    await page.waitForTimeout(800);
    t=await trangThai(app);
    assert.equal((await daHoi(app)).length,truoc,'thu nhỏ thì không được hỏi gì cả');
    assert.equal(t.phien,true,'thu nhỏ KHÔNG được huỷ phiên tập trung');
    assert.equal(t.hien,false);
    console.log('§3 đang tập trung   thu nhỏ không hỏi, phiên vẫn chạy');
    await app.close();app=null;

    // ── §4 Lựa chọn còn nguyên sau khi mở lại ứng dụng ─────────────────────
    ({app,page}=await mo(dir));
    assert.equal((await trangThai(app)).chon,'tray','lựa chọn phải nằm trong dữ liệu, không phải trong bộ nhớ');
    // Và đổi lại được trong Cài đặt.
    await page.locator('#open-setup').click();
    await page.locator('[data-setup-tab="app"]').click();
    await page.locator('[data-close-action="quit"]').click();
    await page.waitForTimeout(400);
    assert.equal((await trangThai(app)).chon,'quit','đổi trong Cài đặt phải có tác dụng');
    await page.locator('#setup-close').click();
    console.log('§4 nhớ qua khởi động lại, đổi lại được trong Cài đặt');

    // ── §5 Chọn "Thoát hẳn" thì bấm X là thoát thật ────────────────────────
    const thoat=new Promise(r=>app.process().once('exit',r));
    await dongCuaSo(app);
    await Promise.race([thoat,new Promise((_,r)=>setTimeout(()=>r(new Error('ứng dụng không thoát sau khi chọn Thoát hẳn')),8000))]);
    console.log('§5 chọn thoát hẳn   bấm X là thoát thật');
    app=null;

    console.log('PASS: thu nhỏ xuống khay giữ được phiên và bộ chặn; câu hỏi chỉ hỏi một lần rồi nhớ.');
  }finally{
    if(app)await app.close();
    fs.rmSync(dir,{recursive:true,force:true});
  }
})().catch(e=>{console.error('LỖI:',e.message);process.exitCode=1;});
