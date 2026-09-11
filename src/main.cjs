const {app,BrowserWindow,ipcMain,powerMonitor,safeStorage,dialog,shell,clipboard,nativeTheme}=require('electron');
const fs=require('node:fs'); const path=require('node:path'); const http=require('node:http'); const crypto=require('node:crypto');
const {WebSocketServer,WebSocket}=require('ws'); const {Engine,initial,migrate,VERSION,WELCOME_CREDITS}=require('./engine.cjs');
const {ForegroundWatcher,listWindows}=require('./foreground.cjs');
const license=require('./license.cjs');
const {createUpdater}=require('./updater.cjs');
// Kênh góp ý. App cố ý không thu thập gì, nên đây là đường duy nhất để người dùng
// nói với tác giả rằng họ kẹt ở đâu. Website giữ bản sao của hai giá trị này
// trong website/config.js — đổi thì nhớ đổi cả hai.
const EMAIL='minhnhat.hoang1003@gmail.com';
const REPO='https://github.com/minhnhathoang1003-crypto/The-Brain-Project';
const SITE='https://the-brain-project.vercel.app';
if(process.env.BRAIN_TEST_DIR) app.setPath('userData',process.env.BRAIN_TEST_DIR);
// Windows ghép cửa sổ với shortcut đã ghim qua id này. Thiếu nó, taskbar coi app là một
// chương trình lạ và hiện icon mặc định thay vì icon của shortcut.
app.setAppUserModelId('com.humanos.brain');
if(!app.requestSingleInstanceLock()) {app.quit();} else {
let win,overlay,watcher,engine,server,wss,interval,updater=null,bridgeError=null,quitting=false,blockedNow=null,closing={exe:'',until:0};
const PORT=process.env.BRAIN_TEST_DIR?Number(process.env.BRAIN_TEST_PORT||47831):47831;

// Link kích hoạt: sau khi trả tiền, khách bấm một nút và Windows mở app kèm mã, để
// không ai phải gõ lại 36 ký tự bằng tay. Bản đã cài đăng ký giao thức qua trình cài
// đặt (xem "protocols" trong package.json); dòng dưới lo nốt trường hợp chạy từ mã
// nguồn, và ghi đè nếu người dùng cài lại app ở chỗ khác.
// Không đăng ký trong lúc chạy test — test không được phép sửa registry của máy.
if(!process.env.BRAIN_TEST_DIR){
  if(app.isPackaged) app.setAsDefaultProtocolClient(license.PROTOCOL);
  else app.setAsDefaultProtocolClient(license.PROTOCOL,process.execPath,[path.resolve(process.argv[1]||'.')]);
}
// Link tới trước khi app kịp dựng xong thì giữ lại, xử lý sau. Mất link ở đây nghĩa
// là khách trả tiền xong bấm nút mà chẳng thấy gì xảy ra.
let onDeepLink=null,pendingKey=null;
const takeLink=key=>{if(!key)return;if(onDeepLink)onDeepLink(key);else pendingKey=key;};
app.on('second-instance',(_e,argv)=>{
  if(win&&!win.isDestroyed()){if(win.isMinimized())win.restore();win.show();win.focus();}
  takeLink(license.keyFromArgv(argv));
});
app.whenReady().then(()=>{
  const dataFile=path.join(app.getPath('userData'),'brain-data.enc');
  const extensionFolder=app.isPackaged?path.join(app.getPath('userData'),'extension'):path.join(__dirname,'../extension');
  if(app.isPackaged)fs.cpSync(path.join(process.resourcesPath,'extension'),extensionFolder,{recursive:true});
  if(!safeStorage.isEncryptionAvailable()){dialog.showErrorBox('Không thể lưu dữ liệu an toàn','Windows chưa cung cấp mã hóa cho tài khoản này. Ứng dụng sẽ đóng.');app.quit();return;}
  function save(s){const temp=dataFile+'.tmp';fs.writeFileSync(temp,safeStorage.encryptString(JSON.stringify(s)));fs.renameSync(temp,dataFile);}
  let state=initial();
  const firstRun=!fs.existsSync(dataFile);
  if(firstRun) state.credits=WELCOME_CREDITS;
  try {if(fs.existsSync(dataFile)){state=JSON.parse(safeStorage.decryptString(fs.readFileSync(dataFile)));if(state.version!==VERSION&&!fs.existsSync(dataFile+'.backup'))fs.copyFileSync(dataFile,dataFile+'.backup',fs.constants.COPYFILE_EXCL);}state=migrate(state);}
  catch(e){dialog.showErrorBox('Không đọc được dữ liệu',`Dữ liệu được giữ nguyên tại ${dataFile}.\n${e.message}`);app.quit();return;}
  engine=new Engine(state,()=>Date.now(),save);engine.recover();save(state);
  nativeTheme.themeSource=engine.s.theme;

  // Bản quyền nằm ở file riêng, cố ý không nằm trong brain-data.enc: nút "Xóa toàn bộ
  // dữ liệu" gọi initial(), nên để chung là người đã trả tiền reset dữ liệu mất luôn
  // thứ họ mua. File này cũng không bị xóa khi reset.
  const licenseFile=path.join(app.getPath('userData'),'brain-license.enc');
  function saveLicense(r){
    if(!r){fs.rmSync(licenseFile,{force:true});license.load(null);return;}
    const temp=licenseFile+'.tmp';
    fs.writeFileSync(temp,safeStorage.encryptString(JSON.stringify(r)));
    fs.renameSync(temp,licenseFile);
    license.load(r);
  }
  // Bản quyền đọc không được thì bỏ qua và chạy tiếp — quy tắc 3: không bao giờ chặn app mở lên.
  try{ if(fs.existsSync(licenseFile)) license.load(JSON.parse(safeStorage.decryptString(fs.readFileSync(licenseFile)))); }
  catch{ license.load(null); }
  // Hai luật chặn cài đặt, quyết ở đây vì chỉ chỗ này nhìn thấy state của engine.
  function whyCannotInstall(){
    if(engine.s.session)
      return 'Đang chạy phiên tập trung. Cài bản mới phải đóng ứng dụng, và đóng giữa phiên là mất toàn bộ credit đang tích lũy.';
    if(engine.s.lockUntil&&engine.s.lockUntil>Date.now())
      return 'Đang trong chế độ khóa. Trong lúc ứng dụng tắt để cài, phần chặn ứng dụng Windows sẽ ngừng hoạt động — chặn website thì vẫn còn vì tiện ích tự giữ.';
    return null;
  }
  try{
    const {autoUpdater}=require('electron-updater');
    updater=createUpdater({app,autoUpdater,onChange:()=>broadcast(),canInstall:whyCannotInstall});
    updater.start();
  }catch(e){ updater=null; }  // hỏng cập nhật không bao giờ được làm app không mở lên

  const windowBackground=()=>nativeTheme.shouldUseDarkColors?'#0b0b0b':'#ffffff';
  const extensionConnected=()=>!!wss&&[...wss.clients].some(ws=>ws.authed&&ws.readyState===WebSocket.OPEN&&Date.now()-(ws.appliedAt||0)<5000);
  const snapshot=()=>({...engine.snapshot(),system:{extensionConnected:extensionConnected(),bridgeError,platform:process.platform,version:app.getVersion(),update:updater?updater.snapshot():null}});
  const broadcast=()=>{if(win&&!win.isDestroyed())win.webContents.send('state',snapshot());if(wss)for(const ws of wss.clients)if(ws.authed&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(engine.rules()));};

  // Kiểm lại bản quyền với máy chủ hai tuần một lần. Chạy trễ và không chờ: khởi động
  // không bao giờ được phụ thuộc vào mạng. Không nối được thì bản ghi giữ nguyên.
  setTimeout(()=>{license.revalidate().then(r=>{if(r&&r.changed&&r.record){saveLicense(r.record);broadcast();}}).catch(()=>{});},20000).unref?.();

  // Kích hoạt bằng link. Ba điều phải giữ:
  //   1. Bấm lại link cũ không được làm gì cả — khách hay bấm nhầm nút trong email.
  //   2. Đổi sang mã khác thì trả lượt của mã cũ về máy chủ trước, nếu không mã cũ
  //      vĩnh viễn mất một lượt cho một máy không còn dùng nó.
  //   3. Hỏng thế nào cũng chỉ là một dòng thông báo. Không hộp thoại, không đóng app.
  onDeepLink=async key=>{
    if(win&&!win.isDestroyed()){if(win.isMinimized())win.restore();win.show();win.focus();}
    const noi=r=>{if(win&&!win.isDestroyed())win.webContents.send('activation',r);};
    const dang=license.stored();
    if(dang&&dang.key===key&&dang.status==='active')
      return noi({ok:true,message:'Máy này đã kích hoạt bằng đúng mã đó rồi.'});
    try{
      if(dang&&dang.key&&dang.key!==key&&dang.instanceId) await license.deactivate();
      const r=await license.verify(key);
      if(r.ok){saveLicense(r.record);broadcast();}
      noi(r.ok?{ok:true,message:r.message}:{ok:false,message:r.error});
    }catch(err){noi({ok:false,message:err.message});}
  };
  // Khởi động nguội: Windows nhét link vào argv của tiến trình đầu tiên.
  takeLink(license.keyFromArgv(process.argv));
  if(pendingKey){const k=pendingKey;pendingKey=null;onDeepLink(k);}
  server=http.createServer((req,res)=>{res.writeHead(404);res.end();});
  wss=new WebSocketServer({noServer:true,maxPayload:4096});
  server.on('upgrade',(req,socket,head)=>{
    if(req.url!=='/bridge'||!/^chrome-extension:\/\/[a-p]{32}$/.test(req.headers.origin||'')){socket.destroy();return;}
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));
  });
  wss.on('connection',ws=>{
    const deadline=setTimeout(()=>{if(!ws.authed)ws.close();},3000);
    ws.on('message',raw=>{try {const m=JSON.parse(raw);if(!ws.authed){const a=Buffer.from(String(m.token||'')),b=Buffer.from(engine.s.token);if(a.length!==b.length||!crypto.timingSafeEqual(a,b)){ws.close();return;}ws.authed=true;clearTimeout(deadline);ws.send(JSON.stringify(engine.rules()));if(!engine.s.paired){engine.s.paired=true;engine.commit();}}else if(m.applied!==undefined){ws.appliedAt=m.applied===true?Date.now():0;}}catch{ws.close();}});
    ws.on('error',()=>{});ws.on('close',()=>clearTimeout(deadline));
  });
  server.on('error',e=>{bridgeError=`Cổng ${PORT}: ${e.code}. Tiện ích chưa kết nối được.`;broadcast();});
  server.listen(PORT,'127.0.0.1');
  const fromWindow=(event,window)=>!!window&&!window.isDestroyed()&&event.sender===window.webContents&&event.senderFrame===window.webContents.mainFrame;
  function verify(event){if(!fromWindow(event,win))throw Error('Không được phép.');}
  ipcMain.handle('state',e=>{verify(e);return snapshot();});
  ipcMain.handle('listApps',async e=>{verify(e);return listWindows();});
  ipcMain.handle('action',(e,type,p)=>{try{
    // Lớp phủ chỉ được đổi credit cho đúng ứng dụng đang che, không có quyền của cửa sổ chính.
    const fromOverlay=fromWindow(e,overlay);
    if(fromOverlay){
      if(type!=='redeem'||!overlay.isVisible()||!blockedNow||p?.id!==blockedNow.id)
        throw Error('Không được phép.');
    }else verify(e);
    if(type==='redeem'&&!extensionConnected()&&!String(p?.id||'').startsWith('app:'))
      throw Error('Kết nối tiện ích trình duyệt trước khi đổi credit.');
    engine.action(type,p);
    if(fromOverlay)hideOverlay();
    if(type==='settings'&&p.theme!==undefined){nativeTheme.themeSource=engine.s.theme;if(win&&!win.isDestroyed())win.setBackgroundColor(windowBackground());}
    broadcast();return {ok:true,state:snapshot()};
  }catch(err){return {ok:false,error:err.message};}});
  ipcMain.handle('system',async(e,type,payload)=>{verify(e);
    if(type==='licenseActivate'){
      const result=await license.verify(payload?.key);
      if(!result.ok)throw Error(result.error);
      saveLicense(result.record);broadcast();
      return {ok:true,message:result.message};
    }
    if(type==='licenseRemove'){
      // Trả lượt kích hoạt lại cho máy chủ TRƯỚC khi xóa bản ghi, vì sau khi xóa thì
      // không còn instanceId để mà trả. Lỗi mạng không được chặn việc gỡ.
      let freed=false;try{freed=(await license.deactivate()).freed;}catch{}
      saveLicense(null);broadcast();
      return {ok:true,message:freed?'Đã gỡ mã khỏi máy này và trả lại một lượt kích hoạt.':'Đã gỡ mã bản quyền khỏi máy này.'};
    }
    if(type==='updateCheck'){if(!updater)throw Error('Không dùng được bộ cập nhật.');updater.check();return {ok:true,message:'Đang kiểm tra bản mới…'};}
    if(type==='updateDownload'){if(!updater)throw Error('Không dùng được bộ cập nhật.');const r=updater.download();if(!r.ok)throw Error(r.error);return {ok:true,message:'Đang tải bản mới…'};}
    if(type==='updateInstall'){if(!updater)throw Error('Không dùng được bộ cập nhật.');const r=updater.install();if(!r.ok)throw Error(r.error);return {ok:true,message:'Đang đóng ứng dụng để cài…'};}
    if(type==='feedbackEmail'){
      // Điền sẵn phiên bản và trạng thái kết nối để đỡ một vòng hỏi đi hỏi lại.
      // Người dùng nhìn thấy toàn bộ nội dung trước khi bấm gửi — không có gì lén.
      const than=[`Phiên bản: ${app.getVersion()}`,`Windows: ${process.getSystemVersion()}`,
        `Tiện ích: ${extensionConnected()?'đã kết nối':'chưa kết nối'}`,'','Tôi muốn góp ý:',''].join('\r\n');
      await shell.openExternal(`mailto:${EMAIL}?subject=${encodeURIComponent('Góp ý The Brain Project '+app.getVersion())}&body=${encodeURIComponent(than)}`);
      return {ok:true,message:'Đang mở ứng dụng email của bạn…'};
    }
    if(type==='openSite'){await shell.openExternal(SITE);return {ok:true};}
    if(type==='openRepo'){await shell.openExternal(REPO);return {ok:true};}
    if(type==='openPrivacy'){await shell.openExternal(SITE+'/quyen-rieng-tu');return {ok:true};}
    if(type==='feedbackIssues'){await shell.openExternal(REPO+'/issues/new');return {ok:true};}
    if(type==='copyPairing'){clipboard.writeText(engine.s.token);return {ok:true,message:'Đã sao chép mã ghép nối.'};}
    if(type==='extensionFolder'){await shell.openPath(extensionFolder);return {ok:true};}
    if(type==='reset'){
      // Nếu không chặn, xóa dữ liệu trở thành nút thoát chế độ khóa chỉ bằng một cú click.
      if(engine.s.lockUntil&&engine.s.lockUntil>Date.now())
        throw Error('Đang trong chế độ khóa. Không xóa được dữ liệu cho tới khi hết giờ khóa.');
      const result=await dialog.showMessageBox(win,{type:'warning',buttons:['Giữ dữ liệu','Xóa toàn bộ'],defaultId:0,cancelId:0,message:'Xóa credit, danh sách chặn và mã ghép nối?',detail:'Không thể hoàn tác. Tiện ích sẽ ngắt ghép nối và bỏ chặn; bạn cần ghép lại nếu muốn sử dụng tiếp.'});if(result.response===1){if(wss)for(const ws of wss.clients){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({reset:true,targets:[],grants:[]}));ws.close();}engine.s=initial();save(engine.s);for(const suffix of ['.backup','.tmp'])fs.rmSync(dataFile+suffix,{force:true});broadcast();return {ok:true,message:'Đã xóa dữ liệu.'};}return {ok:true};}
    throw Error('Thao tác không hợp lệ.');
  });
  win=new BrowserWindow({width:1000,height:720,minWidth:520,minHeight:600,icon:path.join(__dirname,'../assets/icon.png'),backgroundColor:windowBackground(),title:'The Brain Project',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  nativeTheme.on('updated',()=>{if(win&&!win.isDestroyed())win.setBackgroundColor(windowBackground());});
  win.loadFile(path.join(__dirname,'ui/index.html'));
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());
  win.on('close',e=>{if(engine.s.session&&!quitting){const choice=dialog.showMessageBoxSync(win,{type:'question',buttons:['Tiếp tục tập trung','Đóng và hủy phiên'],defaultId:0,cancelId:0,message:'Đóng ứng dụng sẽ hủy phiên và không cộng credit.'});if(choice===0)e.preventDefault();else{engine.stop('Đóng ứng dụng');quitting=true;}}});
  // Chỉ thoát sau khi cửa sổ chính thực sự đóng: lựa chọn tiếp tục tập trung vẫn được tôn trọng.
  win.on('closed',()=>{win=null;app.quit();});
  powerMonitor.on('suspend',()=>{engine.stop('Máy chuyển sang chế độ ngủ');broadcast();});
  powerMonitor.on('lock-screen',()=>{engine.stop('Máy đã khóa màn hình');broadcast();});
  // ── Chặn ứng dụng Windows ──────────────────────────────────────────────────
  // Không giết tiến trình nào. Khi ứng dụng bị chặn lên tiền cảnh thì phủ một cửa sổ
  // luôn-trên-cùng lên trên nó, đúng giao diện trang chặn website. Người dùng đổi credit
  // để mở, hoặc chọn quay lại làm việc và cửa sổ kia bị thu nhỏ.
  function overlayState(target){
    return {target:target?{id:target.id,name:target.name}:null,credits:engine.s.credits,
      packs:engine.snapshot().packs,lockUntil:engine.s.lockUntil||0,sessionActive:!!engine.s.session};
  }
  function showOverlay(target){
    if(!overlay||overlay.isDestroyed()){
      overlay=new BrowserWindow({show:false,frame:false,fullscreen:true,alwaysOnTop:true,skipTaskbar:true,
        backgroundColor:windowBackground(),
        webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
      overlay.loadFile(path.join(__dirname,'ui/overlay.html'));
      overlay.webContents.setWindowOpenHandler(()=>({action:'deny'}));
      overlay.webContents.on('will-navigate',e=>e.preventDefault());
      overlay.on('closed',()=>{overlay=null;});
    }
    blockedNow=target;
    const send=()=>{if(overlay&&!overlay.isDestroyed())overlay.webContents.send('overlay',overlayState(target));};
    if(overlay.webContents.isLoading())overlay.webContents.once('did-finish-load',send);else send();
    overlay.setAlwaysOnTop(true,'screen-saver');
    overlay.show();overlay.focus();
  }
  function hideOverlay(){blockedNow=null;if(overlay&&!overlay.isDestroyed())overlay.hide();}
  ipcMain.on('overlay',(e,choice)=>{
    if(!fromWindow(e,overlay)||choice!=='back'||!overlay.isVisible()||!blockedNow)return;
    const exe=blockedNow.exe;
    hideOverlay();
    // Yêu cầu ứng dụng tự đóng, rồi cho nó vài giây để thoát. Nếu sau khoảng đó nó vẫn còn
    // (ví dụ đang hỏi lưu file), lớp phủ quay lại — không có giấy thông hành miễn phí nào.
    if(watcher?.closeApp(exe)) closing={exe,until:Date.now()+3000};
  });
  watcher=new ForegroundWatcher();
  watcher.on('unavailable',message=>{bridgeError=bridgeError||`Không bật được chặn ứng dụng: ${message}`;broadcast();});
  const inGrace=exe=>closing.exe===exe&&closing.until>Date.now();
  watcher.on('change',({exe})=>{
    const target=inGrace(exe)?null:engine.blockedApp(exe);
    if(target){if(!blockedNow||blockedNow.id!==target.id)showOverlay(target);}
    else if(blockedNow&&exe&&exe!=='the brain project'&&exe!=='electron')hideOverlay();
  });
  watcher.start();
  // Móc cho kiểm thử: cho phép bơm sự kiện cửa sổ tiền cảnh mà không cần mở game thật.
  if(process.env.BRAIN_TEST_DIR){global.__brainWatcher=watcher;global.__brainEngine=engine;}

  interval=setInterval(()=>{
    engine.tick(powerMonitor.getSystemIdleTime());broadcast();
    // Hết giờ mở hoặc vừa bật khóa: lớp phủ phải theo kịp mà không cần đổi cửa sổ.
    const exe=watcher?.current?.exe;
    if(exe&&!inGrace(exe)){
      const target=engine.blockedApp(exe);
      if(target&&(!blockedNow||blockedNow.id!==target.id))showOverlay(target);
      // Lớp phủ tự chiếm tiền cảnh; đừng coi cửa sổ Electron đó là lý do bỏ chặn.
      else if(!target&&blockedNow&&!engine.blockedApp(blockedNow.exe))hideOverlay();
    }
    if(blockedNow&&overlay&&!overlay.isDestroyed())overlay.webContents.send('overlay',overlayState(blockedNow));
  },1000);
});
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>{quitting=true;clearInterval(interval);watcher?.stop();if(engine)engine.stop('Ứng dụng đã thoát');if(wss)for(const ws of wss.clients)ws.close();server?.close();});
}
