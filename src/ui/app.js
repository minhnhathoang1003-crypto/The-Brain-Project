let state=null,minutes=25,custom=false,lastSignature='',toastTimer,dialogRevision=0;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>String(n).replace('.',',');
const mmss=ms=>{const t=Math.max(0,Math.ceil(ms/1000));return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;};
const creditsFor=m=>num(Number((m/state.ratio).toFixed(2)));
const earned=s=>num(Number((Math.min(s.elapsedMs,s.durationMs)/60000/state.ratio).toFixed(2)));
const openGrants=()=>state.grants.filter(g=>g.until>state.now);
const grantFor=id=>openGrants().find(g=>g.targetId===id);
const locked=()=>!!state.lockUntil&&state.lockUntil>state.now;
// Bảy ngày gần nhất, cũ ở trái. Ngày không có dữ liệu vẫn phải hiện, nếu không
// biểu đồ sẽ nói dối rằng tuần vừa rồi liền mạch.
function lastDays(n){
  const by=new Map(state.history.map(d=>[d.day,d]));
  const out=[];
  for(let i=n-1;i>=0;i--){
    const d=new Date(state.now);d.setDate(d.getDate()-i);
    const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    out.push({...(by.get(key)||{day:key,minutes:0,completed:0,interrupted:0,earned:0}),
      label:['CN','T2','T3','T4','T5','T6','T7'][d.getDay()],today:i===0});
  }
  return out;
}
const hhmm=ms=>{const m=Math.ceil(Math.max(0,ms)/60000);return m>=60?`${Math.floor(m/60)} giờ ${m%60} phút`:`${m} phút`;};

function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4200);}
async function act(type,p={}){try{const r=await window.brain.action(type,p);if(!r.ok){toast(r.error);return false;}state=r.state;render();return true;}catch{toast('Không thể thực hiện thao tác. Hãy thử lại.');return false;}}
// Electron bọc lỗi từ tiến trình chính thành "Error invoking remote method 'system': Error: …".
// Người dùng không cần thấy tên phương thức IPC, chỉ cần câu cuối cùng.
const plainError=m=>String(m||'').replace(/^Error invoking remote method '[^']*':\s*/,'').replace(/^(Uncaught )?Error:\s*/,'')||'Không thực hiện được. Hãy thử lại.';
async function system(type,payload){try{const r=await window.brain.system(type,payload);if(r.message)toast(r.message);}catch(e){toast(plainError(e.message));}}
function ask(title,text,callback){dialogRevision++;$('#confirm-yes').style.display='';$('#confirm-title').textContent=title;$('#confirm-text').textContent=text;$('#confirm').showModal();$('#confirm-no').onclick=()=>$('#confirm').close();$('#confirm-yes').onclick=()=>{$('#confirm').close();callback();};}

// Dải quy đổi: luật cốt lõi của sản phẩm, đặt ngay trên nút bắt đầu.
function ruleStrip(m){
  return `<dl class="rule"><div><dt>Tập trung</dt><dd id="rule-minutes">${m} phút</dd></div><div class="arrow">→</div>
  <div><dt>Nhận được</dt><dd id="rule-credits">${creditsFor(m)} credit</dd></div><div class="arrow">→</div>
  <div class="payoff"><dt>Đổi ra</dt><dd id="rule-payoff">${creditsFor(m)} phút</dd></div></dl>`;
}

