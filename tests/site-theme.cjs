const {chromium}=require('playwright');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const site='file:///'+path.resolve(__dirname,'../website').split(path.sep).join('/');
const EDGE=['C:','Program Files (x86)','Microsoft','Edge','Application','msedge.exe'].join(path.sep);
(async()=>{
  let browser;
  try{ browser=await chromium.launch({channel:'chromium'}); }
  catch(e){ if(!fs.existsSync(EDGE)) throw e; console.log('Dùng Edge sẵn có.'); browser=await chromium.launch({executablePath:EDGE}); }
  const read=p=>p.evaluate(()=>({
    attr:document.documentElement.getAttribute('data-theme'),
    checked:document.querySelector('[data-theme-switch]').getAttribute('aria-checked'),
    bg:getComputedStyle(document.body).backgroundColor,
    stored:(()=>{try{return localStorage.getItem('brain-site-theme')}catch(e){return 'x'}})(),
  }));
  try{
    for(const scheme of ['light','dark']){
      const ctx=await browser.newContext({colorScheme:scheme});
      const p=await ctx.newPage();
      await p.goto(site+'/index.html');
      const first=await read(p);
      assert.equal(first.stored,null,'lần đầu không được lưu gì');
      assert.equal(first.attr,null,'lần đầu không gắn data-theme, để CSS tự theo hệ thống');
      assert.equal(first.checked,String(scheme==='dark'),`công tắc phản ánh hệ thống (${scheme})`);
      assert.equal(first.bg,scheme==='dark'?'rgb(11, 11, 11)':'rgb(255, 255, 255)');
      console.log(`hệ thống ${scheme}: nền ${first.bg}, công tắc ${first.checked}, chưa lưu gì`);

      await p.click('[data-theme-switch]');
      const after=await read(p), want=scheme==='dark'?'light':'dark';
      assert.equal(after.stored,want);assert.equal(after.attr,want);
      assert.equal(after.checked,String(want==='dark'));
      console.log(`  gạt một lần → ${want}, đã ghi nhớ`);

      await p.reload();
      const back=await read(p);
      assert.equal(back.attr,want,'tải lại vẫn giữ lựa chọn');
      assert.equal(back.checked,String(want==='dark'));

      await p.goto(site+'/gia.html');
      assert.equal((await read(p)).attr,want,'trang giá cũng giữ');
      await p.goto(site+'/quyen-rieng-tu.html');
      assert.equal((await read(p)).attr,want,'trang quyền riêng tư cũng giữ');
      await p.goto(site+'/kich-hoat.html');
      assert.equal((await read(p)).attr,want,'trang kích hoạt cũng giữ');
      console.log('  tải lại và sang trang khác vẫn giữ');

      await p.emulateMedia({colorScheme:scheme==='dark'?'light':'dark'});
      assert.equal((await read(p)).attr,want,'hệ thống đổi không được đè lựa chọn');
      console.log('  hệ thống đổi sau đó: không đè lựa chọn');
      await ctx.close();
    }
    const ctx=await browser.newContext({colorScheme:'light'});
    const p=await ctx.newPage();await p.goto(site+'/index.html');
    assert.equal((await read(p)).checked,'false');
    await p.emulateMedia({colorScheme:'dark'});
    await p.waitForFunction(()=>document.querySelector('[data-theme-switch]').getAttribute('aria-checked')==='true');
    console.log('chưa chọn gì: hệ thống đổi lúc trang đang mở thì công tắc đi theo');
    await p.screenshot({path:path.resolve(__dirname,'../test-results/site-dark.png'),clip:{x:0,y:0,width:1280,height:110}});
    await ctx.close();
    console.log('PASS: công tắc chủ đề — mặc định theo hệ thống, gạt một lần là nhớ, bốn trang đồng bộ.');
  } finally { await browser.close(); }
})().catch(e=>{console.error('LỖI:',e.message);process.exitCode=1;});
