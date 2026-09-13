// Đường cài tiện ích: link cửa hàng phải đúng, và phải giống nhau ở cả hai nơi.
//
// Link cửa hàng nằm ở HAI chỗ vì ứng dụng và website chạy ở hai nơi khác nhau và không
// đọc được file của nhau: EXTENSION_URL trong src/main.cjs, extensionUrl trong
// website/config.js. Hai bản sao là hai cơ hội để lệch nhau — đúng loại lệch vừa khiến
// bản trên cửa hàng kẹt ở 0.6.0 mà không ai thấy. Bài này canh chúng bằng nhau.
const {chromium}=require('playwright');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const serve=require('./serve.cjs');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'website');
const EDGE=['C:','Program Files (x86)','Microsoft','Edge','Application','msedge.exe'].join(path.sep);
// Chỉ-ID, không kèm slug tên tiện ích: slug đổi theo tên, ID thì không.
const DẠNG=/^https:\/\/chromewebstore\.google\.com\/detail\/[a-p]{32}$/;

(async()=>{
  // ── Hai bản sao của cùng một link phải bằng nhau.
  const app=/const EXTENSION_URL='([^']*)'/.exec(fs.readFileSync(path.join(root,'src','main.cjs'),'utf8'))?.[1];
  const web=/extensionUrl:\s*'([^']*)'/.exec(fs.readFileSync(path.join(dir,'config.js'),'utf8'))?.[1];
  assert.notEqual(app,undefined,'không tìm thấy EXTENSION_URL trong src/main.cjs');
  assert.notEqual(web,undefined,'không tìm thấy extensionUrl trong website/config.js');
  assert.equal(app,web,`link cửa hàng lệch nhau: app='${app}' web='${web}'`);
  if(app){
    assert.match(app,DẠNG,'link cửa hàng phải là dạng chỉ-ID, không kèm slug tên');
    console.log('Link cửa hàng khớp ở cả hai nơi:',app);
  } else {
    console.log('Chưa có link cửa hàng — cả hai nơi đều để trống, đúng.');
  }

  const {base,close}=await serve(dir);
  let br;
  const args=[];
  try{ br=await chromium.launch({channel:'chromium',args}); }
  catch(e){ if(!fs.existsSync(EDGE)) throw e; console.log('Dùng Edge sẵn có.'); br=await chromium.launch({executablePath:EDGE,args}); }
  try{
    // đè: null = dùng config thật, '' = giả vờ chưa có link
    const đọc=async đè=>{
      const p=await br.newPage();
      if(đè!==null) await p.route('**/config.js',async r=>{
        const t=await (await r.fetch()).text();
        await r.fulfill({body:t.replace(/extensionUrl:\s*'[^']*'/,`extensionUrl: '${đè}'`),contentType:'text/javascript'});
      });
      await p.goto(base+'/',{waitUntil:'load'});
      await p.waitForTimeout(500);
      const r=await p.evaluate(()=>({
        store:!document.querySelector('[data-install="store"]').hidden,
        manual:!document.querySelector('[data-install="manual"]').hidden,
        href:document.querySelector('#ext-store')?.getAttribute('href'),
        tiêuĐề:document.querySelector('#install-title').textContent.trim(),
        // Không bao giờ được hiện hai danh sách cùng lúc.
        hiện:[...document.querySelectorAll('.install')].filter(e=>!e.hidden).length,
      }));
      await p.close();return r;
    };

    const thật=await đọc(null);
    assert.equal(thật.hiện,1,'chỉ được hiện đúng một danh sách bước');
    if(app){
      assert.equal(thật.store,true,'có link cửa hàng mà vẫn hiện đường thủ công');
      assert.equal(thật.href,app,'nút cửa hàng trỏ sai link');
      assert.match(thật.tiêuĐề,/^Ba bước/);
      console.log(`Web · có link  → ba bước, nút trỏ đúng`);
    } else {
      assert.equal(thật.manual,true);
      console.log('Web · chưa có link → giữ hướng dẫn thủ công');
    }

    // Nhánh dự phòng phải còn sống: để trống thì quay về hướng dẫn thủ công, không
    // để lại một nút trỏ vào '#'.
    const trống=await đọc('');
    assert.equal(trống.hiện,1);
    assert.equal(trống.manual,true,'để trống link mà vẫn hiện đường cửa hàng');
    assert.equal(trống.store,false);
    assert.match(trống.tiêuĐề,/^Năm bước/);
    console.log('Web · để trống  → năm bước thủ công, không có nút chết');
  } finally { await br.close(); await close(); }

  // ── Link có sống thật không. Bỏ qua nếu không có mạng: bài kiểm bố cục không được
  // đỏ chỉ vì máy đang offline.
  if(app){
    try{
      const r=await fetch(app,{redirect:'manual',headers:{'user-agent':'Mozilla/5.0'}});
      assert([200,301,302].includes(r.status),`cửa hàng trả về ${r.status}`);
      console.log(`Cửa hàng trả về ${r.status}${r.headers.get('location')?' → '+r.headers.get('location'):''}`);
    }catch(e){ console.log('Không gọi được ra mạng, bỏ qua phép kiểm link sống:',e.message); }
  }
  console.log('PASS: đường cài tiện ích đúng ở cả app lẫn web, và nhánh dự phòng còn sống.');
})().catch(e=>{console.error(e);process.exit(1)});
