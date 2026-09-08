const $=s=>document.querySelector(s);
let target=null,busy=false,lastState=null,error='',packsKey='';
function render(state){
  if(target?.id!==state.target?.id)error='';
  lastState=state;
  const changedTarget=target?.id!==state.target?.id;
  target=state.target;
  $('#app-name').textContent=target?.name||'Ứng dụng này';
  $('#balance').textContent=`Số dư ${String(state.credits).replace('.',',')} credit`;
  const locked=state.lockUntil>Date.now();
  $('#explain').textContent=locked
    ? 'Đang trong chế độ khóa. Không đổi được credit cho tới khi hết giờ khóa.'
    : state.sessionActive?'Hãy kết thúc phiên tập trung trước khi đổi credit.'
    : error||'Bạn đã tự đặt ứng dụng này vào danh sách chặn. Credit bị trừ ngay khi bấm mở; kết thúc sớm không hoàn credit. Chọn đóng ứng dụng thì nó sẽ được yêu cầu thoát như khi bạn bấm dấu X.';
  const nextPacksKey=JSON.stringify(state.packs);
  if(nextPacksKey!==packsKey){
    $('#minutes').innerHTML=state.packs.map(n=>`<option value="${n}" ${n===5?'selected':''}>${n} phút · ${n} credit</option>`).join('');
    packsKey=nextPacksKey;
  }
  if(changedTarget)$('#minutes').value=String(state.packs.includes(5)?5:state.packs[0]);
  $('#minutes').disabled=locked||state.sessionActive||busy;
  $('#redeem').disabled=locked||state.sessionActive||busy||!target;
  $('#back').disabled=busy;
}
$('#redeem').onclick=async()=>{
  if(busy||!target)return;
  const payload={id:target.id,minutes:Number($('#minutes').value)};
  busy=true;error='';render(lastState);
  try{
    const r=await window.brain.action('redeem',payload);
    if(!r.ok)error=r.error;
  }catch{error='Không thể mở ứng dụng lúc này. Hãy thử lại.';}
  finally{busy=false;render(lastState);}
};
$('#back').onclick=()=>window.brain.overlay('back');
window.brain.onOverlay(render);
