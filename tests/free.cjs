// Bậc Free, chạy trên ứng dụng thật.
//
// Mọi test end-to-end khác đặt BRAIN_TIER='pro' để kiểm tính năng, nghĩa là không
// test nào nhìn thấy thứ mà phần lớn người dùng thật sự thấy. File này lấp chỗ đó.
//
// Nó không lặp lại phần engine — tests/engine.test.cjs đã canh từng hạn mức. Nó hỏi
// một câu khác: người chưa trả tiền mở ứng dụng lên thì có dùng được không, và những
// thứ họ không có có bị giấu đi một cách tử tế không, hay hiện ra như đồ hỏng.
const { _electron:electron }=require('playwright');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {WebSocket}=require('ws');

(async()=>{
  const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'brain-free-test-'));
  const env={...process.env,BRAIN_TEST_DIR:dir,BRAIN_TEST_PORT:'47871',BRAIN_TIER:'free'};
  delete env.ELECTRON_RUN_AS_NODE;
  let desktop;const errors=[];
  try{
    desktop=await electron.launch({args:[root],env});
    const page=await desktop.firstWindow();
    page.on('pageerror',e=>errors.push(e.message));
    const goi=(type,p={})=>page.evaluate(([t,x])=>window.brain.action(t,x),[type,p]);
    const doc=()=>page.evaluate(()=>window.brain.get());

    await page.getByRole('heading',{name:/bật bộ chặn/}).waitFor();
    // Quà 15 credit là của mọi người, không phải phần thưởng khi trả tiền.
    assert.equal((await doc()).credits,15,'người dùng Free mới vẫn được tặng 15 credit');

    const s=await doc();
    assert.equal(s.tier,'free');
    assert.equal(s.appBlocking,false);
    assert.equal(s.lockedMode,false);
    assert.equal(s.maxTargets,5);
    console.log('§1 mở lên được   ','bậc free, 15 credit, hạn mức 5 mục');

    // §2 Ghép nối tiện ích. Bậc Free phải qua được cửa này — chặn website là thứ
    // nằm trong nhóm miễn phí vĩnh viễn, không phải phần thưởng khi trả tiền.
    const secret=await desktop.evaluate(({safeStorage},bytes)=>
      JSON.parse(safeStorage.decryptString(Buffer.from(bytes))).token,
      Array.from(fs.readFileSync(path.join(dir,'brain-data.enc'))));
    const ws=new WebSocket('ws://127.0.0.1:47871/bridge',{origin:'chrome-extension://'+'a'.repeat(32)});
    const luat=await new Promise((res,rej)=>{
      ws.on('open',()=>ws.send(JSON.stringify({token:secret})));
      ws.once('message',m=>res(JSON.parse(m)));
      ws.on('error',rej);
    });
    ws.on('message',()=>ws.send(JSON.stringify({applied:true})));
    ws.send(JSON.stringify({applied:true}));
    assert.equal(luat.targets.length,4,'bốn website mặc định phải lên được dây tới tiện ích');
    await page.locator('.chips').waitFor();
    console.log('§2 chặn website  ',luat.targets.length+' mục lên dây, không cần trả tiền');

    // §3 Vòng lặp cốt lõi phải chạy trọn vẹn. Đây là lời hứa "miễn phí vĩnh viễn";
    // hỏng ở đây thì cả trang giá đang nói dối.
    assert.equal((await goi('start',{minutes:1})).ok,true,'Free phải bắt đầu được phiên tập trung');
    assert.equal((await goi('cancel')).ok,true);
    const daDoi=await goi('redeem',{id:'youtube.com',minutes:5});
    assert.equal(daDoi.ok,true,'Free phải đổi được credit lấy thời gian mở: '+daDoi.error);
    assert.equal(daDoi.state.grants.length,1);
    assert.equal((await goi('endGrant')).ok,true);
    console.log('§3 vòng lặp cốt lõi','tập trung, hủy, đổi credit, kết thúc — chạy đủ');

    // §4 Vượt hạn mức: thêm tới đúng 5 thì dừng, và lời từ chối phải nói ra con số.
    let chan=null;
    for(let i=1;i<=4&&!chan;i++){
      const r=await goi('targetAdd',{domain:`x${i}.com`});
      if(!r.ok)chan=r.error;
    }
    assert.ok(chan,'phải chặn lại ở đâu đó chứ không thêm vô hạn');
    assert.match(chan,/5/,`lời từ chối phải nói rõ hạn mức, nhận được: ${chan}`);
    const sau=await doc();
    assert.equal(sau.targets.filter(t=>t.domain).length,5,'dừng đúng ở hạn mức 5, không hơn không kém');
    console.log('§4 quá hạn mức   ',chan);

    // §5 Hai tính năng Pro: từ chối rõ ràng, và không được âm thầm đổi dữ liệu.
    for(const [type,p] of [['appAdd',{exe:'leagueclient'}],['lock',{minutes:30}]]){
      const r=await goi(type,p);
      assert.equal(r.ok,false,`${type} phải bị từ chối ở bậc Free`);
      assert.match(r.error,/Pro/,`${type}: phải nói rõ đây là tính năng Pro, nhận được: ${r.error}`);
    }
    assert.equal((await doc()).lockUntil,null,'từ chối rồi thì không được để lại dấu vết');
    console.log('§5 tính năng Pro ','appAdd và lock đều bị từ chối, nói rõ lý do');

    // §6 Giao diện không được bày ra thứ người dùng không có.
    await page.locator('#open-setup').click();
    await page.locator('.setup-rail').waitFor();
    assert.equal(await page.locator('[data-setup-tab="lock"]').count(),0,
      'bậc Free không được hiện tab Chế độ khóa');
    await page.locator('[data-setup-tab="license"]').click();
    // Người chưa mua phải thấy mình đang ở bậc nào, chứ không phải một bảng trống.
    await page.locator('.setup-panel').getByText(/Bạn đang dùng bản/).waitFor();
    await page.locator('.setup-panel').getByText(/Chưa có mã nào trên máy này/).waitFor();
    assert.equal(await page.locator('.plans').count(),1,'phải có bảng so sánh để biết Pro thêm gì');
    console.log('§6 giao diện     ','tab khóa bị ẩn, mục Bản quyền nói rõ đang dùng bản nào');

    // §7 Ba chỗ chạm trần bản Free phải nói ra tại chỗ, không im lặng và không
    // bắt người dùng bấm thử rồi mới biết.
    await page.locator('#setup-close').click();

    // Nhóm "Ứng dụng và game" trước đây biến mất hoàn toàn với người dùng Free,
    // nên họ không bao giờ biết tính năng đó tồn tại.
    const nhomUngDung=page.locator('.group').filter({hasText:'Ứng dụng và game'});
    await nhomUngDung.waitFor();
    await nhomUngDung.locator('.pro-note').waitFor();
    assert.match(await nhomUngDung.locator('.pro-note p').innerText(),/bản Pro/);
    assert.equal(await nhomUngDung.locator('#add-app').count(),0,'Free không được có nút thêm ứng dụng');

    // Danh sách website đã đầy 5/5 ở §4, nên ô "Thêm" phải nhường chỗ cho lời giải thích.
    const nhomWeb=page.locator('.group').filter({hasText:'Website'}).first();
    assert.equal(await nhomWeb.locator('.group-count').innerText(),'5/5','phải hiện rõ đang dùng bao nhiêu trên bao nhiêu');
    assert.equal(await nhomWeb.locator('form.add').count(),0,'đầy rồi thì không để ô Thêm dụ người dùng bấm');
    await nhomWeb.getByText(/hết.*5 mục/).waitFor();

    // Mỗi lời mời chào đều phải có đúng một lối đi tiếp, không phải ngõ cụt.
    const soNut=await page.locator('.pro-note [data-system="openBuy"]').count();
    assert.equal(soNut,2,`mỗi khối chạm trần phải có nút xem bản Pro, đếm được ${soNut}`);
    await page.screenshot({path:path.resolve(root,'test-results/free-limits.png'),fullPage:true});
    console.log('§7 chạm trần     ','nhóm ứng dụng và danh sách đầy đều nói rõ, có lối đi tiếp');

    // §8 Lịch sử: nói rõ Free xem được bao nhiêu ngày và Pro xem được bao lâu.
    await page.locator('#open-stats').click();
    await page.locator('#stats[open]').waitFor();
    assert.match(await page.locator('.stat-range').innerText(),/7 ngày/,
      'con số tổng chỉ tính trên 7 ngày, phải nói ra chứ đừng để tưởng là tổng mọi thời đại');
    const ghiChu=page.locator('#stats .pro-note');
    await ghiChu.waitFor();
    const chu=await ghiChu.innerText();
    assert.match(chu,/7 ngày/);
    assert.match(chu,/180 ngày/,`phải nói Pro xem được bao lâu, nhận được: ${chu}`);
    assert.match(chu,/không bị xóa/,'phải trấn an rằng dữ liệu cũ vẫn còn trên máy');
    console.log('§8 lịch sử       ',chu.split('\n')[0].slice(0,70)+'…');

    assert.deepEqual(errors,[],'giao diện ném lỗi JavaScript');
    console.log('PASS: người dùng Free chạy được trọn vòng lặp cốt lõi, và những thứ họ không có đều được nói rõ kèm lối đi tiếp.');
  }finally{ if(desktop)await desktop.close(); console.log('Isolated test data: '+dir); }
})().catch(e=>{console.error(e);process.exitCode=1;});
