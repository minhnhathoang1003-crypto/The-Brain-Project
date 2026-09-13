// Quay đoạn phim ngắn cho trang giới thiệu, từ chính ứng dụng thật.
//
// Lý do có nó: thứ đáng xem nhất của phần mềm này đều diễn ra theo thời gian — credit
// nhích lên từng giây, đồng hồ đếm ngược, dòng "dừng lúc này là mất chừng đó" đổi số
// theo. Ảnh tĩnh không kể được cái nào trong số đó; người xem phải tự tưởng tượng đúng
// phần hay nhất. Trang cũ có 0 thẻ <video> và 0 @keyframes.
//
// Cách làm:
//   1. CDP Page.startScreencast lấy từng khung hình JPEG của cửa sổ Electron thật.
//      (recordVideo của Playwright không dùng được với Electron: bật lên là cửa sổ trả
//      về url rỗng và mọi thao tác treo — đã thử và bỏ.)
//   2. Chọn khung theo một kịch bản thời gian: đoạn thao tác giữ tốc độ thật, quãng ngồi
//      tập trung tua nhanh 20 lần. Vẫn là cảnh quay thật, chỉ bỏ bớt khung ở giữa.
//   3. ffmpeg của Playwright ghép thành WebM/VP8.
//   4. MediaRecorder của Chromium chuyển tiếp sang MP4/H.264 cho Safari cũ, và cắt khung
//      đầu làm poster.
//
// Chạy: node scripts/demo-video.cjs
const {_electron:electron,chromium}=require('playwright');
const {WebSocket}=require('ws');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const ra=path.join(root,'website','video');
const tam=fs.mkdtempSync(path.join(os.tmpdir(),'brain-video-'));
const khung=path.join(tam,'khung');fs.mkdirSync(khung,{recursive:true});
const EDGE=['C:','Program Files (x86)','Microsoft','Edge','Application','msedge.exe'].join(path.sep);
const FF=path.join(os.homedir(),'AppData','Local','ms-playwright','ffmpeg-1011','ffmpeg-win64.exe');

const W=1472, H=1020;   // số chẵn cả hai chiều, H.264 đòi thế
const FPS=30;
const A=3.4;            // thao tác, tốc độ thật
const B=140;            // ngồi tập trung, sẽ tua nhanh
const TUA=20;
const C=1.0;            // một nhịp cuối ở tốc độ thật cho con số kịp đọc

// Đổi thời điểm trong đoạn phim thành thời điểm trong cảnh quay gốc.
const nguonTai=ot=>{
  if(ot<A) return ot;
  const bDai=B/TUA;
  if(ot<A+bDai) return A+(ot-A)*TUA;
  return A+B+(ot-(A+bDai));
};

