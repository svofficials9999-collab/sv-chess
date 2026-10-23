const V='sv-chess-v26';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg','./vendor/chess.js','./vendor/stockfish.asm.js','./vendor/three.min.js','./royal3d.js','./netplay.js','./assets/me.jpg','./assets/logo.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(ASSETS.map(a=>c.add(new Request(a,{cache:'reload'}))))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{
    if(r.ok&&new URL(e.request.url).origin===location.origin){const cp=r.clone();caches.open(V).then(c=>c.put(e.request,cp))}
    return r;
  }).catch(()=>caches.match('./index.html'))));
});
