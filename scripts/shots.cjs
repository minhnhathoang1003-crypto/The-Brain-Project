// Chụp lại toàn bộ ảnh minh hoạ của trang giới thiệu, ở độ phân giải gấp đôi.
//
// Lý do: ảnh cũ rộng 1479px thật nhưng trang hiển thị chúng ở 916 CSS px, tức 1832 điểm
// ảnh trên màn 2×. Thiếu 24% nên mờ trên mọi máy retina. Chụp ở 2× rồi để scripts/webp.cjs
// cắt ra ba bậc, và srcset lo phần chọn.
//
// Chạy: node scripts/shots.cjs            chụp lại tất cả
//       node scripts/shots.cjs --only=main,focus   chụp lại vài ảnh
const {_electron:electron}=require('playwright');
const {WebSocket}=require('ws');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..');
const tam=fs.mkdtempSync(path.join(os.tmpdir(),'brain-shots-'));
const tho=path.join(tam,'tho');fs.mkdirSync(tho,{recursive:true});
const chon=(process.argv.find(a=>a.startsWith('--only='))||'').slice(7).split(',').filter(Boolean);
const can=t=>!chon.length||chon.includes(t);

// Không dùng --force-device-scale-factor: cờ đó làm cửa sổ co lại còn 949 CSS px nên
// bố cục đổi hẳn. Thay vào đó ép metric ngay trong renderer — trang vẫn dàn ở đúng bề
// rộng cũ (1479 CSS px) nhưng được raster ở gấp đôi, và không bị giới hạn bởi màn hình thật.
// Chụp thẳng bằng CDP chứ không qua page.screenshot: khi chụp fullPage, Playwright tự
// gọi setDeviceMetricsOverride lần nữa và xoá mất deviceScaleFactor của ta — đo được
// ảnh ra 2219px thay vì 2958px, đúng bằng 1,5× của màn hình máy này.
const RỘNG=1479, CAO=1025;
const chup=async(page,ten,opts={})=>{
  const w=opts.w||RỘNG;
  const cdp=await page.context().newCDPSession(page);
  const đặt=(width,height)=>cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:false});
  await đặt(w,opts.h||CAO);
  await page.waitForTimeout(300);
  // Nội dung cao hơn khung thì nới khung ra cho vừa, để không cắt mất phần dưới.
  const cao=Math.max(opts.h||CAO,await page.evaluate(()=>document.documentElement.scrollHeight));
  if(cao!==(opts.h||CAO)){ await đặt(w,cao); await page.waitForTimeout(250); }
  const {data}=await cdp.send('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync(path.join(tho,ten+'.png'),Buffer.from(data,'base64'));
  await cdp.send('Emulation.clearDeviceMetricsOverride');
  await cdp.detach();
  await page.waitForTimeout(200);
  console.log('  chụp',ten,`${w}×${cao} CSS → ${w*2}×${cao*2}`);
};

