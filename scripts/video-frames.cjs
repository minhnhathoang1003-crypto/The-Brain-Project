// Trích vài khung từ đoạn phim đã dựng, để xem lại bằng mắt.
// ffmpeg đi kèm Playwright không có bộ mã hoá ảnh nào, nên nhờ trình duyệt vẽ ra webp.
// Chạy: node scripts/video-frames.cjs [thư-mục-ra]
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..');
const EDGE=['C:','Program Files (x86)','Microsoft','Edge','Application','msedge.exe'].join(path.sep);
const MOC=[0,1.5,3.0,3.6,5.5,7.5,9.5,11.2];

(async()=>{
  const ra=process.argv[2]||path.join(root,'test-results','video');
  fs.mkdirSync(ra,{recursive:true});
  const phim=path.join(root,'website','video','demo.mp4');
  if(!fs.existsSync(phim)) throw new Error('chưa có website/video/demo.mp4');
  let br; try{ br=await chromium.launch({channel:'chromium'}); }
  catch(e){ if(!fs.existsSync(EDGE)) throw e; br=await chromium.launch({executablePath:EDGE}); }
  const page=await br.newPage();
  await page.goto('about:blank');
  await page.evaluate(b64=>{
    const bin=atob(b64);const u=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
    window.__src=URL.createObjectURL(new Blob([u],{type:'video/mp4'}));
  },fs.readFileSync(phim).toString('base64'));
  const ket=await page.evaluate(async moc=>{
    const v=document.createElement('video');v.src=window.__src;v.muted=true;
    await new Promise((r,j)=>{v.onloadedmetadata=r;v.onerror=()=>j(new Error('không mở được mp4'));});
    const cv=document.createElement('canvas');cv.width=736;cv.height=510;
    const g=cv.getContext('2d',{alpha:false});
    const ra=[];
    for(const t of moc){
      if(t>v.duration) continue;
      v.currentTime=t;await new Promise(r=>{v.onseeked=r;});
      g.drawImage(v,0,0,cv.width,cv.height);
      ra.push({t,data:cv.toDataURL('image/webp',0.9).split(',')[1]});
    }
    return {dai:v.duration,w:v.videoWidth,h:v.videoHeight,ra};
  },MOC);
  for(const k of ket.ra){
    const f=path.join(ra,`t${String(k.t).replace('.','_')}s.webp`);
    fs.writeFileSync(f,Buffer.from(k.data,'base64'));
    console.log('  ',f);
  }
  console.log(`Phim ${ket.w}×${ket.h}, dài ${ket.dai.toFixed(2)}s — ${ket.ra.length} khung đã trích.`);
  await br.close();
})().catch(e=>{console.error(e);process.exit(1)});
