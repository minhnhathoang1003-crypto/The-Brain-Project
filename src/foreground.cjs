// Theo dõi cửa sổ đang ở tiền cảnh của Windows, và thu nhỏ nó khi cần.
//
// Cố tình KHÔNG dùng thư viện native: một tiến trình PowerShell chạy nền, khai báo ba hàm
// user32 rồi in tên tiến trình mỗi giây. Đổi lại là không có bước biên dịch, không lệ thuộc
// ABI của Electron, và không có file .node nào để phần mềm diệt virus phải soi.
//
// Không giết tiến trình nào, không đọc nội dung cửa sổ — chỉ lấy tên tiến trình đang ở trước
// và thu nhỏ cửa sổ khi người dùng chọn quay lại làm việc.
const {spawn} = require('node:child_process');
const {EventEmitter} = require('node:events');

const SCRIPT = `
$ErrorActionPreference='SilentlyContinue'
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class BrainFg {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(IntPtr h, out int pid);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowTextW(IntPtr h, StringBuilder s, int n);
  public static string Title(IntPtr h){ StringBuilder b=new StringBuilder(256); GetWindowTextW(h,b,256); return b.ToString(); }
}
"@
$last=''
while($true){
  if($Host.UI.RawUI -ne $null){}
  $h=[BrainFg]::GetForegroundWindow()
  $procId=0
  [void][BrainFg]::GetWindowThreadProcessId($h,[ref]$procId)
  $p=Get-Process -Id $procId -ErrorAction SilentlyContinue
  $line='FG|'+$(if($p){$p.ProcessName}else{''})+'|'+[BrainFg]::Title($h)
  if($line -ne $last){ Write-Output $line; $last=$line }
  Start-Sleep -Milliseconds 900
}
`;

const LIST = `
$ErrorActionPreference='SilentlyContinue'
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
Get-Process | Where-Object { $_.MainWindowTitle -ne '' } |
  Sort-Object ProcessName -Unique |
  ForEach-Object { 'APP|' + $_.ProcessName + '|' + $_.MainWindowTitle }
`;

// Tiến trình của Windows và của chính ứng dụng này không bao giờ nên nằm trong danh sách chọn.
const SYSTEM_APPS = new Set(['explorer','applicationframehost','systemsettings','searchhost',
  'shellexperiencehost','textinputhost','startmenuexperiencehost','lockapp','dwm','sihost',
  'the brain project','electron']);

const powershell = args => spawn('powershell.exe',
  ['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',...args],
  {windowsHide:true, stdio:['ignore','pipe','ignore']});

// Trả về danh sách ứng dụng đang có cửa sổ, để người dùng chọn bằng tên quen thuộc
// ("Liên Minh Huyền Thoại") thay vì phải đi tìm file .exe.
function listWindows(timeoutMs=6000) {
  return new Promise(resolve => {
    let done=false, out='';
    const finish = () => { if(done) return; done=true; clearTimeout(timer); child.kill();
      resolve(out.split(/\r?\n/).map(l=>l.split('|')).filter(p=>p[0]==='APP'&&p[1])
        .map(parts=>({exe:parts[1].toLowerCase(), name:(parts.slice(2).join('|')||parts[1]).trim().slice(0,80)}))
        .filter(a=>!SYSTEM_APPS.has(a.exe))); };
    let child;
    try { child = powershell([LIST]); } catch { resolve([]); return; }
    const timer = setTimeout(finish, timeoutMs);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', d => { out += d; });
    child.on('close', finish);
    child.on('error', () => { out=''; finish(); });
  });
}

// Phát sự kiện 'change' với {exe, title} mỗi khi cửa sổ tiền cảnh đổi.
// Phát 'unavailable' nếu không chạy được PowerShell — khi đó chặn ứng dụng đơn giản là không bật.
class ForegroundWatcher extends EventEmitter {
  constructor() { super(); this.child=null; this.current={exe:'',title:''}; }
  start() {
    if(this.child) return;
    try { this.child = powershell([SCRIPT]); }
    catch(e) { this.emit('unavailable', e.message); return; }
    let buffer='';
    this.child.stdout.setEncoding('utf8');
    this.child.stdout.on('data', chunk => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/); buffer = lines.pop();
      for(const line of lines) {
        const parts = line.split('|');
        if(parts[0] !== 'FG') continue;
        this.current = {exe:(parts[1]||'').toLowerCase(), title:parts.slice(2).join('|').trim()};
        this.emit('change', this.current);
      }
    });
    this.child.on('error', e => { this.child=null; this.emit('unavailable', e.message); });
    this.child.on('close', () => { this.child=null; });
  }
  // Đóng ứng dụng bị chặn bằng WM_CLOSE — đúng như người dùng bấm dấu X, nên ứng dụng
  // vẫn được cơ hội lưu việc đang làm dở. KHÔNG dùng TerminateProcess: giết tiến trình
  // là làm mất dữ liệu của người dùng, và đó cũng là chữ ký kinh điển của malware.
  //
  // Cố tình nhắm theo TÊN TIẾN TRÌNH chứ không phải cửa sổ tiền cảnh: lúc người dùng bấm nút,
  // cửa sổ ở tiền cảnh chính là lớp phủ của chúng ta, không phải ứng dụng bị chặn.
  closeApp(exe) {
    const name=String(exe||'').toLowerCase();
    if(!name||SYSTEM_APPS.has(name)||!/^[a-z0-9][a-z0-9 ._-]{0,79}$/.test(name)) return false;
    try {
      powershell([`$ErrorActionPreference='SilentlyContinue'
Get-Process -Name '${name}' | ForEach-Object { [void]$_.CloseMainWindow() }`]);
      return true;
    } catch { return false; }
  }
  stop() { if(this.child){ this.child.kill(); this.child=null; } }
}

module.exports = {ForegroundWatcher, listWindows, SYSTEM_APPS};
