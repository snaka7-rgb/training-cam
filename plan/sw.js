// オフライン対応: ページ本体はネット優先（更新がすぐ届く）、失敗時は保存済みの版を使う
const C='training-plan-v1',CORE=['./','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(a=>Promise.all(a.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.origin===location.origin){if(!u.pathname.startsWith(new URL('./',location).pathname))return;
    e.respondWith(fetch(r).then(x=>{if(x.ok){const y=x.clone();caches.open(C).then(c=>c.put(r.mode==='navigate'?'./':r,y))}return x}).catch(()=>caches.match(r.mode==='navigate'?'./':r,{ignoreSearch:true})));return}
  if(/^fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)){e.respondWith(caches.match(r).then(h=>h||fetch(r).then(x=>{const y=x.clone();caches.open(C).then(c=>c.put(r,y));return x})))}
});
