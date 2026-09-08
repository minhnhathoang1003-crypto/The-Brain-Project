let state=null,minutes=25,custom=false,lastSignature='',toastTimer;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>String(n).replace('.',',');
const mmss=ms=>{const t=Math.max(0,Math.ceil(ms/1000));return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;};
const creditsFor=m=>num(Number((m/state.ratio).toFixed(2)));
const earned=s=>num(Number((Math.min(s.elapsedMs,s.durationMs)/60000/state.ratio).toFixed(2)));
const unlocked=()=>!!state.grant&&state.grant.until>state.now;
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
async function system(type){try{const r=await window.brain.system(type);if(r.message)toast(r.message);}catch(e){toast(e.message);}}
function ask(title,text,callback){$('#confirm-title').textContent=title;$('#confirm-text').textContent=text;$('#confirm').showModal();$('#confirm-no').onclick=()=>$('#confirm').close();$('#confirm-yes').onclick=()=>{$('#confirm').close();callback();};}

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
    <div class="chips">${state.presets.map(m=>`<button class="chip-btn ${!custom&&minutes===m?'on':''}" data-preset="${m}">${m} phút</button>`).join('')}<button class="chip-btn ${custom?'on':''}" data-preset="custom">Khác</button>${custom?`<input id="custom" class="field narrow" type="number" min="1" max="180" value="${minutes}" aria-label="Số phút tập trung">`:''}</div>
    ${ruleStrip(minutes)}
    <button class="primary big" data-action="start">Bắt đầu tập trung<b id="start-label">${minutes} phút</b></button>
    <p class="note">Chỉ nhận credit khi hoàn tất trọn phiên. Dừng giữa chừng, đóng ứng dụng, khóa máy hoặc rời máy quá ${idleMinutes} phút thì mất toàn bộ credit của phiên.</p>
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
  </section>`;
}
function siteRow(t){
  return `<div class="row"><span class="mark">${esc(t.domain[0].toUpperCase())}</span><span class="domain">${esc(t.domain)}</span>
  <select class="field mins" id="m-${esc(t.id)}" aria-label="Số phút mở ${esc(t.domain)}">${state.packs.map(n=>`<option value="${n}" ${n===5?'selected':''}>${n} phút</option>`).join('')}</select>
  <button class="ghost small" data-action="redeem" data-id="${esc(t.id)}" ${locked()?'disabled':''}>Mở</button>
  ${locked()?'<span class="x locked-x" aria-hidden="true">·</span>':`<button class="x" data-action="targetDelete" data-id="${esc(t.id)}" aria-label="Bỏ chặn ${esc(t.domain)}">×</button>`}</div>`;
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
function grantView(){
  const g=state.grant;
  return `<section class="pane left">
    <div class="stack"><div class="label">${esc(g.domain)} đang mở</div><div class="figure" id="timer">${mmss(g.until-state.now)}</div><div class="unit">còn lại · số dư ${num(state.credits)} credit</div></div>
    <button class="ghost big" data-action="endGrant">Kết thúc sớm</button>
    <p class="note">Hết giờ, website bị chặn lại và tab đang mở sẽ chuyển về trang chặn. Kết thúc sớm không hoàn credit.</p>
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
function setupView(){
  const connected=state.system.extensionConnected;
  const themes=[['system','Theo hệ thống'],['light','Sáng'],['dark','Tối']];
  return `<div class="set-row"><div><b>Bộ chặn website</b><p>${connected?'Đang chặn '+state.targets.length+' website.':'Chưa chặn được website nào — tiện ích không kết nối.'}${state.system.bridgeError?'<br>'+esc(state.system.bridgeError):''}</p></div><span class="chip ${connected?'on':''}">${connected?'Đang chạy':'Chưa chạy'}</span></div>
  <p class="small-note">Chỉ phải làm một lần. Mã ghép nối được giữ lại, nên các lần mở ứng dụng sau tiện ích tự kết nối lại trong vài giây.</p>
  <ol class="steps"><li>Nhấn <b>Mở thư mục tiện ích</b>.</li><li>Vào <code>chrome://extensions</code> (Edge: <code>edge://extensions</code>).</li><li>Bật <b>Developer mode</b>, chọn <b>Load unpacked</b> và chọn thư mục vừa mở.</li><li>Sao chép mã ghép nối, dán vào popup tiện ích rồi kết nối.</li></ol>
  <div class="actions start"><button class="ghost" data-system="extensionFolder">Mở thư mục tiện ích</button><button class="primary" data-system="copyPairing">Sao chép mã ghép nối</button></div>
  <div class="set-row"><div><b>Giao diện</b><p>Mặc định đi theo cài đặt sáng/tối của Windows.</p></div>
    <span class="seg" role="group" aria-label="Chủ đề giao diện">${themes.map(([id,name])=>`<button class="${state.theme===id?'on':''}" data-theme="${id}">${name}</button>`).join('')}</span></div>
  <div class="set-row col"><div><b>Khung thời gian</b><p>Các mốc hiện sẵn trên màn hình chính. Giữ từ 1 đến ${state.maxPresets} mốc; ngoài các mốc này vẫn luôn có ô “Khác”.</p></div>
    <div class="preset-edit">
      ${state.presets.map(m=>`<span class="preset-chip">${m} phút${state.presets.length>1?`<button class="x" data-preset-remove="${m}" aria-label="Bỏ khung ${m} phút">×</button>`:''}</span>`).join('')}
      ${state.presets.length<state.maxPresets?`<form class="preset-add" data-form="presetAdd"><input class="field narrow" name="minutes" type="number" min="1" max="180" placeholder="phút" aria-label="Số phút cho khung mới" required><button class="ghost small">Thêm mốc</button></form>`:'<span class="preset-note">Đã đủ mốc. Bỏ bớt một mốc để thêm mốc khác.</span>'}
    </div></div>
  ${state.lockedMode?`<div class="set-row col"><div><b>Chế độ khóa</b><p>${locked()
    ? `Đang khóa, còn <b>${hhmm(state.lockUntil-state.now)}</b>. Không có cách nào rút ngắn — kể cả xóa dữ liệu.`
    : 'Khóa cứng trong một khoảng thời gian: không đổi được credit, không bỏ chặn được website, không xóa được dữ liệu, và không ngắt được tiện ích. Không hủy được sau khi bật.'}</p></div>
    ${locked()?'':`<div class="preset-edit">${state.lockPacks.map(m=>`<button class="ghost small" data-lock="${m}">${hhmm(m*60000)}</button>`).join('')}</div>`}</div>`:''}
  <div class="set-row"><div><b>Ngưỡng không hoạt động</b><p>Không chạm chuột hay bàn phím quá lâu sẽ hủy phiên. Cơ chế này chỉ giảm việc treo máy, không xác minh được bạn đang học.</p></div>
    <select id="idle" class="field mins" aria-label="Ngưỡng không hoạt động" ${state.session?'disabled':''}>${[120,300,600,900].map(n=>`<option value="${n}" ${state.idleSeconds===n?'selected':''}>${n/60} phút</option>`).join('')}</select></div>
  <div class="ratio"><div><span>Tập trung</span><span>Nhận được</span></div>${[25,50,90].map(m=>`<div><span>${m} phút</span><span>${creditsFor(m)} credit</span></div>`).join('')}</div>
  <div class="set-row col"><div><b>Tiến bộ</b><p>Lưu ${state.historyDays} ngày gần nhất. Chỉ đếm phiên hoàn tất trọn vẹn.</p></div>
    <div class="ratio">${(()=>{const rows=state.history.filter(d=>d.minutes||d.interrupted).slice(0,14);
      return '<div><span>Ngày</span><span>Tập trung · nhận được</span></div>'+(rows.length
        ? rows.map(d=>`<div><span>${d.day.slice(8)}/${d.day.slice(5,7)}${d.day===state.history[0]?.day&&d.day===lastDays(1)[0].day?' · hôm nay':''}</span><span>${d.minutes} phút · ${num(d.earned)} credit${d.interrupted?` · ${d.interrupted} phiên dở`:''}</span></div>`).join('')
        : '<div><span>Chưa có ngày nào</span><span>Hoàn tất một phiên để bắt đầu</span></div>');})()}</div></div>
  <div class="set-row"><div><b>Dữ liệu</b><p>Chỉ lưu trên máy này và mã hóa theo tài khoản Windows. Phiên bản ${esc(state.system.version)}.</p></div><button class="ghost danger" data-system="reset" ${locked()?'disabled':''}>Xóa toàn bộ</button></div>`;
}

