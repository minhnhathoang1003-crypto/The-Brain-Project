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
  // Website và ứng dụng là hai loại khác nhau: một cái do tiện ích chặn và sống
  // sót khi app tắt, một cái cần app đang chạy. Trộn chung một danh sách thì
  // người dùng không thấy được ranh giới đó.
  const sites=state.targets.filter(t=>t.domain), apps=state.targets.filter(t=>t.exe);
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
    <button class="week" id="open-stats" aria-label="Xem thống kê đầy đủ">
      <div class="week-bars">${(()=>{const days=lastDays(7),peak=Math.max(25,...days.map(d=>d.minutes));
        return days.map(d=>`<div class="week-day ${d.today?'now':''}" title="${d.day}: ${d.minutes} phút">
          <div class="week-track"><i style="height:${d.minutes?Math.max(6,Math.round(d.minutes/peak*100)):0}%"></i></div>
          <span>${d.label}</span></div>`).join('');})()}</div>
      <p class="today">Hôm nay <b>${state.todayMinutes}</b> phút · 7 ngày qua <b>${lastDays(7).reduce((n,d)=>n+d.minutes,0)}</b> phút · <span class="week-more">xem thống kê</span></p>
    </button>
  </section>
  <section class="pane right">
    <div class="sites-head"><span>Đang bị chặn</span><span>${locked()?'Đang khóa':'Đổi credit để mở tạm'}</span></div>
    ${locked()?`<div class="warn locked-note"><b>Chế độ khóa · còn <span id="lock-left">${hhmm(state.lockUntil-state.now)}</span></b><br>Không đổi được credit và không bỏ chặn được website nào cho tới khi hết giờ. Tắt ứng dụng cũng không mở khóa — tiện ích tự giữ hạn khóa. Credit bạn kiếm trong lúc này vẫn được cộng.</div>`:''}

    <div class="group">
      <div class="group-head"><span>Website</span><span class="group-count">${state.targets.length}/${state.maxTargets}</span></div>
      ${sites.map(siteRow).join('')||'<div class="empty">Chưa chặn website nào.</div>'}
      ${state.targets.length<state.maxTargets
        ? `<form class="add" data-form="targetAdd"><input class="field" name="domain" maxlength="2048" placeholder="dán link hoặc gõ tên miền" aria-label="Website cần chặn" required><button class="ghost">Thêm</button></form>`
        : proNote(`Bạn đã dùng hết <b>${state.maxTargets} mục</b> của bản Free. Bản Pro chặn được ${proLimit()}.`)
          || `<p class="small-note">Đã dùng hết ${state.maxTargets} mục. Bỏ chặn một mục để thêm mục mới.</p>`}
    </div>

    <div class="group">
      <div class="group-head"><span>Ứng dụng và game</span><span class="group-count">${state.appBlocking?apps.length:'—'}</span></div>
      ${state.appBlocking?`
        ${apps.map(siteRow).join('')||'<div class="empty">Chưa chặn ứng dụng nào.</div>'}
        ${locked()?'':'<button class="ghost add-app" id="add-app">Chọn từ ứng dụng đang mở</button>'}`
      : proNote('Chặn ứng dụng và game Windows — Steam, Liên Minh, Discord — là tính năng của <b>bản Pro</b>. Khác với chặn website, phần này cần ứng dụng đang mở để hoạt động.')}
    </div>
  </section>`;
}
// Chạm trần bản Free. Ba chỗ dùng chung một khối này nên lời lẽ không bao giờ lệch
// nhau, và để chỉ có đúng một chỗ phải sửa nếu đổi cách nói.
//
// Cố ý giữ giọng bình thản: nói hạn mức hiện tại, nói bản Pro cho gì, rồi thôi. Không
// đếm ngược, không "mở khóa ngay", không nhắc lại lần thứ hai. Đây là ứng dụng kỷ
// luật — bán hàng bằng cách gây sốt ruột là tự mâu thuẫn với chính nó.
// Đọc thẳng từ bảng so sánh mà license.cjs dựng ra, để con số trong lời mời chào
// không bao giờ lệch với hạn mức engine thật sự áp dụng.
function proValue(key){
  const d=(state.plans.differences||[]).find(x=>x.key===key);
  return d?d.pro:null;
}
const proLimit=()=>proValue('maxTargets')||'nhiều hơn';

function proNote(text){
  if(state.tier==='pro'||!state.license.selling)return '';
  return `<div class="pro-note"><p>${text}</p>
    <button class="ghost small" data-system="openBuy">Xem bản Pro</button></div>`;
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
    <p class="small-note">Tụt xuống Free <b>không bao giờ làm mất credit</b> bạn đã kiếm, và <b>không xóa mục nào</b> khỏi danh sách chặn — bạn chỉ không thêm được mục mới quá hạn mức. Riêng phần chặn ứng dụng và game Windows thì ngừng hoạt động, vì đó là tính năng của bản Pro; chặn website vẫn chạy như thường.</p></div>`;
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

