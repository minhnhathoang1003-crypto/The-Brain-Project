// Trình duyệt mà bộ chặn không với tới được.
//
// Lỗ thủng thật trong lời hứa cốt lõi: tiện ích chặn là tiện ích Chromium, nạp được vào
// Chrome và Edge nhưng không nạp được vào họ Gecko. Cài Firefox rồi mở YouTube ở đó là
// đi vòng qua toàn bộ danh sách chặn, trong ba mươi giây, và ứng dụng không hề nói gì.
//
// Không vá được bằng mã ở phía này — Firefox không cho cài tiện ích chưa ký của AMO một
// cách vĩnh viễn. Thứ làm được là nói thẳng ngay lúc nó xảy ra, và đưa ra lối đi tiếp.
const {_electron:electron}=require('playwright');
const {WebSocket}=require('ws');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');

const lênTiềnCảnh=(app,exe)=>app.evaluate(({BrowserWindow},exe)=>{
  global.__brainWatcher.current={exe,title:exe};
  global.__brainWatcher.emit('change',{exe,title:exe});
  return new Promise(r=>setTimeout(r,300));
},exe);

const mở=async tier=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'brain-uncovered-'));
  const port=String(47870+(tier==='pro'?0:1));
  const env={...process.env,BRAIN_TEST_DIR:dir,BRAIN_TEST_PORT:port,BRAIN_TIER:tier};
  delete env.ELECTRON_RUN_AS_NODE;
  const app=await electron.launch({args:[root],env});
  const page=await app.firstWindow();
  await page.locator('.gate').waitFor();
  await app.evaluate(()=>global.__brainWatcher.stop());
  const secret=await app.evaluate(({safeStorage},bytes)=>JSON.parse(safeStorage.decryptString(Buffer.from(bytes))).token,
    Array.from(fs.readFileSync(path.join(dir,'brain-data.enc'))));
  const ws=new WebSocket(`ws://127.0.0.1:${port}/bridge`,{origin:'chrome-extension://'+'a'.repeat(32)});
  await new Promise((res,rej)=>{ws.on('open',()=>ws.send(JSON.stringify({token:secret})));ws.once('message',res);ws.on('error',rej);});
  ws.on('message',()=>ws.send(JSON.stringify({applied:true})));ws.send(JSON.stringify({applied:true}));
  await page.locator('main.split').waitFor();
  return {app,page,ws};
};

