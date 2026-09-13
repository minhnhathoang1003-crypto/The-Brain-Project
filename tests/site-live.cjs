// Đo lại trên bản đã deploy, không phải trên file ở máy.
//
// Mọi con số trong tests/site-font.cjs và tests/site-media.cjs đều đo trên file://,
// nơi không có độ trễ mạng, không có CDN, không có header cache. Bài này đi ra ngoài
// thật để kiểm ba thứ chỉ bản live mới trả lời được: font và phim có được phục vụ đúng
// kiểu MIME và đúng header cache không, ảnh nào thật sự được tải về, và CLS thật là
// bao nhiêu — con số 0,1834 từng đo được là đo ở đây chứ không phải ở máy.
//
// Chạy: node tests/site-live.cjs [https://...]
const {chromium}=require('playwright');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const EDGE=['C:','Program Files (x86)','Microsoft','Edge','Application','msedge.exe'].join(path.sep);
const URL_=process.argv[2]||process.env.BRAIN_SITE||'https://the-brain-project.vercel.app';
const NGƯỠNG_CLS=0.01;

(async()=>{
  let browser;
  try{ browser=await chromium.launch({channel:'chromium'}); }
  catch(e){ if(!fs.existsSync(EDGE)) throw e; console.log('Dùng Edge sẵn có.'); browser=await chromium.launch({executablePath:EDGE}); }
  try{
    for(const [dpr,tên] of [[2,'màn 2×'],[1,'màn thường']]){
      const ctx=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:dpr});
      const p=await ctx.newPage();
      const tải=[];
      p.on('response',async r=>{
        const u=new URL(r.url());
        if(/\/(fonts|images|video)\//.test(u.pathname))
          tải.push({p:u.pathname,ct:r.headers()['content-type']||'',cc:r.headers()['cache-control']||'',
            n:Number(r.headers()['content-length']||0),status:r.status()});
      });
      await p.addInitScript(()=>{
        window.__cls=0;window.__shifts=[];
        new PerformanceObserver(l=>{for(const e of l.getEntries()) if(!e.hadRecentInput){
          window.__cls+=e.value;
          window.__shifts.push({t:Math.round(e.startTime),v:+e.value.toFixed(4),
            nodes:e.sources.map(s=>s.node&&s.node.nodeName).filter(Boolean).join(',')});
        }}).observe({type:'layout-shift',buffered:true});
      });
      await p.goto(URL_,{waitUntil:'load'});
      await p.waitForTimeout(3500); // qua hẳn mốc 807ms và 857ms mà bản cũ nhảy
      const r=await p.evaluate(()=>({cls:window.__cls,shifts:window.__shifts,
        inter:document.fonts.check('800 60px Inter'),
        hero:document.querySelector('#gallery-img')?.currentSrc.split('/').pop()}));

      console.log(`\n── ${tên} ──`);
      console.log(`CLS ${r.cls.toFixed(4)}${r.shifts.length?' — '+JSON.stringify(r.shifts):' — không có cú dịch nào'}`);
      assert(r.cls<=NGƯỠNG_CLS,`CLS ${r.cls.toFixed(4)} trên bản live`);
      assert(r.inter,'Inter không được dùng trên bản live');

      const font=tải.filter(x=>x.p.startsWith('/fonts/'));
      const ảnh=tải.filter(x=>x.p.startsWith('/images/'));
      const phim=tải.filter(x=>x.p.startsWith('/video/'));
      const tổng=n=>n.reduce((s,x)=>s+x.n,0);
      console.log(`font  ${font.length} file, ${(tổng(font)/1024).toFixed(0)}KB: ${font.map(f=>f.p.split('/').pop()).join(', ')}`);
      console.log(`ảnh   ${ảnh.length} file, ${(tổng(ảnh)/1024).toFixed(0)}KB: ${ảnh.map(f=>f.p.split('/').pop()).join(', ')}`);
      console.log(`phim  ${phim.length} file (lúc mới vào trang, trước khi bấm phát)`);

      for(const f of font){
        assert.equal(f.status,200,`${f.p} trả về ${f.status}`);
        assert.match(f.ct,/font\/woff2|application\/font-woff2/,`${f.p} sai content-type: ${f.ct}`);
        assert.match(f.cc,/immutable/,`${f.p} thiếu cache immutable: ${f.cc}`);
      }
      assert(font.length<=2,`tải ${font.length} subset font, chỉ nên có latin + vietnamese`);
      assert(tổng(font)<70*1024,`font nặng ${(tổng(font)/1024).toFixed(0)}KB`);
      // latin-ext chỉ nên tải khi trang thật sự có ký tự trong khoảng đó.
      assert(!font.some(f=>f.p.includes('latin-ext')),'tải cả latin-ext dù trang không dùng ký tự nào của nó');

      // Đúng bậc ảnh cho đúng màn hình.
      const poster=ảnh.find(x=>x.p.includes('demo-poster'));
      assert(poster,'không tải poster của đoạn phim');
      assert.match(poster.cc,/immutable/,`poster thiếu cache immutable: ${poster.cc}`);
      const bậc=ảnh.map(x=>x.p).filter(x=>/-\d+\.webp$/.test(x)).map(x=>+x.match(/-(\d+)\.webp$/)[1]);
      if(bậc.length) console.log(`      bậc ảnh đã tải: ${[...new Set(bậc)].join(', ')}`);
      assert(!bậc.includes(dpr===1?1864:466),`${tên} mà lại tải bậc ${dpr===1?1864:466}`);
      await ctx.close();
    }

    // Phim: chỉ kiểm bằng một lượt tải thẳng, vì trang để preload="none".
    const ctx=await browser.newContext();
    const p=await ctx.newPage();
    for(const [f,kiểu] of [['/video/demo.mp4',/video\/mp4/],['/video/demo.webm',/video\/webm/]]){
      const r=await p.request.get(URL_+f);
      assert.equal(r.status(),200,`${f} trả về ${r.status()}`);
      assert.match(r.headers()['content-type']||'',kiểu,`${f} sai content-type`);
      assert.match(r.headers()['cache-control']||'',/immutable/,`${f} thiếu cache immutable`);
      console.log(`\n${f}  ${(Number(r.headers()['content-length']||0)/1024).toFixed(0)}KB  ${r.headers()['content-type']}`);
    }
    await ctx.close();
    console.log('\nBản live: đạt.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
