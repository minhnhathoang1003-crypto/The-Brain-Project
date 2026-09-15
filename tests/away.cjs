// Hai thứ mới của 0.8.0, chạy trên ứng dụng thật:
//   1. Vắng mặt thì CẢNH BÁO trước, chỉ huỷ khi hết ân hạn.
//   2. Phiên ngoài máy — tính giờ bằng thời gian màn hình bị khoá.
//
// Không giả lập được Win+L ở đây, nên bài này bơm thẳng sự kiện 'lock-screen' của
// powerMonitor qua tiến trình chính — đúng con đường mà Windows thật sẽ đi qua.
// Ngưỡng vắng mặt thì hạ xuống 120 giây (giá trị nhỏ nhất ứng dụng cho phép) và ép
// giá trị idle của hệ điều hành, vì không chờ được 5 phút thật trong một bài test.
const {_electron:electron}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const assert=require('node:assert/strict');

const root=path.resolve(__dirname,'..');

async function mo(dir){
  const env={...process.env,BRAIN_TEST_DIR:dir,BRAIN_TEST_PORT:'47899',BRAIN_TIER:'pro'};
  delete env.ELECTRON_RUN_AS_NODE;
  const app=await electron.launch({args:[root],env});
  const page=await app.firstWindow();page.setDefaultTimeout(8000);
  await page.waitForFunction(()=>!!document.querySelector('.gate,main.split,#timer'));
  await app.evaluate(({ipcMain})=>{
    global.__brainWatcher.stop();
    global.__brainEngine.s.paired=true;global.__brainEngine.commit();
    ipcMain.removeHandler('listApps');ipcMain.handle('listApps',()=>[]);
  });
  await page.locator('main.split').waitFor();
  return {app,page};
}
// Ép giá trị "máy không hoạt động bao lâu" mà tiến trình chính đọc từ Windows.
const epIdle=(app,giay)=>app.evaluate(({powerMonitor},n)=>{
  if(!powerMonitor.__that)powerMonitor.__that=powerMonitor.getSystemIdleTime.bind(powerMonitor);
  powerMonitor.getSystemIdleTime=()=>n;
},giay);
const traIdle=app=>app.evaluate(({powerMonitor})=>{
  if(powerMonitor.__that)powerMonitor.getSystemIdleTime=powerMonitor.__that;
});
const banSuKien=(app,ten)=>app.evaluate(({powerMonitor},t)=>powerMonitor.emit(t),ten);
const doc=page=>page.evaluate(()=>window.brain.get());

// Đọc trạng thái THẲNG từ engine ở tiến trình chính, và đợi tới khi điều kiện thành
// thật rồi trả về ĐÚNG ảnh chụp đã thoả điều kiện đó.
//
// Vì sao không dùng waitForFunction rồi đọc lại: giữa lúc điều kiện thành thật và lúc
// đọc lại có một khoảng trống, và trong khoảng đó trạng thái đổi tiếp. Đó là chỗ bài
// này từng nhấp nháy — thêm một dòng log vào là nó xanh, bỏ ra là nó đỏ.
async function doiChinh(app,dieu,han=10000){
  const het=Date.now()+han;let cuoi=null;
  while(Date.now()<het){
    cuoi=await app.evaluate(()=>JSON.parse(JSON.stringify({
      session:global.__brainEngine.s.session,
      lastSession:global.__brainEngine.s.lastSession,
      credits:global.__brainEngine.s.credits,
    })));
    if(dieu(cuoi))return cuoi;
    await new Promise(r=>setTimeout(r,120));
  }
  throw new Error('Quá hạn chờ. Trạng thái cuối: '+JSON.stringify(cuoi));
}

