// Bấm nút trên renderer thật. Chỉ giả lập đầu vào Windows (danh sách/cửa sổ tiền cảnh)
// và lựa chọn trong hộp thoại hệ thống; không gọi thay action đang được kiểm tra.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {_electron:electron}=require('playwright');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {WebSocket}=require('ws');
const root=path.resolve(__dirname,'..');

async function launch(dir=fs.mkdtempSync(path.join(os.tmpdir(),'brain-flows-'))){
  const env={...process.env,BRAIN_TEST_DIR:dir,BRAIN_TEST_PORT:'47858'};
  delete env.ELECTRON_RUN_AS_NODE;
  const app=await electron.launch({...(process.env.BRAIN_FLOW_EXE?{executablePath:process.env.BRAIN_FLOW_EXE,args:[]}:{args:[root]}),env,timeout:15000});
  const page=await app.firstWindow();page.setDefaultTimeout(5000);
  const errors=[];app.on('window',p=>p.on('pageerror',e=>errors.push(e.message)));
  page.on('pageerror',e=>errors.push(e.message));
  await page.waitForFunction(()=>!!document.querySelector('.gate,main.split,#timer'));
  await app.evaluate(({ipcMain})=>{
    global.__brainWatcher.stop();
    global.__closeCalls=[];
    global.__brainWatcher.closeApp=exe=>{global.__closeCalls.push(exe);return true;};
    global.__brainEngine.s.paired=true;global.__brainEngine.commit();
    ipcMain.removeHandler('listApps');
    ipcMain.handle('listApps',()=>[{exe:'fakegame',name:'Game Kiểm Thử'}]);
  });
  await page.locator('main.split').waitFor();
  return {app,page,dir,errors,port:'47858'};
}
// Nối cầu như tiện ích thật: đổi credit cho website đòi tiện ích đang kết nối.
async function connectBridge(app,dir,port){
  const token=await app.evaluate(({safeStorage},bytes)=>JSON.parse(safeStorage.decryptString(Buffer.from(bytes))).token,
    Array.from(fs.readFileSync(path.join(dir,'brain-data.enc'))));
  const ws=new WebSocket(`ws://127.0.0.1:${port}/bridge`,{origin:'chrome-extension://'+'a'.repeat(32)});
  await new Promise((res,rej)=>{ws.on('open',()=>ws.send(JSON.stringify({token})));ws.once('message',res);ws.on('error',rej);});
  ws.on('message',()=>ws.send(JSON.stringify({applied:true})));ws.send(JSON.stringify({applied:true}));
  return ws;
}
async function focus(app,exe){
  await app.evaluate((_,exe)=>{
    global.__brainWatcher.current={exe,title:exe};
    global.__brainWatcher.emit('change',global.__brainWatcher.current);
  },exe);
}
async function addApp(page){
  await page.locator('#add-app').click();
  await page.getByRole('button',{name:'Game Kiểm Thử fakegame.exe'}).click();
  await page.locator('[data-action="redeem"][data-id="app:fakegame"]').waitFor();
}
async function showOverlay(app){
  const created=app.windows().find(w=>w.url().includes('overlay.html'));
  const pending=created?Promise.resolve(created):app.waitForEvent('window');
  await focus(app,'fakegame');
  const overlay=await pending;overlay.setDefaultTimeout(5000);
  await overlay.locator('#app-name').waitFor();
  await overlay.waitForFunction(()=>document.querySelector('#app-name').textContent==='Game Kiểm Thử');
  return overlay;
}
async function visible(app){return app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().some(w=>w.webContents.getURL().includes('overlay.html')&&w.isVisible()));}
async function closeMain(app){
  const child=app.process();
  const exit=new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(Error('Ứng dụng chưa thoát sau khi đóng cửa sổ chính')),5000);
    child.once('exit',(code)=>{clearTimeout(timeout);resolve(code);});
  });
  // BrowserWindow.close đi qua cùng close/cancel/closed với nút X của Windows.
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('index.html')).close());
  assert.equal(await exit,0);
}

