// オフライン対応: ページ本体はネット優先（更新がすぐ届く）、失敗時は保存済みの版を使う
// 2.3.1: ページ本体はブラウザの一時保存を使わず必ず確かめて取る（cache:'no-cache'）。配信側が少しの間だけ古い版を返しても、
//        30分以内に保存した新しい版があればそちらを出す（古い版に戻らない）。確認用の ?u= の取得は保存しない。
const C='training-plan-v2',N='training-plan-ntf',CORE=['manifest.webmanifest','icon-192.png','icon-512.png'],KEEP=18e5;
const verOf=t=>{const m=/id="appver"[^>]*>\s*バージョン\s*([0-9]+(?:\.[0-9]+)*)/.exec(t||'');return m?m[1]:''};
const verCmp=(a,b)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<Math.max(x.length,y.length);i++){const d=(x[i]||0)-(y[i]||0);if(d)return d}return 0};
const PAGE=()=>new URL('./',location).href;
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(async c=>{await c.addAll(CORE.map(u=>new Request(u,{cache:'reload'})));
  if(!await c.match(PAGE()))await c.add(new Request(PAGE(),{cache:'reload'}))}).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(a=>Promise.all(a.filter(k=>k!==C&&k!==N).map(k=>caches.delete(k))))
  .then(()=>caches.open(C)).then(c=>c.keys().then(ks=>Promise.all(ks.filter(q=>new URL(q.url).searchParams.has('u')).map(q=>c.delete(q))))) // 以前の版が残した確認用の取得を片づける
  .catch(()=>{}).then(()=>self.clients.claim()))});
// ページ本体: 確かめて取り、新しい版を './' に保存。取れなければ保存済みの版
// ※ ページ側（updPut）は名前が training-plan-v数字 の保存場所を探して './' に入れる。C の名前を変えるときもこの形にそろえる
async function page(r){const c=await caches.open(C),saved=()=>c.match(PAGE()).then(h=>h||c.match(PAGE(),{ignoreSearch:true}));let x;
  try{x=await fetch(r.url,{cache:'no-cache',credentials:'same-origin'});if(x.redirected)x=await fetch(r)}catch(e){return (await saved())||Response.error()}
  if(!x.ok)return x;
  try{const t=await x.clone().text(),v=verOf(t);if(!v)return x; // ページ本体でないものは './' にしまわない
    const h=await saved();if(h){const hv=verOf(await h.clone().text()),at=+h.headers.get('x-tp-saved')||0;
      if(hv&&verCmp(hv,v)>0&&Date.now()-at<KEEP)return h} // 配信側がまだ古い版を返している間は、さっき入れた新しい版を出す
    const y=new Response(t,{status:200,headers:{'content-type':x.headers.get('content-type')||'text/html; charset=utf-8','x-tp-saved':String(Date.now())}});
    await c.put(PAGE(),y.clone());return y}catch(e){return x}}
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.origin===location.origin){if(!u.pathname.startsWith(new URL('./',location).pathname))return;
    if(r.mode==='navigate'){e.respondWith(page(r));return}
    if(u.searchParams.has('u'))return; // 「最新版か確かめる」の取得はそのままネットへ（保存しない）
    e.respondWith(fetch(r).then(x=>{if(x.ok){const y=x.clone();caches.open(C).then(c=>c.put(r,y))}return x}).catch(()=>caches.match(r,{ignoreSearch:true})));return}
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
