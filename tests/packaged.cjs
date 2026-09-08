const {_electron}=require('playwright');const fs=require('fs'),path=require('path'),os=require('os');const assert=require('node:assert/strict');
(async()=>{
  const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'brain-packaged-'));
  const env={...process.env,BRAIN_TEST_DIR:dir,BRAIN_TEST_PORT:'47843'};delete env.ELECTRON_RUN_AS_NODE;
  const app=await _electron.launch({executablePath:path.join(root,'release/win-unpacked/The Brain Project.exe'),args:[],env});
  try{
    const page=await app.firstWindow();await page.locator('.gate').waitFor();
    const s=await page.evaluate(()=>window.brain.get());
    assert.equal(s.credits,15,'bản cài mới được tặng credit khởi đầu');assert.equal(s.todayMinutes,0);assert.equal(s.session,null);assert.equal(s.grant,null);
    assert.equal(s.paired,false,'bản cài mới bắt đầu ở màn hình ghép nối');assert.equal(s.theme,'system');
    assert.deepEqual(s.presets,[25,50,90]);
    assert.deepEqual(s.targets.map(t=>t.domain),['youtube.com','facebook.com','tiktok.com','instagram.com']);
    assert(fs.existsSync(path.join(dir,'extension/manifest.json')));
    await page.screenshot({path:path.join(root,'test-results/first-run.png')});
    console.log('PASS: bản đóng gói khởi động, không có dữ liệu giả, đúng bốn website mặc định, tiện ích được sao chép sang thư mục dữ liệu.');
  }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
