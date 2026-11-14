const fs = require('fs');
const path = require('path');
const VERSION = 'corpo3d-v2.27.0';
const three = fs.readFileSync(require.resolve('three/build/three.min.js'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, 'src/app.js'), 'utf8');
const exs = fs.readFileSync(path.join(__dirname, 'src/exercicios.js'), 'utf8');
const mus = fs.readFileSync(path.join(__dirname, 'src/musica.js'), 'utf8');
const tpl = fs.readFileSync(path.join(__dirname, 'src/template.html'), 'utf8');

function fill(head, sw) {
  return tpl
    .replace('<!--PWA_HEAD-->', head)
    .replace('<!--PWA_SW-->', sw)
    .split('/*VER*/').join(VERSION.replace('corpo3d-v', ''))
    .split('/*THREE*/').join(three.replace(/<\/script/gi, '<\\/script'))
    .split('/*MUS*/').join(mus)
    .split('/*EXS*/').join(exs)
    .split('/*APP*/').join(app.split('/*VER*/').join(VERSION.replace('corpo3d-v', '')));
}
fs.mkdirSync('dist/pwa', { recursive: true });
// endereço público do app (GitHub Pages). As redes (WhatsApp, Teams...) exigem endereço completo da imagem.
const SITE = 'https://fabiocabel-afk.github.io/anatomo-coach/';
const DESC = 'Seu treino guiado com corpo humano em 3D: músculos, contagem por voz, treinos montados e histórico.';
const OG = [
  '<meta name="description" content="' + DESC + '">',
  '<meta property="og:type" content="website">', '<meta property="og:locale" content="pt_BR">',
  '<meta property="og:site_name" content="AnatoMotion">', '<meta property="og:title" content="AnatoMotion">',
  '<meta property="og:description" content="' + DESC + '">', '<meta property="og:url" content="' + SITE + '">',
  '<meta property="og:image" content="' + SITE + 'og-image.jpg">', '<meta property="og:image:secure_url" content="' + SITE + 'og-image.jpg">',
  '<meta property="og:image:type" content="image/jpeg">', '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">',
  '<meta property="og:image:alt" content="AnatoMotion — treino guiado com corpo humano em 3D">',
  '<meta name="twitter:card" content="summary_large_image">', '<meta name="twitter:title" content="AnatoMotion">',
  '<meta name="twitter:description" content="' + DESC + '">', '<meta name="twitter:image" content="' + SITE + 'og-image.jpg">',
  '<link rel="canonical" href="' + SITE + '">'
].join('');
// ícones e imagem de compartilhamento vêm de assets/ (o ícone é o feito pelo Fabio)
for (const f of ['icon-192.png', 'icon-512.png', 'og-image.jpg']) fs.copyFileSync(path.join(__dirname, 'assets', f), path.join('dist/pwa', f));
fs.writeFileSync('dist/corpo3d.html', fill('', ''));
fs.writeFileSync('dist/pwa/index.html', fill(
  '<link rel="manifest" href="manifest.json"><link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="icon-192.png">' + OG,
  `<script>if('serviceWorker' in navigator&&location.protocol.indexOf('http')===0){navigator.serviceWorker.register('sw.js').catch(function(){});}</script>`));
fs.writeFileSync('dist/pwa/manifest.json', JSON.stringify({
  name: 'AnatoMotion', short_name: 'AnatoMotion', start_url: './index.html', scope: './',
  display: 'standalone', orientation: 'portrait', background_color: '#131016', theme_color: '#131016',
  icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }]
}, null, 2));
fs.writeFileSync('dist/pwa/sw.js', `const CACHE='${VERSION}';
const FILES=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
// a página do app vem sempre da rede quando há internet (assim a versão nova aparece na hora);
// sem internet, usa a cópia guardada. Ícones e manifesto vêm do cache.
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
const caminho=new URL(e.request.url).pathname;const pagina=e.request.mode==='navigate'||caminho.endsWith('/')||caminho.endsWith('/index.html');
if(pagina){e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r&&r.ok){const c=r.clone();caches.open(CACHE).then(k=>k.put('./index.html',c));}return r;}).catch(()=>caches.match('./index.html').then(r=>r||caches.match('./'))));return;}
e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});
`);
console.log('ok', VERSION, (fs.statSync('dist/corpo3d.html').size / 1024).toFixed(0) + ' KB');