test('lớp phủ: bấm mở, bấm lặp, lỗi thiếu credit, giới hạn quyền và trạng thái khóa', {timeout:40000},async()=>{
  const {app,page,errors}=await launch();
  try{
    await addApp(page);
    const overlay=await showOverlay(app);
    // Khi lớp phủ chiếm tiền cảnh, nó phải còn hiện qua nhiều nhịp theo dõi.
    await focus(app,'electron');
    await overlay.locator('#minutes').selectOption('1');
    await page.waitForTimeout(1200);
    assert.equal(await visible(app),true);
    assert.equal(await overlay.locator('#minutes').inputValue(),'1','không reset lựa chọn mỗi nhịp');
    const denied=await overlay.evaluate(async()=>({
      settings:await window.brain.action('settings',{theme:'dark'}),
      other:await window.brain.action('redeem',{id:'youtube.com',minutes:1}),
      secret:await window.brain.system('copyPairing').then(()=>false,()=>true)
    }));
    assert.equal(denied.settings.ok,false);assert.equal(denied.other.ok,false);assert.equal(denied.secret,true);
    await overlay.locator('#minutes').selectOption('30');
    await overlay.getByRole('button',{name:'Đổi credit để mở'}).click();
    await overlay.getByText(/chưa đủ credit/).waitFor();
    assert.equal((await page.evaluate(()=>window.brain.get())).credits,15);
    assert.equal(await visible(app),true);
    await overlay.locator('#minutes').selectOption('5');
    await overlay.getByRole('button',{name:'Đổi credit để mở'}).dblclick();
    await page.waitForFunction(()=>window.brain.get().then(s=>s.credits===10&&s.grant?.targetId==='app:fakegame'));
    assert.equal(await visible(app),false);
    const repeat=await overlay.evaluate(()=>window.brain.action('redeem',{id:'app:fakegame',minutes:5}));
    assert.equal(repeat.ok,false);assert.equal((await page.evaluate(()=>window.brain.get())).credits,10);
    await page.getByRole('button',{name:'Kết thúc tất cả',exact:true}).click();
    await page.locator('#confirm-yes').click();
    await page.waitForFunction(()=>document.querySelectorAll('.open-row').length===0);
    await showOverlay(app);
    await overlay.getByRole('button',{name:'Đóng ứng dụng, quay lại làm việc'}).click();
    assert.equal(await visible(app),false);
    // Sau khi yêu cầu đóng có 3 giây ân hạn để ứng dụng kịp thoát; chờ hết rồi mới đòi lớp phủ.
    await page.waitForTimeout(3200);
    await page.getByRole('button',{name:/Bắt đầu tập trung/}).click();
    await focus(app,'notepad');await showOverlay(app);
    assert.equal(await overlay.locator('#redeem').isDisabled(),true);
    await overlay.getByRole('button',{name:'Đóng ứng dụng, quay lại làm việc'}).click();
    await page.waitForTimeout(3200);
    await page.getByRole('button',{name:'Dừng phiên',exact:true}).click();await page.locator('#confirm-yes').click();
    await page.locator('#open-setup').click();
    await page.getByRole('button',{name:'30 phút',exact:true}).click();await page.locator('#confirm-yes').click();
    await page.locator('#setup-close').click();
    await focus(app,'notepad');await showOverlay(app);
    assert.equal(await overlay.locator('#redeem').isDisabled(),true);
    await overlay.getByText(/Đang trong chế độ khóa/).waitFor();
    assert.equal((await page.evaluate(()=>window.brain.get())).credits,10);
    assert.deepEqual(errors,[]);
  }finally{await app.close();}
});