(async()=>{
  // ── Bậc Pro: cảnh báo hiện đúng lúc, và chặn được ngay từ trong cảnh báo.
  {
    const {app,page,ws}=await mở('pro');
    try{
      assert.equal(await page.locator('.warn',{hasText:'không với tới được'}).count(),0,
        'chưa mở trình duyệt nào thì không được dọa suông');

      // Chrome là trình duyệt tiện ích chạy được — không có gì để cảnh báo.
      await lênTiềnCảnh(app,'chrome');
      assert.equal(await page.locator('.warn',{hasText:'không với tới được'}).count(),0,
        'Chrome nằm trong tầm với, không được cảnh báo');

      await lênTiềnCảnh(app,'firefox');
      const cảnh=page.locator('.warn',{hasText:'không với tới được'});
      await cảnh.waitFor();
      assert.match(await cảnh.innerText(),/Firefox đang mở/);
      assert.deepEqual(await page.evaluate(()=>window.brain.get().then(s=>s.system.uncovered)),
        {exe:'firefox',name:'Firefox'});
      console.log('Pro · mở Firefox   → cảnh báo hiện, đúng tên');

      // Lối đi tiếp: chặn thẳng trình duyệt đó như một ứng dụng.
      await page.getByRole('button',{name:'Chặn Firefox như một ứng dụng'}).click();
      await page.locator('#confirm-yes').click();
      await page.waitForFunction(()=>document.querySelectorAll('.warn').length===0
        ||![...document.querySelectorAll('.warn')].some(e=>/không với tới được/.test(e.textContent)));
      const s=await page.evaluate(()=>window.brain.get());
      const t=s.targets.find(x=>x.exe==='firefox');
      assert(t,'Firefox phải nằm trong danh sách chặn');
      assert.equal(t.name,'Firefox');
      assert.equal(s.system.uncovered,null,'đã chặn rồi thì cảnh báo phải tắt');
      console.log('Pro · bấm chặn     → vào danh sách, cảnh báo tự tắt');

      // Và từ lúc này nó bị chặn thật: lên tiền cảnh là có lớp phủ.
      await lênTiềnCảnh(app,'firefox');
      assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()
        .some(w=>w.isVisible()&&!w.isDestroyed()&&w.webContents.getURL().includes('overlay.html'))),true,
        'chặn rồi thì lớp phủ phải che Firefox');
      console.log('Pro · mở lại       → lớp phủ che thật');
    } finally { ws.close(); await app.close().catch(()=>{}); }
  }

  // ── Bậc Free: vẫn được cảnh báo. Biết mình đang bị hở quan trọng hơn việc bán hàng.
  {
    const {app,page,ws}=await mở('free');
    try{
      await lênTiềnCảnh(app,'librewolf');
      const cảnh=page.locator('.warn',{hasText:'không với tới được'});
      await cảnh.waitFor();
      assert.match(await cảnh.innerText(),/LibreWolf đang mở/);
      assert.equal(await page.getByRole('button',{name:/Chặn LibreWolf như một ứng dụng/}).count(),0,
        'bậc Free không chặn được ứng dụng, đừng hiện nút dẫn tới ngõ cụt');
      console.log('Free · mở LibreWolf → vẫn được cảnh báo, không có nút dẫn tới ngõ cụt');

      // Bỏ qua là tắt hẳn, không hiện lại mỗi lần chuyển cửa sổ.
      await page.getByRole('button',{name:'Bỏ qua'}).click();
      await page.waitForFunction(()=>![...document.querySelectorAll('.warn')]
        .some(e=>/không với tới được/.test(e.textContent)));
      await lênTiềnCảnh(app,'chrome');
      await lênTiềnCảnh(app,'librewolf');
      await page.waitForTimeout(400);
      assert.equal(await page.locator('.warn',{hasText:'LibreWolf đang mở'}).count(),0,
        'đã bảo bỏ qua thì đừng hỏi lại');
      console.log('Free · bấm bỏ qua   → im hẳn với trình duyệt đó');

      // Nhưng bỏ qua một trình duyệt không phải là bỏ qua mọi trình duyệt.
      await lênTiềnCảnh(app,'firefox');
      await page.locator('.warn',{hasText:'Firefox đang mở'}).waitFor();
      assert.equal((await page.evaluate(()=>window.brain.get().then(s=>s.system.uncovered)))?.exe,'firefox');
      console.log('Free · trình duyệt khác → vẫn báo');
    } finally { ws.close(); await app.close().catch(()=>{}); }
  }
  // ── Chạy cùng Windows: chạy từ mã nguồn thì KHÔNG được đụng vào mục khởi động.
  // process.execPath lúc đó là electron.exe trong node_modules; ghi nó vào registry là
  // để lại một mục rác trỏ vào Electron trần, còn nguyên cả sau khi xoá thư mục dự án.
  {
    const {app,page,ws}=await mở('pro');
    try{
      const s=await page.evaluate(()=>window.brain.get());
      assert.equal(s.system.packaged,false,'đang chạy từ mã nguồn');
      assert.equal(s.system.startup,false,'chưa bật thì phải là false');
      const r=await page.evaluate(()=>window.brain.system('startup',{on:true}).then(()=>'cho phép',e=>e.message));
      assert.match(r,/bản đã cài/,'chạy từ mã nguồn mà vẫn ghi được vào mục khởi động');
      assert.equal((await page.evaluate(()=>window.brain.get())).system.startup,false,
        'bị từ chối rồi mà trạng thái vẫn đổi');
      await page.locator('#open-setup').click();await page.locator('#setup').waitFor();
      await page.locator('[data-setup-tab="app"]').click();
      await page.getByText('Chạy cùng Windows').waitFor();
      assert.equal(await page.locator('[data-startup]').count(),0,
        'chạy từ mã nguồn thì đừng hiện nút bấm dẫn tới lỗi');
      await page.getByText('Chỉ ở bản đã cài').waitFor();
      console.log('Khởi động cùng Windows → chạy từ mã nguồn: từ chối, và nói rõ vì sao');
    } finally { ws.close(); await app.close().catch(()=>{}); }
  }

  console.log('PASS: ứng dụng nói thẳng khi một trình duyệt nằm ngoài tầm với của bộ chặn,');
  console.log('      và mục khởi động cùng Windows chỉ đụng tới được ở bản đã cài.');
})().catch(e=>{console.error(e);process.exit(1)});
