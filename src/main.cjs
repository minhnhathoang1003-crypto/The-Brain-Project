const {app,BrowserWindow,ipcMain,powerMonitor,safeStorage,dialog,shell,clipboard,nativeTheme}=require('electron');
const fs=require('node:fs'); const path=require('node:path'); const http=require('node:http'); const crypto=require('node:crypto');
const {WebSocketServer,WebSocket}=require('ws'); const {Engine,initial,migrate,VERSION,WELCOME_CREDITS}=require('./engine.cjs');
if(process.env.BRAIN_TEST_DIR) app.setPath('userData',process.env.BRAIN_TEST_DIR);
// Windows ghép cửa sổ với shortcut đã ghim qua id này. Thiếu nó, taskbar coi app là một
// chương trình lạ và hiện icon mặc định thay vì icon của shortcut.
app.setAppUserModelId('com.humanos.brain');
if(!app.requestSingleInstanceLock()) {app.quit();} else {
let win,engine,server,wss,interval,bridgeError=null,quitting=false;
const PORT=process.env.BRAIN_TEST_DIR?Number(process.env.BRAIN_TEST_PORT||47831):47831;
app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.show();win.focus();}});
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
  const windowBackground=()=>nativeTheme.shouldUseDarkColors?'#0b0b0b':'#ffffff';
  const extensionConnected=()=>!!wss&&[...wss.clients].some(ws=>ws.authed&&ws.readyState===WebSocket.OPEN&&Date.now()-(ws.appliedAt||0)<5000);
  const snapshot=()=>({...engine.snapshot(),system:{extensionConnected:extensionConnected(),bridgeError,platform:process.platform,version:app.getVersion()}});
  const broadcast=()=>{if(win&&!win.isDestroyed())win.webContents.send('state',snapshot());if(wss)for(const ws of wss.clients)if(ws.authed&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(engine.rules()));};
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
  function verify(event){if(!win||event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame)throw Error('Không được phép.');}
  ipcMain.handle('state',e=>{verify(e);return snapshot();});
  ipcMain.handle('action',(e,type,p)=>{verify(e);try{
    if(type==='redeem'&&!extensionConnected())throw Error('Kết nối tiện ích trình duyệt trước khi đổi credit.');
    engine.action(type,p);
    if(type==='settings'&&p.theme!==undefined){nativeTheme.themeSource=engine.s.theme;if(win&&!win.isDestroyed())win.setBackgroundColor(windowBackground());}
    broadcast();return {ok:true,state:snapshot()};
  }catch(err){return {ok:false,error:err.message};}});
  ipcMain.handle('system',async(e,type)=>{verify(e);
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
  powerMonitor.on('suspend',()=>{engine.stop('Máy chuyển sang chế độ ngủ');broadcast();});
  powerMonitor.on('lock-screen',()=>{engine.stop('Máy đã khóa màn hình');broadcast();});
  interval=setInterval(()=>{
    engine.tick(powerMonitor.getSystemIdleTime());broadcast();
  },1000);
});
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>{quitting=true;clearInterval(interval);if(engine)engine.stop('Ứng dụng đã thoát');if(wss)for(const ws of wss.clients)ws.close();server?.close();});
}