const quay=async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'brain-video-data-'));
  const env={...process.env,BRAIN_TEST_DIR:dir,BRAIN_TEST_PORT:'47862',BRAIN_TIER:'pro'};
  delete env.ELECTRON_RUN_AS_NODE;
  const app=await electron.launch({args:[root],env});
  const page=await app.firstWindow();
  let ws;
  try{
    await page.locator('.gate').waitFor();
    const secret=await app.evaluate(({safeStorage},bytes)=>JSON.parse(safeStorage.decryptString(Buffer.from(bytes))).token,
      Array.from(fs.readFileSync(path.join(dir,'brain-data.enc'))));
    ws=new WebSocket('ws://127.0.0.1:47862/bridge',{origin:'chrome-extension://'+'a'.repeat(32)});
    await new Promise((res,rej)=>{ws.on('open',()=>ws.send(JSON.stringify({token:secret})));ws.once('message',res);ws.on('error',rej);});
    ws.on('message',()=>ws.send(JSON.stringify({applied:true})));ws.send(JSON.stringify({applied:true}));
    await page.locator('main.split').waitFor();
    await page.waitForFunction(()=>document.querySelector('#status').textContent==='Đang chặn 4 website');
    await app.evaluate(({BrowserWindow},s)=>BrowserWindow.getAllWindows()[0].setContentSize(s[0],s[1]),[W,H]);
    await page.waitForTimeout(2000);

    const cdp=await page.context().newCDPSession(page);
    const ds=[];let t0=0,đếm=0;
    cdp.on('Page.screencastFrame',async f=>{
      try{ await cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId}); }catch(e){}
      if(!t0) return;
      const t=(Date.now()-t0)/1000;
      const p=path.join(khung,String(++đếm).padStart(6,'0')+'.jpg');
      fs.writeFileSync(p,Buffer.from(f.data,'base64'));
      ds.push({t,p});
    });
    await cdp.send('Page.startScreencast',{format:'jpeg',quality:95,maxWidth:W,maxHeight:H,everyNthFrame:1});
    await page.waitForTimeout(700);

    // Screencast chỉ phát khung khi có gì đó vẽ lại. Nhịp mở đầu là một màn hình đứng im
    // nên nó không phát khung nào, và đoạn phim sẽ bắt đầu ngay giữa cú bấm đầu tiên.
    // Chụp tay một khung làm mốc 0 để có nhịp mở đầu tử tế.
    {
      const {data}=await cdp.send('Page.captureScreenshot',{format:'jpeg',quality:95});
      const p0=path.join(khung,'000000.jpg');
      fs.writeFileSync(p0,Buffer.from(data,'base64'));
      ds.push({t:0,p:p0});
    }
    t0=Date.now();
    // Mốc 25 phút vốn đã được chọn sẵn, bấm vào nó thì trên phim chẳng thấy gì đổi.
    // Bấm sang 50 rồi quay lại 25 mới cho thấy đây là những nút bấm được thật.
    await page.waitForTimeout(900);
    await page.getByRole('button',{name:'50 phút',exact:true}).click();
    await page.waitForTimeout(900);
    await page.getByRole('button',{name:'25 phút',exact:true}).click();
    await page.waitForTimeout(800);
    await app.evaluate(({powerMonitor})=>{powerMonitor.getSystemIdleTime=()=>0;});
    await page.getByRole('button',{name:/Bắt đầu tập trung/}).click();
    await page.locator('.earning').waitFor();
    await page.waitForTimeout((A+B+C)*1000-(Date.now()-t0)+400);

    console.log('  kết ở:',await page.evaluate(()=>document.querySelector('#earning')?.textContent));
    await cdp.send('Page.stopScreencast');
    await page.waitForTimeout(200);
    // Mốc thời gian thật, để dựng lại phim sau này không phải ngồi quay thêm ba phút.
    fs.writeFileSync(path.join(khung,'moc.json'),JSON.stringify(ds.map(d=>[d.t,path.basename(d.p)])));
    console.log('  khung + mốc:',khung);
    return ds;
  } finally {
    if(ws) try{ws.close()}catch(e){}
    await app.close().catch(()=>{});
  }
};

const ghep=ds=>{
  const tong=Math.round((A+B/TUA+C)*FPS);
  const chon=[];
  let i=0;
  for(let k=0;k<tong;k++){
    const st=nguonTai(k/FPS);
    while(i+1<ds.length&&ds[i+1].t<=st) i++;
    chon.push(ds[i].p);
  }
  console.log(`  ${ds.length} khung gốc → ${chon.length} khung phim (${(tong/FPS).toFixed(1)}s ở ${FPS}fps)`);
  fs.mkdirSync(ra,{recursive:true});
  const dich=path.join(ra,'demo.webm');
  // Nối các JPEG thành một luồng rồi cho ffmpeg đọc. Phải chỉ đích danh -c:v mjpeg:
  // bản ffmpeg đi kèm Playwright bị cắt gọn, tự dò thì nó báo "unknown codec".
  const luong=path.join(tam,'khung.mjpg');
  const out=fs.openSync(luong,'w');
  for(const f of chon) fs.writeSync(out,fs.readFileSync(f));
  fs.closeSync(out);
  const r=spawnSync(FF,['-y','-f','image2pipe','-c:v','mjpeg','-framerate',String(FPS),'-i',luong,
    '-c:v','libvpx','-crf','32','-b:v','900k','-qmin','0','-qmax','50','-deadline','good','-cpu-used','2',
    '-auto-alt-ref','0','-pix_fmt','yuv420p','-an',dich],{maxBuffer:1<<30});
  if(r.status!==0){console.error(r.stderr.toString().split('\n').slice(-12).join('\n'));throw new Error('ffmpeg hỏng');}
  console.log(`  webm: ${(fs.statSync(dich).size/1024).toFixed(0)}KB`);
  return dich;
};

