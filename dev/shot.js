const puppeteer=require('puppeteer-core');const path=require('path');
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2});const errs=[];
p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));
const t0=Date.now();await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
console.log('load ms',Date.now()-t0);
const ex=process.argv[2]||'agachamento',ph=+(process.argv[3]||0);
await p.evaluate((e,f,n)=>{__corpo.setExercise(e);__corpo.setPhase(f);if(n)__corpo.neutro()},ex,ph,!!process.env.NEUTRO);
for(const v of process.argv.slice(4)){const [th,phh,d,ty]=v.split(':').map(Number);await p.evaluate((a,b2,c,e)=>__corpo.setView(a,b2,c,e),th,phh,d,ty);await new Promise(r=>setTimeout(r,200));
const el=await p.$('#view');await el.screenshot({path:`shots/v_${ex}_${ph}_${th}_${d}_${ty}.png`});}
console.log(JSON.stringify(await p.evaluate(()=>__corpo.medir())),'erros',errs);await b.close();})();
