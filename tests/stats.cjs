// Màn hình Thống kê, chạy trên ứng dụng thật với lịch sử dài.
//
// Bài này tồn tại vì hai lỗi im lặng đã từng sống chung với nhau: engine XOÁ VĨNH
// VIỄN lịch sử quá 180 ngày, còn bảng ngày thì cắt cứng ở 30 dòng — nên người dùng
// Pro trả tiền cho lịch sử dài mà chỉ xem được 30 ngày, và phần còn lại thì đã bị
// huỷ mất. Không có gì hỏng để nhìn thấy, nên không ai phát hiện.
const {_electron:electron}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const assert=require('node:assert/strict');

const SO_NGAY=400;   // dài hơn hẳn mốc 180 cũ

function lichSu(){
  const hom=new Date(),ra=[];
  for(let i=0;i<SO_NGAY;i++){
    const d=new Date(hom);d.setDate(d.getDate()-i);
    const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    // Ngày chẵn nghỉ, để chuỗi ngày liên tiếp có giá trị xác định được.
    const phut=i%2===0?50:0;
    ra.push({day:key,minutes:phut,completed:phut?2:0,interrupted:0,earned:phut/5});
  }
  return ra;
}

async function moApp(dir,tier){
  const env={...process.env,BRAIN_TEST_DIR:dir,BRAIN_TEST_PORT:'47893',BRAIN_TIER:tier};
  delete env.ELECTRON_RUN_AS_NODE;
  const app=await electron.launch({args:[path.resolve(__dirname,'..')],env});
  await app.firstWindow();
  return app;
}