const sangMp4=async webm=>{
  let br; try{ br=await chromium.launch({channel:'chromium'}); }
  catch(e){ if(!fs.existsSync(EDGE)) throw e; console.log('  Dùng Edge sẵn có.'); br=await chromium.launch({executablePath:EDGE}); }
  const page=await br.newPage();
  await page.goto('about:blank');
  await page.evaluate(b64=>{
    const bin=atob(b64);const u=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
    window.__src=URL.createObjectURL(new Blob([u],{type:'video/webm'}));
  },fs.readFileSync(webm).toString('base64'));
  const ket=await page.evaluate(async ({W,H,loai,bitrate})=>{
    const v=document.createElement('video');
    v.src=window.__src;v.muted=true;v.playsInline=true;
    await new Promise((r,j)=>{v.onloadedmetadata=r;v.onerror=()=>j(new Error('không đọc được webm'));});
    const cv=document.createElement('canvas');cv.width=W;cv.height=H;
    const g=cv.getContext('2d',{alpha:false});
    const rec=new MediaRecorder(cv.captureStream(30),{mimeType:loai,videoBitsPerSecond:bitrate});
    const mieng=[];rec.ondataavailable=e=>{if(e.data.size)mieng.push(e.data);};
    v.currentTime=0;await new Promise(r=>{v.onseeked=r;});
    g.drawImage(v,0,0,W,H);
    const poster=cv.toDataURL('image/webp',0.88).split(',')[1];
    rec.start();await v.play();
    await new Promise(xong=>{const nhip=()=>{
      if(v.ended){g.drawImage(v,0,0,W,H);setTimeout(()=>{rec.stop();xong();},200);return;}
      g.drawImage(v,0,0,W,H);requestAnimationFrame(nhip);};requestAnimationFrame(nhip);});
    await new Promise(r=>{rec.onstop=r;});
    const blob=new Blob(mieng,{type:loai});
    const b64=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result.split(',')[1]);fr.readAsDataURL(blob);});
    return {b64,poster,dai:v.duration};
  },{W,H,loai:'video/mp4;codecs=avc1.42E01E',bitrate:3_200_000});
  fs.writeFileSync(path.join(ra,'demo.mp4'),Buffer.from(ket.b64,'base64'));
  fs.writeFileSync(path.join(root,'website','images','demo-poster.webp'),Buffer.from(ket.poster,'base64'));
  console.log(`  mp4: ${(fs.statSync(path.join(ra,'demo.mp4')).size/1024).toFixed(0)}KB, dài ${ket.dai.toFixed(1)}s`);
  console.log(`  poster: ${(fs.statSync(path.join(root,'website','images','demo-poster.webp')).size/1024).toFixed(0)}KB`);
  await br.close();
};

(async()=>{
  if(!fs.existsSync(FF)) throw new Error(`không thấy ffmpeg ở ${FF} — chạy: npx playwright install ffmpeg`);
  // --frames=<thư-mục> dựng lại phim từ lượt quay trước, khỏi ngồi quay thêm ba phút nữa.
  const lai=(process.argv.find(a=>a.startsWith('--frames='))||'').slice(9);
  let ds;
  if(lai){
    // Bắt buộc phải có moc.json: screencast chỉ phát khung khi màn hình đổi, nên khoảng
    // cách giữa các khung rất không đều. Chia đều ra là dựng sai hẳn nhịp phim.
    const moc=path.join(lai,'moc.json');
    if(!fs.existsSync(moc)) throw new Error(`${lai} không có moc.json — phải quay lại`);
    ds=JSON.parse(fs.readFileSync(moc,'utf8')).map(([t,f])=>({t,p:path.join(lai,f)}));
    console.log(`Dùng lại ${ds.length} khung ở ${lai}`);
  } else {
    console.log(`Đang quay ứng dụng thật, mất khoảng ${Math.round((A+B+C)/60*10)/10} phút…`);
    ds=await quay();
  }
  const webm=ghep(ds);
  await sangMp4(webm);
  console.log('Xong.');
})().catch(e=>{console.error(e);process.exit(1)});