function readyView(){
  const idleMinutes=state.idleSeconds/60;
  return `<section class="pane left">
    ${state.system.extensionConnected?'':`<div class="warn"><b>Chưa chặn được website nào.</b> Tiện ích trình duyệt chưa kết nối, nên danh sách bên cạnh chưa có hiệu lực.<br>Nếu bạn vừa mở lại ứng dụng thì chỉ cần đợi vài giây — tiện ích tự kết nối lại, <b>không phải ghép nối lại</b>. Mã ghép nối không đổi. <button class="link" id="warn-setup">Kiểm tra kết nối</button></div>`}
    <div class="stack"><div class="label">Số dư</div><div class="figure">${num(state.credits)}</div><div class="unit">credit</div></div>
    ${openGrants().length?`
    <div class="open-now">
      <div class="label">Đang mở</div>
      ${openGrants().map(g=>`<div class="open-row"><span class="domain">${esc(g.name||g.domain||g.targetId)}</span><b class="open-left" data-left="${esc(g.targetId)}">${mmss(g.until-state.now)}</b><button class="ghost small" data-action="endGrant" data-id="${esc(g.targetId)}">Kết thúc</button></div>`).join('')}
      <button class="ghost big" data-action="endAll">Kết thúc tất cả</button>
      <p class="note">Vẫn đổi được credit cho mục khác ở cột bên — ví dụ mở trình duyệt rồi mở tiếp website bên trong. Hết giờ là chặn lại. Không tập trung được khi còn mục đang mở.</p>
    </div>`:`
    <div class="chips">${state.presets.map(m=>`<button class="chip-btn ${!custom&&minutes===m?'on':''}" data-preset="${m}">${m} phút</button>`).join('')}<button class="chip-btn ${custom?'on':''}" data-preset="custom">Khác</button>${custom?`<input id="custom" class="field narrow" type="number" min="1" max="180" value="${minutes}" aria-label="Số phút tập trung">`:''}</div>
    ${ruleStrip(minutes)}
    <button class="primary big" data-action="start">Bắt đầu tập trung<b id="start-label">${minutes} phút</b></button>
    <p class="note">Chỉ nhận credit khi hoàn tất trọn phiên. Dừng giữa chừng, đóng ứng dụng, khóa máy hoặc rời máy quá ${idleMinutes} phút thì mất toàn bộ credit của phiên.</p>`}
    <div class="week">
      <div class="week-bars">${(()=>{const days=lastDays(7),peak=Math.max(25,...days.map(d=>d.minutes));
        return days.map(d=>`<div class="week-day ${d.today?'now':''}" title="${d.day}: ${d.minutes} phút">
          <div class="week-track"><i style="height:${d.minutes?Math.max(6,Math.round(d.minutes/peak*100)):0}%"></i></div>
          <span>${d.label}</span></div>`).join('');})()}</div>
      <p class="today">Hôm nay <b>${state.todayMinutes}</b> phút · 7 ngày qua <b>${lastDays(7).reduce((n,d)=>n+d.minutes,0)}</b> phút</p>
    </div>
  </section>
  <section class="pane right">
    <div class="sites-head"><span>Đang bị chặn</span><span>${locked()?'Đang khóa':'Đổi credit để mở tạm'}</span></div>
    ${locked()?`<div class="warn locked-note"><b>Chế độ khóa · còn <span id="lock-left">${hhmm(state.lockUntil-state.now)}</span></b><br>Không đổi được credit và không bỏ chặn được website nào cho tới khi hết giờ. Tắt ứng dụng cũng không mở khóa — tiện ích tự giữ hạn khóa. Credit bạn kiếm trong lúc này vẫn được cộng.</div>`:''}
    ${state.targets.map(siteRow).join('')||'<div class="empty">Danh sách trống. Thêm một tên miền để bắt đầu.</div>'}
    <form class="add" data-form="targetAdd"><input class="field" name="domain" maxlength="253" placeholder="thêm tên miền, ví dụ reddit.com" aria-label="Tên miền cần chặn" required><button class="ghost">Thêm</button></form>
    ${state.appBlocking&&!locked()?'<button class="link add-app" id="add-app">＋ Chặn một ứng dụng đang mở</button>':''}
  </section>`;
}
function siteRow(t){
  const label=t.domain||t.name||t.exe;
  return `<div class="row"><span class="mark">${t.exe?'▣':esc(label[0].toUpperCase())}</span><span class="domain" title="${esc(t.exe?t.exe+'.exe':label)}">${esc(label)}</span>
  ${grantFor(t.id)
    ? `<b class="open-left" data-left="${esc(t.id)}">${mmss(grantFor(t.id).until-state.now)}</b><button class="ghost small" data-action="endGrant" data-id="${esc(t.id)}">Kết thúc</button>`
    : `<select class="field mins" id="m-${esc(t.id)}" aria-label="Số phút mở ${esc(t.domain||t.name)}">${state.packs.map(n=>`<option value="${n}" ${n===5?'selected':''}>${n} phút</option>`).join('')}</select>
  <button class="ghost small" data-action="redeem" data-id="${esc(t.id)}" ${locked()||state.session?'disabled':''}>Mở</button>`}
  ${locked()?'<span class="x locked-x" aria-hidden="true">·</span>':`<button class="x" data-action="targetDelete" data-id="${esc(t.id)}" aria-label="Bỏ chặn ${esc(t.domain||t.name)}">×</button>`}</div>`;
}
function focusView(){
  const s=state.session,goal=creditsFor(s.durationMs/60000);
  return `<section class="pane left">
    <div class="stack"><div class="label">Đang tập trung</div><div class="figure" id="timer">${mmss(s.durationMs-s.elapsedMs)}</div><div class="unit">còn lại</div></div>
    <div class="progress"><i id="bar"></i></div>
    <div class="earning">
      <div class="earning-top"><span class="earning-now" id="earning">${earned(s)}</span><span class="earning-goal">/ ${goal} credit</span></div>
      <div class="label">Đang tích lũy</div>
      <p class="earning-risk">Số này chỉ vào ví khi phiên kết thúc trọn vẹn. Dừng lúc này là mất cả <b id="earning-risk">${earned(s)}</b> credit.</p>
    </div>
    <button class="ghost big" data-action="cancel">Dừng phiên</button>
  </section>`;
}
// Lần chạy đầu: chưa ghép nối thì app chưa chặn được gì, nên không cho vào thẳng màn hình chính.
function gateView(){
  return `<section class="pane gate">
    <h1>Còn một bước nữa: bật bộ chặn</h1>
    <p class="lead">The Brain Project chặn website bằng một tiện ích trình duyệt. Chưa gắn tiện ích thì credit không có tác dụng gì, nên hãy làm bốn bước này một lần duy nhất.</p>
    ${state.credits>0?`<div class="warn"><b>Bạn được tặng ${num(state.credits)} credit để bắt đầu.</b> Dùng được ngay sau khi ghép nối xong — để lúc cần gấp bạn vẫn có thời gian, chưa phải tập trung đủ một phiên.</div>`:''}
    <ol>
      <li><span class="k">1</span><p>Nhấn <b>Mở thư mục tiện ích</b> bên dưới. Một cửa sổ Explorer sẽ hiện ra — cứ để nguyên đó.</p></li>
      <li><span class="k">2</span><p>Mở Chrome, gõ <code>chrome://extensions</code> vào thanh địa chỉ rồi Enter. Dùng Edge thì gõ <code>edge://extensions</code>.</p></li>
      <li><span class="k">3</span><p>Bật <b>Developer mode</b> ở góc phải trên, rồi nhấn <b>Load unpacked</b> và chọn đúng thư mục vừa mở ở bước 1.</p></li>
      <li><span class="k">4</span><p>Nhấn <b>Sao chép mã ghép nối</b>, mở biểu tượng tiện ích trên thanh Chrome, dán mã vào rồi nhấn kết nối.</p></li>
    </ol>
    <div class="actions start"><button class="ghost" data-system="extensionFolder">Mở thư mục tiện ích</button><button class="primary" data-system="copyPairing">Sao chép mã ghép nối</button></div>
    <div class="waiting"><i></i> Đang chờ tiện ích kết nối… Màn hình này tự chuyển tiếp khi xong.</div>
  </section>`;
}
async function pickApp(){
  const revision=++dialogRevision;
  $('#confirm-title').textContent='Chọn ứng dụng để chặn';
  $('#confirm-text').innerHTML='<span class="note">Đang đọc danh sách ứng dụng đang mở…</span>';
  $('#confirm').showModal();
  $('#confirm-no').onclick=()=>$('#confirm').close();
  $('#confirm-yes').style.display='none';
  let running;
  try{running=await window.brain.listApps();}
  catch{
    if(revision===dialogRevision&&$('#confirm').open)$('#confirm-text').textContent='Không đọc được danh sách ứng dụng. Hãy đóng bảng này rồi thử lại.';
    return;
  }
  // Kết quả đọc cửa sổ có thể tới sau khi người dùng đã hủy hoặc mở một hộp xác nhận khác.
  if(revision!==dialogRevision||!$('#confirm').open)return;
  const already=new Set(state.targets.filter(t=>t.exe).map(t=>t.exe));
  const open=running.filter(a=>!already.has(a.exe));
  $('#confirm-text').innerHTML=open.length
    ? `<div class="app-pick">${open.map(a=>`<button class="ghost app-option" data-exe="${esc(a.exe)}" data-name="${esc(a.name)}"><b>${esc(a.name)}</b><small>${esc(a.exe)}.exe</small></button>`).join('')}</div>`
    : '<span class="note">Không thấy ứng dụng nào đang mở, hoặc mọi ứng dụng đang mở đều đã bị chặn. Mở ứng dụng bạn muốn chặn rồi thử lại.</span>';
}
// Bảng so sánh đọc thẳng từ license.cjs, nên nó không bao giờ lệch khỏi thứ engine
// thật sự áp dụng. Thêm một hạn mức ở đó là bảng này tự có thêm dòng.
function plansView(){
  const l=state.license,pro=state.tier==='pro';
  const cell=v=>v===true?'<span class="yes" aria-label="Có">✓</span>'
              :v===false?'<span class="no" aria-label="Không">—</span>':esc(String(v));
  return `<div class="set-row col"><div><b>Free và Pro khác nhau ở đâu</b>
    <p>${l.selling
      ? `Bạn đang dùng bản <b>${pro?'Pro':'Free'}</b>.`
      : 'Hôm nay <b>mọi tính năng đều đang mở cho tất cả mọi người</b> — chưa bán, chưa ai bị giới hạn gì. Bảng dưới là ranh giới sẽ áp dụng khi bắt đầu bán.'}</p></div>
    <table class="plans"><thead><tr><th></th><th>Free</th><th class="${pro&&l.selling?'on':''}">Pro</th></tr></thead>
      <tbody>${state.plans.differences.map(d=>`<tr><th>${esc(d.label)}</th><td>${cell(d.free)}</td><td>${cell(d.pro)}</td></tr>`).join('')}</tbody></table>
    <p class="small-note"><b>Vòng lặp cốt lõi miễn phí vĩnh viễn:</b> ${state.plans.alwaysFree.map(esc).join(' · ')}.</p>
    <p class="small-note">Tụt xuống Free không bao giờ làm mất credit đã kiếm, và không bao giờ bỏ chặn thứ gì đang chặn — chỉ là không thêm được mục mới quá hạn mức.</p></div>`;
}

