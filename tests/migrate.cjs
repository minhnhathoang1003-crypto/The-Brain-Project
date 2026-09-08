const {_electron}=require('playwright');const fs=require('node:fs'),path=require('node:path'),os=require('node:os');const assert=require('node:assert/strict');
(async()=>{
  const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'brain-migrate-'));
  const env={...process.env,BRAIN_TEST_DIR:dir,BRAIN_TEST_PORT:'47842'};delete env.ELECTRON_RUN_AS_NODE;
  const launch=()=>_electron.launch({args:[root],env});let app;
  const shots=path.join(root,'test-results');fs.mkdirSync(shots,{recursive:true});
  try{
    app=await launch();let page=await app.firstWindow();await page.locator('.gate').waitFor();
    const legacy={version:1,token:'c'.repeat(64),settings:{idleSeconds:600,nativeEnabled:true,advanced:true,goalMinutes:120},
      tasks:Array.from({length:12},(_,i)=>({id:'task'+i,title:'Việc '+i,done:i===2,priority:'high',notes:'chi tiết cũ'})),
      habits:Array.from({length:8},(_,i)=>({id:'habit'+i,title:'Thói quen '+i,days:['2026-09-07']})),
      sleep:{today:8},usage:[{minutes:20}],reflections:[{id:'r',target:'YouTube',answer:null}],
      sessions:[{id:'session',status:'completed',credits:1}],
      ledger:Array.from({length:12},()=>({id:'c',at:Date.now(),amount:1,reason:'Phiên đã hoàn tất'})),
      targets:[{id:'app',type:'app',enabled:true},{id:'off',domain:'off.example.com',type:'site',enabled:false},
        {id:'youtube',name:'YouTube',domain:'youtube.com',type:'site',enabled:true},
        ...Array.from({length:8},(_,i)=>({id:'site'+i,domain:`site${i}.example.com`,type:'site',enabled:true}))],
      grants:[{id:'app-grant',targetId:'app',until:Date.now()+120000,minutes:5},{id:'web-grant',targetId:'youtube',until:Date.now()+120000,minutes:5}]};
    const encrypted=await app.evaluate(({safeStorage},state)=>Array.from(safeStorage.encryptString(JSON.stringify(state))),legacy);
    await app.close();app=null;fs.writeFileSync(path.join(dir,'brain-data.enc'),Buffer.from(encrypted));

    app=await launch();page=await app.firstWindow();await page.locator('.open-row').waitFor();
    const s=await page.evaluate(()=>window.brain.get());
    assert(s.credits>13.8&&s.credits<=14,`hoàn credit cho lượt mở ứng dụng không còn hỗ trợ: ${s.credits}`);
    assert.equal(s.idleSeconds,600);
    assert.equal(s.theme,'system');assert.deepEqual(s.presets,[25,50,90]);
    assert.equal(s.paired,true,'người dùng cũ không bị đẩy vào màn hình mở đầu');
    assert.equal(await page.locator('.gate').count(),0);
    assert.equal(s.grants.length,1);assert.equal(s.grants[0].domain,'youtube.com','lượt mở website còn hiệu lực được giữ');
    assert.equal(s.targets.length,9,'chỉ giữ website đang bật');
    assert(s.targets.every(t=>t.id===t.domain&&Object.keys(t).length===2));
    for(const gone of ['tasks','habits','ledger','sessions','reflections','sleep','usage','settings'])assert(!(gone in s),gone);
    assert(fs.existsSync(path.join(dir,'brain-data.enc.backup')),'bản sao dữ liệu cũ được giữ lại');
    await page.screenshot({path:path.join(shots,'unlocked.png'),fullPage:true});
    assert.equal((await page.evaluate(()=>window.brain.action('start',{minutes:5}))).ok,false,'không tập trung khi đang mở website');

    // Bố cục: hai cột khi rộng, một cột khi hẹp, không tràn ngang ở cả hai.
    await page.evaluate(()=>window.brain.action('endGrant'));await page.waitForFunction(()=>document.querySelectorAll('.open-row').length===0);
    for(const [width,height,sideBySide] of [[1000,720,true],[1005,734,true],[900,600,true],[520,640,false]]){
      await app.evaluate(({BrowserWindow},size)=>BrowserWindow.getAllWindows()[0].setContentSize(size.w,size.h),{w:width,h:height});
      await page.waitForTimeout(350);
      const dims=await page.evaluate(()=>{const l=document.querySelector('.left').getBoundingClientRect(),r=document.querySelector('.right').getBoundingClientRect();
        // Không khối nào trong hai cột được phép cắt mất nội dung của chính nó.
        const clipped=[...document.querySelectorAll('.left>*,.right>*,.rule,.warn,.earning')]
          .filter(el=>el.scrollHeight>el.clientHeight+1)
          .map(el=>el.className+' '+el.clientHeight+'<'+el.scrollHeight);
        return {side:r.left>=l.right-1,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,primary:document.querySelectorAll('#main .primary').length,clipped};});
      assert.equal(dims.side,sideBySide,`bố cục ở ${width}px`);
      assert(dims.scrollWidth<=dims.width+1,`tràn ngang ở ${width}px`);
      assert(dims.primary<=1,'chỉ một hành động chính');
      assert.deepEqual(dims.clipped,[],`nội dung bị cắt chữ ở ${width}px: ${JSON.stringify(dims.clipped)}`);
      if(!sideBySide)await page.screenshot({path:path.join(shots,'narrow.png'),fullPage:true});
      if(width===1005)await page.screenshot({path:path.join(shots,'disconnected.png'),fullPage:true});
    }
    console.log('PASS: nâng cấp v1 → v8, hoàn credit đúng một lần, giữ mã ghép nối và lượt mở đang chạy, bỏ qua màn hình mở đầu, hai cột co lại thành một cột.');
  }finally{if(app)await app.close();console.log('Isolated test data: '+dir);}
})().catch(e=>{console.error(e);process.exitCode=1;});
