// Font của trang: tự host, preload, và không bao giờ tráo giữa chừng.
//
// Bản cũ kéo Inter từ Google Fonts với display=swap. Trang vẽ bằng Segoe UI gần một giây
// rồi Inter về và cả hero nhảy một cái: đo trên bản đang chạy được CLS 0,1834, hai cú
// dịch ở mốc 807ms và 857ms, cả hai đều rơi vào chữ (H1, .lede, .cta-meta, .topnav).
//
// Bài kiểm chạy ba tình huống, và đòi ba mức khác nhau vì thực tế đo được là khác nhau:
//
//   1. Font về muộn (chỉ font bị giữ 1,5 giây, phần còn lại bình thường) — CLS phải bằng 0.
//      Đây là chỗ display: optional thật sự ăn tiền: quá 100ms là trình duyệt giữ luôn font
//      dự phòng tới hết vòng đời trang. Đổi lại swap là bài này đỏ ngay.
//   2. Mạng bình thường — CLS phải bằng 0, và Inter phải về kịp.
//   3. Slow 3G (50KB/s, trễ 400ms) — đòi dưới 0,1, mức Google gọi là tốt.
//      Ở tốc độ này optional KHÔNG cứu được, và cần nói thẳng vì sao: đo được FCP ở
//      3676ms còn inter-latin.woff2 về ở 3780ms, tức chỉ sau lần vẽ đầu 96ms, nên Chrome
//      vẫn tráo. optional cho 0,0939 còn swap cho 0,0979 — gần như nhau. Thứ thật sự hạ
//      được con số ở đây là tự host và preload: bản cũ kéo font từ tên miền lạ nên đo
//      trên trang đang chạy được 0,1834.
//      Bản đã deploy, đo qua mạng thật: 0,0000.
const {chromium}=require('playwright');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const serve=require('./serve.cjs');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'website');
const EDGE=['C:','Program Files (x86)','Microsoft','Edge','Application','msedge.exe'].join(path.sep);
const PAGES=['index.html','gia.html','kich-hoat.html','quyen-rieng-tu.html','404.html'];
const NGƯỠNG_CLS=0.01;      // mạng bình thường và khi font về muộn: gần như bằng 0
const NGƯỠNG_CLS_CHẬM=0.1;  // Slow 3G: mức Google gọi là tốt
const NGƯỠNG_RỘNG=0.015;    // Chữ thường của font dự phòng lệch không quá 1,5% bề rộng.

