// Ứng dụng phải nói được tiện ích đang nối là bản nào.
//
// Lý do bài này tồn tại: tiện ích đã lên Chrome Web Store ở bản 0.6.0 trong khi mã nguồn
// đã ở 0.7.x. Không ai phát hiện ra, vì ứng dụng không có cách nào biết — nó chỉ thấy
// "đã kết nối". Một tiện ích cũ hơn thì thiếu tính năng một cách im lặng: vẫn chặn đúng,
// vẫn giữ hạn chế độ khóa, nhưng màn hình chặn không đổi credit tại chỗ được.
//
// Trường `version` là TÙY CHỌN ở phía ứng dụng: bản cũ không gửi thì vẫn phải ghép nối
// được bình thường, chỉ là bị đánh dấu cũ.
const {_electron:electron}=require('playwright');
const {WebSocket}=require('ws');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const PORT='47876';
const ORIGIN='chrome-extension://'+'a'.repeat(32);

(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'brain-extver-'));
  const env={...process.env,BRAIN_TEST_DIR:dir,BRAIN_TEST_PORT:PORT,BRAIN_TIER:'pro'};
  delete env.ELECTRON_RUN_AS_NODE;
  const app=await electron.launch({args:[root],env});
  const page=await app.firstWindow();
  let ws;
  try{
    await page.locator('.gate').waitFor();
    await app.evaluate(()=>global.__brainWatcher.stop());

    // Có link cửa hàng thì màn hình mở đầu phải là HAI bước, và cách nạp thủ công gập
    // lại chứ không biến mất — người chạy từ mã nguồn vẫn cần nó.
    const url=(await page.evaluate(()=>window.brain.get())).system.extensionUrl;
    if(url){
      assert.match(url,/^https:\/\/chromewebstore\.google\.com\/detail\/[a-p]{32}$/,'link cửa hàng sai dạng');
      await page.getByRole('button',{name:'Cài tiện ích'}).waitFor();
      assert.equal(await page.locator('.gate > ol > li').count(),2,'có cửa hàng thì phải còn hai bước');
      assert.match(await page.locator('.gate .lead').innerText(),/hai bước/);
      const thủCông=page.locator('.gate details.thu-cong');
      assert.equal(await thủCông.count(),1,'cách nạp thủ công phải còn, chỉ gập lại');
      assert.equal(await page.locator('.gate details.thu-cong [data-system="extensionFolder"]').isVisible(),false,
        'chưa mở ra thì nút nạp thủ công phải đang ẩn');
      await thủCông.locator('summary').click();
      await page.locator('.gate details.thu-cong [data-system="extensionFolder"]').waitFor();
      console.log('màn hình mở đầu → hai bước, cách thủ công gập lại mà vẫn mở ra được');
    } else {
      assert.equal(await page.locator('.gate > ol > li').count(),4,'chưa có cửa hàng thì giữ bốn bước');
      console.log('màn hình mở đầu → bốn bước thủ công (chưa có link cửa hàng)');
    }
    const secret=await app.evaluate(({safeStorage},b)=>JSON.parse(safeStorage.decryptString(Buffer.from(b))).token,
      Array.from(fs.readFileSync(path.join(dir,'brain-data.enc'))));

    // Nối một lần với một lời khai phiên bản cho trước, rồi đọc lại ứng dụng thấy gì.
    const nối=async khai=>{
      if(ws){ws.close();await page.waitForTimeout(300);}
      ws=new WebSocket(`ws://127.0.0.1:${PORT}/bridge`,{origin:ORIGIN});
      await new Promise((res,rej)=>{
        ws.on('open',()=>ws.send(JSON.stringify({token:secret,...khai})));
        ws.once('message',res);ws.on('error',rej);
      });
      ws.on('message',()=>ws.send(JSON.stringify({applied:true})));
      ws.send(JSON.stringify({applied:true}));
      await page.waitForFunction(()=>window.brain.get().then(s=>s.system.extensionConnected));
      await page.waitForTimeout(250);
      return (await page.evaluate(()=>window.brain.get())).system.extension;
    };

    // Bản cũ không khai gì — đúng thứ đang nằm trên cửa hàng.
    const cũ=await nối({});
    assert.deepEqual(cũ,{version:null,outdated:true,wanted:'0.7.0'},
      'tiện ích không khai phiên bản thì phải bị coi là bản cũ');
    await page.locator('main.split').waitFor();
    console.log('không khai gì  → version null, outdated true');

    // Bản đúng bằng mức tối thiểu: không phải cảnh báo.
    assert.deepEqual(await nối({version:'0.7.0'}),{version:'0.7.0',outdated:false,wanted:'0.7.0'});
    console.log('khai 0.7.0     → đạt mức tối thiểu, không cảnh báo');

    // Bản mới hơn ứng dụng: cũng không phải cảnh báo.
    assert.equal((await nối({version:'0.7.1'})).outdated,false);
    console.log('khai 0.7.1     → không cảnh báo');

    // So sánh phải theo từng số, không so chuỗi: '0.10.0' > '0.9.0'.
    assert.equal((await nối({version:'0.10.0'})).outdated,false,'0.10.0 phải mới hơn 0.7.0');
    assert.equal((await nối({version:'0.6.9'})).outdated,true,'0.6.9 vẫn cũ hơn 0.7.0');
    console.log('0.10.0 > 0.7.0 > 0.6.9 → so theo số, không so chuỗi');

    // Đúng bản đang nằm trên cửa hàng lúc viết bài này.
    const store=await nối({version:'0.6.0'});
    assert.deepEqual(store,{version:'0.6.0',outdated:true,wanted:'0.7.0'});
    await page.locator('#open-setup').click();await page.locator('#setup').waitFor();
    await page.locator('[data-setup-tab="blocker"]').click();
    const cảnh=page.locator('.setup-panel .warn',{hasText:'cũ hơn ứng dụng'});
    await cảnh.waitFor();
    assert.match(await cảnh.innerText(),/bản 0\.6\.0/);
    assert.match(await cảnh.innerText(),/vẫn chặn đúng/,'phải nói rõ cái gì CÒN chạy, không chỉ cái hỏng');
    await page.locator('#setup-close').click();
    console.log('khai 0.6.0     → cảnh báo nói đúng số bản, và nói rõ cái gì vẫn chạy');

    // Lời khai bậy không được tin, nhưng cũng không được làm hỏng việc ghép nối.
    const bậy=await nối({version:'<script>alert(1)</script>'});
    assert.deepEqual(bậy,{version:null,outdated:true,wanted:'0.7.0'});
    assert.equal(await page.locator('main.split').count(),1,'lời khai bậy không được chặn việc ghép nối');
    console.log('khai bậy       → bỏ qua, vẫn ghép nối bình thường');

    // Rút dây thì không còn gì để nói về phiên bản nữa.
    ws.close();ws=null;
    await page.waitForFunction(()=>window.brain.get().then(s=>!s.system.extensionConnected));
    assert.equal((await page.evaluate(()=>window.brain.get())).system.extension,null);
    console.log('rút dây        → không còn thông tin phiên bản');

    // Manifest của tiện ích trong repo phải đạt mức tối thiểu mà ứng dụng đòi.
    const manifest=JSON.parse(fs.readFileSync(path.join(root,'extension','manifest.json'),'utf8'));
    const số=v=>String(v).split('.').map(Number);
    const cũHơn=(a,b)=>{const x=số(a),y=số(b);for(let i=0;i<Math.max(x.length,y.length);i++){const d=(x[i]||0)-(y[i]||0);if(d)return d<0;}return false;};
    assert(!cũHơn(manifest.version,'0.7.0'),
      `tiện ích trong repo là ${manifest.version}, thấp hơn mức ứng dụng đòi`);
    console.log(`manifest repo  → ${manifest.version}, đạt mức ứng dụng đòi`);
  } finally { if(ws)ws.close(); await app.close().catch(()=>{}); }
  console.log('PASS: ứng dụng biết và nói ra được tiện ích đang nối là bản nào.');
})().catch(e=>{console.error(e);process.exit(1)});
