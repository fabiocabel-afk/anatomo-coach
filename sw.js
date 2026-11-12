const CACHE='corpo3d-v2.19.0';
const FILES=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
// a página do app vem sempre da rede quando há internet (assim a versão nova aparece na hora);
// sem internet, usa a cópia guardada. Ícones e manifesto vêm do cache.
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
const caminho=new URL(e.request.url).pathname;const pagina=e.request.mode==='navigate'||caminho.endsWith('/')||caminho.endsWith('/index.html');
if(pagina){e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r&&r.ok){const c=r.clone();caches.open(CACHE).then(k=>k.put('./index.html',c));}return r;}).catch(()=>caches.match('./index.html').then(r=>r||caches.match('./'))));return;}
e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});
