const crypto = require('node:crypto');
const {tier,limits} = require('./license.cjs');
const RATIO = 5;                    // 5 phút tập trung = 1 credit
const PACKS = [1, 5, 10, 15, 30];   // các gói phút có thể đổi
const VERSION = 7;
const IDLE_CHOICES = [120, 300, 600, 900];
const THEMES = ['system', 'light', 'dark'];
const DEFAULT_PRESETS = [25, 50, 90];
// Quà cho lần chạy đầu tiên, để người dùng mới có sẵn ít thời gian dùng khi cần gấp.
// Cố tình KHÔNG nằm trong initial(): reset dữ liệu phải về 0, nếu không xóa-rồi-cài-lại
// trở thành cách kiếm credit vô hạn.
const WELCOME_CREDITS = 15;
const MAX_PRESETS = 4;
const LOCK_PACKS = [30, 60, 120, 240];   // số phút khóa có thể chọn
const MAX_LOCK_MINUTES = 720;            // trần 12 tiếng: khóa lỡ tay không được biến thành thảm họa
const HISTORY_DAYS = 180;                // số ngày lưu trên đĩa; bậc license quyết định xem được bao nhiêu
const DEFAULT_SITES = ['youtube.com', 'facebook.com', 'tiktok.com', 'instagram.com'];
const DAY = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const round = n => Math.round(n*100)/100;
const isSite = t => !!t.domain;
const isApp = t => !!t.exe;
const clean = (v,max=253) => String(v??'').trim().slice(0,max);
function requireThat(ok,msg) { if(!ok) throw new Error(msg); }

const blankDay = (day=DAY()) => ({day, minutes:0, completed:0, interrupted:0, earned:0});
const validPresets = v => Array.isArray(v) && v.length>=1 && v.length<=MAX_PRESETS
  && v.every(n=>Number.isInteger(n)&&n>=1&&n<=180) && new Set(v).size===v.length;

function initial() {
  return { version:VERSION, token:crypto.randomBytes(32).toString('hex'), idleSeconds:300, theme:'system',
    presets:[...DEFAULT_PRESETS], credits:0, paired:false, lockUntil:null,
    targets: DEFAULT_SITES.map(domain=>({id:domain,domain})),
    session:null, grant:null, lastSession:null, history:[blankDay()] };
}

function migrate(state, now=Date.now()) {
  if(state.version===VERSION) return state;
  let next;
  // Từ v3 trở đi mọi bản đều cùng một hình dạng, chỉ khác ở việc thiếu vài trường mới —
  // nên nhận cả dải chứ không liệt kê từng số. Liệt kê từng số chính là lý do người dùng
  // có dữ liệu v5 và v6 bị chặn ngoài cửa khi VERSION nhảy lên 7.
  if(state.version===1||state.version===2) next=fromLegacy(state,now);
  else if(Number.isInteger(state.version)&&state.version>=3&&state.version<VERSION) next=structuredClone(state);
  else throw new Error('Phiên bản dữ liệu không tương thích');
  if(!THEMES.includes(next.theme)) next.theme='system';
  if(!validPresets(next.presets)) next.presets=[...DEFAULT_PRESETS];
  if(typeof next.lockUntil!=='number'||next.lockUntil<=now) next.lockUntil=null;
  if(!Array.isArray(next.history)) {
    // v6 trở về trước chỉ đếm số phút của hôm nay; giữ lại nó thành dòng đầu tiên của lịch sử.
    const t=next.today;
    next.history=[t&&typeof t.minutes==='number'?{...blankDay(t.day||DAY()),minutes:t.minutes}:blankDay()];
  }
  delete next.today;
  // Người dùng trước v4 đã ghép nối xong từ trước; đừng bắt họ đi qua màn hình mở đầu.
  next.paired=state.version<4?true:!!next.paired;
  next.version=VERSION;
  return next;
}