// kiểu: 'thường' | 'chậm' (Slow 3G) | 'font-muộn' (chỉ giữ riêng font lại 1,5 giây)
const đoCLS=async(browser,url,kiểu='thường')=>{
  const ctx=await browser.newContext({viewport:{width:1280,height:900}});
  const p=await ctx.newPage();
  if(kiểu==='chậm'){
    const cdp=await ctx.newCDPSession(p);
    await cdp.send('Network.enable');
    // Slow 3G theo đúng mức DevTools dùng: 400Kbps, trễ 400ms.
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:400,downloadThroughput:50*1024,uploadThroughput:20*1024});
  }
  if(kiểu==='font-muộn'){
    // Giữ riêng font lại, mọi thứ khác bình thường. Đây là tình huống optional sinh ra để
    // xử lý: trang vẽ xong từ lâu rồi font mới về.
    await p.route('**/fonts/**',async r=>{ await new Promise(x=>setTimeout(x,1500)); await r.continue(); });
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
  // Thứ tự khai @font-face quyết định ai thắng khi hai dải cùng phủ một ký tự: khối SAU
  // thắng. latin-ext (U+0100-02BA) nuốt trọn ă đ ĩ ũ ơ ư và cả ₫, nên nếu nó đứng sau
  // vietnamese thì mọi trang tiếng Việt đều kéo về file 85KB thay cho file 10KB.
  const thứTự=['inter-latin-ext','inter-vietnamese','inter-latin'].map(x=>css.indexOf(`url(fonts/${x}.woff2)`));
  assert(thứTự[0]<thứTự[1]&&thứTự[1]<thứTự[2],
    'phải khai theo thứ tự latin-ext → vietnamese → latin, không thì vietnamese bị latin-ext giành mất');
  const bytes=['inter-latin','inter-vietnamese'].reduce((n,s)=>n+fs.statSync(path.join(dir,'fonts',s+'.woff2')).size,0);
  assert(bytes<70*1024,`hai subset tải mặc định nặng ${Math.round(bytes/1024)}KB`);
  console.log(`Tải mặc định ${Math.round(bytes/1024)}KB (trước đây 140KB từ Google Fonts).`);

  // Qua HTTP chứ không phải file://: chỉ khi đó mới biết đúng subset nào thật sự được tải.
  const {base:site,close}=await serve(dir);
  let browser;
  const args=['--force-device-scale-factor=1'];
  try{ browser=await chromium.launch({channel:'chromium',args}); }
  catch(e){ if(!fs.existsSync(EDGE)) throw e; console.log('Dùng Edge sẵn có.'); browser=await chromium.launch({executablePath:EDGE,args}); }
  try{
    // --- Font về muộn: đúng việc mà display: optional sinh ra để làm.
    const muộn=await đoCLS(browser,site+'/index.html','font-muộn');
    console.log(`Font về muộn 1,5s: CLS ${muộn.cls.toFixed(4)}${muộn.shifts.length?' — '+JSON.stringify(muộn.shifts):' — không có cú dịch nào'}`);
    assert(muộn.cls<=NGƯỠNG_CLS,`font về muộn mà trang vẫn tráo giữa chừng: CLS ${muộn.cls.toFixed(4)}`);

    // --- Slow 3G: optional không cứu được ở đây, xem ghi chú đầu file. Đòi mức "tốt".
    const chậm=await đoCLS(browser,site+'/index.html','chậm');
    console.log(`Slow 3G: CLS ${chậm.cls.toFixed(4)}${chậm.shifts.length?' — '+JSON.stringify(chậm.shifts):' — không có cú dịch nào'}`);
    assert(chậm.cls<=NGƯỠNG_CLS_CHẬM,`Slow 3G vượt mức tốt: CLS ${chậm.cls.toFixed(4)}`);

    // --- Mạng bình thường: font về kịp và được dùng thật.
    const nhanh=await đoCLS(browser,site+'/index.html','thường');
    console.log(`Mạng thường: CLS ${nhanh.cls.toFixed(4)}, Inter được dùng: ${nhanh.interDùng}`);
    assert(nhanh.cls<=NGƯỠNG_CLS,`mạng thường vẫn dịch chuyển CLS ${nhanh.cls.toFixed(4)}`);
    assert(nhanh.interDùng,'Inter không nạp được từ thư mục fonts/');

    // --- display: optional đánh đổi: font về muộn là cả trang giữ font dự phòng. Đổi lại
    // CLS bằng 0. Phép đo dưới đây cho biết cái giá đó lớn cỡ nào ở mạng bình thường.
    let thắng=0;const lượt=5;
    for(let i=0;i<lượt;i++){ const r=await đoCLS(browser,site+'/index.html','thường'); if(r.interDùng) thắng++; }
    console.log(`Inter về kịp ${thắng}/${lượt} lần tải nguội ở mạng bình thường.`);
    assert(thắng>=4,`Inter chỉ về kịp ${thắng}/${lượt} lần — preload hoặc kích thước font có vấn đề`);

    // --- Mặt chữ dự phòng phải gần Inter ở cỡ chữ thường, để lần tải nguội không giãn ra.
    const p=await browser.newPage({viewport:{width:1280,height:900}});
    await p.goto(site+'/index.html');
    await p.evaluate(()=>document.fonts.ready);
    // Subset latin-ext chỉ được tải khi trang thật sự có ký tự riêng của nó. Đây là chỗ
    // dễ mất tiền nhất mà không ai thấy: dải U+0100-02BA của latin-ext nuốt trọn ă đ ĩ ũ
    // ơ ư, nên chỉ cần khai sai thứ tự là mọi trang tiếng Việt kéo về file 85KB thay cho
    // file 10KB — đúng chuyện đã xảy ra ở lần deploy đầu (140KB font cho một trang không
    // dùng ký tự latin-ext nào).
    {
      const ctx=await browser.newContext({viewport:{width:1280,height:900}});
      const q=await ctx.newPage();
      const đãTải=[];
      q.on('request',r=>{if(r.url().includes('/fonts/'))đãTải.push(r.url().split('/').pop());});
      await q.goto(site+'/index.html',{waitUntil:'load'});
      await q.evaluate(()=>document.fonts.ready);
      await q.waitForTimeout(800);
      console.log('Subset đã tải:',đãTải.join(', ')||'(không có)');
      assert(đãTải.includes('inter-latin.woff2')&&đãTải.includes('inter-vietnamese.woff2'),
        'phải tải latin và vietnamese');
      assert(!đãTải.includes('inter-latin-ext.woff2'),
        'latin-ext bị tải dù trang không dùng ký tự riêng nào của nó — kiểm lại thứ tự khai @font-face');
      await ctx.close();
    }

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
  } finally { await browser.close(); await close(); }
})().catch(e=>{console.error(e);process.exit(1)});
