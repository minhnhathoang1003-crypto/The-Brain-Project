let socket=null, ping=null, expiry=null, snapshot={targets:[],grants:[],lockUntil:null,credits:0,packs:[],session:false}, applyQueue=Promise.resolve(), lastKey='', connecting=false;
// Màn hình chặn đổi credit ngay tại chỗ. Nó hỏi service worker, service worker hỏi
// ứng dụng qua cầu nối, rồi trả lời ngược lại. reqId ghép câu hỏi với câu trả lời vì
// một socket dùng chung cho mọi tab.
let reqSeq=0; const cho=new Map();
// Báo thức của Chrome không xuống dưới 30 giây, nên sau khi ứng dụng khởi động lại người dùng
// phải chờ tới nửa phút mới chặn lại được. Trong lúc service worker còn thức thì thử lại nhanh
// hơn nhiều, có giãn dần để không quay vòng vô ích khi ứng dụng đang tắt hẳn.
let retry=null, retryDelay=2000;
function scheduleRetry(){clearTimeout(retry);retry=setTimeout(()=>connect(),retryDelay);retryDelay=Math.min(retryDelay*2,30000);}
function stopRetry(){clearTimeout(retry);retry=null;retryDelay=2000;}
// Chế độ khóa: tiện ích tự giữ hạn khóa. Tắt ứng dụng, ngắt kết nối hay khởi động lại
// trình duyệt đều không mở khóa được — vì quyền chặn nằm ở đây chứ không nằm ở ứng dụng.
function locked(data,now=Date.now()){return !!data.lockUntil&&data.lockUntil>now;}
function usableGrants(data,now=Date.now()){return locked(data,now)?[]:data.grants;}
function isBlocked(url,targets,grants,now=Date.now()){
  try{const u=new URL(url);if(!['http:','https:'].includes(u.protocol))return null;return targets.find(t=>(u.hostname===t.domain||u.hostname.endsWith('.'+t.domain))&&!grants.some(g=>g.targetId===t.id&&g.until>now));}catch{return null;}
}
function rulesFor(data,now=Date.now()){
  const grants=usableGrants(data,now);
  return data.targets.filter(t=>!grants.some(g=>g.targetId===t.id&&g.until>now)).map((t,i)=>({id:i+1,priority:1,action:{type:'redirect',redirect:{url:chrome.runtime.getURL('blocked.html')+'?host='+encodeURIComponent(t.domain)}},condition:{urlFilter:'||'+t.domain+'^',resourceTypes:['main_frame']}}));
}
function apply(){
  const current=structuredClone(snapshot);
  applyQueue=applyQueue.catch(()=>{}).then(async()=>{
    const rules=rulesFor(current),key=JSON.stringify(rules);
    if(key!==lastKey){const old=await chrome.declarativeNetRequest.getDynamicRules();await chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds:old.map(r=>r.id),addRules:rules});lastKey=key;}
    const tabs=await chrome.tabs.query({});
    for(const tab of tabs){const t=isBlocked(tab.url,current.targets,usableGrants(current));if(t)await chrome.tabs.update(tab.id,{url:chrome.runtime.getURL('blocked.html')+'?host='+encodeURIComponent(t.domain)}).catch(()=>{});}
    await chrome.storage.local.set({connected:!!socket&&socket.readyState===WebSocket.OPEN,updatedAt:Date.now(),lockUntil:current.lockUntil||null,error:null});
    return true;
  }).catch(async e=>{await chrome.storage.local.set({error:'Không áp dụng được bộ chặn: '+e.message,connected:false});return false;});
  return applyQueue;
}
function armExpiry(){clearTimeout(expiry);chrome.alarms.clear('expiry');const next=Math.min(...[...snapshot.grants.filter(g=>g.until>Date.now()).map(g=>g.until),...(locked(snapshot)?[snapshot.lockUntil]:[])]);if(Number.isFinite(next)){chrome.alarms.create('expiry',{when:next});expiry=setTimeout(()=>{apply();armExpiry();},Math.max(1,next-Date.now()+10));}}
function huyCho(ly_do){for(const [id,yc] of cho){cho.delete(id);yc.reply({ok:false,error:ly_do});}}
// Đợi tới khi luật chặn thật sự biến mất khỏi trình duyệt.
//
// Đừng dựa vào snapshot hay applyQueue: snapshot được gán TRƯỚC khi apply() chạy, nên
// vừa thấy lượt mở trong đó thì applyQueue vẫn đang là hàng đợi cũ đã xong từ lâu —
// trả lời lúc đó là trang điều hướng rồi bị đá ngược về màn hình chặn. Chỉ danh sách
// luật động của chính trình duyệt mới là câu trả lời thật.
async function choMoKhoa(targetId,han=6000){
  const domain=(snapshot.targets.find(t=>t.id===targetId)||{}).domain;
  if(!domain)return true;
  const loc='||'+domain+'^';
  const het=Date.now()+han;
  while(Date.now()<het){
    const con=await chrome.declarativeNetRequest.getDynamicRules().catch(()=>null);
    if(con&&!con.some(r=>r.condition&&r.condition.urlFilter===loc))return true;
    await new Promise(r=>setTimeout(r,40));
  }
  return false;
}
async function offline(){huyCho('Mất kết nối với ứng dụng The Brain Project. Hãy mở ứng dụng rồi thử lại.');snapshot.grants=[];snapshot.credits=0;clearInterval(ping);clearTimeout(expiry);await apply();armExpiry();await chrome.storage.local.set({connected:false});}
async function connect(){
  if(connecting||socket?.readyState===WebSocket.OPEN||socket?.readyState===WebSocket.CONNECTING)return;
  connecting=true;const {token}=await chrome.storage.local.get('token');
  if(!token){connecting=false;stopRetry();return;}
  const ws=new WebSocket('ws://127.0.0.1:47831/bridge');socket=ws;connecting=false;
  ws.onopen=()=>{ws.send(JSON.stringify({token}));clearInterval(ping);ping=setInterval(()=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({ping:true}));},10000);};
  ws.onmessage=async event=>{if(ws!==socket)return;try{const data=JSON.parse(event.data);if(data.redeemResult){
        const yc=cho.get(data.redeemResult.reqId);
        if(yc){
          cho.delete(data.redeemResult.reqId);
          // Ứng dụng bảo "xong" không có nghĩa trình duyệt đã gỡ luật chặn. Trả lời
          // sớm thì trang điều hướng rồi bị đá ngược lại đây. Đợi lượt mở thật sự
          // có hiệu lực đã.
          if(data.redeemResult.ok) await choMoKhoa(yc.targetId);
          yc.reply(data.redeemResult);
        }
        return;
      }
      if(data.reset){if(locked(snapshot))return;snapshot={targets:[],grants:[],lockUntil:null};await chrome.storage.local.remove('token');await chrome.storage.local.set({targets:[],connected:false});await apply();ws.close();return;}if(!Array.isArray(data.targets)||!Array.isArray(data.grants))return;retryDelay=2000;snapshot={targets:data.targets,grants:data.grants,lockUntil:data.lockUntil??null,credits:Number(data.credits)||0,packs:Array.isArray(data.packs)?data.packs:[],session:!!data.session};await chrome.storage.local.set({targets:data.targets,lockUntil:snapshot.lockUntil,credits:snapshot.credits,packs:snapshot.packs,session:snapshot.session});const applied=await apply();if(ws===socket&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({applied}));armExpiry();}catch{ws.close();}};
  ws.onclose=()=>{if(socket===ws){socket=null;offline();scheduleRetry();}};ws.onerror=()=>ws.close();
}
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
  if(sender.id!==chrome.runtime.id)return;
  const tuPopup=sender.url===chrome.runtime.getURL('popup.html');
  const tuManChan=sender.url&&sender.url.startsWith(chrome.runtime.getURL('blocked.html'));
  if(!tuPopup&&!tuManChan)return;

  // Hai lệnh của màn hình chặn. Chúng KHÔNG được dùng từ popup và ngược lại: mỗi
  // trang chỉ làm được đúng việc của nó.
  if(tuManChan){
    if(msg.type==='status'){
      // Service worker có thể vừa ngủ dậy, lúc đó snapshot trong bộ nhớ là rỗng.
      (async()=>{
        const luu=await chrome.storage.local.get(['credits','packs','lockUntil','session','connected']);
        const now=Date.now();
        const khoa=snapshot.lockUntil??luu.lockUntil??null;
        reply({
          credits:snapshot.credits||luu.credits||0,
          packs:(snapshot.packs&&snapshot.packs.length?snapshot.packs:luu.packs)||[],
          lockUntil:khoa&&khoa>now?khoa:null,
          session:snapshot.session??luu.session??false,
          connected:!!socket&&socket.readyState===WebSocket.OPEN,
          targets:snapshot.targets||[],
        });
      })();
      return true;
    }
    if(msg.type==='redeem'){
      if(!socket||socket.readyState!==WebSocket.OPEN){
        reply({ok:false,error:'Chưa kết nối được với ứng dụng The Brain Project. Hãy mở ứng dụng rồi thử lại.'});
        return true;
      }
      const reqId=++reqSeq;
      cho.set(reqId,{reply,targetId:String(msg.targetId||'')});
      // Ứng dụng không trả lời trong 8 giây thì thôi, đừng để người dùng nhìn nút quay mãi.
      setTimeout(()=>{if(cho.has(reqId)){cho.delete(reqId);reply({ok:false,error:'Ứng dụng không phản hồi. Hãy thử lại.'});}},8000);
      socket.send(JSON.stringify({redeem:{targetId:String(msg.targetId||''),minutes:Number(msg.minutes),reqId}}));
      return true;
    }
    return;
  }

  if(msg.type==='pair'){
    if(!/^[a-f0-9]{64}$/.test(msg.token||'')){reply({ok:false,error:'Mã ghép nối cần đủ 64 ký tự. Hãy sao chép lại từ ứng dụng.'});return;}
    (async()=>{const old=socket;socket=null;old?.close();await offline();stopRetry();await chrome.storage.local.set({token:msg.token,error:null});await connect();reply({ok:true});})();return true;
  }
  if(msg.type==='disconnect'){
    if(locked(snapshot)){
      const phut=Math.ceil((snapshot.lockUntil-Date.now())/60000);
      reply({ok:false,error:`Đang trong chế độ khóa. Không ngắt kết nối được trong ${phut} phút nữa.`});
      return true;
    }
    (async()=>{const old=socket;socket=null;old?.close();stopRetry();clearInterval(ping);clearTimeout(expiry);snapshot={targets:[],grants:[],lockUntil:null};await chrome.storage.local.remove('token');await chrome.storage.local.set({targets:[],connected:false});await apply();reply({ok:true});})();return true;
  }
});
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='expiry'){apply();armExpiry();}else if(alarm.name==='reconnect')connect();});
chrome.runtime.onInstalled.addListener(()=>chrome.alarms.create('reconnect',{periodInMinutes:.5}));
chrome.runtime.onStartup.addListener(()=>chrome.alarms.create('reconnect',{periodInMinutes:.5}));
(async()=>{const {targets=[],lockUntil=null,credits=0,packs=[],session=false}=await chrome.storage.local.get(['targets','lockUntil','credits','packs','session']);snapshot={targets,grants:[],lockUntil,credits,packs,session};await apply();armExpiry();await chrome.alarms.create('reconnect',{periodInMinutes:.5});connect();})();
