// Vỏ ứng dụng theo hướng Windows: thanh tiêu đề gộp, phím tắt, menu chuột phải,
// vòng focus, và bố cục co giãn theo bề rộng cửa sổ.
//
// Bài này kiểm những thứ mà ảnh chụp không nói được: cửa sổ có kéo được bằng thanh
// tiêu đề không, Tab có thấy con trỏ không, bấm chuột phải có ra menu của Windows không.
const {_electron:electron}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');

async function mo(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'brain-shell-'));
  const env={...process.env,BRAIN_TEST_DIR:dir,BRAIN_TEST_PORT:'47907',BRAIN_TIER:'pro'};
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
  return {app,page,dir};
}
const coCua=(app,w,h)=>app.evaluate(({BrowserWindow},b)=>{
  BrowserWindow.getAllWindows().find(x=>x.webContents.getURL().includes('index.html')).setBounds(b);
},{width:w,height:h});

(async()=>{
  const {app,page,dir}=await mo();
  try{
    // §1 Một thanh tiêu đề, không phải hai. Cửa sổ phải khai titleBarStyle 'hidden'
    // thì Windows mới nhường chỗ cho thanh của ứng dụng.
    const kieu=await app.evaluate(({BrowserWindow})=>{
      const w=BrowserWindow.getAllWindows().find(x=>x.webContents.getURL().includes('index.html'));
      return {khung:w.isMenuBarVisible?w.isMenuBarVisible():null,tieuDe:w.getTitle()};
    });
    assert.equal(kieu.tieuDe,'The Brain Project');
    const bar=await page.locator('.bar').evaluate(e=>({
      keo:getComputedStyle(e).webkitAppRegion,
      cao:parseInt(getComputedStyle(e).height),
      chuaPhai:parseInt(getComputedStyle(e).paddingRight),
    }));
    assert.equal(bar.keo,'drag','thanh tiêu đề phải kéo được cửa sổ');
    assert.ok(bar.chuaPhai>100,`phải chừa chỗ cho ba nút của Windows, đang chừa ${bar.chuaPhai}px`);
    console.log('§1 thanh tiêu đề   ',bar.cao+'px, kéo được, chừa '+bar.chuaPhai+'px cho nút cửa sổ');

    // §2 Nút bên trong thanh phải BẤM được, không bị vùng kéo nuốt mất.
    const nut=await page.locator('#open-setup').evaluate(e=>getComputedStyle(e).webkitAppRegion);
    assert.equal(nut,'no-drag','nút trong thanh tiêu đề mà để vùng kéo thì bấm sẽ thành kéo cửa sổ');
    console.log('§2 nút trong thanh  bấm được (no-drag)');

    // §3 Phím tắt. Ctrl+, mở Cài đặt; Escape đóng.
    await page.keyboard.press('Control+Comma');
    await page.locator('#setup[open]').waitFor();
    await page.keyboard.press('Escape');
    await page.locator('#setup[open]').waitFor({state:'detached'});
    // Ctrl+Shift+T mở Thống kê.
    await page.keyboard.press('Control+Shift+T');
    await page.locator('#stats[open]').waitFor();
    assert.equal(await page.locator('[data-stats-range="7"].on').count(),1,'mở bằng phím tắt vẫn phải bắt đầu ở 7 ngày');
    await page.keyboard.press('Escape');
    await page.locator('#stats[open]').waitFor({state:'detached'});
    console.log('§3 phím tắt         Ctrl+, và Ctrl+Shift+T, Escape đóng');

    // §4 Phím tắt phải được GHI RA, không giấu. Tối giản không có nghĩa là bí mật.
    assert.match(await page.locator('#open-setup').getAttribute('title'),/Ctrl\+,/);
    assert.match(await page.locator('#open-stats').getAttribute('title'),/Ctrl\+Shift\+T/);
    console.log('§4 phím tắt ghi ra  trong tooltip của chính nút đó');

    // §5 Vòng focus. Trước 0.8.0 cả file CSS chỉ có ĐÚNG MỘT quy tắc :focus-visible.
    await page.locator('#open-setup').focus();
    const vong=await page.evaluate(()=>{
      const e=document.activeElement, st=getComputedStyle(e);
      return {tag:e.id||e.tagName, w:st.outlineWidth, style:st.outlineStyle};
    });
    assert.equal(vong.tag,'open-setup');
    assert.notEqual(vong.style,'none','đi bằng bàn phím phải thấy con trỏ đang ở đâu');
    assert.ok(parseFloat(vong.w)>=2,`vòng focus phải đủ dày, đang là ${vong.w}`);
    console.log('§5 vòng focus       ',vong.w+' '+vong.style);

    // §6 Menu chuột phải trên mục bị chặn. Không mở được menu thật trong test (nó là
    // cửa sổ của hệ điều hành), nên kiểm hai thứ: dòng có mang id, và lệnh chạy được.
    const dong=page.locator('.row[data-target-id]').first();
    await dong.waitFor();
    const id=await dong.getAttribute('data-target-id');
    assert.ok(id,'mỗi dòng phải mang id để menu biết nhắm mục nào');
    assert.equal(await page.evaluate(()=>typeof window.brain.contextMenu),'function',
      'renderer phải gọi được menu của tiến trình chính');
    console.log('§6 menu chuột phải  dòng mang id, cầu nối có sẵn:',id);

    // §7 Bề rộng nội dung có trần. Màn hình siêu rộng mà để chữ kéo hết cỡ thì mỏi mắt.
    await coCua(app,1920,900);
    await page.waitForTimeout(400);
    const rong=await page.locator('main.split').evaluate(e=>({
      thuc:e.getBoundingClientRect().width, tran:getComputedStyle(e).maxWidth}));
    assert.notEqual(rong.tran,'none','phải có trần bề rộng nội dung');
    assert.ok(rong.thuc<=parseInt(rong.tran)+1,`nội dung tràn quá trần: ${rong.thuc} > ${rong.tran}`);
    console.log('§7 trần bề rộng     ',Math.round(rong.thuc)+'px trong cửa sổ 1920px (trần '+rong.tran+')');

    // §8 Cửa sổ hẹp: một cột, và nhãn dài nhường chỗ nhưng KHÔNG mất nội dung.
    await coCua(app,560,760);
    await page.waitForTimeout(500);
    const cot=await page.locator('main.split').evaluate(e=>getComputedStyle(e).gridTemplateColumns);
    assert.equal(cot.split(' ').length,1,'cửa sổ hẹp phải co về một cột');
    const tt=await page.locator('#status').evaluate(e=>({
      co:parseFloat(getComputedStyle(e).fontSize), title:e.title}));
    assert.equal(tt.co,0,'nhãn dài phải nhường chỗ ở cửa sổ hẹp');
    assert.ok(tt.title&&tt.title.length>10,'nhưng nội dung phải còn trong tooltip, không được biến mất');
    console.log('§8 cửa sổ hẹp       một cột, nhãn thu về chấm, nội dung giữ trong tooltip');

    // §9 Bán kính bo góc đã gom về một thang, không còn mười hai giá trị rời rạc.
    const css=fs.readFileSync(path.join(root,'src/ui/style.css'),'utf8');
    const thoi=[...css.matchAll(/border-radius:\s*(\d+)px/g)].map(m=>m[1]);
    const conLai=[...new Set(thoi.filter(v=>v!=='50'))];
    assert.deepEqual(conLai,[],`còn bán kính viết thẳng bằng số: ${conLai.join(', ')}px — dùng var(--r1..r4) hoặc var(--pill)`);
    console.log('§9 bán kính         đều đi qua token');

    console.log('PASS: vỏ ứng dụng theo hướng Windows — một thanh tiêu đề kéo được, phím tắt có ghi ra, focus thấy được, nội dung có trần.');
  }finally{
    await app.close();
    fs.rmSync(dir,{recursive:true,force:true});
  }
})().catch(e=>{console.error('LỖI:',e.message);process.exitCode=1;});
