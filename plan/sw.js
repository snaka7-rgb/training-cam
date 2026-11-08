// オフライン対応: ページ本体はネット優先（更新がすぐ届く）、失敗時は保存済みの版を使う
const C='training-plan-v2',N='training-plan-ntf',CORE=['./','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(a=>Promise.all(a.filter(k=>k!==C&&k!==N).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.origin===location.origin){if(!u.pathname.startsWith(new URL('./',location).pathname))return;
    e.respondWith(fetch(r).then(x=>{if(x.ok){const y=x.clone();caches.open(C).then(c=>c.put(r.mode==='navigate'?'./':r,y))}return x}).catch(()=>caches.match(r.mode==='navigate'?'./':r,{ignoreSearch:true})));return}
  if(/^fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)){e.respondWith(caches.match(r).then(h=>h||fetch(r).then(x=>{const y=x.clone();caches.open(C).then(c=>c.put(r,y));return x})))}
});
// 今日のメニュー通知: ページが書いた予定表（Cache の 'sched'）を見て、時刻を過ぎていれば1日1回だけ通知する
async function ntfCheck(){try{const c=await caches.open(N),r=await c.match('sched');if(!r)return;const o=await r.json();if(!o||!o.on||!o.days)return;
  const d=new Date(),k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),nm=o.days[k];
  if(!nm||(o.shown&&o.shown[k]))return;const [h,m]=String(o.time||'7:00').split(':').map(Number);if(d.getHours()*60+d.getMinutes()<h*60+(m||0))return;
  await self.registration.showNotification('今日は '+nm+' の日',{body:'メニューを開いて始めましょう。',tag:'tp-today',icon:'icon-192.png',badge:'icon-192.png'});
  o.shown={[k]:1};await c.put('sched',new Response(JSON.stringify(o),{headers:{'content-type':'application/json'}}))}catch(e){}}
self.addEventListener('message',e=>{if(e.data&&e.data.type==='ntf-check')e.waitUntil(ntfCheck())});
self.addEventListener('periodicsync',e=>{if(e.tag==='ntf-daily')e.waitUntil(ntfCheck())});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{const c=cs.find(x=>x.url.includes('/plan'));return c?c.focus():self.clients.openWindow('./')}))});
