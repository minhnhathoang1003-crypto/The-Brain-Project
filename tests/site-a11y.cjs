// Rà các thiết lập trợ năng của hệ điều hành trên trang giới thiệu.
// Giả lập đúng những gì Windows/macOS gửi xuống, rồi đọc style đã tính toán.
const {chromium}=require('playwright');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const EDGE=['C:','Program Files (x86)','Microsoft','Edge','Application','msedge.exe'].join(path.sep);
const base=process.env.BRAIN_SITE||'file:///'+path.resolve(__dirname,'../website').split(path.sep).join('/');
const page=u=>base.startsWith('file')?`${base}/index.html`:base+u;
(async()=>{
  let b; try{ b=await chromium.launch({channel:'chromium'}); }catch{ b=await chromium.launch({executablePath:EDGE}); }
  try{
    // Playwright không giả lập được prefers-reduced-transparency, nên bài này đọc
    // thiết lập THẬT của máy đang chạy rồi kiểm đúng nhánh tương ứng.
    let ctx=await b.newContext({colorScheme:'light'});let p=await ctx.newPage();
    await p.goto(page('/'));
    const t=await p.evaluate(()=>({
      reduced:matchMedia('(prefers-reduced-transparency: reduce)').matches,
      blur:getComputedStyle(document.querySelector('.topbar')).backdropFilter,
    }));
    if(t.reduced){
      assert.equal(t.blur,'none','máy xin bớt trong suốt thì phải bỏ hẳn blur');
      console.log('bớt trong suốt (máy này đang bật)  blur:',t.blur,'— nền đặc');
    } else {
      assert.match(t.blur,/blur/,'máy không xin bớt trong suốt thì giữ lớp kính');
      console.log('trong suốt bình thường             blur:',t.blur);
    }
    // Dù máy này ở nhánh nào, luật cho nhánh kia vẫn phải tồn tại. Đọc thẳng từ file
    // vì trình duyệt chặn cssRules của stylesheet nạp qua file:// (CORS).
    const css=fs.readFileSync(path.resolve(__dirname,'../website/styles.css'),'utf8');
    assert.match(css,/prefers-reduced-transparency/,'phải có luật cho prefers-reduced-transparency');
    await ctx.close();

    // Giảm chuyển động: không còn phóng to thu nhỏ khi nhấn.
    ctx=await b.newContext({colorScheme:'light',reducedMotion:'reduce'});p=await ctx.newPage();
    await p.goto(page('/'));
    const rm=await p.evaluate(()=>{
      const probe=(sel,pseudo)=>getComputedStyle(document.querySelector(sel),pseudo).transform;
      return {switchTr:getComputedStyle(document.querySelector('.theme-switch')).transitionProperty,
              trackTr:getComputedStyle(document.querySelector('.theme-track')).transitionProperty,
              reveal:getComputedStyle(document.querySelector('.reveal')||document.body).transitionProperty};
    });
    assert.equal(rm.trackTr,'none','giảm chuyển động thì công tắc không trượt');
    console.log('giảm chuyển động     công tắc:',rm.trackTr);
    await ctx.close();

    // Tương phản cao: viền phải dày và đậm hơn, nền thanh đầu trang thành đặc.
    ctx=await b.newContext({colorScheme:'light',contrast:'more'});p=await ctx.newPage();
    await p.goto(page('/'));
    const hc=await p.evaluate(()=>{const t=getComputedStyle(document.querySelector('.topbar'));
      const ghost=document.querySelector('.btn-ghost');
      return {blur:t.backdropFilter,line:getComputedStyle(document.documentElement).getPropertyValue('--line').trim(),
              ghostBorder:ghost?getComputedStyle(ghost).borderTopWidth:null};});
    assert.equal(hc.blur,'none','tương phản cao thì bỏ blur');
    assert.equal(hc.line,'#8a8a8a','viền phải đậm hơn');
    assert.equal(hc.ghostBorder,'2px','viền phải dày hơn');
    console.log('tương phản cao       blur:',hc.blur,'| --line:',hc.line,'| viền nút:',hc.ghostBorder);
    await ctx.close();
    console.log('PASS: trang giới thiệu tôn trọng giảm chuyển động, bớt trong suốt và tương phản cao.');
  } finally { await b.close(); }
})().catch(e=>{console.error('LỖI:',e.message);process.exitCode=1;});
