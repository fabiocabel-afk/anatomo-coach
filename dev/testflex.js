const puppeteer=require('puppeteer-core');const path=require('path');
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2});const errs=[];
p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
await p.evaluate(()=>__corpo.setExercise('flexao'));
for(const f of [0,0.25,0.5,0.75,1]){await p.evaluate(f=>{__corpo.setPhase(f);__corpo.setView(90,6,4.2,0.35)},f);await new Promise(r=>setTimeout(r,250));
const m=await p.evaluate(()=>({pt:__corpo.pontos(),md:__corpo.medir()}));console.log(f,JSON.stringify(m.pt),'minAll',m.md.minAll.toFixed(4));
const el=await p.$('#view');await el.screenshot({path:`shots/flex_${f}.png`});}
console.log('erros',errs);await b.close();})();
