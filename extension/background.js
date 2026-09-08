let socket=null, ping=null, expiry=null, snapshot={targets:[],grants:[],lockUntil:null}, applyQueue=Promise.resolve(), lastKey='', connecting=false;
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
async function offline(){snapshot.grants=[];clearInterval(ping);clearTimeout(expiry);await apply();armExpiry();await chrome.storage.local.set({connected:false});}
async function connect(){
  if(connecting||socket?.readyState===WebSocket.OPEN||socket?.readyState===WebSocket.CONNECTING)return;
  connecting=true;const {token}=await chrome.storage.local.get('token');
  if(!token){connecting=false;stopRetry();return;}
  const ws=new WebSocket('ws://127.0.0.1:47831/bridge');socket=ws;connecting=false;
  ws.onopen=()=>{ws.send(JSON.stringify({token}));clearInterval(ping);ping=setInterval(()=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({ping:true}));},10000);};
  ws.onmessage=async event=>{if(ws!==socket)return;try{const data=JSON.parse(event.data);if(data.reset){if(locked(snapshot))return;snapshot={targets:[],grants:[],lockUntil:null};await chrome.storage.local.remove('token');await chrome.storage.local.set({targets:[],connected:false});await apply();ws.close();return;}if(!Array.isArray(data.targets)||!Array.isArray(data.grants))return;retryDelay=2000;snapshot={targets:data.targets,grants:data.grants,lockUntil:data.lockUntil??null};await chrome.storage.local.set({targets:data.targets,lockUntil:snapshot.lockUntil});const applied=await apply();if(ws===socket&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({applied}));armExpiry();}catch{ws.close();}};
  ws.onclose=()=>{if(socket===ws){socket=null;offline();scheduleRetry();}};ws.onerror=()=>ws.close();
}
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
  if(sender.id!==chrome.runtime.id||sender.url!==chrome.runtime.getURL('popup.html'))return;
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
(async()=>{const {targets=[],lockUntil=null}=await chrome.storage.local.get(['targets','lockUntil']);snapshot={targets,grants:[],lockUntil};await apply();armExpiry();await chrome.alarms.create('reconnect',{periodInMinutes:.5});connect();})();
