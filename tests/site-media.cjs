// Ảnh và phim của trang giới thiệu: đúng cỡ, không thừa byte, và dừng được.
//
// Bản cũ chỉ có một file mỗi ảnh. Đo trên bản đang chạy: main.webp rộng 1479px thật
// nhưng ô chứa nó rộng 916 CSS px, tức 1832 điểm ảnh trên màn 2× — thiếu 24%, mờ trên
// mọi máy retina; còn logo.webp 128px hiển thị ở 56 điểm ảnh, thừa 129%. Không trang nào
// có srcset nên điện thoại 360px cũng tải đúng file dành cho màn hình lớn.
//
// Bài này kiểm cả hai đầu: đủ nét ở màn 2×, và không tải thừa ở màn thường.
const {chromium}=require('playwright');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'website');
const site='file:///'+dir.split(path.sep).join('/').replace(/ /g,'%20');
const EDGE=['C:','Program Files (x86)','Microsoft','Edge','Application','msedge.exe'].join(path.sep);
const THIEU=0.95;  // ảnh phải phủ ít nhất 95% số điểm ảnh mà màn hình cần
const THUA=1.6;    // và không được rộng quá 1,6 lần — quá đó là tải thừa

const nap=async(browser,dpr,rong)=>{
  const ctx=await browser.newContext({viewport:{width:rong,height:900},deviceScaleFactor:dpr});
  const p=await ctx.newPage();
  await p.goto(site+'/index.html');
  await p.evaluate(()=>document.fonts.ready);
  await p.waitForTimeout(400);
  return {ctx,p};
};

