// Câu hỏi: đóng rồi mở lại ứng dụng thì có phải ghép nối lại từ đầu không?
// Bài này chạy ứng dụng Electron thật + tiện ích thật trong trình duyệt thật, ghép nối một lần,
// khởi động lại ứng dụng, rồi đo xem tiện ích tự kết nối lại sau bao lâu mà KHÔNG đụng vào popup.
const {_electron:electron,chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),PORT=47851;
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'brain-restart-'));
const env={...process.env,BRAIN_TEST_DIR:dir,BRAIN_TEST_PORT:String(PORT),BRAIN_TIER:'pro'};delete env.ELECTRON_RUN_AS_NODE;
const launchApp=()=>electron.launch({args:[root],env});
const waitFor=async(fn,label,timeout=180000)=>{
  const t0=Date.now();
  while(Date.now()-t0<timeout){ if(await fn()) return Date.now()-t0; await new Promise(r=>setTimeout(r,250)); }
  throw new Error(`Quá hạn chờ: ${label}`);
};
(async()=>{
  let app,context;
  try{
    app=await launchApp();let page=await app.firstWindow();await page.locator('.gate').waitFor();
    const token=await app.evaluate(({safeStorage},bytes)=>JSON.parse(safeStorage.decryptString(Buffer.from(bytes))).token,
      Array.from(fs.readFileSync(path.join(dir,'brain-data.enc'))));

    // Tiện ích thật, chỉ đổi cổng cho khớp cổng thử nghiệm.
    const ext=fs.mkdtempSync(path.join(os.tmpdir(),'brain-restart-ext-'));
    fs.cpSync(path.join(root,'extension'),ext,{recursive:true});
    const bg=path.join(ext,'background.js');
    fs.writeFileSync(bg,fs.readFileSync(bg,'utf8').replace('127.0.0.1:47831','127.0.0.1:'+PORT));
    const launchBrowser=executablePath=>chromium.launchPersistentContext(
      fs.mkdtempSync(path.join(os.tmpdir(),'brain-restart-profile-')),
      {channel:'chromium',executablePath,headless:true,args:[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]});
    try{context=await launchBrowser(process.env.BRAIN_BROWSER||undefined);}
    catch(error){const edge='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
      if(process.env.BRAIN_BROWSER||!fs.existsSync(edge))throw error;
      console.log('Chromium kèm Playwright không chạy được; dùng Edge với profile tạm.');
      context=await launchBrowser(edge);}
    let [worker]=context.serviceWorkers();if(!worker)worker=await context.waitForEvent('serviceworker');
    const id=new URL(worker.url()).host;

    // Ghép nối một lần duy nhất trong cả bài.
    const popup=await context.newPage();await popup.goto(`chrome-extension://${id}/popup.html`);
    await popup.locator('#token').fill(token);await popup.locator('#pair').click();
    await popup.getByText(/Đã kết nối/).waitFor();
    await waitFor(()=>page.evaluate(()=>window.brain.get().then(s=>s.system.extensionConnected)),'ứng dụng nhận tiện ích lần đầu',30000);
    await page.evaluate(()=>window.brain.action('targetAdd',{domain:'example.com'}));
    const site=await context.newPage();
    await site.goto('https://example.com').catch(()=>{});
    await site.waitForURL(`chrome-extension://${id}/blocked.html?host=example.com`);
    console.log('Ghép nối xong: đang chặn example.com.');

    // Đóng ứng dụng. Tiện ích vẫn chạy, không ai đụng vào popup nữa.
    await app.close();app=null;
    await waitFor(()=>popup.evaluate(()=>chrome.storage.local.get('connected').then(v=>v.connected===false)),'tiện ích ghi nhận mất kết nối',30000);
    console.log('Đã đóng ứng dụng; tiện ích chuyển sang trạng thái mất kết nối.');

    // Mở lại ứng dụng — KHÔNG dán mã ghép nối lần nữa.
    app=await launchApp();page=await app.firstWindow();
    const restored=await page.evaluate(()=>window.brain.get());
    assert.equal(restored.paired,true,'không quay lại màn hình mở đầu');
    assert.equal(await page.locator('.gate').count(),0);
    const reconnectMs=await waitFor(()=>page.evaluate(()=>window.brain.get().then(s=>s.system.extensionConnected)),
      'tiện ích tự kết nối lại sau khi mở lại ứng dụng');
    console.log(`Tiện ích tự kết nối lại sau ${(reconnectMs/1000).toFixed(1)} s mà không cần ghép nối lại.`);

    // Sau khi kết nối lại: chặn vẫn chạy và đổi credit vẫn được.
    await site.goto('https://example.com').catch(()=>{});
    await site.waitForURL(`chrome-extension://${id}/blocked.html?host=example.com`,{timeout:20000});
    // Đổi credit phải chạy được: nếu ứng dụng còn coi cầu nối là mất kết nối thì lệnh này bị chặn.
    const redeem=await page.evaluate(()=>window.brain.action('redeem',{id:'example.com',minutes:1}));
    assert.equal(redeem.ok,true,`đổi credit sau khi mở lại: ${redeem.error}`);
    assert.equal(redeem.state.credits,14,'trừ đúng 1 credit từ 15 credit tặng ban đầu');
    console.log('PASS: mã ghép nối được giữ nguyên qua các lần khởi động lại; tiện ích tự kết nối lại và đổi credit chạy bình thường.');
    console.log(`Độ trễ kết nối lại đo được: ${(reconnectMs/1000).toFixed(1)} s.`);
  } finally {
    if(context)await context.close();
    if(app)await app.close();
    console.log('Thư mục dữ liệu thử nghiệm: '+dir);
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