// Bốn trạng thái, và mỗi trạng thái phải nói được hai điều: chuyện gì đang xảy ra,
// và người dùng cần làm gì. Trạng thái 'active' trước đây không hiện gì cả — người
// đã trả tiền mở màn hình này ra không thấy dấu hiệu nào rằng mình đang có bản Pro.
// Ba thứ người dùng thật sự cần biết, giống hệt Spotify, Adobe, 1Password hay
// JetBrains: đang ở gói nào, giấy phép nào, và khi nào có chuyện.
//
// KHÔNG nói: xác minh lần cuối ngày nào, bao lâu kiểm lại một lần, còn mấy ngày ân
// hạn. Đó là ruột gan của cơ chế, người dùng không cần nghĩ tới bao giờ — và riêng
// cái đếm ngược ân hạn còn trông như đồng hồ đếm tới lúc mất thứ mình đã mua, trong
// khi chẳng có gì sắp xảy ra.
//
// Nguyên tắc: im lặng khi mọi thứ ổn, nói rõ khi có chuyện. Đồng hồ ân hạn chỉ hiện
// khi nó thật sự sắp hết — lúc đó nó là cảnh báo có ích, không phải tiếng ồn.
const CANH_BAO_AN_HAN = 7;   // còn dưới ngần này ngày thì mới nói

