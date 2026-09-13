// Font của trang: tự host, preload, và không bao giờ tráo giữa chừng.
//
// Bản cũ kéo Inter từ Google Fonts với display=swap. Trang vẽ bằng Segoe UI gần một giây
// rồi Inter về và cả hero nhảy một cái: đo trên bản đang chạy được CLS 0,1834, hai cú
// dịch ở mốc 807ms và 857ms, cả hai đều rơi vào chữ (H1, .lede, .cta-meta, .topnav).
//
// Bài kiểm này dựng lại đúng tình huống tệ nhất — mạng chậm, cache trống, font chắc chắn
// về muộn — rồi đòi CLS bằng 0. display: optional làm được điều đó vì quá 100ms là trình
// duyệt giữ luôn font dự phòng tới hết vòng đời của trang.
const {chromium}=require('playwright');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'website');
const site='file:///'+dir.split(path.sep).join('/').replace(/ /g,'%20');
const EDGE=['C:','Program Files (x86)','Microsoft','Edge','Application','msedge.exe'].join(path.sep);
const PAGES=['index.html','gia.html','kich-hoat.html','quyen-rieng-tu.html','404.html'];
const NGƯỠNG_CLS=0.01;   // Google gọi dưới 0,1 là tốt; ta đòi gần như bằng 0.
const NGƯỠNG_RỘNG=0.015; // Chữ thường của font dự phòng lệch không quá 1,5% bề rộng.

const đoCLS=async(browser,url,chậm)=>{
  const ctx=await browser.newContext({viewport:{width:1280,height:900}});
  const p=await ctx.newPage();
  if(chậm){
    const cdp=await ctx.newCDPSession(p);
    await cdp.send('Network.enable');
    // Chậm hơn 3G: đủ để font 48KB không thể về trong 100ms.
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:400,downloadThroughput:50*1024,uploadThroughput:20*1024});
  }
  await p.addInitScript(()=>{
    window.__cls=0; window.__shifts=[];
    new PerformanceObserver(l=>{for(const e of l.getEntries()) if(!e.hadRecentInput){
      window.__cls+=e.value;
      window.__shifts.push({t:Math.round(e.startTime),v:+e.value.toFixed(4),
        nodes:e.sources.map(s=>s.node&&s.node.nodeName).filter(Boolean).join(',')});
    }}).observe({type:'layout-shift',buffered:true});
  });
  await p.goto(url,{waitUntil:'load'});
  await p.waitForTimeout(2500); // qua hẳn mốc mà bản cũ nhảy (807ms, 857ms)
  const r=await p.evaluate(()=>({cls:window.__cls,shifts:window.__shifts,
    interDùng:document.fonts.check('800 60px Inter')}));
  await ctx.close();
  return r;
};

