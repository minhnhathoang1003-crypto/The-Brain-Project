const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
function functions(){const source=fs.readFileSync(require('node:path').join(__dirname,'../extension/background.js'),'utf8');const code=source.slice(source.indexOf('function locked'),source.indexOf('function apply'));const context=vm.createContext({URL,Date,chrome:{runtime:{getURL:p=>'chrome-extension://test/'+p}}});vm.runInContext(code,context);return context;}
const targets=[{id:'youtube',domain:'youtube.com'},{id:'social',domain:'facebook.com'}];
test('extension blocks exact domain and subdomain, not lookalikes or internal pages',()=>{const c=functions();assert.equal(c.isBlocked('https://www.youtube.com/watch?v=abc',targets,[],1000).id,'youtube');for(const url of ['https://notyoutube.com','https://youtube.com.evil.com','https://example.com/youtube.com','chrome://extensions','chrome-extension://test/blocked.html'])assert.equal(c.isBlocked(url,targets,[],1000),undefined===c.isBlocked(url,targets,[],1000)?undefined:null);});
test('grant expiry closes existing tabs and reinstates navigation rule',()=>{const c=functions(),grants=[{targetId:'youtube',until:2000}];assert.equal(c.isBlocked('https://youtube.com',targets,grants,1000),undefined);assert.equal(c.isBlocked('https://youtube.com',targets,grants,2000).id,'youtube');assert.equal(c.rulesFor({targets,grants},1000).length,1);assert.equal(c.rulesFor({targets,grants},2000).length,2);});
test('rules redirect only top-level navigation to local blocked page',()=>{const c=functions();const r=c.rulesFor({targets,grants:[]},0)[0];assert.equal(r.condition.urlFilter,'||youtube.com^');assert.equal(r.condition.resourceTypes[0],'main_frame');assert.equal(r.action.type,'redirect');assert(r.action.redirect.url.endsWith('blocked.html?host=youtube.com'));});
test('a lock makes the extension ignore every grant, even one still on the wire',()=>{
  const c=functions(),grants=[{targetId:'youtube',until:9000}];
  // Chưa khóa: grant có hiệu lực, youtube.com được mở.
  assert.equal(c.isBlocked('https://youtube.com',targets,c.usableGrants({grants,lockUntil:null},1000),1000),undefined);
  assert.equal(c.rulesFor({targets,grants,lockUntil:null},1000).length,1);
  // Đang khóa: grant bị bỏ qua hoàn toàn, chặn đủ cả hai.
  const locked={targets,grants,lockUntil:5000};
  assert.equal(c.locked(locked,1000),true);
  assert.equal(c.usableGrants(locked,1000).length,0,'đang khóa thì không grant nào dùng được');
  assert.equal(c.isBlocked('https://youtube.com',targets,c.usableGrants(locked,1000),1000).id,'youtube');
  assert.equal(c.rulesFor(locked,1000).length,2,'đang khóa thì chặn hết');
  // Hết hạn khóa: grant có hiệu lực trở lại mà không cần ứng dụng nói gì.
  assert.equal(c.locked(locked,5000),false);
  assert.equal(c.rulesFor(locked,5000).length,1);
});