function updateView(){
  const u=state.system.update;
  const ban=v=>v?`bản ${esc(v)}`:'bản mới';
  // Chưa đóng gói thì không có gì để cập nhật — nói thẳng thay vì hiện nút chết.
  if(!u||!u.supported)
    return `<div class="set-row"><div><b>Cập nhật</b><p>Bản đang chạy từ mã nguồn nên không tự cập nhật. Bản đã cài đặt sẽ tự kiểm tra bản mới.</p></div>
      <span class="chip">Không áp dụng</span></div>`;

  const body={
    idle:      ()=>[`Đang dùng bản mới nhất.`,`<button class="ghost small" data-system="updateCheck">Kiểm tra lại</button>`],
    checking:  ()=>[`Đang kiểm tra…`,''],
    available: ()=>[`Có ${ban(u.version)}. Tải về rồi cài khi bạn sẵn sàng — không tự tải để khỏi tốn dung lượng mạng của bạn.`,
                    `<button class="primary small" data-system="updateDownload">Tải bản mới</button>`],
    downloading:()=>[`Đang tải ${ban(u.version)}… ${u.percent}%`,''],
    ready:     ()=>[`${ban(u.version)} đã tải xong. Cài đặt sẽ đóng ứng dụng rồi mở lại.`,
                    `<button class="primary small" data-system="updateInstall">Cài và khởi động lại</button>`],
    error:     ()=>[`Không kiểm tra được bản mới: ${esc(u.error||'lỗi không rõ')}`,
                    `<button class="ghost small" data-system="updateCheck">Thử lại</button>`],
  }[u.status]||(()=>['','']);

  const [text,button]=body();
  const chan=state.session
    ? 'Đang chạy phiên tập trung nên chưa cài được — đóng ứng dụng giữa phiên là mất credit đang tích lũy.'
    : locked()
      ? 'Đang trong chế độ khóa nên chưa cài được: lúc ứng dụng tắt để cài, phần chặn ứng dụng Windows sẽ ngừng hoạt động.'
      : '';
  const nen=u.status==='ready'&&chan;

  return `<div class="set-row"><div><b>Cập nhật</b><p>${text}${nen?`<br><b>${chan}</b>`:''}</p></div>
    ${nen?'':button}</div>`;
}