const signature=s=>JSON.stringify({...s,now:0,session:s.session?{...s.session,elapsedMs:0}:null,grant:s.grant?{...s.grant,until:0}:null,lastSession:0});
function render(){
  if(!state)return;
  if(state.theme==='system')delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme=state.theme;
  if(!custom&&!state.presets.includes(minutes))minutes=state.presets[0];
  const connected=state.system.extensionConnected;
  $('#status').textContent=connected?`Đang chặn ${state.targets.length} website`:'Chưa chặn được website nào';
  $('#status').classList.toggle('on',connected);
  const gate=!state.paired;
  $('#main').className=gate||state.session||unlocked()?'stage':'split';
  $('#main').innerHTML=gate?gateView():state.session?focusView():unlocked()?grantView():readyView();
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
  } else if(unlocked()&&timer) timer.textContent=mmss(state.grant.until-state.now);
  const left=$('#lock-left');if(left&&locked())left.textContent=hhmm(state.lockUntil-state.now);
}

document.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.id==='open-setup'||b.id==='warn-setup'){$('#setup-body').innerHTML=setupView();$('#setup').showModal();return;}
  if(b.id==='setup-close'){$('#setup').close();return;}
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
  else if(a==='endGrant')ask('Kết thúc sớm?','Website sẽ bị chặn lại ngay. Credit đã đổi không được hoàn lại.',()=>act('endGrant'));
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
