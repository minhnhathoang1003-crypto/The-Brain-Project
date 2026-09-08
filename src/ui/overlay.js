const $=s=>document.querySelector(s);
let target=null;
function render(state){
  target=state.target;
  $('#app-name').textContent=target?.name||'Ứng dụng này';
  $('#balance').textContent=`Số dư ${String(state.credits).replace('.',',')} credit`;
  const locked=state.lockUntil>Date.now();
  $('#explain').textContent=locked
    ? 'Đang trong chế độ khóa. Không đổi được credit cho tới khi hết giờ khóa.'
    : 'Bạn đã tự đặt ứng dụng này vào danh sách chặn. Đổi credit nếu bạn thật sự muốn mở.';
  $('#minutes').innerHTML=state.packs.map(n=>`<option value="${n}" ${n===5?'selected':''}>${n} phút · ${n} credit</option>`).join('');
  $('#minutes').disabled=locked;
  $('#redeem').disabled=locked;
}
$('#redeem').onclick=async()=>{
  const r=await window.brain.action('redeem',{id:target.id,minutes:Number($('#minutes').value)});
  if(!r.ok){$('#explain').textContent=r.error;return;}
  window.brain.overlay('done');
};
$('#back').onclick=()=>window.brain.overlay('back');
window.brain.onOverlay(render);
