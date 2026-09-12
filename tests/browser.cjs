const {chromium}=require('playwright');const {WebSocketServer}=require('ws');const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const assert=require('node:assert/strict');
(async()=>{
  const ext=fs.mkdtempSync(path.join(os.tmpdir(),'brain-extension-test-')),token='a'.repeat(64);let current={targets:[{id:'example',domain:'example.com'}],grants:[],now:Date.now()};let ack=false;
  const server=new WebSocketServer({host:'127.0.0.1',port:0});await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
  fs.cpSync(path.resolve(__dirname,'../extension'),ext,{recursive:true});const script=path.join(ext,'background.js');fs.writeFileSync(script,fs.readFileSync(script,'utf8').replace('127.0.0.1:47831','127.0.0.1:'+server.address().port));
  const push=()=>{for(const ws of server.clients)if(ws.authed&&ws.readyState===1)ws.send(JSON.stringify(current));};
  server.on('connection',ws=>{ws.on('message',data=>{const m=JSON.parse(data);if(!ws.authed){if(m.token!==token){ws.close();return;}ws.authed=true;push();}else if(m.applied)ack=true;});});
  const timer=setInterval(push,1000);let context;
  // Đợi tab về đúng địa chỉ bằng cách DÒ, không dùng page.waitForURL.
  //
  // Lúc lượt mở hết hạn, tiện ích gọi chrome.tabs.update để kéo tab về trang chặn.
  // waitForURL đang theo dõi một điều hướng và bị chính điều hướng đó cắt ngang, nên
  // nó ném lỗi ngay khi việc cần kiểm TRA VỪA XẢY RA — đo được: cuộc chờ kết thúc ở
  // 5108ms trong khi lượt mở hết hạn ở 5000ms, chứ không phải chờ hết 12 giây.
  // Đó là chỗ bài này nhấp nháy khoảng một nửa số lần chạy.
  const doiUrl=async(page,url,han=15000)=>{
    const het=Date.now()+han;
    while(Date.now()<het){
      if(page.url()===url)return true;
      await page.waitForTimeout(100);
    }
    throw new Error(`tab không về ${url} sau ${han}ms; đang ở ${page.url()}`);
  };
  try{
    const launch=executablePath=>chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(),'brain-browser-test-')),{channel:'chromium',executablePath,headless:true,args:[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]});
    try{context=await launch(process.env.BRAIN_BROWSER||undefined);}catch(error){const edge='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';if(process.env.BRAIN_BROWSER||!fs.existsSync(edge))throw error;console.log('Bundled Chromium unavailable; testing in installed Edge with an isolated temporary profile.');context=await launch(edge);}
    let [worker]=context.serviceWorkers();if(!worker)worker=await context.waitForEvent('serviceworker');const id=new URL(worker.url()).host;
    const popup=await context.newPage();await popup.goto(`chrome-extension://${id}/popup.html`);await popup.locator('#token').fill(token);await popup.locator('#pair').click();await popup.getByText(/Đã kết nối/).waitFor();
    assert(ack,'server receives successful rule application acknowledgement');
    const page=await context.newPage();await page.goto('https://example.com').catch(()=>{});await doiUrl(page,`chrome-extension://${id}/blocked.html?host=example.com`);await page.getByRole('heading',{name:/Một khoảng dừng/}).waitFor();
    await page.screenshot({path:path.resolve(__dirname,'../test-results/browser-blocked.png')});
    current.grants=[{targetId:'example',until:Date.now()+5000}];push();
    await page.waitForTimeout(1200);await page.route('https://example.com/',route=>route.fulfill({status:200,contentType:'text/html',body:'<h1>Allowed test destination</h1>'}));await page.goto('https://example.com');await page.getByRole('heading',{name:'Allowed test destination'}).waitFor();
    await doiUrl(page,`chrome-extension://${id}/blocked.html?host=example.com`);
    current.grants=[{targetId:'example',until:Date.now()+60000}];push();await page.waitForTimeout(1200);await page.goto('https://example.com');await page.getByRole('heading',{name:'Allowed test destination'}).waitFor();
    for(const ws of server.clients)ws.close();await doiUrl(page,`chrome-extension://${id}/blocked.html?host=example.com`);
    await popup.locator('#disconnect').click();await page.waitForTimeout(700);await page.goto('https://example.com');await page.getByRole('heading',{name:'Allowed test destination'}).waitFor();
    const rules=await worker.evaluate(()=>chrome.declarativeNetRequest.getDynamicRules());assert.equal(rules.length,0);
    console.log('PASS: real Chromium extension pairing, DNR navigation block, grant unlock, timed reblock of existing tab, disconnect fail-closed, explicit unpair removes rules.');
  }finally{clearInterval(timer);if(context)await context.close();for(const ws of server.clients)ws.terminate();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
