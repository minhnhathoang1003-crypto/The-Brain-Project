// Phản hồi lúc nhấn và các thiết lập trợ năng, chạy trên ứng dụng Electron thật.
const {_electron:electron}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const launch=extra=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'brain-a11y-'));
  const env={...process.env,BRAIN_TEST_DIR:dir,BRAIN_TEST_PORT:'47862',...extra};
  delete env.ELECTRON_RUN_AS_NODE;
  return electron.launch({args:[root],env});
};
(async()=>{
  const app=await launch();
  try{
    const page=await app.firstWindow();
    await page.locator('.gate').waitFor();
    await app.evaluate(()=>global.__brainWatcher.stop());

    // §1 Phản hồi phải xuất hiện lúc NHẤN XUỐNG, không đợi nhả.
    const btn=page.getByRole('button',{name:'Sao chép mã ghép nối'});
    const at=async()=>btn.evaluate(el=>getComputedStyle(el).transform);
    assert.equal(await at(),'none','lúc nghỉ không biến dạng');
    const box=await btn.boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
    await page.mouse.down();
    await page.waitForTimeout(140);   // qua hết 100ms transition, vẫn CHƯA nhả chuột
    const pressed=await at();
    await page.mouse.up();
    assert.notEqual(pressed,'none','phải co lại ngay lúc nhấn xuống, chưa cần nhả');
    assert.match(pressed,/^matrix\(0\.9/,`co lại đúng tỉ lệ, nhận được ${pressed}`);
    await page.waitForTimeout(200);
    assert.equal(await at(),'none','nhả ra là trở lại như cũ');
    console.log('§1 phản hồi lúc nhấn   ',pressed);

    // §14 Ba thiết lập, đọc bằng chính media query của trình duyệt.
    const q=await page.evaluate(()=>({
      motion:matchMedia('(prefers-reduced-motion: reduce)').matches,
      transparency:matchMedia('(prefers-reduced-transparency: reduce)').matches,
      contrast:matchMedia('(prefers-contrast: more)').matches,
    }));
    console.log('§14 máy này báo        ',JSON.stringify(q));

    // Luật cho cả ba nhánh phải tồn tại, kể cả nhánh máy này không rơi vào.
    const css=fs.readFileSync(path.join(root,'src/ui/style.css'),'utf8');
    for(const feat of ['prefers-reduced-motion','prefers-reduced-transparency','prefers-contrast'])
      assert.match(css,new RegExp(feat),`thiếu luật cho ${feat}`);
    // §14 Giảm chuyển động không được là "tắt hết": toast vẫn phải mờ dần.
    const rm=css.slice(css.indexOf('@media (prefers-reduced-motion:reduce)'));
    assert.match(rm,/\.toast\{transition:opacity/,'giảm chuyển động vẫn giữ mờ dần cho toast');
    assert(!/\*\{transition:none!important/.test(css),'không được tắt sạch mọi transition');
    console.log('§14 ba nhánh đều có luật, và giảm chuyển động vẫn giữ phản hồi mờ dần');

    console.log('PASS: ứng dụng phản hồi ngay lúc nhấn và tôn trọng ba thiết lập trợ năng.');
  } finally { await app.close(); }
})().catch(e=>{console.error('LỖI:',e.message);process.exitCode=1;});