// v1 và v2 mang theo task, habit, sổ credit và nhiều grant. Bản này chỉ giữ những gì
// còn ý nghĩa: mã ghép nối, số dư, danh sách website đang bật và lượt mở còn hiệu lực.
function fromLegacy(state, now) {
  const next=initial();
  if(typeof state.token==='string'&&state.token) next.token=state.token;
  if(IDLE_CHOICES.includes(Number(state.settings?.idleSeconds))) next.idleSeconds=Number(state.settings.idleSeconds);
  next.targets=(state.targets||[]).filter(t=>t.type==='site'&&t.enabled&&t.domain)
    .map(t=>({id:t.domain,domain:t.domain}));
  const domainOf=id=>(state.targets||[]).find(t=>t.id===id)?.domain;
  const live=(state.grants||[]).filter(g=>g.until>now&&!g.ended);
  const kept=live.find(g=>next.targets.some(t=>t.id===domainOf(g.targetId)));
  let credits=(state.ledger||[]).reduce((n,x)=>n+(Number(x.amount)||0),0);
  for(const g of live) if(g!==kept) credits+=Math.min(Number(g.minutes)||0,(g.until-now)/60000);
  if(kept) next.grant={targetId:domainOf(kept.targetId),domain:domainOf(kept.targetId),until:kept.until,minutes:kept.minutes};
  next.credits=Math.max(0,round(credits));
  return next;
}