(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'brain-away-'));
  let app,page;
  try{
    ({app,page}=await mo(dir));

    // ── §1 Cảnh báo vắng mặt ───────────────────────────────────────────────
    await page.evaluate(()=>window.brain.action('settings',{idleSeconds:120}));
    await page.getByRole('button',{name:/Bắt đầu tập trung/}).click();
    await page.locator('#timer').waitFor();
    assert.equal((await doc(page)).session.mode,'onscreen','mặc định phải là phiên trên máy');

    await epIdle(app,130);                       // vượt ngưỡng
    await page.getByText(/Bạn còn ở đó không/).waitFor();
    let s=(await doc(page)).session;
    assert.ok(s,'chạm ngưỡng KHÔNG được huỷ ngay');
    assert.ok(s.warnUntil,'phải đặt hạn chót để đếm ngược');
    assert.equal(await page.locator('#idle-left').count(),1,'phải có đồng hồ đếm ngược');
    console.log('§1 cảnh báo         hiện ra, phiên vẫn sống');

    // ── §2 Chạm phím trở lại là cảnh báo tự tắt ────────────────────────────
    await epIdle(app,0);
    // Đợi giao diện vẽ lại, đừng khẳng định ngay: trạng thái ở tiến trình chính đổi
    // trước, renderer nhận qua broadcast sau một nhịp.
    await page.locator('#idle-left').waitFor({state:'detached'});
    assert.ok((await doc(page)).session,'có thao tác trở lại thì không bao giờ bị huỷ');
    console.log('§2 quay lại máy     cảnh báo tự tắt, không cần bấm nút nào');

    // ── §3 Vắng mặt suốt ân hạn thì mới huỷ ────────────────────────────────
    await epIdle(app,130);
    await page.getByText(/Bạn còn ở đó không/).waitFor();
    // Kéo hạn chót về quá khứ thay vì chờ thật 60 giây.
    await app.evaluate(()=>{global.__brainEngine.s.session.warnUntil=Date.now()-1;});
    s=await doiChinh(app,x=>!x.session);
    assert.match(s.lastSession.reason,/không hoạt động/);
    assert.equal(s.credits,15,'phiên dở không cộng credit, cũng không trừ');
    console.log('§3 hết ân hạn       mới huỷ, và nói rõ lý do');
    await traIdle(app);

    // ── §4 Phiên ngoài máy: chưa khoá thì chưa tính giờ ────────────────────
    await page.locator('[data-mode="away"]').click();
    await page.getByText(/màn hình bị khoá/).waitFor();
    await page.getByRole('button',{name:/Bắt đầu tập trung/}).click();
    await page.getByText(/Nhấn Win\+L/).waitFor();
    s=(await doc(page)).session;
    assert.equal(s.mode,'away');
    assert.equal(s.lockedAt,null,'chưa khoá thì chưa có đồng hồ');
    assert.ok(s.armedUntil>Date.now(),'phải có hạn chót để khoá');
    console.log('§4 chờ khoá máy     nói rõ việc cần làm, chưa tính giờ');

    // ── §5 Khoá màn hình là đồng hồ chạy ───────────────────────────────────
    await banSuKien(app,'lock-screen');
    await doiChinh(app,x=>x.session&&x.session.lockedAt);
    console.log('§5 đã khoá          đồng hồ bắt đầu chạy');

    // ── §6 Máy ngủ trong lúc khoá KHÔNG huỷ phiên ──────────────────────────
    // Đây là điểm khác cốt lõi với phiên trên máy: ngủ là bằng chứng mạnh hơn cho
    // việc không ai đụng vào máy, không phải vi phạm.
    await banSuKien(app,'suspend');
    await page.waitForTimeout(1500);
    assert.ok((await doiChinh(app,()=>true)).session,'phiên ngoài máy không được huỷ vì máy ngủ');
    console.log('§6 máy ngủ          phiên vẫn sống');

    // ── §7 Vắng mặt không đụng được tới phiên ngoài máy ────────────────────
    await epIdle(app,9999);
    await page.waitForTimeout(1500);
    const ng=(await doiChinh(app,()=>true)).session;
    assert.ok(ng,'vắng mặt là chuyện đương nhiên của phiên ngoài máy');
    assert.ok(!ng.warnUntil,'không được cảnh báo vắng mặt ở phiên ngoài máy');
    await traIdle(app);
    console.log('§7 vắng mặt         không áp dụng cho phiên ngoài máy');

    // ── §8 Mở khoá sớm là mất sạch ─────────────────────────────────────────
    await banSuKien(app,'unlock-screen');
    s=await doiChinh(app,x=>!x.session);
    assert.match(s.lastSession.reason,/Mở khoá máy trước khi hết giờ/);
    assert.equal(s.credits,15,'mở khoá sớm không được cộng gì');
    console.log('§8 mở khoá sớm      mất sạch, nói rõ lý do');

    // ── §9 Đủ giờ thì cộng credit, kể cả khi màn hình còn khoá ─────────────
    await page.locator('[data-mode="away"]').click();
    await page.getByRole('button',{name:/Bắt đầu tập trung/}).click();
    await page.getByText(/Nhấn Win\+L/).waitFor();
    await banSuKien(app,'lock-screen');
    const daKhoa=await doiChinh(app,x=>x.session&&x.session.lockedAt);
    // Kéo mốc khoá về quá khứ thay vì chờ thật 25 phút.
    const phut=daKhoa.session.durationMs/60000;
    // Tham số ĐẦU TIÊN của app.evaluate là module Electron, tham số mình truyền vào
    // là tham số THỨ HAI. Quên chỗ này thì phép tính ra NaN và lockedAt thành rỗng —
    // phiên bị huỷ với lý do "chưa khoá màn hình", nhìn như lỗi của sản phẩm.
    await app.evaluate((_,p)=>{global.__brainEngine.s.session.lockedAt=Date.now()-p*60000-1000;},phut);
    s=await doiChinh(app,x=>!x.session);
    assert.equal(s.lastSession.status,'completed','ly do: '+JSON.stringify(s.lastSession));
    assert.equal(s.credits,15+phut/5,`đủ giờ phải cộng đúng ${phut/5} credit theo tỉ lệ cố định`);
    console.log('§9 đủ giờ           cộng '+(phut/5)+' credit, đúng tỉ lệ 5:1');

    console.log('PASS: vắng mặt được cảnh báo trước khi huỷ, và phiên ngoài máy chỉ tính khi màn hình thật sự bị khoá.');
  }finally{
    if(app)await app.close();
    fs.rmSync(dir,{recursive:true,force:true});
  }
})().catch(e=>{console.error('LỖI:',e.message);process.exitCode=1;});