function licenseView(){
  const l=state.license;
  let than, canh='';
  if(!l.hasKey)
    than=l.selling
      ? 'Chưa có mã trên máy này. Dán mã bạn nhận qua email để mở khóa bản Pro.'
      : 'Chưa có mã nào trên máy này. Khi mở bán, bạn dán mã nhận qua email vào đây.';
  else if(l.status==='active'){
    than=`<b>Bản Pro đang hoạt động</b> trên máy này.`;
    if(typeof l.graceDaysLeft==='number'&&l.graceDaysLeft<=CANH_BAO_AN_HAN)
      canh=`<div class="warn">Đã ${l.graceDays-l.graceDaysLeft} ngày không kết nối được tới máy chủ bản quyền.
        Máy này giữ bản Pro thêm <b>${l.graceDaysLeft} ngày</b> nữa. Nối mạng và mở lại ứng dụng là xong —
        credit và danh sách chặn của bạn không bị ảnh hưởng dù có chuyện gì.</div>`;
  }
  else if(l.status==='revoked')
    than=`<b>Mã này đã bị thu hồi</b> — thường là do đơn hàng được hoàn tiền hoặc bị hủy.
      Nếu bạn cho rằng đây là nhầm lẫn, gửi góp ý trong mục Ứng dụng kèm email bạn đã dùng để mua.`;
  else
    than=`<b>Chưa xác minh được mã này.</b> Gỡ mã rồi dán lại để thử kích hoạt một lần nữa.`;

  return `<div class="set-row col"><div><b>Bản quyền</b>
    <p>${than}</p></div>
    ${canh}
    ${l.hasKey?`<p class="small-note key-line"><code>${esc(l.maskedKey)}</code></p>`:
      `<form class="preset-add" data-form="licenseActivate"><input class="field" name="key" type="text" spellcheck="false" autocomplete="off" placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" aria-label="Mã bản quyền" required><button class="primary small">Kích hoạt</button></form>`}
    ${l.hasKey?`<p class="small-note quiet-row">Đổi sang máy khác?
      <button class="link" data-system="licenseRemove"
        data-ask="Gỡ mã bản quyền khỏi máy này?"
        data-ask-text="Máy này sẽ trở lại bản Free. Một lượt kích hoạt được trả lại để bạn dùng mã đó cho máy khác, và bạn dán lại mã ở đây bất cứ lúc nào. Credit và danh sách chặn không bị ảnh hưởng.">Gỡ mã khỏi máy này</button></p>`:''}</div>`;
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
  about:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="7.8" r="0.9" fill="currentColor" stroke="none"/>',
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

function tabLicense(){ return licenseView()+plansView(); }

// Thống kê tách hẳn khỏi Cài đặt: nó là thứ người ta xem thường xuyên, không
// phải thứ chỉnh một lần rồi thôi. Mở bằng cách bấm vào dải bảy ngày.
// Khoảng thời gian đang xem trong màn hình Thống kê. Giữ ngoài render để chuyển
// khoảng không làm mất chỗ cuộn.
let statsRange = 7;
const STATS_RANGES = [
  { n: 7,   ten: '7 ngày'   },
  { n: 30,  ten: '30 ngày'  },
  { n: 90,  ten: '90 ngày'  },
  { n: 0,   ten: 'Tất cả'   },   // 0 = mọi thứ engine còn giữ
];

// Lấy đúng n ngày gần nhất, kể cả ngày không tập trung — chuỗi ngày và lưới nhiệt
// cần biết cả những ngày trống, nếu không thì "nghỉ một hôm" trông như không tồn tại.
function daysBack(n){
  const by=new Map(state.history.map(d=>[d.day,d]));
  const co=state.history.length?state.history[state.history.length-1].day:null;
  const out=[];
  const dem=n||Math.max(1,ngayTu(co));
  for(let i=dem-1;i>=0;i--){
    const d=new Date(state.now);d.setDate(d.getDate()-i);
    const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    out.push({...(by.get(key)||{day:key,minutes:0,completed:0,interrupted:0,earned:0}),
      dow:d.getDay(), today:i===0});
  }
  return out;
}
// Bao nhiêu ngày tính từ ngày cũ nhất còn lưu tới hôm nay.
function ngayTu(day){
  if(!day)return 1;
  const a=new Date(day+'T00:00:00'), b=new Date(state.now);
  return Math.floor((b-a)/86400000)+1;
}

const congDon=rows=>rows.reduce((a,d)=>({
  phut:a.phut+(d.minutes||0), xong:a.xong+(d.completed||0),
  do_:a.do_+(d.interrupted||0), credit:a.credit+(d.earned||0),
  ngay:a.ngay+(d.minutes?1:0),
}),{phut:0,xong:0,do_:0,credit:0,ngay:0});

// Chuỗi ngày liên tiếp có tập trung. Hôm nay chưa tập trung thì chuỗi vẫn còn sống
// nếu hôm qua có — người ta hay mở ứng dụng buổi sáng, và báo "chuỗi đã đứt" lúc
// 9 giờ sáng trong khi ngày còn dài là vừa sai vừa làm nản lòng.
function chuoi(rows){
  let dai=0,tam=0;
  for(const d of rows){ if(d.minutes){tam++;dai=Math.max(dai,tam);} else tam=0; }
  let nay=0;
  for(let i=rows.length-1;i>=0;i--){
    const d=rows[i];
    if(d.minutes){nay++;continue;}
    if(d.today&&nay===0)continue;   // hôm nay chưa kịp tập trung, chưa tính là đứt
    break;
  }
  return {nay,dai};
}

// Lưới nhiệt kiểu bảng đóng góp: mỗi cột một tuần, mỗi ô một ngày. Đây là thứ mà
// mọi ứng dụng theo dõi thói quen được yêu thích đều có, vì nó cho thấy NHỊP —
// bạn đều đặn hay bùng nổ rồi bỏ — thứ mà bảng số không bao giờ nói ra.
function luoiNhiet(rows){
  const dinh=Math.max(25,...rows.map(d=>d.minutes));
  const tuan=[];
  let cot=[];
  // Đệm đầu để ngày đầu tiên rơi đúng thứ của nó trong cột.
  for(let i=0;i<rows[0].dow;i++) cot.push(null);
  for(const d of rows){
    cot.push(d);
    if(cot.length===7){tuan.push(cot);cot=[];}
  }
  if(cot.length) tuan.push(cot);

  const muc=m=>!m?0:m>=dinh*.75?4:m>=dinh*.5?3:m>=dinh*.25?2:1;
  const thang=[];
  for(const c of tuan){
    const dau=c.find(Boolean);
    const t=dau?dau.day.slice(5,7):'';
    thang.push(t!==thang.at(-1)?.t?{t,nhan:['','Th1','Th2','Th3','Th4','Th5','Th6','Th7','Th8','Th9','Th10','Th11','Th12'][Number(t)]}:{t,nhan:''});
  }
  return `<div class="heat-wrap"><div class="heat">
    <div class="heat-dow"><span></span><span>T2</span><span></span><span>T4</span><span></span><span>T6</span><span></span></div>
    <div class="heat-grid">${tuan.map((c,i)=>`<div class="heat-col">
      <span class="heat-month">${thang[i].nhan}</span>
      ${Array.from({length:7},(_,j)=>{const d=c[j];
        return d?`<i class="heat-cell lv${muc(d.minutes)} ${d.today?'now':''}" title="${d.day}: ${d.minutes} phút"></i>`
                : '<i class="heat-cell empty"></i>';}).join('')}
    </div>`).join('')}</div>
  </div></div>
  <div class="heat-key"><span>Ít</span>${[0,1,2,3,4].map(l=>`<i class="heat-cell lv${l}"></i>`).join('')}<span>Nhiều</span></div>`;
}

function statsView(){
  const toiDa=state.historyDays;                       // bậc license cho xem bao nhiêu
  const range=STATS_RANGES.find(r=>r.n===statsRange)||STATS_RANGES[0];
  const soNgay=range.n===0?0:Math.min(range.n,toiDa);
  const rows=daysBack(soNgay);
  const t=congDon(rows);
  const tb=t.ngay?Math.round(t.phut/t.ngay):0;
  const ks=chuoi(rows);
  const nhat=rows.reduce((a,d)=>d.minutes>(a?.minutes||0)?d:a,null);

  // So với kỳ trước: chỉ nói khi thật sự có kỳ trước để so.
  let soSanh='';
  if(range.n&&state.history.length>range.n){
    const truoc=congDon(daysBack(range.n*2).slice(0,range.n));
    if(truoc.phut>0){
      const chenh=Math.round((t.phut-truoc.phut)/truoc.phut*100);
      const huong=chenh>0?'len':chenh<0?'xuong':'ngang';
      soSanh=`<span class="delta ${huong}">${chenh>0?'+':''}${chenh}%</span> so với ${range.n} ngày trước đó`;
    }
  }

  const chips=STATS_RANGES.map(r=>{
    const khoa=r.n===0?toiDa<365:r.n>toiDa;
    return `<button class="chip-btn small ${statsRange===r.n?'on':''}" data-stats-range="${r.n}" ${khoa?'disabled title="Bản Pro xem lại được toàn bộ lịch sử"':''}>${r.ten}</button>`;
  }).join('');

  const coDuLieu=rows.some(d=>d.minutes||d.interrupted);

  return `<div class="stats-head">
    <div class="chips tight">${chips}</div>
    <p class="stat-range">${range.n===0?`Toàn bộ lịch sử · ${rows.length} ngày`:`${soNgay} ngày gần nhất`}${soSanh?' · '+soSanh:''}</p>
  </div>

  <div class="stat-grid">
    <div><span class="label">Tổng thời gian</span><b>${gioPhut(t.phut)}</b></div>
    <div><span class="label">Trung bình mỗi ngày</span><b>${tb} phút</b></div>
    <div><span class="label">Chuỗi hiện tại</span><b>${ks.nay} ngày</b></div>
    <div><span class="label">Chuỗi dài nhất</span><b>${ks.dai} ngày</b></div>
    <div><span class="label">Phiên hoàn tất</span><b>${t.xong}</b></div>
    <div><span class="label">Phiên bỏ dở</span><b>${t.do_}</b></div>
    <div><span class="label">Credit đã kiếm</span><b>${num(Number(t.credit.toFixed(2)))}</b></div>
    <div><span class="label">Ngày nhiều nhất</span><b>${nhat&&nhat.minutes?`${nhat.minutes} phút`:'—'}</b>${nhat&&nhat.minutes?`<span class="sub">${ngayVn(nhat.day)}</span>`:''}</div>
  </div>

  ${!coDuLieu?`<div class="empty big">Chưa có ngày nào trong khoảng này. Hoàn tất một phiên tập trung để bắt đầu.</div>`:
    soNgay&&soNgay<=7
    ? `<div class="set-row col"><div><b>Từng ngày</b></div>
        <div class="week-bars big">${(()=>{const dinh=Math.max(25,...rows.map(d=>d.minutes));
          return rows.map(d=>`<div class="week-day ${d.today?'now':''}" title="${d.day}: ${d.minutes} phút">
            <div class="week-track"><i style="height:${d.minutes?Math.max(6,Math.round(d.minutes/dinh*100)):0}%"></i></div>
            <span>${['CN','T2','T3','T4','T5','T6','T7'][d.dow]}</span></div>`).join('');})()}</div></div>`
    : `<div class="set-row col"><div><b>Nhịp tập trung</b><p>Mỗi ô là một ngày. Ô càng đậm càng nhiều phút.</p></div>
        ${luoiNhiet(rows)}</div>`}

  <div class="set-row col"><div><b>Theo ngày</b><p>Chỉ đếm phiên hoàn tất trọn vẹn.</p></div>
    ${proNote(`Bản Free xem lại được <b>${toiDa} ngày</b> gần nhất. Bản Pro xem lại được toàn bộ, từ ngày cài — dữ liệu những ngày trước đó vẫn nằm trên máy bạn và không bị xóa.`)||''}
    <div class="ratio">${'<div><span>Ngày</span><span>Tập trung · nhận được</span></div>'+(()=>{
      const co=rows.filter(d=>d.minutes||d.interrupted).reverse();
      return co.length
        ? co.map(d=>`<div><span>${ngayVn(d.day)}${d.today?' · hôm nay':''}</span><span>${d.minutes} phút · ${num(d.earned)} credit${d.interrupted?` · ${d.interrupted} phiên dở`:''}</span></div>`).join('')
        : '<div><span>Chưa có ngày nào</span><span>Hoàn tất một phiên để bắt đầu</span></div>';})()}</div></div>`;
}

// 145 phút đọc khó hơn 2 giờ 25. Dưới một giờ thì giữ nguyên phút.
function gioPhut(m){
  if(m<60)return `${m} phút`;
  const g=Math.floor(m/60),p=m%60;
  return p?`${g} giờ ${p} phút`:`${g} giờ`;
}
const ngayVn=day=>`${day.slice(8)}/${day.slice(5,7)}`;

// Giới thiệu, quyền riêng tư và lịch sử phiên bản — ba thứ người dùng cần để
// hiểu họ đang chạy cái gì, thay vì phải lên website tìm.
function tabAbout(){
  const moi=CHANGELOG.slice(0,4);
  return `<div class="set-row col"><div><b>The Brain Project ${esc(state.system.version)}</b>
    <p>Một vòng lặp duy nhất: tập trung để kiếm credit, đổi credit để mở thứ gây nghiện.
    Dự án cá nhân, không phải công ty. Mã nguồn công khai.</p></div>
    <div class="actions start"><button class="ghost small" data-system="openSite">Trang giới thiệu</button><button class="ghost small" data-system="openRepo">Mã nguồn</button></div></div>

  <div class="set-row col"><div><b>Quyền riêng tư</b>
    <p>Không có tài khoản, không có bộ theo dõi, không có máy chủ nào giữ dữ liệu của bạn. Dữ liệu nằm trên
    máy bạn và được mã hóa theo tài khoản Windows. Tiện ích đọc địa chỉ tab để đối chiếu danh sách chặn, nhưng
    <b>không lưu và không gửi đi đâu</b> — kể cả về ứng dụng này.</p>
    <p>Ứng dụng nối ra Internet đúng hai việc: hỏi GitHub xem có bản mới không, và kiểm mã bản quyền nếu bạn đã
    mua. Cả hai đều không kèm dữ liệu tập trung, danh sách chặn hay số credit của bạn.</p></div>
    <div class="actions start"><button class="ghost small" data-system="openPrivacy">Đọc chính sách đầy đủ</button></div></div>

  <div class="set-row col"><div><b>Có gì mới</b><p>Bốn bản gần nhất.</p></div>
    <div class="changelog">${moi.map(v=>`<div class="cl-ver"><b>${esc(v.v)}</b><ul>${v.items.map(i=>`<li>${i}</li>`).join('')}</ul></div>`).join('')}</div></div>`;
}

function tabApp(){
  return `${updateView()}
  <div class="set-row"><div><b>Góp ý</b><p>Kẹt ở đâu, thấy chỗ nào khó hiểu, hay muốn xin thêm tính năng — nói thẳng với tác giả. Ứng dụng không thu thập gì về bạn, nên đây là cách duy nhất tôi biết được điều gì đang không ổn.</p></div>
    <div class="actions start"><button class="ghost small" data-system="feedbackIssues">Mở GitHub</button><button class="primary small" data-system="feedbackEmail">Gửi email</button></div></div>
  <div class="set-row"><div><b>Dữ liệu</b><p>Chỉ lưu trên máy này và mã hóa theo tài khoản Windows. Phiên bản ${esc(state.system.version)}.${state.license.hasKey?' Bản quyền nằm ở file riêng, nên xóa dữ liệu <b>không</b> làm mất mã bạn đã mua.':''}</p></div><button class="ghost danger" data-system="reset" ${locked()?'disabled':''}>Xóa toàn bộ</button></div>`;
}

function setupTabs(){
  const t=[
    {id:'blocker', ten:'Bộ chặn',     view:tabBlocker},
    {id:'session', ten:'Phiên',       view:tabSession},
    {id:'lock',    ten:'Chế độ khóa', view:tabLock, an:!state.lockedMode},
    {id:'look',    ten:'Giao diện',   view:tabLook},
    {id:'license', ten:'Bản quyền',   view:tabLicense},
    {id:'app',     ten:'Ứng dụng',    view:tabApp},
    {id:'about',   ten:'Giới thiệu',  view:tabAbout},
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
  if($('#stats').open)$('#stats-body').innerHTML=statsView();
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
  if(b.id==='open-stats'){statsRange=7;$('#stats-body').innerHTML=statsView();$('#stats').showModal();return;}
  if(b.id==='stats-close'){$('#stats').close();return;}
  if(b.dataset.setupTab){setupTab=b.dataset.setupTab;$('#setup-body').innerHTML=setupView();$('.setup-panel').scrollTop=0;return;}
  if(b.dataset.statsRange!==undefined){statsRange=Number(b.dataset.statsRange);$('#stats-body').innerHTML=statsView();return;}
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
  if(b.dataset.system){
    const hoi=b.dataset.ask;
    if(hoi)ask(hoi,b.dataset.askText||'',()=>system(b.dataset.system));
    else system(b.dataset.system);
    return;
  }
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
// Kích hoạt bằng link: mở thẳng mục Bản quyền để người dùng nhìn thấy kết quả,
// thay vì một dòng toast trôi qua rồi thôi.
window.brain.onActivation(r=>{
  toast(r.message);
  if(!r.ok)return;
  setupTab='license';
  $('#setup-body').innerHTML=setupView();
  if(!$('#setup').open)$('#setup').showModal();
});
window.brain.get().then(s=>{state=s;render();}).catch(()=>{$('#main').innerHTML='<div class="pane left"><div class="warn">Không kết nối được ứng dụng. Hãy đóng và mở lại.</div></div>';});