test('đóng ứng dụng: nhắm đúng tiến trình bị chặn, không cấp giấy thông hành', {timeout:40000},async()=>{
  const {app,page,errors}=await launch();
  try{
    await addApp(page);
    const overlay=await showOverlay(app);
    await overlay.getByRole('button',{name:'Đóng ứng dụng, quay lại làm việc'}).click();
    await page.waitForFunction(()=>true);
    // Phải yêu cầu đóng ĐÚNG ứng dụng bị chặn, không phải cửa sổ tiền cảnh (lúc đó là lớp phủ).
    assert.deepEqual(await app.evaluate(()=>global.__closeCalls),['fakegame']);
    assert.equal(await visible(app),false);

    // Ứng dụng thật sự thoát: tiền cảnh chuyển sang thứ khác, không còn lớp phủ.
    await focus(app,'notepad');
    assert.equal(await visible(app),false);

    // Nhưng nếu nó KHÔNG chịu thoát, lớp phủ phải quay lại sau khoảng ân hạn —
    // đây chính là lỗi cũ: bấm xong là dùng ứng dụng thoải mái.
    await focus(app,'fakegame');
    await page.waitForTimeout(3500);
    await app.evaluate(()=>{global.__brainWatcher.emit('change',global.__brainWatcher.current);});
    await page.waitForFunction(()=>true);
    assert.equal(await visible(app),true,'hết ân hạn mà ứng dụng vẫn chạy thì phải chặn lại');
    assert.deepEqual(await app.evaluate(()=>global.__closeCalls),['fakegame'],'không tự đóng lại khi chưa bấm');

    // Bấm lần nữa thì lại yêu cầu đóng lần nữa.
    await overlay.getByRole('button',{name:'Đóng ứng dụng, quay lại làm việc'}).click();
    await page.waitForFunction(()=>true);
    assert.deepEqual(await app.evaluate(()=>global.__closeCalls),['fakegame','fakegame']);
    assert.equal((await page.evaluate(()=>window.brain.get())).credits,15,'đóng ứng dụng không tốn credit');
    assert.deepEqual(errors,[]);
  }finally{await app.close();}
});

test('mở trình duyệt rồi mở tiếp website bên trong, không bị kẹt ở màn đếm ngược', {timeout:40000},async()=>{
  const {app,page,errors,dir,port}=await launch();
  let ws;
  try{
    // Đổi credit cho website đòi tiện ích đang kết nối, nên phải nối cầu thật.
    ws=await connectBridge(app,dir,port);
    await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Đang chặn'));
    await app.evaluate(()=>{global.__brainEngine.s.credits=40;global.__brainEngine.commit();});
    await addApp(page);
    // Mở "trình duyệt" trước.
    await page.locator('[id="m-app:fakegame"]').selectOption('5');
    await page.locator('[data-action="redeem"][data-id="app:fakegame"]').click();
    await page.locator('#confirm-yes').click();
    await page.waitForFunction(()=>document.querySelectorAll('.open-row').length===1);
    // Ngõ cụt cũ: cột phải biến mất và không đổi được gì nữa.
    assert.equal(await page.locator('main.split').count(),1,'vẫn giữ hai cột khi đang có mục mở');
    assert.equal(await page.getByRole('button',{name:'Kết thúc tất cả'}).isVisible(),true);
    // Mở tiếp website bên trong — đây chính là thứ trước đây không làm được.
    await page.locator('[id="m-youtube.com"]').selectOption('10');
    await page.locator('[data-action="redeem"][data-id="youtube.com"]').click();
    await page.locator('#confirm-yes').click();
    await page.waitForFunction(()=>document.querySelectorAll('.open-row').length===2);
    const s2=await page.evaluate(()=>window.brain.get());
    assert.equal(s2.credits,25,'trừ đúng 5 + 10');
    assert.deepEqual(s2.grants.map(g=>g.targetId).sort(),['app:fakegame','youtube.com']);
    // Tiện ích nhận đủ cả hai lượt mở.
    const wire=await app.evaluate(()=>global.__brainEngine.rules());
    assert.deepEqual(wire.grants.map(g=>g.targetId).sort(),['app:fakegame','youtube.com']);
    assert.equal(wire.targets.length,4,'danh sách website gửi đi vẫn đủ; tiện ích tự bỏ mục đang mở theo grants');
    // Không mở lại được đúng mục đang mở.
    const again=await page.evaluate(()=>window.brain.action('redeem',{id:'youtube.com',minutes:1}));
    assert.equal(again.ok,false);assert.match(again.error,/đang mở rồi/);
    // Kết thúc từng mục.
    await page.locator('.open-row [data-action="endGrant"][data-id="youtube.com"]').click();
    await page.locator('#confirm-yes').click();
    await page.waitForFunction(()=>document.querySelectorAll('.open-row').length===1);
    assert.equal((await page.evaluate(()=>window.brain.get())).grants[0].targetId,'app:fakegame');
    // Còn mục mở thì chưa tập trung được; kết thúc tất cả xong là quay lại bình thường.
    const blocked=await page.evaluate(()=>window.brain.action('start',{minutes:25}));
    assert.equal(blocked.ok,false);assert.match(blocked.error,/kết thúc thời gian giải trí/);
    await page.getByRole('button',{name:'Kết thúc tất cả'}).click();
    await page.locator('#confirm-yes').click();
    await page.waitForFunction(()=>document.querySelectorAll('.open-row').length===0);
    await page.getByRole('button',{name:/Bắt đầu tập trung/}).waitFor();
    assert.equal((await page.evaluate(()=>window.brain.get())).credits,25,'kết thúc sớm không hoàn credit');
    assert.deepEqual(errors,[]);
  }finally{if(ws)ws.close();await app.close();}
});

