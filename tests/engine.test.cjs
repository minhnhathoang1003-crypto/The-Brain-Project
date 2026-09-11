const {test}=require('node:test');const assert=require('node:assert/strict');
const {Engine,initial,migrate,DAY,MAX_LOCK_MINUTES,VERSION}=require('../src/engine.cjs');
const {PLANS,tier,limits}=require('../src/license.cjs');
function harness(){let now=Date.now();const e=new Engine(initial(),()=>now);return {e,advance(ms,idle=0){now+=ms;e.tick(idle);},complete(minutes=25){e.action('start',{minutes});for(let i=0;i<minutes*60;i++){now+=1000;e.tick(0);}},at:()=>now};}

test('credit only after full completion; never awarded twice',()=>{const h=harness();h.e.action('start',{minutes:1});for(let i=0;i<59;i++)h.advance(1000);assert.equal(h.e.s.credits,0);h.advance(1000);assert.equal(h.e.s.credits,.2);h.advance(1000);assert.equal(h.e.s.credits,.2);assert.equal(h.e.s.lastSession.status,'completed');});
test('exact 5:1 ratio and today counter',()=>{const h=harness();h.complete();assert.equal(h.e.s.credits,5);assert.equal(h.e.snapshot().todayMinutes,25);assert.equal(h.e.s.history[0].day,DAY());});
test('cancellation forfeits all partial credit',()=>{const h=harness();h.e.action('start',{minutes:1});h.advance(1000);h.e.action('cancel');assert.equal(h.e.s.credits,0);assert.equal(h.e.s.session,null);assert.equal(h.e.s.lastSession.status,'interrupted');assert.throws(()=>h.e.action('cancel'));});
test('idle, suspend gap, clock rollback and restart forfeit credit',()=>{for(const which of ['idle','gap','rollback','restart']){const h=harness();h.e.action('start',{minutes:1});if(which==='idle')h.advance(1000,300);if(which==='gap')h.advance(11000);if(which==='rollback')h.advance(-1000);if(which==='restart')h.e.recover();assert.equal(h.e.s.session,null,which);assert.equal(h.e.s.credits,0,which);}});
test('redeem debits once, allows stacking another target, and expires back to blocked',()=>{
  const h=harness();h.complete();h.complete();          // 10 credit trước khi mở gì
  h.e.action('redeem',{id:'youtube.com',minutes:5});
  assert.equal(h.e.s.credits,5);assert.equal(h.e.rules().grants.length,1);
  assert.throws(()=>h.e.action('redeem',{id:'youtube.com',minutes:1}),/đang mở rồi/,'không mở lại đúng mục đang mở');
  assert.throws(()=>h.e.action('start',{minutes:1}),/kết thúc thời gian giải trí/);
  // Mở thêm mục khác được — đây là thứ gỡ bẫy "mở trình duyệt rồi kẹt không mở được website".
  h.e.action('redeem',{id:'facebook.com',minutes:5});
  assert.equal(h.e.s.credits,0);
  assert.equal(h.e.rules().grants.length,2);
  assert.deepEqual(h.e.snapshot().grants.map(g=>g.targetId).sort(),['facebook.com','youtube.com']);
  h.advance(300000);
  assert.deepEqual(h.e.s.grants,[]);assert.equal(h.e.rules().grants.length,0);
});
test('no debt, free unlock or invalid target',()=>{const h=harness();for(const p of [{id:'youtube.com',minutes:1},{id:'fake.com',minutes:5},{id:'youtube.com',minutes:-1},{id:'youtube.com',minutes:0},{id:'youtube.com',minutes:7},{id:'youtube.com',minutes:NaN}])assert.throws(()=>h.e.action('redeem',p));assert.equal(h.e.s.credits,0);});
test('early end has no refund',()=>{const h=harness();h.complete();h.e.action('redeem',{id:'youtube.com',minutes:5});h.e.action('endGrant');assert.equal(h.e.s.credits,0);assert.equal(h.e.rules().grants.length,0);assert.throws(()=>h.e.action('endGrant'));});
test('policy is immutable during a focus session',()=>{const h=harness();h.e.action('start',{minutes:1});for(const [a,p] of [['targetAdd',{domain:'reddit.com'}],['targetDelete',{id:'youtube.com'}],['settings',{idleSeconds:900}],['redeem',{id:'youtube.com',minutes:1}],['start',{minutes:5}]])assert.throws(()=>h.e.action(a,p),a);});
test('strict domain validation, normalisation and duplicates',()=>{
  const h=harness();
  h.e.action('targetAdd',{domain:'https://WWW.Reddit.com/'});
  assert(h.e.rules().targets.some(t=>t.domain==='reddit.com'));
  // Link có đường dẫn, cổng hay tham số nay được nhận và rút về tên miền gốc:
  // dán link thật mới là điều người ta làm nhiều nhất.
  for(const [domain,mong] of [['evil.com/path','evil.com'],['a.com:80','a.com'],['https://other.com?x=1','other.com']]){
    h.e.action('targetAdd',{domain});
    assert(h.e.rules().targets.some(t=>t.domain===mong),`${domain} phải thành ${mong}`);
  }
  // Nhưng thứ không phải tên miền thì vẫn bị từ chối, và trùng vẫn bị chặn.
  for(const domain of ['reddit.com','www.reddit.com','localhost','x.com\nfoo','-evil.com','127.0.0.1',''])
    assert.throws(()=>h.e.action('targetAdd',{domain}),String(domain));
});
test('deleting a site removes it from the blocker but not while it is unlocked',()=>{const h=harness();h.complete();h.e.action('redeem',{id:'youtube.com',minutes:5});assert.throws(()=>h.e.action('targetDelete',{id:'youtube.com'}));h.e.action('targetDelete',{id:'tiktok.com'});assert(!h.e.rules().targets.some(t=>t.id==='tiktok.com'));});
test('snapshot is detached and does not expose the bridge secret',()=>{const h=harness();const s=h.e.snapshot();assert.equal(s.token,undefined);s.targets.pop();assert.equal(h.e.s.targets.length,4);});
test('invalid duration and settings rejected',()=>{const h=harness();for(const minutes of [0,-1,181,Infinity,1.5,'oops'])assert.throws(()=>h.e.action('start',{minutes}));assert.throws(()=>h.e.action('settings',{idleSeconds:0}));assert.throws(()=>h.e.action('settings',{}));h.e.action('settings',{idleSeconds:900});assert.equal(h.e.s.idleSeconds,900);});
test('theme is a settings field with three values and is changeable mid-session',()=>{
  const h=harness();assert.equal(h.e.s.theme,'system');
  for(const theme of ['light','dark','system']){h.e.action('settings',{theme});assert.equal(h.e.snapshot().theme,theme);}
  assert.throws(()=>h.e.action('settings',{theme:'neon'}));
  h.e.action('start',{minutes:5});h.e.action('settings',{theme:'dark'});assert.equal(h.e.s.theme,'dark');
  assert.throws(()=>h.e.action('settings',{idleSeconds:600}),'ngưỡng vẫn bị khóa giữa phiên');
});
test('presets are user editable, validated, sorted and capped',()=>{
  const h=harness();assert.deepEqual(h.e.s.presets,[25,50,90]);
  h.e.action('settings',{presets:[90,15,45]});assert.deepEqual(h.e.snapshot().presets,[15,45,90],'luôn được sắp tăng dần');
  h.e.action('settings',{presets:[10]});assert.deepEqual(h.e.s.presets,[10],'giữ được đúng một mốc');
  for(const presets of [[],[1,2,3,4,5],[0],[181],[1.5],[10,10],['x'],'25',null])assert.throws(()=>h.e.action('settings',{presets}),JSON.stringify(presets));
  assert.deepEqual(h.e.s.presets,[10],'lần thử không hợp lệ không đụng vào dữ liệu');
  h.e.action('start',{minutes:5});h.e.action('settings',{presets:[20,40]});assert.deepEqual(h.e.s.presets,[20,40],'đổi được giữa phiên');
});
test('license seam gates the blocklist size and is the only place the boundary lives',()=>{
  // Bản Beta: mọi người dùng đều ở bậc pro, không ai bị giới hạn.
  assert.equal(tier(),'pro');
  assert.equal(limits().maxTargets,PLANS.pro.maxTargets);
  const h=harness();
  let n=0;while(h.e.s.targets.length<PLANS.pro.maxTargets)h.e.action('targetAdd',{domain:`site${n++}.example.com`});
  assert.equal(h.e.s.targets.length,PLANS.pro.maxTargets);
  assert.throws(()=>h.e.action('targetAdd',{domain:'thua.example.com'}),/tối đa 50 website/);

  // Ranh giới Free đã đóng đinh sẵn dù chưa bán: bật lên là có hiệu lực ngay.
  const before=process.env.BRAIN_TIER;
  try{
    process.env.BRAIN_TIER='free';
    assert.equal(tier(),'free');
    assert.equal(limits().maxTargets,5);
    const free=harness();
    assert.equal(free.e.s.targets.length,4,'bốn website mặc định vẫn nằm dưới hạn mức Free');
    free.e.action('targetAdd',{domain:'reddit.com'});
    assert.throws(()=>free.e.action('targetAdd',{domain:'thua.example.com'}),/Bản Free chặn tối đa 5 website/);
    assert.equal(free.e.snapshot().tier,'free');
    assert.equal(free.e.snapshot().maxTargets,5);
    // Vòng lặp cốt lõi không bao giờ bị khóa sau tường phí.
    free.complete();
    assert.equal(free.e.s.credits,5,'bản Free vẫn kiếm được credit');
    free.e.action('redeem',{id:'youtube.com',minutes:5});
    assert.equal(free.e.s.grants[0].domain,'youtube.com','bản Free vẫn đổi được credit');
  } finally { if(before===undefined)delete process.env.BRAIN_TIER; else process.env.BRAIN_TIER=before; }
  assert.equal(tier(),'pro','khôi phục lại bậc mặc định');
});
test('unknown or absent tier falls back to the paid tier, never locks anyone out',()=>{
  const before=process.env.BRAIN_TIER;
  try{
    for(const bad of ['','enterprise','FREE','null']){process.env.BRAIN_TIER=bad;assert.equal(tier(),'pro',bad);}
    delete process.env.BRAIN_TIER;assert.equal(tier(),'pro');
  } finally { if(before===undefined)delete process.env.BRAIN_TIER; else process.env.BRAIN_TIER=before; }
});
test('removed feature endpoints cannot mutate state',()=>{const h=harness();for(const type of ['taskAdd','habitToggle','reflect','skipBreak','sleep','usage'])assert.throws(()=>h.e.action(type,{title:'x',id:'study'}),type);assert.deepEqual(Object.keys(h.e.s).sort(),['credits','grants','history','idleSeconds','lastSession','lockUntil','paired','presets','session','targets','theme','token','version']);});