function licenseView(){
  const l=state.license;
  return `<div class="set-row col"><div><b>Bản quyền</b>
    <p>${l.hasKey
      ? `Mã đã lưu trên máy này: <code>${esc(l.maskedKey)}</code>.${l.status==='unverified'?' <b>Chưa xác minh được</b> vì cổng thanh toán chưa được nối.':''}`
      : 'Chưa có mã nào trên máy này. Khi mở bán, bạn dán mã nhận qua email vào đây.'}</p></div>
    ${l.hasKey
      ? `<div class="actions start"><button class="ghost danger" data-system="licenseRemove">Gỡ mã khỏi máy này</button></div>`
      : `<form class="preset-add" data-form="licenseActivate"><input class="field" name="key" type="text" spellcheck="false" autocomplete="off" placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" aria-label="Mã bản quyền" required><button class="primary small">Kích hoạt</button></form>`}
    <p class="small-note">Mã được lưu mã hóa trong một file riêng, <b>không nằm chung với dữ liệu</b> — nên “Xóa toàn bộ dữ liệu” không làm mất bản quyền bạn đã mua.</p></div>`;
}

// ── Cài đặt: bảy mục, mỗi mục một tab ──────────────────────────────
// Trước đây cả mười hai khối nằm chung một cột cuộn dài, phải kéo rất sâu mới
// tới mục cuối. Nay thanh bên trái đứng yên, chỉ phần nội dung cuộn.
let setupTab='blocker';

// Icon vẽ bằng SVG nét, không dùng emoji: emoji có màu riêng và mỗi hệ điều
// hành vẽ một kiểu, phá luôn nguyên tắc đơn sắc của sản phẩm.
const ICON={
  blocker:'<path d="M9 7V3M15 7V3M7 7h10v5a5 5 0 0 1-10 0z"/><path d="M12 17v4"/>',
  look:'<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none"/>',
  session:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  lock:'<rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  history:'<path d="M4 20V10M10 20V5M16 20v-7M22 20H2"/>',
  license:'<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v4M15 12v3"/>',
  app:'<path d="M12 3 3 7.5v9L12 21l9-4.5v-9z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
};
const svgIcon=id=>`<svg class="tab-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[id]}</svg>`;

function tabBlocker(){
  const connected=state.system.extensionConnected;
  return `<div class="set-row"><div><b>Bộ chặn website</b><p>${connected?'Đang chặn '+state.targets.length+' website.':'Chưa chặn được website nào — tiện ích không kết nối.'}${state.system.bridgeError?'<br>'+esc(state.system.bridgeError):''}</p></div><span class="chip ${connected?'on':''}">${connected?'Đang chạy':'Chưa chạy'}</span></div>
  <p class="small-note">Chỉ phải làm một lần. Mã ghép nối được giữ lại, nên các lần mở ứng dụng sau tiện ích tự kết nối lại trong vài giây.</p>
  <ol class="steps"><li>Nhấn <b>Mở thư mục tiện ích</b>.</li><li>Vào <code>chrome://extensions</code> (Edge: <code>edge://extensions</code>).</li><li>Bật <b>Developer mode</b>, chọn <b>Load unpacked</b> và chọn thư mục vừa mở.</li><li>Sao chép mã ghép nối, dán vào popup tiện ích rồi kết nối.</li></ol>
  <div class="actions start"><button class="ghost" data-system="extensionFolder">Mở thư mục tiện ích</button><button class="primary" data-system="copyPairing">Sao chép mã ghép nối</button></div>`;
}

function tabLook(){
  const themes=[['system','Theo hệ thống'],['light','Sáng'],['dark','Tối']];
  return `<div class="set-row col"><div><b>Giao diện</b><p>Mặc định đi theo cài đặt sáng/tối của Windows.</p></div>
    <span class="seg" role="group" aria-label="Chủ đề giao diện">${themes.map(([id,name])=>`<button class="${state.theme===id?'on':''}" data-theme="${id}">${name}</button>`).join('')}</span></div>`;
}

function tabSession(){
  return `<div class="set-row col"><div><b>Khung thời gian</b><p>Các mốc hiện sẵn trên màn hình chính. Giữ từ 1 đến ${state.maxPresets} mốc; ngoài các mốc này vẫn luôn có ô “Khác”.</p></div>
    <div class="preset-edit">
      ${state.presets.map(m=>`<span class="preset-chip">${m} phút${state.presets.length>1?`<button class="x" data-preset-remove="${m}" aria-label="Bỏ khung ${m} phút">×</button>`:''}</span>`).join('')}
      ${state.presets.length<state.maxPresets?`<form class="preset-add" data-form="presetAdd"><input class="field narrow" name="minutes" type="number" min="1" max="180" placeholder="phút" aria-label="Số phút cho khung mới" required><button class="ghost small">Thêm mốc</button></form>`:'<span class="preset-note">Đã đủ mốc. Bỏ bớt một mốc để thêm mốc khác.</span>'}
    </div></div>
  <div class="set-row"><div><b>Ngưỡng không hoạt động</b><p>Không chạm chuột hay bàn phím quá lâu sẽ hủy phiên. Cơ chế này chỉ giảm việc treo máy, không xác minh được bạn đang học.</p></div>
    <select id="idle" class="field mins" aria-label="Ngưỡng không hoạt động" ${state.session?'disabled':''}>${[120,300,600,900].map(n=>`<option value="${n}" ${state.idleSeconds===n?'selected':''}>${n/60} phút</option>`).join('')}</select></div>
  <div class="set-row col"><div><b>Bảng quy đổi</b><p>Tỉ lệ cố định, không đổi được: 5 phút tập trung bằng 1 credit.</p></div>
    <div class="ratio"><div><span>Tập trung</span><span>Nhận được</span></div>${[25,50,90].map(m=>`<div><span>${m} phút</span><span>${creditsFor(m)} credit</span></div>`).join('')}</div></div>`;
}

function tabLock(){
  return `<div class="set-row col"><div><b>Chế độ khóa</b><p>${locked()
    ? `Đang khóa, còn <b>${hhmm(state.lockUntil-state.now)}</b>. Không có cách nào rút ngắn — kể cả xóa dữ liệu.`
    : 'Khóa cứng trong một khoảng thời gian: không đổi được credit, không bỏ chặn được website, không xóa được dữ liệu, và không ngắt được tiện ích. Không hủy được sau khi bật.'}</p></div>
    ${locked()?'':`<div class="preset-edit">${state.lockPacks.map(m=>`<button class="ghost small" data-lock="${m}">${hhmm(m*60000)}</button>`).join('')}</div>`}</div>`;
}

function tabHistory(){
  return `<div class="set-row col"><div><b>Tiến bộ</b><p>Lưu ${state.historyDays} ngày gần nhất. Chỉ đếm phiên hoàn tất trọn vẹn.</p></div>
    <div class="ratio">${(()=>{const rows=state.history.filter(d=>d.minutes||d.interrupted).slice(0,14);
      return '<div><span>Ngày</span><span>Tập trung · nhận được</span></div>'+(rows.length
        ? rows.map(d=>`<div><span>${d.day.slice(8)}/${d.day.slice(5,7)}${d.day===state.history[0]?.day&&d.day===lastDays(1)[0].day?' · hôm nay':''}</span><span>${d.minutes} phút · ${num(d.earned)} credit${d.interrupted?` · ${d.interrupted} phiên dở`:''}</span></div>`).join('')
        : '<div><span>Chưa có ngày nào</span><span>Hoàn tất một phiên để bắt đầu</span></div>');})()}</div></div>`;
}

function tabLicense(){ return licenseView()+plansView(); }

function tabApp(){
  return `${updateView()}
  <div class="set-row"><div><b>Góp ý</b><p>Kẹt ở đâu, thấy chỗ nào khó hiểu, hay muốn xin thêm tính năng — nói thẳng với tác giả. Ứng dụng không thu thập gì về bạn, nên đây là cách duy nhất tôi biết được điều gì đang không ổn.</p></div>
    <div class="actions start"><button class="ghost small" data-system="feedbackIssues">Mở GitHub</button><button class="primary small" data-system="feedbackEmail">Gửi email</button></div></div>
  <div class="set-row"><div><b>Dữ liệu</b><p>Chỉ lưu trên máy này và mã hóa theo tài khoản Windows. Phiên bản ${esc(state.system.version)}.</p></div><button class="ghost danger" data-system="reset" ${locked()?'disabled':''}>Xóa toàn bộ</button></div>`;
}

function setupTabs(){
  const t=[
    {id:'blocker', ten:'Bộ chặn',     view:tabBlocker},
    {id:'session', ten:'Phiên',       view:tabSession},
    {id:'lock',    ten:'Chế độ khóa', view:tabLock, an:!state.lockedMode},
    {id:'history', ten:'Tiến bộ',     view:tabHistory},
    {id:'look',    ten:'Giao diện',   view:tabLook},
    {id:'license', ten:'Bản quyền',   view:tabLicense},
    {id:'app',     ten:'Ứng dụng',    view:tabApp},
  ];
  return t.filter(x=>!x.an);
}

function setupView(){
  const tabs=setupTabs();
  // Bậc Free không có chế độ khóa nên tab đó biến mất; nếu đang đứng ở đó thì lùi về tab đầu.
  if(!tabs.some(t=>t.id===setupTab)) setupTab=tabs[0].id;
  const hien=tabs.find(t=>t.id===setupTab);
  return `<nav class="setup-rail" role="tablist" aria-label="Mục cài đặt">
    ${tabs.map(t=>`<button role="tab" aria-selected="${t.id===setupTab}" data-setup-tab="${t.id}" class="${t.id===setupTab?'on':''}">${svgIcon(t.id)}<span>${t.ten}</span></button>`).join('')}
  </nav>
  <div class="setup-panel" role="tabpanel">${hien.view()}</div>`;
}

const signature=s=>JSON.stringify({...s,now:0,session:s.session?{...s.session,elapsedMs:0}:null,grants:s.grants.map(g=>({...g,until:0})),lastSession:0});
function render(){
  if(!state)return;
  if(state.theme==='system')delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme=state.theme;
  if(!custom&&!state.presets.includes(minutes))minutes=state.presets[0];
  const connected=state.system.extensionConnected;
  $('#status').textContent=connected?`Đang chặn ${state.targets.length} website`:'Chưa chặn được website nào';
  $('#status').classList.toggle('on',connected);
  const gate=!state.paired;
  $('#main').className=gate||state.session?'stage':'split';
  $('#main').innerHTML=gate?gateView():state.session?focusView():readyView();
  if($('#setup').open)$('#setup-body').innerHTML=setupView();
  lastSignature=signature(state);
  live();
}
function live(){
  if(!state)return;
  const timer=$('#timer');
  if(state.session&&timer){
    timer.textContent=mmss(state.session.durationMs-state.session.elapsedMs);
    const bar=$('#bar');if(bar)bar.style.width=Math.min(100,state.session.elapsedMs/state.session.durationMs*100)+'%';
    const now=earned(state.session);
    $('#earning').textContent=now;$('#earning-risk').textContent=now;
  }
  for(const el of document.querySelectorAll('[data-left]')){
    const g=grantFor(el.dataset.left);
    if(g)el.textContent=mmss(g.until-state.now);
  }
  const left=$('#lock-left');if(left&&locked())left.textContent=hhmm(state.lockUntil-state.now);
}

document.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.id==='open-setup'||b.id==='warn-setup'){$('#setup-body').innerHTML=setupView();$('#setup').showModal();return;}
  if(b.id==='setup-close'){$('#setup').close();return;}
  if(b.dataset.setupTab){setupTab=b.dataset.setupTab;$('#setup-body').innerHTML=setupView();$('.setup-panel').scrollTop=0;return;}
  if(b.id==='add-app'){pickApp();return;}
  if(b.dataset.exe){
    $('#confirm').close();$('#confirm-yes').style.display='';
    if(await act('appAdd',{exe:b.dataset.exe,name:b.dataset.name}))toast(`Đã chặn ${b.dataset.name}.`);
    return;
  }
  if(b.dataset.theme){act('settings',{theme:b.dataset.theme});return;}
  if(b.dataset.lock){
    const m=Number(b.dataset.lock);
    ask(`Khóa cứng trong ${hhmm(m*60000)}?`,
      `Không có cách nào hủy hay rút ngắn. Trong ${hhmm(m*60000)} tới bạn sẽ không đổi được credit, không bỏ chặn được website nào, không xóa được dữ liệu và không ngắt được tiện ích. Tắt ứng dụng cũng không mở khóa. Credit bạn kiếm trong lúc khóa vẫn được cộng bình thường.`,
      async()=>{if(await act('lock',{minutes:m}))toast(`Đã khóa trong ${hhmm(m*60000)}.`);});
    return;
  }
  if(b.dataset.presetRemove){const gone=Number(b.dataset.presetRemove);act('settings',{presets:state.presets.filter(m=>m!==gone)});return;}
  if(b.dataset.system){system(b.dataset.system);return;}
  if(b.dataset.preset){custom=b.dataset.preset==='custom';if(!custom)minutes=Number(b.dataset.preset);render();$('#custom')?.focus();return;}
  const a=b.dataset.action,id=b.dataset.id;if(!a)return;
  if(a==='start')await act('start',{minutes});
  else if(a==='cancel')ask('Dừng phiên tập trung?',`Bạn sẽ mất ${earned(state.session)} credit đã tích lũy trong phiên này.`,()=>act('cancel'));
  else if(a==='redeem'){const m=Number(document.getElementById('m-'+id).value);
    ask(`Mở ${id} trong ${m} phút?`,`${m} credit bị trừ ngay khi xác nhận và thời gian bắt đầu tính từ lúc đó, kể cả khi bạn chưa mở website. Kết thúc sớm không hoàn credit.`,
      async()=>{if(await act('redeem',{id,minutes:m}))toast('Đã mở. Bạn có thể truy cập ngay.');});}
  else if(a==='endGrant')ask('Kết thúc sớm mục này?','Mục này bị chặn lại ngay. Credit đã đổi không được hoàn lại.',()=>act('endGrant',{id}));
  else if(a==='endAll')ask('Kết thúc tất cả?','Mọi mục đang mở sẽ bị chặn lại ngay. Credit đã đổi không được hoàn lại.',()=>act('endGrant'));
  else if(a==='targetDelete')ask(`Bỏ chặn ${id}?`,'Website này sẽ không còn bị chặn và biến mất khỏi danh sách đổi credit.',()=>act('targetDelete',{id}));
});
document.addEventListener('submit',async e=>{
  const form=e.target.closest('form[data-form]');if(!form)return;e.preventDefault();
  const data=Object.fromEntries(new FormData(form));
  if(form.dataset.form==='presetAdd'){
    const added=Math.round(Number(data.minutes));
    if(state.presets.includes(added)){toast('Khung thời gian này đã có.');return;}
    if(await act('settings',{presets:[...state.presets,added]}))toast(`Đã thêm mốc ${added} phút.`);
    return;
  }
  // Bản quyền không phải state của engine nên đi đường system, không đi qua act().
  if(form.dataset.form==='licenseActivate'){await system('licenseActivate',{key:data.key});return;}
  if(await act(form.dataset.form,data))toast('Đã thêm vào danh sách chặn.');
});
document.addEventListener('input',e=>{
  if(e.target.id!=='custom')return;
  minutes=Math.max(1,Math.min(180,Math.round(Number(e.target.value)||1)));
  $('#start-label').textContent=minutes+' phút';
  $('#rule-minutes').textContent=minutes+' phút';
  $('#rule-credits').textContent=creditsFor(minutes)+' credit';
  $('#rule-payoff').textContent=creditsFor(minutes)+' phút';
});
document.addEventListener('change',e=>{if(e.target.id==='idle')act('settings',{idleSeconds:Number(e.target.value)});});

window.brain.onState(s=>{
  const previous=state;state=s;
  if(signature(s)!==lastSignature)render();else live();
  if(previous?.session&&!s.session){const last=s.lastSession;
    toast(last?.status==='completed'?`Hoàn tất phiên! +${num(last.credits)} credit.`:`Phiên đã dừng: ${last?.reason||'Gián đoạn'}. Không cộng credit.`);}
});
window.brain.get().then(s=>{state=s;render();}).catch(()=>{$('#main').innerHTML='<div class="pane left"><div class="warn">Không kết nối được ứng dụng. Hãy đóng và mở lại.</div></div>';});