(async()=>{
  // --- Kiểm tĩnh: mọi ứng viên srcset đều có thật trên đĩa.
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  const js=fs.readFileSync(path.join(dir,'app.js'),'utf8');
  const ungVien=[...html.matchAll(/srcset="([^"]+)"/g),...js.matchAll(/srcset: '([^']+)'/g)]
    .flatMap(m=>m[1].split(',').map(x=>x.trim().split(/\s+/)[0]));
  assert(ungVien.length>=10,`chỉ thấy ${ungVien.length} ứng viên srcset`);
  for(const f of new Set(ungVien))
    assert(fs.existsSync(path.join(dir,f)),`srcset trỏ vào file không có: ${f}`);
  for(const f of ['video/demo.webm','video/demo.mp4','images/demo-poster.webp'])
    assert(fs.existsSync(path.join(dir,f)),`thiếu ${f}`);
  const mp4=fs.statSync(path.join(dir,'video','demo.mp4')).size;
  const webm=fs.statSync(path.join(dir,'video','demo.webm')).size;
  console.log(`Phim: webm ${(webm/1024).toFixed(0)}KB, mp4 ${(mp4/1024).toFixed(0)}KB`);
  assert(mp4<3.5*1024*1024&&webm<3.5*1024*1024,'đoạn phim nặng quá 3,5MB');

  let browser;
  const args=['--allow-file-access-from-files'];
  try{ browser=await chromium.launch({channel:'chromium',args}); }
  catch(e){ if(!fs.existsSync(EDGE)) throw e; console.log('Dùng Edge sẵn có.'); browser=await chromium.launch({executablePath:EDGE,args}); }
  try{
    // --- Đúng cỡ ở cả màn thường lẫn màn 2×, cả desktop lẫn điện thoại.
    for(const [dpr,rong] of [[1,1440],[2,1440],[2,390],[1,390]]){
      const {ctx,p}=await nap(browser,dpr,rong);
      // Mở hết các tab ảnh để ép trình duyệt chọn ứng viên cho từng ảnh một.
      const tabs=await p.locator('.gallery-tabs button').count();
      for(let i=0;i<tabs;i++){
        await p.locator('.gallery-tabs button').nth(i).click();
        // naturalWidth KHÔNG phải bề rộng thật của file khi ảnh dùng srcset kiểu `w`:
        // trình duyệt trả về bề rộng đã chia cho mật độ nó tự tính, nên ảnh 1864px được
        // chọn cho ô 932px luôn báo về đúng 932. Muốn biết file thật bao nhiêu thì phải
        // giải mã lại chính currentSrc bằng một thẻ Image không có srcset.
        await p.waitForFunction(()=>{const g=document.querySelector('#gallery-img');
          return g.complete&&!!g.currentSrc;},null,{timeout:10000});
        const r=await p.evaluate(async ()=>{
          const g=document.querySelector('#gallery-img');
          const u=g.currentSrc;
          const i=new Image(); i.src=u; await i.decode();
          return {src:u.split('/').pop(),tu:i.naturalWidth,hien:g.getBoundingClientRect().width};});
        const can=r.hien*dpr, ti=r.tu/can;
        assert(ti>=THIEU,`dpr${dpr} ${rong}px: ${r.src} chỉ có ${r.tu}px cho ${Math.round(can)} điểm ảnh cần (${(ti*100).toFixed(0)}%)`);
        assert(ti<=THUA,`dpr${dpr} ${rong}px: ${r.src} rộng ${r.tu}px trong khi chỉ cần ${Math.round(can)} (${(ti*100).toFixed(0)}%)`);
      }
      // Logo chỉ có một file cho mọi màn hình — 2KB thì thêm một lượt tải còn tốn hơn
      // số byte tiết kiệm được, nên nó phải vừa đủ cho màn 2× và không hơn bao nhiêu.
      // (File cũ là 128px cho một ô 28 CSS px, tức thừa 129%.)
      await p.waitForFunction(()=>{const l=document.querySelector('.brand-mark');
        return l.complete&&!!(l.currentSrc||l.src);},null,{timeout:10000});
      const lg=await p.evaluate(async ()=>{const l=document.querySelector('.brand-mark');
        const i=new Image(); i.src=l.currentSrc||l.src; await i.decode();
        return {tu:i.naturalWidth,hien:l.getBoundingClientRect().width};});
      assert(lg.tu>=lg.hien*2*THIEU,`logo chỉ ${lg.tu}px, màn 2× cần ${lg.hien*2}`);
      assert(lg.tu<=lg.hien*2*1.25,`logo ${lg.tu}px trong khi màn 2× chỉ cần ${lg.hien*2}`);
      console.log(`dpr${dpr} ${rong}px: ${tabs} ảnh đều đúng cỡ, logo ${lg.tu}px cho ${lg.hien*2} điểm ảnh ở màn 2×`);
      await ctx.close();
    }

    // --- Đoạn phim: tự chạy, lặp, không tiếng, và dừng được.
    {
      const {ctx,p}=await nap(browser,2,1440);
      const v=p.locator('#hero-video');
      const thuoc=await v.evaluate(e=>({muted:e.muted,loop:e.loop,playsInline:e.playsInline,
        poster:!!e.getAttribute('poster'),controls:e.hasAttribute('controls'),
        nguon:[...e.querySelectorAll('source')].map(s=>s.type)}));
      assert(thuoc.muted&&thuoc.loop&&thuoc.playsInline,'phim phải muted + loop + playsinline mới tự chạy được');
      assert(thuoc.poster,'phim phải có poster, không thì chỗ đó trống lúc đang tải');
      assert(thuoc.nguon.includes('video/webm')&&thuoc.nguon.includes('video/mp4'),'cần cả webm lẫn mp4');
      await p.waitForFunction(()=>{const e=document.querySelector('#hero-video');return e.currentTime>0.2;},null,{timeout:15000});
      console.log('Phim tự chạy khi vào tầm mắt.');

      // Nút dừng phải có thật và dừng thật (WCAG 2.2.2).
      const nut=p.locator('#hero-video-toggle');
      assert.equal(await nut.isVisible(),true,'phải có nút tạm dừng');
      await nut.click();
      await p.waitForFunction(()=>document.querySelector('#hero-video').paused,null,{timeout:5000});
      await p.waitForFunction(()=>/Phát/.test(document.querySelector('#hero-video-toggle').textContent),null,{timeout:5000});
      const tCa=await p.evaluate(()=>document.querySelector('#hero-video').currentTime);
      await p.waitForTimeout(700);
      assert.equal(await p.evaluate(()=>document.querySelector('#hero-video').currentTime),tCa,'dừng rồi mà phim vẫn chạy tiếp');
      await nut.click();
      await p.waitForFunction(()=>!document.querySelector('#hero-video').paused,null,{timeout:5000});
      console.log('Nút tạm dừng và phát lại: đạt.');
      await ctx.close();
    }

    // --- Giảm chuyển động: phim đứng yên ở poster và không tải một byte phim nào.
    {
      const ctx=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
      const p=await ctx.newPage();
      const taiPhim=[];
      p.on('request',r=>{if(/\/video\//.test(r.url()))taiPhim.push(r.url());});
      await p.goto(site+'/index.html');
      await p.waitForTimeout(2500);
      assert.equal(await p.evaluate(()=>document.querySelector('#hero-video').paused),true,
        'bật giảm chuyển động mà phim vẫn chạy');
      assert.deepEqual(taiPhim,[],`giảm chuyển động mà vẫn tải ${taiPhim.length} file phim`);
      // Vẫn bấm phát được nếu người xem muốn.
      await p.locator('#hero-video-toggle').click();
      await p.waitForFunction(()=>document.querySelector('#hero-video').currentTime>0.2,null,{timeout:15000});
      console.log('Giảm chuyển động: phim đứng yên, không tải gì, nhưng vẫn phát được khi bấm.');
      await ctx.close();
    }
    console.log('Ảnh và phim: đạt.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