test('v2 migration keeps the pairing token, balance and enabled sites only',()=>{
  const old={version:2,token:'a'.repeat(64),settings:{idleSeconds:600},tasks:[{id:'t',title:'Bỏ',done:false}],habits:[{id:'h',days:['2026-09-07']}],
    targets:[{id:'youtube',domain:'youtube.com',type:'site',enabled:true},{id:'tiktok',domain:'tiktok.com',type:'site',enabled:false}],
    ledger:[{amount:10},{amount:-3}],sessions:[{id:'s'}],grants:[],reflections:[{id:'r'}],session:null};
  const next=migrate(old,1000);
  assert.equal(next.version,8);assert.equal(next.lockUntil,null);assert.equal(next.token,old.token);assert.equal(next.idleSeconds,600);assert.equal(next.credits,7);
  assert.equal(next.theme,'system');assert.deepEqual(next.presets,[25,50,90]);assert.equal(next.paired,true,'người dùng cũ không phải đi qua màn hình mở đầu');
  assert.deepEqual(next.targets,[{id:'youtube.com',domain:'youtube.com'}]);
  for(const gone of ['tasks','habits','ledger','sessions','reflections','settings'])assert(!(gone in next),gone);
});
test('v3 migration only adds the new fields and keeps everything else',()=>{
  const old={version:3,token:'d'.repeat(64),idleSeconds:900,credits:8.5,targets:[{id:'x.com',domain:'x.com'}],session:null,grant:null,lastSession:null,today:{day:'2026-09-08',minutes:40}};
  const next=migrate(old,1000);
  assert.equal(next.version,8);assert.equal(next.theme,'system');assert.deepEqual(next.presets,[25,50,90]);assert.equal(next.paired,true);
  assert.equal(next.credits,8.5);assert.equal(next.idleSeconds,900);
  assert.deepEqual(next.history,[{day:'2026-09-08',minutes:40,completed:0,interrupted:0,earned:0}],'số phút hôm nay cũ thành dòng đầu của lịch sử');
  assert(!('today' in next),'trường today cũ được bỏ');
  assert.deepEqual(migrate(next,1001),next,'nâng cấp lần hai không đổi gì');
});
test('v4 migration adds presets and keeps an unpaired user unpaired',()=>{
  const old={version:4,token:'e'.repeat(64),idleSeconds:300,theme:'dark',credits:0,paired:false,targets:[],session:null,grant:null,lastSession:null,today:{day:'2026-09-08',minutes:0}};
  const next=migrate(old,1000);
  assert.equal(next.version,8);assert.deepEqual(next.presets,[25,50,90]);
  assert.equal(next.theme,'dark','giữ chủ đề đã chọn');
  assert.equal(next.paired,false,'người chưa ghép nối vẫn phải qua màn hình mở đầu');
});
test('v1 migration refunds unusable unlocks once and keeps a live website unlock',()=>{
  const old={version:1,token:'b'.repeat(64),settings:{idleSeconds:300},targets:[{id:'app',type:'app',enabled:true},{id:'yt',domain:'youtube.com',type:'site',enabled:true}],
    ledger:[{amount:20},{amount:-5}],grants:[{id:'g1',targetId:'app',until:250000,minutes:5},{id:'g2',targetId:'yt',until:250000,minutes:5},{id:'g3',targetId:'app',until:50000,minutes:5}]};
  const next=migrate(old,100000);
  assert.equal(next.credits,17.5);
  assert.deepEqual(next.grants,[{targetId:'youtube.com',domain:'youtube.com',until:250000,minutes:5}]);
  assert.equal(migrate(structuredClone(next),100001).credits,17.5);
});
test('every shipped data version can still be opened',()=>{
  // Đã từng có lỗi thật: VERSION nhảy lên 7 mà migrate chỉ nhận v1–v4, nên mọi người dùng
  // có dữ liệu v5 hoặc v6 bị chặn ngoài cửa. Bài này đi qua TẤT CẢ các bản đã phát hành.
  for(let v=3;v<VERSION;v++){
    const old={version:v,token:'f'.repeat(64),idleSeconds:600,credits:12.5,paired:true,
      targets:[{id:'x.com',domain:'x.com'}],session:null,grant:null,lastSession:null,today:{day:'2026-09-08',minutes:33}};
    const next=migrate(old,1000);
    assert.equal(next.version,VERSION,`v${v} phải mở được`);
    assert.equal(next.credits,12.5,`v${v} giữ nguyên số dư`);
    assert.equal(next.token,old.token,`v${v} giữ nguyên mã ghép nối`);
    assert.equal(next.history[0].minutes,33,`v${v} giữ số phút hôm nay`);
    assert.deepEqual(migrate(next,1001),next,`v${v} nâng cấp lần hai không đổi gì`);
  }
  // v1 và v2 có hình dạng khác hẳn, đã có bài riêng; ở đây chỉ cần chúng không ném lỗi.
  for(const v of [1,2]){
    const legacy={version:v,token:'g'.repeat(64),settings:{idleSeconds:300},targets:[],grants:[],ledger:[],tasks:[],habits:[]};
    assert.equal(migrate(legacy,1000).version,VERSION,`v${v} phải mở được`);
  }
});
test('unsupported data versions fail closed without mutation',()=>{const state={version:99};assert.throws(()=>migrate(state));assert.equal(state.version,99);});
test('locked mode closes every exit inside the app and cannot be shortened',()=>{
  const h=harness();h.complete();                       // 5 credit trong ví
  h.e.action('lock',{minutes:60});
  assert.equal(h.e.snapshot().lockUntil,h.at()+3600000);

  // Bốn lối thoát trong ứng dụng đều bị chặn.
  assert.throws(()=>h.e.action('redeem',{id:'youtube.com',minutes:5}),/chế độ khóa/);
  assert.throws(()=>h.e.action('targetDelete',{id:'youtube.com'}),/chế độ khóa/);
  assert.throws(()=>h.e.action('lock',{minutes:1}),/Đang trong chế độ khóa rồi/);
  for(const minutes of [0,-60,MAX_LOCK_MINUTES+1,1.5,'oops',NaN])
    assert.throws(()=>h.e.action('lock',{minutes}),String(minutes));

  // Vẫn tập trung và tích credit được — khóa không phải là hình phạt.
  h.complete();
  assert.equal(h.e.s.credits,10,'kiếm credit trong lúc khóa vẫn được cộng');
  assert.throws(()=>h.e.action('redeem',{id:'youtube.com',minutes:5}),/chế độ khóa/);

  // Thêm website thì vẫn cho: siết chặt hơn luôn được phép.
  h.e.action('targetAdd',{domain:'reddit.com'});
  assert(h.e.rules().targets.some(t=>t.domain==='reddit.com'));

  // Hết giờ thì tự mở, không cần thao tác gì.
  h.advance(3600000-25*60000+1000);
  assert.equal(h.e.s.lockUntil,null);
  assert.equal(h.e.snapshot().lockUntil,null);
  h.e.action('redeem',{id:'youtube.com',minutes:5});
  assert.equal(h.e.s.grants[0].domain,'youtube.com','hết khóa là đổi được ngay');
});
test('a lock cannot start over a live unlock, and it voids grants on the wire',()=>{
  const h=harness();h.complete();
  h.e.action('redeem',{id:'youtube.com',minutes:5});
  assert.throws(()=>h.e.action('lock',{minutes:30}),/hết thời gian đang mở/);
  h.e.action('endGrant');
  h.e.action('lock',{minutes:30});
  // Kể cả nếu còn sót grant trong dữ liệu, luật gửi cho tiện ích phải rỗng grant.
  h.e.s.grants=[{targetId:'youtube.com',domain:'youtube.com',until:h.at()+300000,minutes:5}];
  const r=h.e.rules();
  assert.deepEqual(r.grants,[],'đang khóa thì không grant nào được lên dây');
  assert.equal(r.lockUntil,h.at()+1800000);
  assert.equal(r.targets.length,4,'vẫn chặn đủ bốn website');
});
test('locked mode is a paid feature and the free tier is told so',()=>{
  const before=process.env.BRAIN_TIER;
  try{
    process.env.BRAIN_TIER='free';
    const free=harness();
    assert.equal(free.e.snapshot().lockedMode,false);
    assert.throws(()=>free.e.action('lock',{minutes:30}),/bản Pro/);
    assert.equal(free.e.s.lockUntil,null);
  } finally { if(before===undefined)delete process.env.BRAIN_TIER; else process.env.BRAIN_TIER=before; }
  assert.equal(harness().e.snapshot().lockedMode,true);
});
test('history records each day, survives a rollover and is capped by the licence tier',()=>{
  const h=harness();
  h.complete();                                  // 25 phút trọn vẹn
  h.e.action('start',{minutes:5});h.advance(1000);h.e.action('cancel');
  const today=h.e.s.history[0];
  assert.equal(today.day,DAY());
  assert.equal(today.minutes,25);
  assert.equal(today.completed,1);
  assert.equal(today.interrupted,1,'phiên bị hủy vẫn được ghi nhận');
  assert.equal(today.earned,5);
  assert.equal(h.e.snapshot().todayMinutes,25,'bộ đếm hôm nay và lịch sử là cùng một nguồn');

  // Sang ngày mới: dòng cũ được giữ nguyên, dòng mới bắt đầu từ 0.
  h.e.s.history[0].day='2020-01-01';
  h.complete(1);
  assert.equal(h.e.s.history.length,2);
  assert.equal(h.e.s.history[0].day,DAY());
  assert.equal(h.e.s.history[0].minutes,1);
  assert.equal(h.e.s.history[1].minutes,25,'ngày hôm trước không bị đụng vào');
  assert.equal(h.e.snapshot().todayMinutes,1);

  const before=process.env.BRAIN_TIER;
  try{
    process.env.BRAIN_TIER='free';
    const free=harness();
    for(let i=0;i<20;i++) free.e.s.history.unshift({day:'2026-01-'+String(i+1).padStart(2,'0'),minutes:i,completed:1,interrupted:0,earned:0});
    assert.equal(free.e.s.history.length,21,'trên đĩa vẫn giữ đủ');
    assert.equal(free.e.snapshot().history.length,7,'bản Free chỉ xem được 7 ngày');
    assert.equal(free.e.snapshot().historyDays,7);
  } finally { if(before===undefined)delete process.env.BRAIN_TIER; else process.env.BRAIN_TIER=before; }
  assert.equal(harness().e.snapshot().historyDays,180);
});
test('app targets block by executable and never reach the browser extension',()=>{
  const h=harness();
  h.e.action('appAdd',{exe:'LeagueClient.exe',name:'Liên Minh Huyền Thoại'});
  const app=h.e.s.targets.at(-1);
  assert.deepEqual(app,{id:'app:leagueclient',exe:'leagueclient',name:'Liên Minh Huyền Thoại'},'bỏ đuôi .exe và hạ chữ thường');
  assert.equal(h.e.rules().targets.length,4,'tiện ích chỉ nhận website, không nhận ứng dụng');
  assert(!h.e.rules().targets.some(t=>t.id.startsWith('app:')));

  assert.equal(h.e.blockedApp('leagueclient').id,'app:leagueclient');
  assert.equal(h.e.blockedApp('chrome'),null,'ứng dụng ngoài danh sách không bị chặn');
  assert.equal(h.e.blockedApp(''),null);

  // Đổi credit mở được ứng dụng, hết giờ thì chặn lại.
  h.complete();
  h.e.action('redeem',{id:'app:leagueclient',minutes:5});
  assert.equal(h.e.blockedApp('leagueclient'),null,'đang mở thì không chặn');
  h.advance(300000);
  assert.equal(h.e.blockedApp('leagueclient').id,'app:leagueclient','hết giờ là chặn lại');

  // Chế độ khóa thắng mọi lượt mở.
  h.complete();h.e.action('lock',{minutes:30});
  h.e.s.grant={targetId:'app:leagueclient',domain:null,until:h.at()+300000,minutes:5};
  assert.equal(h.e.blockedApp('leagueclient').id,'app:leagueclient','đang khóa thì lượt mở vô hiệu');

  for(const exe of ['','   ','.exe','có dấu','a/b','x'.repeat(90)])
    assert.throws(()=>h.e.action('appAdd',{exe}),JSON.stringify(exe));
  assert.throws(()=>h.e.action('appAdd',{exe:'leagueclient'}),/đã có trong danh sách/);
});
test('app blocking is a paid feature and is inert on the free tier',()=>{
  const before=process.env.BRAIN_TIER;
  try{
    process.env.BRAIN_TIER='free';
    const free=harness();
    assert.equal(free.e.snapshot().appBlocking,false);
    assert.throws(()=>free.e.action('appAdd',{exe:'leagueclient'}),/bản Pro/);
    // Kể cả khi dữ liệu đã có sẵn mục ứng dụng, bậc Free không chặn ứng dụng nào.
    free.e.s.targets.push({id:'app:leagueclient',exe:'leagueclient',name:'LMHT'});
    assert.equal(free.e.blockedApp('leagueclient'),null);
  } finally { if(before===undefined)delete process.env.BRAIN_TIER; else process.env.BRAIN_TIER=before; }
  assert.equal(harness().e.snapshot().appBlocking,true);
});
test('bridge payload keeps the wire shape the extension expects',()=>{const h=harness();h.complete();h.e.action('redeem',{id:'youtube.com',minutes:5});const r=h.e.rules();assert.deepEqual(Object.keys(r).sort(),['grants','lockUntil','now','targets']);assert.deepEqual(Object.keys(r.targets[0]).sort(),['domain','id']);assert.deepEqual(Object.keys(r.grants[0]).sort(),['targetId','until']);});
