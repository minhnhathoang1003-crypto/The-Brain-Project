// Đổi ảnh PNG thô (chụp ở 2×) thành WebP ba cỡ cho trang giới thiệu.
//
// Bản cũ chỉ có một file 1479px cho mỗi ảnh — vừa thừa cho màn thường vừa thiếu cho màn 2×
// (1479 trên 1832 điểm ảnh mà ô ảnh cần, tức mờ 24%), và không có srcset nên điện thoại
// 360px cũng tải đúng file dành cho desktop.
//
// Chạy: node scripts/webp.cjs <thư-mục-png-thô>
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),ra=path.join(root,'website','images');
const EDGE=['C:','Program Files (x86)','Microsoft','Edge','Application','msedge.exe'].join(path.sep);
const CHAT_LUONG=0.86;

// Ba bậc cho mỗi ảnh, đủ phủ bốn tình huống thật mà không tải thừa quá 1,5 lần:
//   điện thoại 390px màn thường (cần 322) → 466
//   điện thoại 390px màn 2×      (cần 644) → 932
//   desktop màn thường           (cần 932) → 932
//   desktop màn 2×               (cần 1864) → 1864
// narrow chụp cửa sổ hẹp thật nên cả ba bậc nhỏ hơn theo tỉ lệ 780.
const CO={
  main:[466,932,1864], focus:[466,932,1864], settings:[466,932,1864], dark:[466,932,1864],
  locked:[466,932,1864], gate:[466,932,1864], overlay:[466,932,1864], blocked:[466,932,1864],
  narrow:[390,780,1560],
};
const TEN={blocked:'browser-blocked'};

(async()=>{
  const tho=process.argv[2];
  if(!tho||!fs.existsSync(tho)){console.error('Cần thư mục PNG thô: node scripts/webp.cjs <thư-mục>');process.exit(1);}
  let br; try{ br=await chromium.launch({channel:'chromium'}); }
  catch(e){ if(!fs.existsSync(EDGE)) throw e; console.log('Dùng Edge sẵn có.'); br=await chromium.launch({executablePath:EDGE}); }
  const page=await br.newPage();
  await page.goto('about:blank');
  let tong=0;
  for(const [ten,bac] of Object.entries(CO)){
    const nguon=path.join(tho,ten+'.png');
    if(!fs.existsSync(nguon)){console.log('  bỏ qua',ten,'— không có PNG');continue;}
    const b64=fs.readFileSync(nguon).toString('base64');
    const ket=await page.evaluate(async ({b64,bac,q})=>{
      const img=new Image();
      img.src='data:image/png;base64,'+b64;
      await img.decode();
      const ve=w=>{
        const cv=document.createElement('canvas');
        cv.width=w; cv.height=Math.round(img.naturalHeight*w/img.naturalWidth);
        const g=cv.getContext('2d',{alpha:false});
        g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high';
        g.drawImage(img,0,0,cv.width,cv.height);
        return {w:cv.width,h:cv.height,data:cv.toDataURL('image/webp',q).split(',')[1]};
      };
      return {goc:[img.naturalWidth,img.naturalHeight],ra:bac.map(ve)};
    },{b64,bac,q:CHAT_LUONG});
    const ten2=TEN[ten]||ten;
    // Tên mang luôn bề rộng: nhìn tên là biết file nào cho màn nào, khỏi đoán "@2x" là bao nhiêu.
    const mo=ket.ra.map(k=>{
      const f=path.join(ra,`${ten2}-${k.w}.webp`);
      fs.writeFileSync(f,Buffer.from(k.data,'base64'));
      tong+=fs.statSync(f).size;
      return `${k.w}×${k.h} (${Math.round(fs.statSync(f).size/1024)}KB)`;
    });
    console.log(`${ten2.padEnd(16)} nguồn ${ket.goc[0]}×${ket.goc[1]} → ${mo.join('  ')}`);
  }
  // Logo hiện ở 28 CSS px, tức 56 điểm ảnh trên màn 2×. File cũ là 128px — thừa 129%.
  // Chỉ thu một lần: chạy lại script mà cứ nén tiếp file 64px thì mỗi lượt lại mất thêm ít chất lượng.
  const logo=path.join(ra,'logo.webp');
  if(fs.existsSync(logo)){
    const b64=fs.readFileSync(logo).toString('base64');
    const nho=await page.evaluate(async ({b64,q})=>{
      const img=new Image();img.src='data:image/webp;base64,'+b64;await img.decode();
      if(img.naturalWidth<=64) return null;
      const cv=document.createElement('canvas');cv.width=cv.height=64;
      const g=cv.getContext('2d');g.imageSmoothingQuality='high';
      g.clearRect(0,0,64,64);g.drawImage(img,0,0,64,64);
      return cv.toDataURL('image/webp',q).split(',')[1];
    },{b64,q:0.92});
    if(nho){
      fs.writeFileSync(logo,Buffer.from(nho,'base64'));
      console.log(`logo.webp        → 64×64 (${Math.round(fs.statSync(logo).size/1024)}KB)`);
    } else console.log('logo.webp        đã 64px rồi, để nguyên');
  }
  // Favicon: bản gốc là PNG 256×256 nặng 58KB — nặng hơn mọi ảnh minh hoạ trên trang,
  // mà lại được tải ở MỌI lần vào trang, kể cả trên 3G. Trình duyệt vẽ favicon ở 16–32
  // CSS px nên 64px đã dư. Thêm một bản WebP đứng trước trong HTML: trình duyệt lấy định
  // dạng đầu tiên nó hiểu, và WebP nén hình đơn sắc này nhẹ hơn PNG nhiều lần.
  const icon=path.join(ra,'icon.png');
  if(fs.existsSync(icon)){
    const cũ=fs.statSync(icon).size;
    const ra2=await page.evaluate(async b64=>{
      const img=new Image();img.src='data:image/png;base64,'+b64;await img.decode();
      const vẽ=()=>{const cv=document.createElement('canvas');cv.width=cv.height=64;
        const g=cv.getContext('2d');g.imageSmoothingQuality='high';
        g.clearRect(0,0,64,64);g.drawImage(img,0,0,64,64);return cv;};
      return {goc:img.naturalWidth,
        png:img.naturalWidth<=64?null:vẽ().toDataURL('image/png').split(',')[1],
        webp:vẽ().toDataURL('image/webp',0.92).split(',')[1]};
    },fs.readFileSync(icon).toString('base64'));
    if(ra2.png) fs.writeFileSync(icon,Buffer.from(ra2.png,'base64'));
    fs.writeFileSync(path.join(ra,'icon.webp'),Buffer.from(ra2.webp,'base64'));
    const k=f=>Math.round(fs.statSync(f).size/1024*10)/10;
    console.log(`icon             ${ra2.goc}px ${Math.round(cũ/1024)}KB → png 64px ${k(icon)}KB, webp 64px ${k(path.join(ra,'icon.webp'))}KB`);
  }
  console.log(`Tổng ảnh minh hoạ: ${(tong/1024).toFixed(0)}KB`);
  await br.close();
})().catch(e=>{console.error(e);process.exit(1)});
