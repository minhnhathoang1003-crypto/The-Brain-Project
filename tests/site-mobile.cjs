// Rà bố cục trang giới thiệu trên các cỡ điện thoại, chạy thẳng vào bản đã deploy.
// Đặt BRAIN_SITE=http://localhost:xxxx để rà bản cục bộ trước khi đẩy.
const {chromium,devices}=require('playwright');
const path=require('node:path'),fs=require('node:fs');
const EDGE=['C:','Program Files (x86)','Microsoft','Edge','Application','msedge.exe'].join(path.sep);
const base=process.env.BRAIN_SITE||'https://the-brain-project.vercel.app';
const SIZES=[
  ['iPhone SE',       375, 667, 2],
  ['iPhone 14',       390, 844, 3],
  ['iPhone 14 Pro Max',430, 932, 3],
  ['Android nhỏ',     360, 800, 3],
  ['iPad dọc',        768,1024, 2],
];
const PAGES=['/','/gia','/quyen-rieng-tu'];
(async()=>{
  let b; try{ b=await chromium.launch({channel:'chromium'}); }catch{ b=await chromium.launch({executablePath:EDGE}); }
  const out=path.resolve(__dirname,'../test-results');fs.mkdirSync(out,{recursive:true});
  let problems=0;
  for(const [name,w,h,dpr] of SIZES){
    const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:dpr,isMobile:w<768,hasTouch:w<768,colorScheme:'light'});
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
    if(w===390){await p.goto(base+'/');await p.screenshot({path:path.join(out,'mobile-hero.png'),fullPage:false});
      await p.evaluate(()=>document.querySelector('#loop').scrollIntoView());await p.waitForTimeout(300);
      await p.screenshot({path:path.join(out,'mobile-loop.png')});}
    if(errs.length)console.log(`    LỖI JS: ${errs.join(' | ')}`);
    await ctx.close();
  }
  await b.close();
  if(problems)process.exitCode=1;
  console.log(problems?`\n${problems} trang/kích thước có vấn đề.`:'\nKhông có kích thước nào vỡ.');
})().catch(e=>{console.error('LỖI:',e.message);process.exitCode=1;});
