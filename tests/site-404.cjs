// Trang 404. Người gặp nó thường là người được ai đó gửi link — tức là đúng người
// mình đang muốn thuyết phục. Để họ nhìn thấy màn hình lỗi kỹ thuật trần trụi của
// Vercel thì trông như cả website hỏng.
//
// Bài này chạy được ở hai chế độ:
//   node tests/site-404.cjs              → kiểm file cục bộ
//   BRAIN_SITE=https://... node ...      → kiểm cả website đã deploy
const {chromium}=require('playwright');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const EDGE=['C:','Program Files (x86)','Microsoft','Edge','Application','msedge.exe'].join(path.sep);
const local='file:///'+path.resolve(__dirname,'../website').split(path.sep).join('/');

(async()=>{
  let browser;
  try{ browser=await chromium.launch({channel:'chromium'}); }
  catch(e){ if(!fs.existsSync(EDGE)) throw e; console.log('Dùng Edge sẵn có.'); browser=await chromium.launch({executablePath:EDGE}); }

  try{
    // §1 Trang tự nó phải đứng vững và chỉ đường đi tiếp.
    const p=await (await browser.newContext()).newPage();
    const loi=[];p.on('pageerror',e=>loi.push(String(e)));
    await p.goto(local+'/404.html');
    assert.deepEqual(loi,[],'trang 404 ném lỗi JavaScript');

    const links=await p.locator('main a').evaluateAll(a=>a.map(x=>x.getAttribute('href')));
    for(const bat_buoc of ['/','/#install','/gia','/quyen-rieng-tu'])
      assert.ok(links.includes(bat_buoc),`thiếu lối đi tới ${bat_buoc}`);
    console.log('§1 lối đi tiếp     ',links.join(' '));

    // §2 Mọi đường dẫn phải TUYỆT ĐỐI. Trang này được phục vụ cho cả /a/b/c, nên
    // đường dẫn tương đối sẽ tính từ /a/b/ và hỏng hết ảnh, CSS, link.
    const html=fs.readFileSync(path.resolve(__dirname,'../website/404.html'),'utf8');
    const tuong_doi=[...html.matchAll(/(?:href|src)="(?!https?:|\/|#|mailto:)([^"]+)"/g)].map(m=>m[1]);
    assert.deepEqual(tuong_doi,[],`đường dẫn tương đối sẽ hỏng ở đường dẫn nhiều tầng: ${tuong_doi.join(', ')}`);
    console.log('§2 đường dẫn       ','tất cả đều tuyệt đối');

    // §3 Không được để Google lập chỉ mục trang lỗi.
    assert.match(html,/<meta name="robots" content="noindex">/,'trang 404 phải có noindex');
    console.log('§3 noindex         ','có');

    // §4 Website đã deploy: đường dẫn sai phải trả về ĐÚNG mã 404 (không phải 200)
    // và hiện trang tiếng Việt, chứ không phải màn hình lỗi của Vercel.
    const site=process.env.BRAIN_SITE;
    if(!site){
      console.log('§4 bỏ qua          ','đặt BRAIN_SITE=https://… để kiểm website đã deploy');
    }else{
      const p2=await (await browser.newContext()).newPage();
      const res=await p2.goto(site.replace(/\/$/,'')+'/khong-he-co-trang-nay');
      assert.equal(res.status(),404,'đường dẫn sai phải trả mã 404, không được trả 200');
      await p2.getByRole('heading',{name:/Không có trang nào ở đây/}).waitFor({timeout:10000});
      // Ảnh và CSS phải nạp được, nếu không trang 404 lại trông như một lỗi khác.
      const cssOk=await p2.evaluate(()=>getComputedStyle(document.body).fontFamily.includes('Inter'));
      assert.ok(cssOk,'CSS không nạp được trên trang 404');
      const duong=await p2.locator('#duong-dan').innerText();
      assert.equal(duong,'/khong-he-co-trang-nay','phải hiện đúng đường dẫn người dùng đã mở');
      console.log('§4 đã deploy       ','404 thật, trang tiếng Việt, CSS nạp được');

      // Gốc trang vẫn phải 200 — đây là thứ đã làm người ta hoảng.
      const goc=await p2.goto(site);
      assert.equal(goc.status(),200,'gốc trang phải trả 200');
      console.log('§5 gốc trang       ','200');
    }

    console.log('PASS: đường dẫn sai dẫn tới một trang tiếng Việt có lối đi tiếp, không phải màn hình lỗi kỹ thuật.');
  } finally { await browser.close(); }
})().catch(e=>{console.error('LỖI:',e.message);process.exit(1);});
