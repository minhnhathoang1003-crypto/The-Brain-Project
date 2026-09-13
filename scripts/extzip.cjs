// Đóng gói thư mục extension/ thành file ZIP để nộp lên Chrome Web Store.
//
// Vì sao cần script thay vì nén tay: bản trên cửa hàng đã kẹt ở 0.6.0 trong khi mã nguồn
// đi tới 0.7.x mà không ai thấy. Nén tay là lúc quên mất đã đổi gì và đóng gói nhầm.
//
// Chạy: node scripts/extzip.cjs
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const nguồn=path.join(root,'extension');
const ra=path.join(root,'chrome-web-store');

const số=v=>String(v).split('.').map(Number);
const cũHơn=(a,b)=>{const x=số(a),y=số(b);for(let i=0;i<Math.max(x.length,y.length);i++){const d=(x[i]||0)-(y[i]||0);if(d)return d<0;}return false;};

(async()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(nguồn,'manifest.json'),'utf8'));
  const v=manifest.version;
  if(!/^\d+(\.\d+){1,3}$/.test(v)) throw new Error(`manifest.version không hợp lệ: ${v}`);

  // Cửa hàng chỉ nhận phiên bản TĂNG. Nộp lại số cũ là bị từ chối ngay ở bước upload.
  fs.mkdirSync(ra,{recursive:true});
  const đãCó=fs.readdirSync(ra).map(f=>/focus-bridge-(\d[\d.]*)\.zip$/.exec(f)?.[1]).filter(Boolean);
  const caoNhất=đãCó.sort((a,b)=>cũHơn(a,b)?-1:1).at(-1);
  if(caoNhất&&!cũHơn(caoNhất,v))
    throw new Error(`Trong chrome-web-store/ đã có bản ${caoNhất}. Tăng version trong extension/manifest.json trước (đang là ${v}).`);

  const đích=path.join(ra,`the-brain-project-focus-bridge-${v}.zip`);
  fs.rmSync(đích,{force:true});
  const r=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',
    `Compress-Archive -Path '${nguồn}\\*' -DestinationPath '${đích}' -CompressionLevel Optimal -Force`],
    {encoding:'utf8'});
  if(r.status!==0||!fs.existsSync(đích)){console.error(r.stderr||r.stdout);throw new Error('nén hỏng');}

  // Đọc lại chính file vừa tạo để báo cáo, chứ không báo cáo thứ mình tưởng đã bỏ vào.
  const danh=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',
    `Add-Type -A System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::OpenRead('${đích}').Entries | ForEach-Object { $_.FullName }`],
    {encoding:'utf8'});
  // .NET trả FullName với dấu gạch ngược trên Windows, dù trong file ZIP là gạch xuôi
  // (đọc lại bằng python zipfile thì đúng là gạch xuôi). Chuẩn hóa trước khi đối chiếu,
  // không thì phép kiểm dưới đây báo thiếu fonts/ trong khi nó có đủ.
  const tệp=(danh.stdout||'').split(/\r?\n/).map(x=>x.trim().replace(/\\/g,'/'))
    .filter(x=>x&&!x.endsWith('/')).sort();

  // Những thứ thiếu một cái là tiện ích hỏng ngay khi nạp.
  const bắtBuộc=['manifest.json','background.js','blocked.html','blocked.css','blocked.js','popup.html','popup.js'];
  const thiếu=bắtBuộc.filter(f=>!tệp.includes(f));
  if(thiếu.length) throw new Error('ZIP thiếu file: '+thiếu.join(', '));
  // blocked.css tự host font. Thiếu một file là trang chặn đổi mặt chữ mà không báo lỗi
  // gì cả — đối chiếu từng url(fonts/...) với thứ thật sự nằm trong ZIP.
  const css=fs.readFileSync(path.join(nguồn,'blocked.css'),'utf8');
  const cầnFont=[...css.matchAll(/url\((fonts\/[^)]+)\)/g)].map(m=>m[1]);
  const thiếuFont=[...new Set(cầnFont)].filter(f=>!tệp.includes(f));
  if(thiếuFont.length) throw new Error('blocked.css gọi font không có trong ZIP: '+thiếuFont.join(', '));
  // Và chiều ngược lại: font nằm trong gói mà không ai gọi là byte chết gửi cho mọi người.
  const thừaFont=tệp.filter(f=>f.startsWith('fonts/')&&!cầnFont.includes(f));
  if(thừaFont.length) throw new Error('ZIP có font không ai dùng: '+thừaFont.join(', '));
  if(!tệp.some(f=>f.startsWith('icons/'))) throw new Error('ZIP không có icons/');

  const kb=n=>(n/1024).toFixed(0)+'KB';
  console.log(`${path.relative(root,đích)}  ${kb(fs.statSync(đích).size)}  ·  ${tệp.length} file`);
  console.log('  '+tệp.join('\n  '));
  console.log(`\nQuyền xin: ${(manifest.permissions||[]).join(', ')} · host: ${(manifest.host_permissions||[]).join(', ')}`);
  console.log('Không thêm quyền mới so với bản trên cửa hàng thì Chrome không hỏi lại người dùng');
  console.log('và bản cập nhật tự về trong vòng vài giờ tới vài ngày.');
})().catch(e=>{console.error(e.message);process.exit(1)});
