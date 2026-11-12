const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:520,height:1000});await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
const ids=process.argv[2].split(',');const fases=(process.argv[3]||'0,1').split(',').map(Number);const th=+(process.argv[4]||90);
for(const id of ids)for(const f of fases){await p.evaluate((id,f,th)=>{__corpo.setExercise(id,true);__corpo.posar(f,0);__corpo.camera({th,ph:8,dist:3.6,ty:0.75});},id,f,th);await sleep(700);await p.evaluate((f)=>__corpo.posar(f,0),f);await sleep(300);
 await (await p.$('#view')).screenshot({path:`shots/sq_${id}_${f}.png`});}
await b.close();})();
