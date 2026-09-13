// Rà bố cục trang giới thiệu trên các cỡ điện thoại, mặc định chạy thẳng vào bản đã deploy.
//   node tests/site-mobile.cjs --local     rà thư mục website/ ngay tại máy, trước khi đẩy
//   BRAIN_SITE=http://...                  rà một địa chỉ bất kỳ
const {chromium,devices}=require('playwright');
const path=require('node:path'),fs=require('node:fs');
const serve=require('./serve.cjs');
const EDGE=['C:','Program Files (x86)','Microsoft','Edge','Application','msedge.exe'].join(path.sep);
const CỤC_BỘ=process.argv.includes('--local');
const SIZES=[
  ['iPhone SE',       375, 667, 2],
  ['iPhone 14',       390, 844, 3],
  ['iPhone 14 Pro Max',430, 932, 3],
  ['Android nhỏ',     360, 800, 3],
  ['iPad dọc',        768,1024, 2],
];
const PAGES=['/','/gia','/quyen-rieng-tu'];
(async()=>{
  const máyChủ=CỤC_BỘ?await serve(path.resolve(__dirname,'../website')):null;
  const base=máyChủ?máyChủ.base:(process.env.BRAIN_SITE||'https://the-brain-project.vercel.app');
  console.log('Đang rà: '+base);
  let b; try{ b=await chromium.launch({channel:'chromium'}); }catch{ b=await chromium.launch({executablePath:EDGE}); }
  const out=path.resolve(__dirname,'../test-results');fs.mkdirSync(out,{recursive:true});
  let problems=0;
  // hasTouch bật cho cả iPad: nó cũng là màn cảm ứng, và quy tắc @media (pointer: coarse)
  // — thứ phóng nút bấm lên 44px — chỉ có hiệu lực khi ngữ cảnh được đánh dấu là cảm ứng.
  for(const [name,w,h,dpr] of SIZES){
    const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:dpr,isMobile:w<768,hasTouch:true,colorScheme:'light'});
    const p=await ctx.newPage();
    const errs=[];p.on('pageerror',e=>errs.push(e.message));
    for(const u of PAGES){
      await p.goto(base+u,{waitUntil:'networkidle'});
      await p.waitForFunction(()=>document.fonts.ready.then(()=>true));
      await p.waitForTimeout(250);
      const r=await p.evaluate(()=>{
        const de=document.documentElement;
        // Phần tử nào thò ra ngoài mép phải màn hình
        // Bỏ qua thứ CỐ Ý nằm ngoài màn hình cho trình đọc màn hình: link bỏ qua
        // điều hướng, nhãn sr-only, input ẩn. Chúng ở -9999px là đúng thiết kế.
        const offscreenOnPurpose=el=>el.closest('.sr-only,.skip')||el.classList.contains('sr-only')
          ||el.getBoundingClientRect().right< -100;
        const over=[...document.querySelectorAll('body *')].filter(el=>{
          const b=el.getBoundingClientRect();
          return b.width>0 && !offscreenOnPurpose(el) && (b.right>innerWidth+1 || b.left<-1);
        }).slice(0,6).map(el=>`${el.tagName.toLowerCase()}.${(el.className||'').toString().split(' ')[0]} [${Math.round(el.getBoundingClientRect().left)}→${Math.round(el.getBoundingClientRect().right)}]`);
        // Khối nào cắt mất nội dung của chính nó
        const clipped=[...document.querySelectorAll('body *')].filter(el=>{
          const cs=getComputedStyle(el);
          if(el.classList.contains('sr-only')||el.closest('.sr-only'))return false;
          return cs.overflow!=='visible' && cs.overflowY!=='auto' && cs.overflowY!=='scroll'
            && el.scrollHeight>el.clientHeight+2 && el.clientHeight>0;
        }).slice(0,6).map(el=>`${el.tagName.toLowerCase()}.${(el.className||'').toString().split(' ')[0]} ${el.clientHeight}<${el.scrollHeight}`);
        // Vùng bấm quá nhỏ
        // Chỉ tính nút và link đứng riêng. Link nằm trong câu văn thì cao bằng dòng chữ,
        // đó là chuyện bình thường của văn bản, không phải vùng bấm quá nhỏ.
        const inline=el=>el.tagName==='A'&&['P','LI','TD','TH','FIGCAPTION','SPAN'].includes(el.parentElement?.tagName);
        const small=[...document.querySelectorAll('a,button')].filter(el=>{
          const b=el.getBoundingClientRect();
          return b.width>0 && b.height>0 && !inline(el) && (b.height<32||b.width<32);
        }).slice(0,6).map(el=>`${el.tagName.toLowerCase()}.${(el.className||'').toString().split(' ')[0]} ${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)}`);
        const h1=document.querySelector('h1');
        return {scrollW:de.scrollWidth,clientW:de.clientWidth,over,clipped,small,
          h1:h1?getComputedStyle(h1).fontSize:null};
      });
      const bleed=r.scrollW>r.clientW+1;
      const bad=bleed||r.over.length||r.clipped.length||r.small.length;
      if(bad)problems++;
      console.log(`${name.padEnd(19)} ${String(w).padStart(4)}px ${u.padEnd(17)} ${bad?'✖':'✓'} tràn:${bleed?r.scrollW+'>'+r.clientW:'không'} h1:${r.h1}`);
      if(r.over.length)   console.log('    thò ra ngoài :',r.over.join(' | '));
      if(r.clipped.length)console.log('    cắt nội dung :',r.clipped.join(' | '));
      if(r.small.length)  console.log('    bấm quá nhỏ  :',r.small.join(' | '));
    }
    // --- Đoạn phim ở hero và khung ảnh bộ sưu tập, chỉ có trên trang chủ.
    {
      await p.goto(base+'/',{waitUntil:'load'});
      await p.waitForTimeout(1200);
      // Khung ảnh bộ sưu tập phải chiếm chỗ NGAY, trước khi ảnh lazy tải xong. Đặt
      // width:auto cho #gallery-img từng làm nó co về 0px trên cả bốn cỡ điện thoại,
      // rồi bung ra khi ảnh về — đúng thứ dịch chuyển mà aspect-ratio sinh ra để chặn.
      const khung=await p.evaluate(()=>{
        const g=document.querySelector('#gallery-img');
        const b=g.getBoundingClientRect();
        return {rộng:Math.round(b.width),cao:Math.round(b.height),xong:g.complete&&g.naturalWidth>0};
      });
      const v=await p.evaluate(()=>{
        const e=document.querySelector('#hero-video'),n=document.querySelector('#hero-video-toggle');
        const bv=e.getBoundingClientRect(),bn=n.getBoundingClientRect();
        return {chạy:!e.paused,phim:[Math.round(bv.width),Math.round(bv.height)],
          nút:[Math.round(bn.width),Math.round(bn.height)],chữ:n.textContent.trim(),
          tràn:bv.right>innerWidth+1||bn.right>bv.right+1};
      });
      // Cuộn tới đoạn phim: màn thấp thì lúc vào trang nó nằm dưới nếp gấp, chưa chạy là đúng.
      await p.evaluate(()=>document.querySelector('#hero-video').scrollIntoView({block:'center'}));
      await p.waitForTimeout(2500);
      const sau=await p.evaluate(()=>{const e=document.querySelector('#hero-video');
        return {chạy:!e.paused,t:+e.currentTime.toFixed(1),chữ:document.querySelector('#hero-video-toggle').textContent.trim()};});
      const lỗi=[];
      if(khung.rộng<w*0.5) lỗi.push(`khung ảnh co còn ${khung.rộng}px`);
      if(v.tràn) lỗi.push('phim hoặc nút thò ra ngoài');
      if(v.nút[0]<44||v.nút[1]<44) lỗi.push(`nút ${v.nút[0]}×${v.nút[1]} (cần 44×44)`);
      if(!sau.chạy||sau.t<0.2) lỗi.push(`cuộn tới rồi phim vẫn không chạy (t=${sau.t})`);
      if(v.chạy&&v.chữ!=='Tạm dừng') lỗi.push(`đang chạy mà nút ghi "${v.chữ}"`);
      if(!v.chạy&&v.chữ!=='Phát') lỗi.push(`đang dừng mà nút ghi "${v.chữ}"`);
      if(lỗi.length) problems++;
      console.log(`${name.padEnd(19)} ${String(w).padStart(4)}px hero${' '.repeat(13)}${lỗi.length?'✖':'✓'} `
        +`phim ${v.phim[0]}×${v.phim[1]} nút ${v.nút[0]}×${v.nút[1]} khung ${khung.rộng}px, cuộn tới → chạy ${sau.chạy} t=${sau.t}s`);
      if(lỗi.length) console.log('    '+lỗi.join(' | '));
    }

    if(w===390){await p.goto(base+'/');await p.screenshot({path:path.join(out,'mobile-hero.png'),fullPage:false});
      await p.evaluate(()=>document.querySelector('#loop').scrollIntoView());await p.waitForTimeout(300);
      await p.screenshot({path:path.join(out,'mobile-loop.png')});}
    if(errs.length)console.log(`    LỖI JS: ${errs.join(' | ')}`);
    await ctx.close();
  }
  await b.close();
  if(máyChủ) await máyChủ.close();
  if(problems)process.exitCode=1;
  console.log(problems?`\n${problems} trang/kích thước có vấn đề.`:'\nKhông có kích thước nào vỡ.');
})().catch(e=>{console.error('LỖI:',e.message);process.exitCode=1;});
