// atualização: a página vem da rede (versão nova na hora) e funciona sem internet
const puppeteer=require('puppeteer-core');const fs=require('fs');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const dir='/tmp/prof_pwa2';fs.rmSync(dir,{recursive:true,force:true});
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',userDataDir:dir,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
await p.goto('http://localhost:8765/index.html');await p.waitForFunction('window.__corpo',{timeout:60000});
await p.evaluate(()=>navigator.serviceWorker.ready);await sleep(500);
await p.reload();await p.waitForFunction('window.__corpo',{timeout:60000});
ok(await p.evaluate(()=>!!navigator.serviceWorker.controller),'service worker controlando a página');
// simula uma versão nova no servidor
const orig=fs.readFileSync('dist/pwa/index.html','utf8');
fs.writeFileSync('dist/pwa/index.html',orig.replace('<body','<body data-marca="NOVA"'));
await p.reload();await p.waitForFunction('window.__corpo',{timeout:60000});
ok(await p.evaluate(()=>document.body.dataset.marca==='NOVA'),'versão nova aparece no primeiro recarregamento');
fs.writeFileSync('dist/pwa/index.html',orig);
// sem internet
await p.setOfflineMode(true);await p.reload();await p.waitForFunction('window.__corpo',{timeout:60000});
ok(await p.evaluate(()=>!!window.__corpo),'abre sem internet (cópia guardada)');
await p.setOfflineMode(false);
await b.close();})().catch(e=>{console.error(e);process.exit(1);});
