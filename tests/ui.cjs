const { _electron:electron }=require('playwright');const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const assert=require('node:assert/strict');const {WebSocket}=require('ws');
(async()=>{
  const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'brain-ui-test-'));fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
  const env={...process.env,BRAIN_TEST_DIR:dir,BRAIN_TEST_PORT:'47841'};delete env.ELECTRON_RUN_AS_NODE;
  const origin='chrome-extension://'+'a'.repeat(32);
  let desktop;const errors=[];
  try{
    desktop=await electron.launch({args:[root],env});const page=await desktop.firstWindow();page.on('pageerror',e=>errors.push(e.message));

    // Lần chạy đầu: chưa ghép nối thì bị chặn ở màn hình mở đầu.
    await page.getByRole('heading',{name:/bật bộ chặn/}).waitFor();
    assert.equal((await page.evaluate(()=>window.brain.get())).credits,15,'người dùng mới được tặng 15 credit');
    await page.getByText(/Bạn được tặng 15 credit/).waitFor();
    assert.equal(await page.locator('.chips').count(),0,'chưa vào được màn hình chính');
    assert.equal(await page.locator('#status').innerText(),'Chưa chặn được website nào');
    await page.screenshot({path:path.join(root,'test-results/gate.png'),fullPage:true});
    assert.equal(await page.evaluate(()=>typeof window.require),'undefined');

    const secret=await desktop.evaluate(({safeStorage},bytes)=>JSON.parse(safeStorage.decryptString(Buffer.from(bytes))).token,Array.from(fs.readFileSync(path.join(dir,'brain-data.enc'))));
    const bad=new WebSocket('ws://127.0.0.1:47841/bridge',{origin:'https://evil.example'});await new Promise(r=>{bad.on('error',r);bad.on('close',r);});
    const wrong=new WebSocket('ws://127.0.0.1:47841/bridge',{origin});await new Promise((res,rej)=>{wrong.on('open',()=>wrong.send(JSON.stringify({token:'b'.repeat(64)})));wrong.on('close',res);wrong.on('error',rej);});
    assert.equal((await page.evaluate(()=>window.brain.get())).paired,false,'token sai không tính là đã ghép nối');

    // Ghép nối thật: màn hình mở đầu tự nhường chỗ cho bố cục hai cột.
    const ws=new WebSocket('ws://127.0.0.1:47841/bridge',{origin});
    const rules=await new Promise((res,rej)=>{ws.on('open',()=>ws.send(JSON.stringify({token:secret})));ws.once('message',m=>res(JSON.parse(m)));ws.on('error',rej);});
    assert.equal(rules.targets.length,4);assert.deepEqual(rules.grants,[]);
    ws.on('message',()=>ws.send(JSON.stringify({applied:true})));ws.send(JSON.stringify({applied:true}));
    await page.waitForFunction(()=>document.querySelector('#status').textContent==='Đang chặn 4 website');
    await page.locator('main.split').waitFor();
    assert.equal(await page.locator('.row').count(),4);
    const cols=await page.evaluate(()=>{const l=document.querySelector('.left').getBoundingClientRect(),r=document.querySelector('.right').getBoundingClientRect();return {sideBySide:r.left>=l.right-1,scrollWidth:document.documentElement.scrollWidth,width:innerWidth};});
    assert(cols.sideBySide,'hai cột nằm cạnh nhau ở cửa sổ mặc định');
    assert(cols.scrollWidth<=cols.width+1,'không tràn ngang');
    assert.equal(await page.locator('.rule').innerText(),'TẬP TRUNG\n25 phút\n→\nNHẬN ĐƯỢC\n5 credit\n→\nĐỔI RA\n5 phút');
    await page.screenshot({path:path.join(root,'test-results/main.png'),fullPage:true});

    // Chủ đề: ba lựa chọn, lưu lại được.
    await page.locator('#open-setup').click();await page.locator('#setup').waitFor();
    await page.locator('[data-setup-tab="look"]').click();
    await page.getByRole('button',{name:'Tối',exact:true}).click();
    await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
    assert.equal((await page.evaluate(()=>window.brain.get())).theme,'dark');
    assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(11, 11, 11)');
    // Chụp ở tab có nội dung: tab Giao diện gần như trống nên làm ảnh minh hoạ thì yếu.
    await page.locator('[data-setup-tab="blocker"]').click();
    await page.screenshot({path:path.join(root,'test-results/dark.png'),fullPage:true});
    await page.locator('[data-setup-tab="look"]').click();
    await page.getByRole('button',{name:'Theo hệ thống',exact:true}).click();
    await page.waitForFunction(()=>!document.documentElement.dataset.theme);
    await page.getByRole('button',{name:'Sáng',exact:true}).click();
    await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
    assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(255, 255, 255)');

    // Khung thời gian tùy chỉnh: bỏ một mốc, thêm một mốc, và màn hình chính đi theo.
    await page.locator('[data-setup-tab="session"]').click();
    assert.deepEqual(await page.locator('.chips .chip-btn').allInnerTexts(),['25 phút','50 phút','90 phút','Khác']);
    await page.getByRole('button',{name:'Bỏ khung 50 phút'}).click();
    await page.waitForFunction(()=>document.querySelectorAll('.preset-chip').length===2);
    await page.getByRole('spinbutton',{name:'Số phút cho khung mới'}).fill('15');
    await page.getByRole('button',{name:'Thêm mốc'}).click();
    await page.waitForFunction(()=>document.querySelectorAll('.preset-chip').length===3);
    assert.deepEqual((await page.evaluate(()=>window.brain.get())).presets,[15,25,90],'được sắp tăng dần');
    assert.deepEqual(await page.locator('.chips .chip-btn').allInnerTexts(),['15 phút','25 phút','90 phút','Khác']);
    // Bảng cài đặt: tiêu đề và hàng nút đứng yên, chỉ phần giữa cuộn.
    const panel=await page.evaluate(()=>({
      panelScrolls:getComputedStyle(document.querySelector('.setup-panel')).overflowY,
      railScrolls:getComputedStyle(document.querySelector('.setup-rail')).overflowY,
      dialogScrolls:getComputedStyle(document.querySelector('#setup')).overflowY,
      soTab:document.querySelectorAll('.setup-rail [data-setup-tab]').length}));
    assert.equal(panel.panelScrolls,'auto','chỉ phần nội dung được cuộn');
    assert.notEqual(panel.dialogScrolls,'auto','tiêu đề và hàng nút phải đứng yên');
    assert(panel.soTab>=6,`thanh mục phải có ít nhất 6 tab, đang có ${panel.soTab}`);
    // Bấm sang một tab khác thì nội dung phải đổi theo.
    await page.locator('[data-setup-tab="history"]').click();
    await page.locator('.setup-panel').getByText('Tiến bộ').waitFor();
    await page.locator('[data-setup-tab="blocker"]').click();
    await page.locator('.setup-panel').getByText('Bộ chặn website').waitFor();
    await page.screenshot({path:path.join(root,'test-results/settings.png'),fullPage:true});
    await page.locator('#setup-close').click();

    // Thêm rồi xóa một tên miền.
    await page.getByRole('textbox',{name:'Tên miền cần chặn'}).fill('https://WWW.Reddit.com/');
    await page.getByRole('button',{name:'Thêm',exact:true}).click();
    await page.locator('.domain',{hasText:'reddit.com'}).waitFor();
    await page.getByRole('button',{name:'Bỏ chặn reddit.com'}).click();await page.locator('#confirm-yes').click();
    await page.waitForFunction(()=>document.querySelectorAll('.row').length===4);

    // Phiên tập trung: credit tăng dần theo thời gian thực, hủy thì mất sạch.
    await desktop.evaluate(({powerMonitor})=>{powerMonitor.getSystemIdleTime=()=>0;});
    await page.getByRole('button',{name:'Khác'}).click();await page.getByRole('spinbutton',{name:'Số phút tập trung'}).fill('1');
    assert.equal(await page.locator('#rule-credits').innerText(),'0,2 credit');
    await page.getByRole('button',{name:/Bắt đầu tập trung/}).click();await page.locator('.earning').waitFor();
    await page.waitForTimeout(3200);
    const growing=await page.locator('#earning').innerText();
    assert(Number(growing.replace(',','.'))>0,`credit phải tăng dần, đang là ${growing}`);
    assert.equal(await page.locator('#earning-risk').innerText(),growing,'dòng cảnh báo mất credit khớp số đang tích lũy');
    await page.getByRole('button',{name:'Dừng phiên'}).click();await page.locator('#confirm-yes').click();
    await page.locator('main.split').waitFor();
    assert.equal((await page.evaluate(()=>window.brain.get())).credits,15,'hủy phiên không cộng gì thêm vào số dư');

    // Một phiên trọn vẹn 60 giây cộng đúng 0,2 credit.
    const started=await page.evaluate(()=>window.brain.action('start',{minutes:1}));assert.equal(started.ok,true,started.error);
    await page.locator('main.split').waitFor({timeout:90000});
    const s=await page.evaluate(()=>window.brain.get());
    assert.equal(s.credits,15.2,JSON.stringify(s.lastSession));assert.equal(s.todayMinutes,1);
    // Lịch sử: một phiên trọn vẹn và một phiên bị hủy đều được ghi vào đúng ngày hôm nay.
    assert.equal(s.history[0].minutes,1);assert.equal(s.history[0].completed,1);
    assert.equal(s.history[0].interrupted,1,'phiên bị hủy trước đó được ghi nhận');
    assert.equal(s.history[0].earned,.2);
    assert.equal(await page.locator('.week-day').count(),7,'dải bảy ngày luôn đủ bảy cột');
    assert.equal(await page.locator('.week-day.now').count(),1);
    assert.match(await page.locator('.today').innerText(),/Hôm nay 1 phút · 7 ngày qua 1 phút/);
    const poor=await page.evaluate(()=>window.brain.action('redeem',{id:'youtube.com',minutes:30}));
    assert.equal(poor.ok,false);assert.match(poor.error,/chưa đủ credit/);

    // Chế độ khóa: bật từ Cài đặt, đóng mọi lối thoát, không rút ngắn được.
    await page.locator('#open-setup').click();await page.locator('#setup').waitFor();
    await page.locator('[data-setup-tab="lock"]').click();
    await page.getByRole('button',{name:'30 phút',exact:true}).click();
    await page.locator('#confirm-yes').click();
    await page.waitForFunction(()=>document.querySelector('.locked-note')!==null);
    const lockState=await page.evaluate(()=>window.brain.get());
    assert(lockState.lockUntil>Date.now()+29*60000,'khóa 30 phút');
    assert.match(await page.locator('.sites-head').innerText(),/ĐANG KHÓA/,'cột phải đổi sang trạng thái khóa');
    assert.equal(await page.getByRole('button',{name:'Mở'}).first().isDisabled(),true,'không đổi được credit');
    assert.equal(await page.getByRole('button',{name:/Bỏ chặn/}).count(),0,'không bỏ chặn được website');
    // Còn đang ở tab Chế độ khóa: không được có nút khóa thêm.
    assert.equal(await page.getByRole('button',{name:'30 phút',exact:true}).count(),0,'không có nút khóa thêm');
    // Nút xóa dữ liệu nằm ở tab Ứng dụng.
    await page.locator('[data-setup-tab="app"]').click();
    assert.equal(await page.getByRole('button',{name:'Xóa toàn bộ'}).isDisabled(),true,'không xóa được dữ liệu');
    for(const [type,p2,pattern] of [['redeem',{id:'youtube.com',minutes:5},/chế độ khóa/],
                                    ['targetDelete',{id:'youtube.com'},/chế độ khóa/],
                                    ['lock',{minutes:30},/khóa rồi/]]){
      const r=await page.evaluate(([t,q])=>window.brain.action(t,q),[type,p2]);
      assert.equal(r.ok,false,type);assert.match(r.error,pattern,type);
    }
    const wipe=await page.evaluate(()=>window.brain.system('reset').then(()=>'cho phép',e=>e.message));
    assert.match(wipe,/chế độ khóa/,'xóa dữ liệu cũng bị chặn');
    // Tiện ích nhận được hạn khóa và không còn grant nào trên dây.
    const wire=await new Promise(res=>{ws.once('message',m=>res(JSON.parse(m)));});
    assert(wire.lockUntil>Date.now(),'tiện ích biết đang khóa');
    assert.deepEqual(wire.grants,[]);
    assert.equal(wire.targets.length,4,'vẫn chặn đủ website');
    await page.screenshot({path:path.join(root,'test-results/locked.png'),fullPage:true});
    await page.locator('#setup-close').click();

    assert(!fs.readFileSync(path.join(dir,'brain-data.enc')).includes(Buffer.from('youtube.com')),'dữ liệu trên đĩa được mã hóa');
    await new Promise(r=>{ws.once('close',r);ws.close();});
    await page.waitForFunction(()=>document.querySelector('#status').textContent==='Chưa chặn được website nào');
    assert.equal(await page.locator('main.split').count(),1,'mất kết nối không đẩy người dùng về màn hình mở đầu');

    await desktop.close();desktop=null;
    desktop=await electron.launch({args:[root],env});const reopened=await desktop.firstWindow();await reopened.locator('main.split').waitFor();
    const restored=await reopened.evaluate(()=>window.brain.get());
    assert.equal(restored.credits,15.2);assert.equal(restored.targets.length,4);assert.equal(restored.todayMinutes,1);assert.equal(restored.history[0].completed,1,'lịch sử sống sót qua khởi động lại');
    assert.equal(restored.theme,'light');assert.equal(restored.paired,true);assert.deepEqual(restored.presets,[15,25,90]);
    assert(restored.lockUntil>Date.now(),'chế độ khóa sống sót qua việc đóng và mở lại ứng dụng');
    assert.equal((await reopened.evaluate(()=>window.brain.action('redeem',{id:'youtube.com',minutes:5}))).ok,false,'mở lại ứng dụng không phải là cách thoát khóa');
    assert.deepEqual(errors,[]);
    console.log('PASS: màn hình mở đầu, bố cục hai cột, dải quy đổi, ba chủ đề, khung thời gian tùy chỉnh, bảng cài đặt chỉ cuộn phần giữa, credit tăng dần, hủy mất sạch, phiên trọn vẹn cộng credit, chế độ khóa đóng mọi lối thoát và sống sót qua khởi động lại, mã hóa, xác thực cầu nối, khôi phục sau khởi động lại.');
  }finally{if(desktop)await desktop.close();console.log('Isolated test data: '+dir);}
})().catch(e=>{console.error(e);process.exitCode=1;});
