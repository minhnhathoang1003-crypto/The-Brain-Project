// Đổi credit ngay trên màn hình chặn, chạy trong Chromium thật với tiện ích thật.
//
// Máy chủ giả ở đây nói đúng giao thức mà src/main.cjs nói: nhận {redeem:{...}},
// cấp lượt mở, đẩy luật mới lên dây TRƯỚC, rồi mới trả {redeemResult}.
const {chromium}=require('playwright');const {WebSocketServer}=require('ws');
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const assert=require('node:assert/strict');

(async()=>{
  const ext=fs.mkdtempSync(path.join(os.tmpdir(),'brain-redeem-ext-')),token='a'.repeat(64);
  let current={targets:[{id:'example',domain:'example.com'}],grants:[],lockUntil:null,now:Date.now(),credits:10,packs:[1,5,10,15,30],session:false};
  const nhanDuoc=[];
  const server=new WebSocketServer({host:'127.0.0.1',port:0});
  await new Promise((res,rej)=>{server.once('listening',res);server.once('error',rej);});
  fs.cpSync(path.resolve(__dirname,'../extension'),ext,{recursive:true});
  const script=path.join(ext,'background.js');
  fs.writeFileSync(script,fs.readFileSync(script,'utf8').replace('127.0.0.1:47831','127.0.0.1:'+server.address().port));

  const push=()=>{current.now=Date.now();for(const ws of server.clients)if(ws.authed&&ws.readyState===1)ws.send(JSON.stringify(current));};
  server.on('connection',ws=>{
    ws.on('message',data=>{
      const m=JSON.parse(data);
      if(!ws.authed){if(m.token!==token){ws.close();return;}ws.authed=true;push();return;}
      if(!m.redeem)return;
      nhanDuoc.push(m.redeem);
      const {targetId,minutes,reqId}=m.redeem;
      // Đúng thứ tự của main.cjs: cấp quyền, đẩy luật, rồi mới báo xong.
      if(current.credits<minutes){
        ws.send(JSON.stringify({redeemResult:{ok:false,error:'Bạn chưa đủ credit. Hoàn thành một phiên tập trung để tích lũy.',reqId}}));
        return;
      }
      current.credits-=minutes;
      current.grants=[{targetId,until:Date.now()+minutes*60000}];
      push();
      ws.send(JSON.stringify({redeemResult:{ok:true,reqId}}));
    });
  });

  const timer=setInterval(push,1000);let context;
  try{
    const launch=executablePath=>chromium.launchPersistentContext(
      fs.mkdtempSync(path.join(os.tmpdir(),'brain-redeem-profile-')),
      {channel:'chromium',executablePath,headless:true,args:[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]});
    try{context=await launch(process.env.BRAIN_BROWSER||undefined);}
    catch(error){
      const edge='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
      if(process.env.BRAIN_BROWSER||!fs.existsSync(edge))throw error;
      console.log('Bundled Chromium unavailable; testing in installed Edge with an isolated temporary profile.');
      context=await launch(edge);
    }
    let [worker]=context.serviceWorkers();if(!worker)worker=await context.waitForEvent('serviceworker');
    const id=new URL(worker.url()).host;
    const chan=`chrome-extension://${id}/blocked.html?host=example.com`;

    const popup=await context.newPage();
    await popup.goto(`chrome-extension://${id}/popup.html`);
    await popup.locator('#token').fill(token);await popup.locator('#pair').click();
    await popup.getByText(/Đã kết nối/).waitFor();

    const page=await context.newPage();
    await page.route('https://example.com/',r=>r.fulfill({status:200,contentType:'text/html',body:'<h1>Allowed test destination</h1>'}));
    await page.goto('https://example.com').catch(()=>{});
    await page.waitForURL(chan);

    // §1 Khu đổi credit hiện ra, đúng số dư và đúng các gói.
    await page.locator('#doi:not([hidden])').waitFor({timeout:10000});
    assert.equal(await page.locator('#so-du').innerText(),'10');
    assert.deepEqual(await page.locator('.pack').allInnerTexts(),
      ['1 phút','5 phút','10 phút','15 phút','30 phút']);
    // 15 và 30 vượt quá 10 credit: phải mờ đi chứ không biến mất, để thấy giá.
    assert.equal(await page.locator('.pack:disabled').count(),2,'gói quá số dư phải bị vô hiệu');
    assert.match(await page.locator('.pack').nth(4).getAttribute('title'),/Cần 30 credit/);
    await page.screenshot({path:path.resolve(__dirname,'../test-results/blocked-redeem.png'),fullPage:true});
    console.log('§1 khu đổi credit   10 credit, 5 gói, 2 gói bị mờ');

    // §2 Bấm một gói: đổi được và vào thẳng trang, không bị đá ngược lại.
    await page.locator('.pack').nth(1).click();     // 5 phút
    await page.getByRole('heading',{name:'Allowed test destination'}).waitFor({timeout:15000});
    assert.deepEqual(nhanDuoc.map(r=>({targetId:r.targetId,minutes:r.minutes})),[{targetId:'example',minutes:5}]);
    assert.equal(current.credits,5,'đúng 5 credit bị trừ');
    console.log('§2 đổi 5 phút       vào thẳng trang, trừ đúng 5 credit');

    // §3 Chế độ khóa: không có nút nào để bấm, và nói rõ còn bao lâu.
    current.grants=[];current.lockUntil=Date.now()+45*60000;push();
    const khoa=await context.newPage();
    await khoa.goto(chan);
    await khoa.getByText(/chế độ khóa/i).waitFor({timeout:10000});
    assert.equal(await khoa.locator('#doi:not([hidden])').count(),0,'đang khóa thì không được hiện khu đổi credit');
    assert.match(await khoa.locator('#note').innerText(),/45 phút/);
    console.log('§3 chế độ khóa      không có nút nào, nói rõ còn 45 phút');

    // §4 Đang trong phiên tập trung: cũng không đổi được.
    current.lockUntil=null;current.session=true;push();
    const phien=await context.newPage();
    await phien.goto(chan);
    await phien.getByText(/phiên tập trung/i).waitFor({timeout:10000});
    assert.equal(await phien.locator('#doi:not([hidden])').count(),0,'đang trong phiên thì không được hiện khu đổi credit');
    console.log('§4 đang tập trung   không đổi được, nói rõ lý do');

    // §5 blocked.html nằm trong web_accessible_resources: một trang bất kỳ nhúng nó
    // vào iframe vô hình rồi dụ người dùng bấm là đổi mất credit. Trong khung thì
    // trang phải trống trơn.
    current.session=false;push();
    const keXau=await context.newPage();
    await keXau.route('https://evil.test/',r=>r.fulfill({status:200,contentType:'text/html',
      body:`<iframe id="f" src="${chan}" style="width:900px;height:700px"></iframe>`}));
    await keXau.goto('https://evil.test/');
    const khung=keXau.frameLocator('#f');
    await keXau.waitForTimeout(1500);
    assert.equal(await khung.locator('.pack').count(),0,'trong iframe không được hiện nút đổi credit');
    assert.equal(await khung.locator('#retry').count(),0,'trong iframe phải trống hoàn toàn');
    console.log('§5 chống nhúng khung trang trống trơn khi bị iframe');

    console.log('PASS: đổi credit ngay trên màn hình chặn — đúng số dư, vào thẳng trang, và mọi luật của ứng dụng vẫn thắng.');
  }finally{
    clearInterval(timer);
    if(context)await context.close();
    for(const ws of server.clients)ws.terminate();
    await new Promise(res=>server.close(res));
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
