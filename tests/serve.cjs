// Máy chủ tĩnh bé xíu cho các bài kiểm trang giới thiệu.
//
// Vì sao không mở thẳng file://: giao thức file: không phản ánh đúng cách trình duyệt
// tải font. Đo được: cùng một trang, mở bằng file:// thì cả ba subset Inter đều ở trạng
// thái 'loaded', còn qua HTTP thì chỉ latin và vietnamese được tải — latin-ext nằm im
// đúng như ý đồ. Bài nào nói về chuyện tải cái gì thì phải chạy qua HTTP.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const KIEU={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8','.woff2':'font/woff2','.webp':'image/webp',
  '.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4','.webm':'video/webm',
  '.xml':'text/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.json':'application/json'};

// Trả về {base, close}. base là gốc kiểu http://127.0.0.1:<cổng>
module.exports = async function serve(dir){
  const srv=http.createServer((q,s)=>{
    const đường=decodeURIComponent(q.url.split('?')[0]);
    let f=path.join(dir,đường==='/'?'index.html':đường);
    // cleanUrls của Vercel: /gia cũng phục vụ gia.html
    if(!fs.existsSync(f)&&fs.existsSync(f+'.html')) f=f+'.html';
    if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){
      const p404=path.join(dir,'404.html');
      if(fs.existsSync(p404)){s.writeHead(404,{'content-type':KIEU['.html']});fs.createReadStream(p404).pipe(s);return;}
      s.writeHead(404);s.end();return;
    }
    s.writeHead(200,{'content-type':KIEU[path.extname(f)]||'application/octet-stream'});
    fs.createReadStream(f).pipe(s);
  });
  await new Promise(r=>srv.listen(0,'127.0.0.1',r));
  return {base:'http://127.0.0.1:'+srv.address().port, close:()=>new Promise(r=>srv.close(r))};
};
