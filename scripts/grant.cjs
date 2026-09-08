// Công cụ dành cho phát triển và thử nghiệm — KHÔNG nằm trong bản đóng gói (xem "files" ở package.json).
// Cộng credit thẳng vào dữ liệu thật của ứng dụng trên máy này.
//
//   node scripts/grant.cjs            — chỉ đọc và in số dư hiện tại
//   node scripts/grant.cjs 100        — cộng thêm 100 credit
//
// Phải đóng The Brain Project trước, nếu không ứng dụng sẽ ghi đè lên thay đổi này.
const {app,safeStorage}=require('electron');
const fs=require('node:fs'), path=require('node:path'), {execFileSync}=require('node:child_process');

// Chạy script trực tiếp thì Electron lấy tên mặc định là "Electron"; ép về đúng tên ứng dụng
// để getPath('userData') trỏ vào thư mục dữ liệu thật.
app.setName(require('../package.json').name);

const amount=process.argv.includes('--')?Number(process.argv[process.argv.indexOf('--')+1]):Number(process.argv[2]);
const readOnly=!Number.isFinite(amount);

app.whenReady().then(()=>{
  try{
    const file=path.join(app.getPath('userData'),'brain-data.enc');
    if(!fs.existsSync(file))throw new Error(`Chưa có dữ liệu tại ${file}. Hãy mở ứng dụng một lần rồi đóng lại.`);
    if(!safeStorage.isEncryptionAvailable())throw new Error('Windows không cung cấp mã hóa cho tài khoản này.');

    if(!readOnly){
      const running=execFileSync('tasklist',['/FI','IMAGENAME eq The Brain Project.exe','/NH'],{encoding:'utf8'});
      if(running.includes('The Brain Project.exe'))
        throw new Error('The Brain Project đang chạy. Hãy đóng hẳn ứng dụng rồi chạy lại lệnh này, nếu không ứng dụng sẽ ghi đè thay đổi.');
    }

    const state=JSON.parse(safeStorage.decryptString(fs.readFileSync(file)));
    console.log(`Số dư hiện tại: ${state.credits} credit`);
    if(readOnly){
      console.log(`Phiên đang chạy: ${state.session?'có':'không'} · Website đang mở: ${state.grant?state.grant.domain:'không'}`);
      console.log('Thêm một con số vào lệnh để cộng credit, ví dụ: node scripts/grant.cjs 100');
      return;
    }

    const backup=file+'.before-grant';
    fs.copyFileSync(file,backup);
    state.credits=Math.round((state.credits+amount)*100)/100;
    const temp=file+'.tmp';
    fs.writeFileSync(temp,safeStorage.encryptString(JSON.stringify(state)));
    fs.renameSync(temp,file);
    console.log(`Đã cộng ${amount} credit. Số dư mới: ${state.credits} credit`);
    console.log(`Bản sao trước khi sửa: ${backup}`);
  }catch(e){
    console.error('Lỗi: '+e.message);
    process.exitCode=1;
  }finally{
    app.quit();
  }
});