class Engine {
  constructor(state=initial(), clock=()=>Date.now(), save=()=>{}) { this.s=state; this.clock=clock; this.save=save; this.lastTick=clock(); }
  commit() { this.save(this.s); return this.s; }
  recover() { if(this.s.session) this.stop('Ứng dụng đã đóng hoặc khởi động lại'); this.lastTick=this.clock(); }
  stop(reason) {
    if(!this.s.session) return;
    this.s.session=null; this.day().interrupted+=1;
    this.s.lastSession={status:'interrupted',reason,credits:0,at:this.clock()}; this.commit();
  }
  // Mỗi ngày một dòng, mới nhất đứng đầu. Đây là nguồn duy nhất cho cả bộ đếm hôm nay
  // lẫn biểu đồ tiến bộ, nên không có chuyện hai con số lệch nhau.
  day() {
    const day=DAY();
    if(this.s.history[0]?.day!==day) this.s.history.unshift(blankDay(day));
    if(this.s.history.length>HISTORY_DAYS) this.s.history.length=HISTORY_DAYS;
    return this.s.history[0];
  }
  award(minutes) {
    const today=this.day(), earned=round(minutes/RATIO);
    today.minutes+=minutes; today.completed+=1; today.earned=round(today.earned+earned);
    this.s.credits=round(this.s.credits+earned);
    return earned;
  }
  tick(idle=0) {
    const s=this.s, now=this.clock(), delta=now-this.lastTick; this.lastTick=now;
    if(s.session) {
      if(delta<0||delta>10000) this.stop('Máy ngủ hoặc đồng hồ hệ thống thay đổi');
      else if(idle>=s.idleSeconds) this.stop('Máy không hoạt động quá ngưỡng đã đặt');
      else {
        s.session.elapsedMs+=delta;
        if(s.session.elapsedMs>=s.session.durationMs) {
          const credits=this.award(s.session.durationMs/60000);
          s.session=null; s.lastSession={status:'completed',reason:null,credits,at:now}; this.commit();
        }
      }
    }
    if(s.grant&&s.grant.until<=now) { s.grant=null; this.commit(); }
    if(s.lockUntil&&s.lockUntil<=now) { s.lockUntil=null; this.commit(); }
  }
  action(type,p={}) {
    const s=this.s, now=this.clock(), unlocked=()=>!!s.grant&&s.grant.until>now, locked=()=>!!s.lockUntil&&s.lockUntil>now;
    switch(type) {
      case 'start': {
        requireThat(!s.session,'Bạn đang có một phiên tập trung.');
        requireThat(!unlocked(),'Hãy kết thúc thời gian giải trí trước khi tập trung.');
        const minutes=Number(p.minutes);
        requireThat(Number.isInteger(minutes)&&minutes>=1&&minutes<=180,'Thời lượng phải từ 1 đến 180 phút.');
        s.session={startedAt:now,durationMs:minutes*60000,elapsedMs:0}; this.lastTick=now; break;
      }
      case 'cancel': requireThat(s.session,'Không có phiên nào đang chạy.'); this.stop('Bạn đã dừng phiên'); break;
      case 'redeem': {
        requireThat(!locked(),'Đang trong chế độ khóa. Không đổi được credit cho tới khi hết giờ khóa.');
        requireThat(!s.session,'Không thể đổi credit trong phiên tập trung.');
        requireThat(!unlocked(),'Chỉ mở một website tại một thời điểm.');
        const target=s.targets.find(t=>t.id===p.id); requireThat(target,'Không tìm thấy website trong danh sách.');
        const minutes=Number(p.minutes); requireThat(PACKS.includes(minutes),'Gói thời gian không hợp lệ.');
        requireThat(s.credits>=minutes,'Bạn chưa đủ credit. Hoàn thành một phiên tập trung để tích lũy.');
        s.credits=round(s.credits-minutes);
        s.grant={targetId:target.id,domain:target.domain,until:now+minutes*60000,minutes}; break;
      }
      case 'endGrant': requireThat(unlocked(),'Không có website nào đang mở.'); s.grant=null; break;
      case 'appAdd': {
        requireThat(limits().appBlocking,'Chặn ứng dụng thuộc bản Pro.');
        requireThat(!s.session,'Không đổi danh sách chặn giữa phiên.');
        const exe=clean(p.exe,200).toLowerCase().replace(/\.exe$/,'');
        requireThat(/^[a-z0-9][a-z0-9 ._-]{0,79}$/.test(exe),'Không nhận ra ứng dụng này.');
        requireThat(!s.targets.some(t=>t.exe===exe),'Ứng dụng này đã có trong danh sách.');
        requireThat(s.targets.length<limits().maxTargets,`Bản ${tier()==='free'?'Free':'hiện tại'} chặn tối đa ${limits().maxTargets} mục.`);
        s.targets.push({id:'app:'+exe,exe,name:clean(p.name,80)||exe}); break;
      }
      case 'targetAdd': {
        requireThat(!s.session,'Không đổi danh sách chặn giữa phiên.');
        const domain=clean(p.domain).toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/\/$/,'');
        requireThat(/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain),'Nhập tên miền, ví dụ reddit.com; không nhập đường dẫn.');
        requireThat(!s.targets.some(t=>t.domain===domain),'Website này đã có trong danh sách.');
        requireThat(s.targets.length<limits().maxTargets,`Bản ${tier()==='free'?'Free':'hiện tại'} chặn tối đa ${limits().maxTargets} website.`);
        s.targets.push({id:domain,domain}); break;
      }
      case 'targetDelete':
        requireThat(!locked(),'Đang trong chế độ khóa. Không bỏ chặn được website nào cho tới khi hết giờ khóa.');
        requireThat(!s.session,'Không đổi danh sách chặn giữa phiên.');
        requireThat(!unlocked()||s.grant.targetId!==p.id,'Hãy kết thúc thời gian đang mở trước.');
        s.targets=s.targets.filter(t=>t.id!==p.id); break;
      case 'settings': {
        let changed=false;
        if(p.theme!==undefined) { requireThat(THEMES.includes(p.theme),'Chủ đề không hợp lệ.'); s.theme=p.theme; changed=true; }
        if(p.presets!==undefined) {
          const presets=Array.isArray(p.presets)?p.presets.map(Number):null;
          requireThat(Array.isArray(presets)&&presets.length>=1,'Cần giữ ít nhất một khung thời gian.');
          requireThat(presets.length<=MAX_PRESETS,`Tối đa ${MAX_PRESETS} khung thời gian.`);
          requireThat(presets.every(n=>Number.isInteger(n)&&n>=1&&n<=180),'Mỗi khung phải từ 1 đến 180 phút.');
          requireThat(new Set(presets).size===presets.length,'Khung thời gian này đã có.');
          s.presets=[...presets].sort((a,b)=>a-b); changed=true;
        }
        if(p.idleSeconds!==undefined) {
          requireThat(!s.session,'Hãy kết thúc phiên trước khi đổi ngưỡng.');
          requireThat(IDLE_CHOICES.includes(Number(p.idleSeconds)),'Ngưỡng không hợp lệ.');
          s.idleSeconds=Number(p.idleSeconds); changed=true;
        }
        requireThat(changed,'Không có cài đặt nào để đổi.'); break;
      }
      case 'lock': {
        requireThat(limits().lockedMode,'Chế độ khóa thuộc bản Pro.');
        requireThat(!locked(),'Đang trong chế độ khóa rồi.');
        requireThat(!unlocked(),'Hãy để hết thời gian đang mở trước khi bật chế độ khóa.');
        const minutes=Number(p.minutes);
        requireThat(Number.isInteger(minutes)&&minutes>=1&&minutes<=MAX_LOCK_MINUTES,`Thời lượng khóa phải từ 1 đến ${MAX_LOCK_MINUTES} phút.`);
        s.lockUntil=now+minutes*60000; break;
      }
      default: throw new Error('Thao tác không được hỗ trợ.');
    }
    return this.commit();
  }
  snapshot() {
    const s=this.s;
    return { credits:s.credits, idleSeconds:s.idleSeconds, theme:s.theme, presets:[...s.presets], paired:!!s.paired, targets:structuredClone(s.targets),
      session:s.session?{...s.session}:null, grant:s.grant?{...s.grant}:null, lastSession:s.lastSession?{...s.lastSession}:null,
      todayMinutes:s.history[0]?.day===DAY()?s.history[0].minutes:0,
      history:s.history.slice(0,limits().historyDays).map(d=>({...d})), historyDays:limits().historyDays,
      packs:PACKS, ratio:RATIO, maxPresets:MAX_PRESETS,
      tier:tier(), maxTargets:limits().maxTargets, lockedMode:limits().lockedMode, appBlocking:limits().appBlocking,
      lockUntil:s.lockUntil&&s.lockUntil>this.clock()?s.lockUntil:null, lockPacks:LOCK_PACKS, now:this.clock() };
  }
  // main.cjs hỏi câu này mỗi khi cửa sổ tiền cảnh đổi.
  blockedApp(exe) {
    const now=this.clock();
    if(!limits().appBlocking||!exe) return null;
    const target=this.s.targets.find(t=>isApp(t)&&t.exe===exe);
    if(!target) return null;
    const locked=!!this.s.lockUntil&&this.s.lockUntil>now;
    const open=!locked&&this.s.grant&&this.s.grant.targetId===target.id&&this.s.grant.until>now;
    return open?null:target;
  }
  rules() {
    const now=this.clock();
    const lockUntil=this.s.lockUntil&&this.s.lockUntil>now?this.s.lockUntil:null;
    return { targets:this.s.targets.filter(isSite).map(t=>({id:t.id,domain:t.domain})),
      grants:lockUntil?[]:this.s.grant&&this.s.grant.until>now?[{targetId:this.s.grant.targetId,until:this.s.grant.until}]:[],
      lockUntil, now };
  }
}
module.exports={Engine,initial,migrate,DAY,RATIO,PACKS,THEMES,VERSION,MAX_PRESETS,WELCOME_CREDITS,LOCK_PACKS,MAX_LOCK_MINUTES,HISTORY_DAYS};