test('hủy chọn bằng Quay lại/Escape, kết quả tải muộn không phá hộp xác nhận', {timeout:30000},async()=>{
  const {app,page,errors}=await launch();
  try{
    for(const cancel of ['button','escape']){
      await app.evaluate(({ipcMain})=>{
        ipcMain.removeHandler('listApps');
        ipcMain.handle('listApps',()=>new Promise(resolve=>{global.__resolveAppList=resolve;}));
      });
      await page.locator('#add-app').click();
      await app.evaluate(()=>{if(!global.__resolveAppList)throw Error('Chưa nhận yêu cầu đọc ứng dụng');});
      if(cancel==='button')await page.locator('#confirm-no').click();else await page.keyboard.press('Escape');
      await page.getByRole('button',{name:'Bỏ chặn youtube.com',exact:true}).click();
      assert.equal(await page.locator('#confirm-yes').isVisible(),true);
      await app.evaluate(()=>global.__resolveAppList([{exe:'lateapp',name:'Kết quả tới muộn'}]));
      await page.waitForTimeout(150);
      assert.equal(await page.locator('#confirm-title').innerText(),'Bỏ chặn youtube.com?');
      assert.equal(await page.locator('.app-option').count(),0);
      await page.locator('#confirm-no').click();
    }
    await page.getByRole('button',{name:'Bỏ chặn youtube.com',exact:true}).click();
    await page.locator('#confirm-yes').click();
    await page.waitForFunction(()=>window.brain.get().then(s=>!s.targets.some(t=>t.id==='youtube.com')));
    await app.evaluate(({ipcMain})=>{ipcMain.removeHandler('listApps');ipcMain.handle('listApps',()=>{throw Error('Test list unavailable');});});
    await page.locator('#add-app').click();await page.getByText(/Không đọc được danh sách ứng dụng/).waitFor();
    await page.locator('#confirm-no').click();
    await page.getByRole('button',{name:/Bắt đầu tập trung/}).click();
    await page.getByRole('button',{name:'Dừng phiên',exact:true}).click();await page.locator('#confirm-yes').click();
    await page.locator('main.split').waitFor();
    assert.equal((await page.evaluate(()=>window.brain.get())).session,null);
    assert.deepEqual(errors,[]);
  }finally{await app.close();}
});

for(const mode of ['hidden','visible','focus'])test(`đóng cửa sổ chính sau lớp phủ ${mode}: thoát tiến trình và mở lại dữ liệu`,{timeout:30000},async()=>{
  const first=await launch();let closed=false;
  try{
    await addApp(first.page);const overlay=await showOverlay(first.app);
    if(mode!=='visible')await overlay.getByRole('button',{name:'Đóng ứng dụng, quay lại làm việc'}).click();
    if(mode==='focus'){
      await first.page.getByRole('button',{name:/Bắt đầu tập trung/}).click();
      await first.app.evaluate(({dialog})=>{global.__closePrompts=0;dialog.showMessageBoxSync=()=>{global.__closePrompts++;return 0;};});
      await first.app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('index.html')).close());
      assert.equal(await first.page.locator('#timer').isVisible(),true,'chọn tiếp tục thì giữ cửa sổ và phiên');
      assert.equal(await first.app.evaluate(()=>global.__closePrompts),1);
      await first.app.evaluate(({dialog})=>{dialog.showMessageBoxSync=()=>1;});
    }
    await closeMain(first.app);closed=true;
    const reopened=await launch(first.dir);
    try{
      const s=await reopened.page.evaluate(()=>window.brain.get());
      assert.equal(s.session,null);assert.equal(s.credits,15);
      assert(s.targets.some(t=>t.id==='app:fakegame'));
      if(mode==='focus')assert.equal(s.lastSession.status,'interrupted');
      assert.deepEqual(first.errors,[]);assert.deepEqual(reopened.errors,[]);
    }finally{await reopened.app.close();}
  }finally{if(!closed)await first.app.close();}
});
