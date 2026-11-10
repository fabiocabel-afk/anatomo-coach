const puppeteer=require('puppeteer-core');
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();const errs=[];p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/index.html');await p.waitForFunction('window.__corpo');
await p.evaluate(()=>navigator.serviceWorker.ready);
const r=await p.evaluate(async()=>({keys:await caches.keys(),n:(await (await caches.open((await caches.keys())[0])).keys()).length,manifest:(await (await fetch('manifest.json')).json()).short_name}));
// clique real nos chips e no play
await p.click('#bGrupo');await p.type('#exQ','flexao');await p.click('#exList .li');await new Promise(r=>setTimeout(r,500));
const nome=await p.$eval('#nome',e=>e.textContent);
console.log(JSON.stringify(r),nome,'erros:',errs.length?errs:'nenhum');await b.close();})();
