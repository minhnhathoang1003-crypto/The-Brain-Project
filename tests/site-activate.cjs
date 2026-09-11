// Trang /kich-hoat là thứ khách nhìn thấy ngay sau khi trả tiền. Hỏng ở đây nghĩa là
// khách mất tiền mà không mở khóa được gì, nên nó đáng có test riêng.
const {chromium}=require('playwright');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const site='file:///'+path.resolve(__dirname,'../website').split(path.sep).join('/');
const EDGE=['C:','Program Files (x86)','Microsoft','Edge','Application','msedge.exe'].join(path.sep);
const KEY='04C49813-1111-2222-3333-7CECA38820BB';

(async()=>{
  let browser;
  try{ browser=await chromium.launch({channel:'chromium'}); }
  catch(e){ if(!fs.existsSync(EDGE)) throw e; console.log('Dùng Edge sẵn có.'); browser=await chromium.launch({executablePath:EDGE}); }
  const trang=async query=>{
    const p=await (await browser.newContext()).newPage();
    const loi=[];
    p.on('pageerror',e=>loi.push(String(e)));
    await p.goto(site+'/kich-hoat.html'+query);
    assert.deepEqual(loi,[],'trang ném lỗi JavaScript');
    return p;
  };
  const hien=(p,sel)=>p.evaluate(s=>{
    const el=document.querySelector(s);
    return !!el && !el.hidden && getComputedStyle(el).display!=='none';
  },sel);

  try{
    // §1 Đường đi bình thường: mã trong địa chỉ.
    {
      const p=await trang('?key='+KEY);
      assert.equal(await hien(p,'#co-ma'),true,'có mã thì phải hiện phần hướng dẫn');
      assert.equal(await hien(p,'#khong-ma'),false,'không được hiện cả hai phần cùng lúc');

      const href=await p.getAttribute('#mo-app','href');
      assert.equal(href,`thebrainproject://activate?key=${KEY}`,`link sai: ${href}`);
      assert.equal((await p.textContent('#ma')).trim(),KEY,'mã phải hiện ra để chép tay');
      console.log('§1 có mã           ',href);
    }

    // §2 Mã phải được chuẩn hóa y như src/license.cjs làm, nếu không thì web bảo
    // "xong rồi" trong khi phần mềm từ chối.
    {
      const p=await trang('?key='+KEY.toLowerCase());
      assert.equal(await p.getAttribute('#mo-app','href'),`thebrainproject://activate?key=${KEY}`,
        'chữ thường phải được viết hoa lại');
      console.log('§2 chữ thường      chuẩn hóa đúng');
    }

    // §3 Không mã, mã rác, và biến [license_key] chưa được Lemon Squeezy thay —
    // cả ba đều phải rơi vào nhánh "không có mã", không bao giờ dựng link hỏng.
    for(const [ten,query] of [
      ['không có tham số', ''],
      ['tham số rỗng',     '?key='],
      ['mã rác',           '?key=abc'],
      ['thiếu một ký tự',  '?key='+KEY.slice(0,-1)],
      ['biến chưa thay',   '?key=%5Blicense_key%5D'],
      ['thử chèn HTML',    '?key=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E'],
    ]){
      const p=await trang(query);
      assert.equal(await hien(p,'#khong-ma'),true,`${ten}: phải hiện phần hướng dẫn tìm mã`);
      assert.equal(await hien(p,'#co-ma'),false,`${ten}: không được hiện link kích hoạt`);
      console.log('§3',ten.padEnd(18),'rơi đúng nhánh không có mã');
    }

    // §4 Không được nạp script phân tích ở trang này: địa chỉ mang theo mã bản quyền.
    {
      const html=fs.readFileSync(path.resolve(__dirname,'../website/kich-hoat.html'),'utf8');
      assert.ok(!/_vercel\/(insights|speed-insights)/.test(html),
        'trang kích hoạt không được gửi địa chỉ (kèm mã) về máy chủ phân tích');
      const robots=fs.readFileSync(path.resolve(__dirname,'../website/robots.txt'),'utf8');
      assert.match(robots,/Disallow:\s*\/kich-hoat/,'robots.txt phải chặn trang kích hoạt');
      const sitemap=fs.readFileSync(path.resolve(__dirname,'../website/sitemap.xml'),'utf8');
      assert.ok(!sitemap.includes('kich-hoat'),'sitemap không được liệt kê trang kích hoạt');
      console.log('§4 không phân tích, không lập chỉ mục');
    }

    // §5 Giao thức phải khớp với thứ ứng dụng thật sự đăng ký.
    {
      const L=require('../src/license.cjs');
      const js=fs.readFileSync(path.resolve(__dirname,'../website/kich-hoat.js'),'utf8');
      assert.ok(js.includes(`'${L.PROTOCOL}'`),
        `website dùng giao thức khác với src/license.cjs (${L.PROTOCOL})`);
      const pkg=require('../package.json');
      assert.deepEqual(pkg.build.protocols?.[0]?.schemes,[L.PROTOCOL],
        'trình cài đặt phải đăng ký đúng giao thức mà mã nguồn dùng');
      assert.equal(L.keyFromUrl(`${L.PROTOCOL}://activate?key=${KEY}`),KEY,
        'ứng dụng phải đọc được đúng link mà website tạo ra');
      console.log('§5 giao thức khớp  ',L.PROTOCOL);
    }

    console.log('PASS: trang kích hoạt dựng đúng link, có đường lùi, và không rò mã đi đâu.');
  } finally { await browser.close(); }
})().catch(e=>{console.error('LỖI:',e.message);process.exit(1);});