(async()=>{
  const root=path.resolve(__dirname,'..');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'brain-stats-test-'));
  const file=path.join(dir,'brain-data.enc');
  const rows=lichSu();
  let app;
  try{
    // Bơm lịch sử vào file đã mã hoá, qua chính safeStorage của ứng dụng.
    app=await moApp(dir,'pro');
    await new Promise(r=>setTimeout(r,1200));
    const vao=Array.from(fs.readFileSync(file));
    const ra=await app.evaluate(({safeStorage},{bytes,rows})=>{
      const s=JSON.parse(safeStorage.decryptString(Buffer.from(bytes)));
      s.history=rows;s.paired=true;s.credits=40;
      return Array.from(safeStorage.encryptString(JSON.stringify(s)));
    },{bytes:vao,rows});
    fs.writeFileSync(file,Buffer.from(ra));

    // Bơm luôn một bản quyền đang hoạt động: link "Gỡ mã" chỉ hiện khi có mã.
    const lic=await app.evaluate(({safeStorage},rec)=>
      Array.from(safeStorage.encryptString(JSON.stringify(rec))),
      {key:'1A2B3C4D-5E6F-7A8B-9C0D-1E2F3A4B5C6D',instanceId:'inst-test',status:'active',checkedAt:Date.now()});
    fs.writeFileSync(path.join(dir,'brain-license.enc'),Buffer.from(lic));
    await app.close();

    // ── Bậc Pro ──────────────────────────────────────────────────────────────
    app=await moApp(dir,'pro');
    let page=await app.firstWindow();
    await page.waitForTimeout(1200);

    const giu=await page.evaluate(()=>window.brain.get().then(s=>s.history.length));
    assert.equal(giu,SO_NGAY,`engine phải giữ đủ ${SO_NGAY} ngày, đang giữ ${giu} — lịch sử vẫn đang bị xoá`);
    console.log('§1 không xoá lịch sử',giu+' ngày còn nguyên');

    await page.locator('#open-stats').click();
    await page.locator('#stats[open]').waitFor();

    // Mở ra phải luôn ở 7 ngày, không phải khoảng lần trước để lại.
    assert.equal(await page.locator('[data-stats-range="7"].on').count(),1,'mở Thống kê phải bắt đầu ở 7 ngày');
    for(const n of [7,30,90,0])
      assert.equal(await page.locator(`[data-stats-range="${n}"]:not([disabled])`).count(),1,
        `bậc Pro phải chọn được khoảng ${n||'tất cả'}`);
    console.log('§2 chọn khoảng      bốn mức, Pro dùng được cả bốn');

    // Bảng ngày KHÔNG được cắt ở 30 dòng nữa.
    await page.locator('[data-stats-range="0"]').click();
    await page.waitForTimeout(400);
    const dong=await page.locator('.ratio > div').count();
    assert.ok(dong>200,`bảng theo ngày chỉ có ${dong} dòng — vẫn đang bị cắt`);
    assert.match(await page.locator('.stat-range').innerText(),/Toàn bộ lịch sử/);
    console.log('§3 bảng theo ngày   ',dong+' dòng, không bị cắt ở 30');

    // Lưới nhịp chỉ hiện ở khoảng dài, và phải có ô cho từng ngày.
    const o=await page.locator('.heat-cell:not(.empty)').count();
    assert.ok(o>=SO_NGAY,`lưới nhịp thiếu ô: ${o} < ${SO_NGAY}`);
    assert.equal(await page.locator('.heat-cell.now').count(),1,'phải đánh dấu đúng một ô hôm nay');
    console.log('§4 lưới nhịp        ',o+' ô');

    // Chuỗi ngày: dữ liệu cách nhật nên chuỗi dài nhất đúng bằng 1.
    const cs=await page.locator('.stat-grid>div').filter({hasText:'Chuỗi dài nhất'}).locator('b').innerText();
    assert.equal(cs,'1 ngày',`dữ liệu cách nhật thì chuỗi dài nhất phải là 1, nhận được ${cs}`);
    console.log('§5 chuỗi ngày       ',cs);

    // Tổng thời gian đọc được: 200 ngày × 50 phút = 10.000 phút = 166 giờ 40.
    const tong=await page.locator('.stat-grid>div').filter({hasText:'Tổng thời gian'}).locator('b').innerText();
    assert.match(tong,/giờ/,`quá 60 phút thì phải đổi sang giờ, nhận được ${tong}`);
    console.log('§6 tổng thời gian   ',tong);

    // Màn hình Bản quyền: gỡ mã phải là link nhỏ, không phải nút nổi bật.
    await page.locator('#stats-close').click();
    await page.locator('#open-setup').click();
    await page.locator('[data-setup-tab="license"]').click();
    assert.equal(await page.locator('[data-system="licenseRemove"].link').count(),1,
      'gỡ mã phải là link nhỏ — không phần mềm nào để nút đỏ ngay chỗ xem hạn dùng');
    assert.equal(await page.locator('[data-system="licenseRemove"].danger').count(),0,
      'không được còn là nút nguy hiểm');
    assert.ok(await page.locator('[data-system="licenseRemove"]').getAttribute('data-ask'),
      'gỡ mã phải hỏi lại trước khi làm');
    console.log('§7 gỡ mã            link nhỏ, có hỏi lại');
    await app.close();app=null;

    // ── Bậc Free ─────────────────────────────────────────────────────────────
    app=await moApp(dir,'free');
    page=await app.firstWindow();
    await page.waitForTimeout(1200);
    const thay=await page.evaluate(()=>window.brain.get().then(s=>s.history.length));
    assert.equal(thay,7,`bậc Free chỉ được gửi 7 ngày, đang nhận ${thay}`);

    await page.locator('#open-stats').click();
    await page.locator('#stats[open]').waitFor();
    for(const n of [30,90,0])
      assert.equal(await page.locator(`[data-stats-range="${n}"][disabled]`).count(),1,
        `bậc Free phải thấy khoảng ${n||'tất cả'} nhưng không bấm được`);
    assert.equal(await page.locator('[data-stats-range="7"]:not([disabled])').count(),1);
    assert.equal(await page.locator('.heat-wrap').count(),0,'7 ngày thì dùng cột, không dùng lưới nhịp');
    console.log('§8 bậc Free         7 ngày dùng được, ba khoảng kia hiện mà mờ');

    console.log('PASS: lịch sử không bị xoá, Pro xem lại được toàn bộ, Free bị giới hạn ở 7 ngày và được nói rõ.');
  }finally{
    if(app)await app.close();
    fs.rmSync(dir,{recursive:true,force:true});
  }
})().catch(e=>{console.error('LỖI:',e.message);process.exitCode=1;});