(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'brain-shots-data-'));
  const env={...process.env,BRAIN_TEST_DIR:dir,BRAIN_TEST_PORT:'47861',BRAIN_TIER:'pro'};
  delete env.ELECTRON_RUN_AS_NODE;
  const app=await electron.launch({args:[root],env});
  const page=await app.firstWindow();
  let ws;
  try{
    await page.locator('.gate').waitFor();
    if(can('gate')) await chup(page,'gate');

    // Ghép nối như tiện ích thật, để hiện màn hình chính.
    const secret=await app.evaluate(({safeStorage},bytes)=>JSON.parse(safeStorage.decryptString(Buffer.from(bytes))).token,
      Array.from(fs.readFileSync(path.join(dir,'brain-data.enc'))));
    ws=new WebSocket('ws://127.0.0.1:47861/bridge',{origin:'chrome-extension://'+'a'.repeat(32)});
    await new Promise((res,rej)=>{ws.on('open',()=>ws.send(JSON.stringify({token:secret})));ws.once('message',res);ws.on('error',rej);});
    ws.on('message',()=>ws.send(JSON.stringify({applied:true})));ws.send(JSON.stringify({applied:true}));
    await page.locator('main.split').waitFor();
    await page.waitForFunction(()=>document.querySelector('#status').textContent==='Đang chặn 4 website');
    if(can('main')) await chup(page,'main');

    if(can('focus')){
      await app.evaluate(({powerMonitor})=>{powerMonitor.getSystemIdleTime=()=>0;});
      await page.evaluate(()=>window.brain.action('start',{minutes:25}));
      await page.locator('.earning').waitFor();
      // Chờ hơn hai phút thật. Ảnh này phải cho thấy credit đã tích được một con số
      // nhìn ra là đang nhích lên, chứ 0,01 sau bốn giây thì chẳng nói lên điều gì.
      await page.waitForTimeout(126000);
      await chup(page,'focus');
      console.log('  focus đang hiện:',await page.evaluate(()=>
        [document.querySelector('#clock')?.textContent,document.querySelector('#earning')?.textContent].join(' / ')));
      await page.getByRole('button',{name:'Dừng phiên'}).click();
      await page.locator('#confirm-yes').click();
      await page.locator('main.split').waitFor();
    }

    if(can('settings')){
      await page.locator('#open-setup').click();await page.locator('#setup').waitFor();
      await page.locator('[data-setup-tab="blocker"]').click();
      await page.locator('.setup-panel').getByText('Bộ chặn website').waitFor();
      await chup(page,'settings');
      await page.locator('#setup-close').click();
    }

    if(can('dark')){
      await page.locator('#open-setup').click();await page.locator('#setup').waitFor();
      await page.locator('[data-setup-tab="look"]').click();
      await page.getByRole('button',{name:'Tối',exact:true}).click();
      await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
      await page.locator('[data-setup-tab="blocker"]').click();
      await page.locator('.setup-panel').getByText('Bộ chặn website').waitFor();
      await chup(page,'dark');
      await page.locator('[data-setup-tab="look"]').click();
      await page.getByRole('button',{name:'Sáng',exact:true}).click();
      await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
      await page.locator('#setup-close').click();
    }

    if(can('narrow')) await chup(page,'narrow',{w:780,h:960});

    if(can('overlay')){
      await app.evaluate(()=>global.__brainWatcher.stop());
      await page.evaluate(()=>window.brain.action('appAdd',{exe:'fakegame.exe',name:'Game Giả Lập'}));
      await app.evaluate(()=>{global.__brainWatcher.current={exe:'fakegame',title:'Game Giả Lập'};
        global.__brainWatcher.emit('change',{exe:'fakegame',title:'Game Giả Lập'});
        return new Promise(r=>setTimeout(r,500));});
      const overlay=app.windows().find(w=>w.url().includes('overlay.html'));
      if(!overlay) throw new Error('lớp phủ không hiện');
      await overlay.waitForTimeout(500);
      await chup(overlay,'overlay',{fullPage:false,w:1536,h:960});
      await app.evaluate(()=>{global.__brainWatcher.current={exe:'notepad',title:'notepad'};
        global.__brainWatcher.emit('change',{exe:'notepad',title:'notepad'});
        return new Promise(r=>setTimeout(r,400));});
      await page.evaluate(()=>window.brain.action('targetDelete',{id:'app:fakegame'}));
    }

    // Khóa đóng mọi lối thoát nên để cuối cùng.
    if(can('locked')){
      await page.locator('#open-setup').click();await page.locator('#setup').waitFor();
      await page.locator('[data-setup-tab="lock"]').click();
      await page.getByRole('button',{name:'30 phút',exact:true}).click();
      await page.locator('#confirm-yes').click();
      await page.waitForFunction(()=>document.querySelector('.locked-note')!==null);
      await page.locator('#setup-close').click();
      await page.waitForTimeout(300);
      await chup(page,'locked');
    }
  } finally {
    if(ws) try{ws.close()}catch(e){}
    await app.close().catch(()=>{});
  }

  // Trang chặn của tiện ích chạy trong trình duyệt, không phải trong Electron. Nó tự đọc
  // tên miền từ query string và tự lo phần "chưa kết nối được ứng dụng", nên mở thẳng
  // file là ra đúng trạng thái đang dùng trên trang giới thiệu.
  if(can('blocked')){
    const {chromium}=require('playwright');
    const EDGE=['C:','Program Files (x86)','Microsoft','Edge','Application','msedge.exe'].join(path.sep);
    let br; try{ br=await chromium.launch({channel:'chromium'}); }
    catch(e){ if(!fs.existsSync(EDGE)) throw e; br=await chromium.launch({executablePath:EDGE}); }
    const ctx=await br.newContext({viewport:{width:1280,height:720},deviceScaleFactor:2});
    const p2=await ctx.newPage();
    const url='file:///'+path.join(root,'extension','blocked.html').split(path.sep).join('/').replace(/ /g,'%20')+'?host=youtube.com';
    await p2.goto(url);
    await p2.getByRole('heading',{name:/Một khoảng dừng/}).waitFor();
    await p2.evaluate(()=>document.fonts.ready);
    await p2.waitForTimeout(400);
    await p2.screenshot({path:path.join(tho,'blocked.png')});
    console.log('  chụp blocked 1280×720 CSS → 2560×1440');
    await br.close();
  }

  console.log('PNG thô:',tho);
  fs.writeFileSync(path.join(root,'test-results','shots-tho.txt'),tho);
})().catch(e=>{console.error(e);process.exit(1)});