(async()=>{
  // --- Kiểm tĩnh: không còn gọi ra ngoài, và mỗi trang preload đúng hai subset dùng thật.
  for(const f of PAGES){
    const s=fs.readFileSync(path.join(dir,f),'utf8');
    assert(!/fonts\.(googleapis|gstatic)\.com/.test(s),`${f} vẫn còn gọi Google Fonts`);
    for(const sub of ['inter-latin.woff2','inter-vietnamese.woff2'])
      assert(new RegExp(`rel="preload" href="/?fonts/${sub}"[^>]*as="font"[^>]*crossorigin`).test(s),`${f} thiếu preload ${sub}`);
    // 404 phục vụ cho mọi đường dẫn sai nên đường dẫn phải tuyệt đối, không thì /a/b/c hỏng hết.
    if(f==='404.html') assert(/href="\/fonts\//.test(s),'404.html phải preload bằng đường dẫn tuyệt đối');
  }
  const css=fs.readFileSync(path.join(dir,'styles.css'),'utf8');
  for(const sub of ['inter-latin','inter-latin-ext','inter-vietnamese']){
    assert(fs.existsSync(path.join(dir,'fonts',sub+'.woff2')),`thiếu file ${sub}.woff2`);
    assert(css.includes(`url(fonts/${sub}.woff2)`),`styles.css chưa khai ${sub}`);
  }
  assert.equal((css.match(/font-display: optional/g)||[]).length,3,'cả ba subset phải dùng display: optional');
  assert(!/font-display:\s*swap/.test(css),'còn sót display: swap — sẽ tráo font giữa chừng');
  assert(/size-adjust:\s*107\.45%/.test(css)&&/size-adjust:\s*106\.36%/.test(css),'thiếu size-adjust đã đo');
  const bytes=['inter-latin','inter-vietnamese'].reduce((n,s)=>n+fs.statSync(path.join(dir,'fonts',s+'.woff2')).size,0);
  assert(bytes<70*1024,`hai subset tải mặc định nặng ${Math.round(bytes/1024)}KB`);
  console.log(`Tải mặc định ${Math.round(bytes/1024)}KB (trước đây 140KB từ Google Fonts).`);

  let browser;
  const args=['--allow-file-access-from-files','--force-device-scale-factor=1'];
  try{ browser=await chromium.launch({channel:'chromium',args}); }
  catch(e){ if(!fs.existsSync(EDGE)) throw e; console.log('Dùng Edge sẵn có.'); browser=await chromium.launch({executablePath:EDGE,args}); }
  try{
    // --- Mạng chậm: font chắc chắn về muộn. Đây là tình huống từng sinh ra CLS 0,1834.
    const chậm=await đoCLS(browser,site+'/index.html',true);
    console.log(`Mạng chậm: CLS ${chậm.cls.toFixed(4)}${chậm.shifts.length?' — '+JSON.stringify(chậm.shifts):' — không có cú dịch nào'}`);
    assert(chậm.cls<=NGƯỠNG_CLS,`mạng chậm vẫn dịch chuyển CLS ${chậm.cls.toFixed(4)}`);

    // --- Mạng bình thường: font về kịp và được dùng thật.
    const nhanh=await đoCLS(browser,site+'/index.html',false);
    console.log(`Mạng thường: CLS ${nhanh.cls.toFixed(4)}, Inter được dùng: ${nhanh.interDùng}`);
    assert(nhanh.cls<=NGƯỠNG_CLS,`mạng thường vẫn dịch chuyển CLS ${nhanh.cls.toFixed(4)}`);
    assert(nhanh.interDùng,'Inter không nạp được từ thư mục fonts/');

    // --- display: optional đánh đổi: font về muộn là cả trang giữ font dự phòng. Đổi lại
    // CLS bằng 0. Phép đo dưới đây cho biết cái giá đó lớn cỡ nào ở mạng bình thường.
    let thắng=0;const lượt=5;
    for(let i=0;i<lượt;i++){ const r=await đoCLS(browser,site+'/index.html',false); if(r.interDùng) thắng++; }
    console.log(`Inter về kịp ${thắng}/${lượt} lần tải nguội ở mạng bình thường.`);
    assert(thắng>=4,`Inter chỉ về kịp ${thắng}/${lượt} lần — preload hoặc kích thước font có vấn đề`);

    // --- Mặt chữ dự phòng phải gần Inter ở cỡ chữ thường, để lần tải nguội không giãn ra.
    const p=await browser.newPage({viewport:{width:1280,height:900}});
    await p.goto(site+'/index.html');
    await p.evaluate(()=>document.fonts.ready);
    const rộng=await p.evaluate(async site=>{
      // Nạp Inter dưới một tên riêng. Không đo thẳng họ "Inter" của trang được: nó khai
      // display: optional, nên lần tải nào font về muộn là cả tài liệu — kể cả canvas —
      // giữ nguyên font dự phòng, và phép đo sẽ ra con số của font dự phòng chứ không
      // phải của Inter. Đó là bài này từng đỏ một cách ngẫu nhiên.
      const f=new FontFace('ĐoInter',`url("${site}/fonts/inter-latin.woff2")`);
      await f.load(); document.fonts.add(f);
      const c=document.createElement('canvas').getContext('2d');
      const w=g=>{c.font='400 100px '+g;return c.measureText('Tap trung de kiem credit, doi credit de mo website gay nghien.').width;};
      return {inter:w('ĐoInter'),segoe:w('"Inter dự phòng"'),arial:w('"Inter dự phòng 2"')};
    },site);
    for(const [tên,v] of [['Segoe UI',rộng.segoe],['Arial',rộng.arial]]){
      const lệch=Math.abs(v-rộng.inter)/rộng.inter;
      console.log(`Dự phòng ${tên}: rộng ${v.toFixed(1)} so với Inter ${rộng.inter.toFixed(1)} — lệch ${(lệch*100).toFixed(2)}%`);
      assert(lệch<=NGƯỠNG_RỘNG,`${tên} lệch ${(lệch*100).toFixed(2)}%, vượt ngưỡng ${NGƯỠNG_RỘNG*100}%`);
    }
    console.log('Font: đạt.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
