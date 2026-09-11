// Đăng ký giao thức thebrainproject:// — kiểm bằng chính registry của Windows.
//
// Bài này tồn tại vì một lần suýt phát hành hỏng: package.json từng khai
// build.protocols và trông như đã xong, nhưng tùy chọn đó của electron-builder chỉ
// có tác dụng trên macOS — NSIS không đọc nó. Link trong email sẽ không mở được gì
// cả, mà chẳng có test nào đỏ.
//
// Test này CÓ sửa registry của máy (HKCU, không phải HKLM) và tự dọn sau.
const {_electron:electron}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');

const KHOA='HKCU\\Software\\Classes\\thebrainproject';
// Smart App Control chặn win-unpacked (thư mục build thô) nhưng KHÔNG chặn trình cài
// đặt hay bản đã cài — đã xác minh ở 0.7.1 bằng cùng một file, cùng SHA-256, đặt ở
// hai chỗ khác nhau. Phải hỏi trước khi thử: Playwright ném lỗi khởi động từ một
// promise nội bộ, catch của mình không bắt được và Node sập luôn.
function sacDangBat(){
  const r=reg(['query','HKLM\\SYSTEM\\CurrentControlSet\\Control\\CI\\Policy','/v','VerifiedAndReputablePolicyState']);
  return !!r&&/0x1\b/.test(r);
}
const reg=args=>{try{return execFileSync('reg',args,{encoding:'utf8',stdio:['ignore','pipe','ignore']});}catch{return null;}};
const xoa=()=>reg(['delete',KHOA,'/f']);

(async()=>{
  const root=path.resolve(__dirname,'..');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'brain-protocol-test-'));
  const {PROTOCOL}=require('../src/license.cjs');
  assert.equal(PROTOCOL,'thebrainproject','tên giao thức đổi thì phải sửa cả test này');

  const daCo=!!reg(['query',KHOA]);
  if(daCo){
    // Máy này đã đăng ký sẵn (chạy npm start, hoặc đã cài app). Xóa đi để biết chắc
    // thứ ta đọc được sau đây là do lần chạy này tạo ra, chứ không phải rác cũ.
    console.log('Đã có sẵn đăng ký trên máy này — xóa để kiểm lại từ đầu.');
    xoa();
  }

  let desktop;
  try{
    const env={...process.env,BRAIN_TEST_DIR:dir,BRAIN_TEST_PORT:'47881',BRAIN_TIER:'pro',BRAIN_TEST_PROTOCOL:'1'};
    delete env.ELECTRON_RUN_AS_NODE;
    desktop=await electron.launch({args:[root],env});
    await desktop.firstWindow();

    // Windows cần một nhịp để ghi xong; đừng đọc ngay lập tức rồi kết luận là hỏng.
    let than=null;
    for(let i=0;i<40&&!than;i++){
      than=reg(['query',KHOA]);
      if(!than)await new Promise(r=>setTimeout(r,100));
    }
    assert.ok(than,'ứng dụng chạy rồi mà không đăng ký được giao thức — link trong email sẽ không mở được gì');
    assert.match(than,/URL Protocol/,'thiếu giá trị "URL Protocol" thì Windows không coi đây là giao thức');
    console.log('§1 đã đăng ký      ',KHOA);

    const lenh=reg(['query',KHOA+'\\shell\\open\\command','/ve']);
    assert.ok(lenh,'thiếu lệnh mở — Windows không biết chạy gì khi bấm link');
    // Phải có chỗ nhận đường link, nếu không app mở lên mà không thấy mã đâu.
    assert.match(lenh,/%1/,`lệnh mở phải nhận tham số đường link, nhận được: ${lenh.trim()}`);
    assert.match(lenh,/\.exe/i,'lệnh mở phải trỏ tới một file thực thi');
    console.log('§2 lệnh mở         ',lenh.trim().split(/\s{4,}/).pop().slice(0,90));

    // §3 Đọc được mã ra khỏi đúng loại link mà Windows sẽ truyền vào.
    const KEY='04C49813-1111-2222-3333-7CECA38820BB';
    const {keyFromArgv}=require('../src/license.cjs');
    assert.equal(keyFromArgv(['app.exe',`${PROTOCOL}://activate?key=${KEY}`]),KEY);
    console.log('§3 đọc mã từ argv  ',KEY);

    // §4 Bản đã đóng gói đi qua NHÁNH KHÁC của main.cjs (app.isPackaged), và đó mới
    // là thứ khách chạy. Nhánh dev xanh không chứng minh được gì cho nhánh kia.
    // Chỉ chạy khi có sẵn bản build; không bắt ai phải build mới test được.
    const dongGoi=path.join(root,'release/win-unpacked/The Brain Project.exe');
    if(!fs.existsSync(dongGoi)){
      console.log('§4 bỏ qua          ','chưa có release/win-unpacked — chạy `npm run pack` để kiểm nhánh đóng gói');
    }else if(sacDangBat()){
      console.log('§4 KHÔNG KIỂM ĐƯỢC','Smart App Control đang bật — Windows chặn release/win-unpacked.');
      console.log('                    Trình cài đặt và bản đã cài thì KHÔNG bị chặn, nên đây là hạn chế');
      console.log('                    của máy test chứ không phải lỗi của sản phẩm. Sau khi cài bản mới,');
      console.log('                    tự kiểm bằng lệnh trong tests/protocol.cjs.');
    }else{
      await desktop.close();desktop=null;
      xoa();
      const dir2=fs.mkdtempSync(path.join(os.tmpdir(),'brain-protocol-packed-'));
      const env2={...process.env,BRAIN_TEST_DIR:dir2,BRAIN_TEST_PORT:'47882',BRAIN_TIER:'pro',BRAIN_TEST_PROTOCOL:'1'};
      delete env2.ELECTRON_RUN_AS_NODE;
      let app2;
      try{
        app2=await electron.launch({executablePath:dongGoi,env:env2});
        await app2.firstWindow();
        let lenh2=null;
        for(let i=0;i<50&&!lenh2;i++){
          lenh2=reg(['query',KHOA+'\\shell\\open\\command','/ve']);
          if(!lenh2)await new Promise(r=>setTimeout(r,100));
        }
        assert.ok(lenh2,'bản đã đóng gói không đăng ký được giao thức');
        assert.match(lenh2,/%1/,'lệnh mở của bản đóng gói phải nhận đường link');
        assert.match(lenh2,/The Brain Project\.exe/,
          `lệnh mở phải trỏ tới chính ứng dụng, nhận được: ${lenh2.trim()}`);
        assert.ok(!/electron\.exe/i.test(lenh2),'bản đóng gói không được trỏ tới electron.exe');
        console.log('§4 bản đóng gói    ',lenh2.trim().split(/\s{4,}/).pop().slice(0,90));
      }finally{
        if(app2)await app2.close();
        fs.rmSync(dir2,{recursive:true,force:true});
      }
    }

    console.log('PASS: giao thức được đăng ký lúc chạy, đúng hình dạng Windows cần, và ứng dụng đọc được mã từ link.');
  }finally{
    if(desktop)await desktop.close();
    // Dọn sạch: chỉ giữ lại đăng ký nếu máy này vốn đã có từ trước.
    xoa();
    if(daCo)console.log('Lưu ý: đăng ký cũ trên máy này đã bị xóa. Chạy `npm start` hoặc mở app đã cài để đăng ký lại.');
    fs.rmSync(dir,{recursive:true,force:true});
  }
})().catch(e=>{console.error('LỖI:',e.message);process.exitCode=1;});
