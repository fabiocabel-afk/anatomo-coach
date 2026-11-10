const puppeteer=require('puppeteer-core');const path=require('path');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2});const errs=[];
p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));
await p.evaluateOnNewDocument(()=>{window.__falas=[];Object.defineProperty(window,'speechSynthesis',{value:{speak:u=>__falas.push(u.text),cancel(){},getVoices:()=>[],addEventListener(){}}});window.SpeechSynthesisUtterance=function(t){this.text=t};});
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
await p.evaluate(()=>localStorage.clear());await sleep(1500);
const st=()=>p.evaluate(()=>({atual:__corpo.atual(),rep:__corpo.repouso(),nome:document.getElementById('nome').textContent,bot:document.getElementById('bPlay').innerText,sub:document.getElementById('nSub').textContent,on:[...document.querySelectorAll('#chips .chip.on')].map(x=>x.textContent),info:document.getElementById('bInfo').hidden,minAll:+__corpo.medir().minAll.toFixed(3)}));
console.log('abertura',JSON.stringify(await st()));
await p.screenshot({path:'shots/rep1.png'});
// pose viva: duas leituras diferentes da cabeça
const h1=await p.evaluate(()=>__corpo.ossos(['head']).head);await sleep(1500);const h2=await p.evaluate(()=>__corpo.ossos(['head']).head);
console.log('cabeça se mexe',JSON.stringify(h1)!==JSON.stringify(h2),'quadril/pés no chão?',JSON.stringify(await p.evaluate(()=>__corpo.ossos(['hips','leftFoot','rightFoot']))));
// Escolher abre catálogo
await p.click('#bPlay');await sleep(300);console.log('escolher abriu',await p.$eval('#trSheet',e=>!e.hidden));
await p.click('#bTrClose');await sleep(200);
// tocar num exercício do grupo e depois tocar de novo nele
await p.click('#chips .chip[data-id="rosca"]');await sleep(900);console.log('após escolher',JSON.stringify(await st()));
await p.click('#chips .chip[data-id="rosca"]');await sleep(900);console.log('após tocar de novo',JSON.stringify(await st()));
// descanso usa o repouso
await p.click('#chips .chip[data-id="rosca"]');await sleep(300);
await p.click('#bCfg');for(let i=0;i<8;i++)await p.click('.stp[data-k="reps"] button[data-d="-1"]');await p.click('#bCfgSave');
await p.click('#bPlay');await p.evaluate(()=>__corpo.avancar(2.8*2+0.1));await sleep(1200);
console.log('no descanso',JSON.stringify(await st()),JSON.stringify(await p.evaluate(()=>__corpo.treino())));
await p.screenshot({path:'shots/rep2.png'});
await p.evaluate(()=>__corpo.avancar(31));await sleep(800);
console.log('volta do descanso',JSON.stringify(await st()),(await p.evaluate(()=>__corpo.treino())).estado);
await p.screenshot({path:'shots/rep3.png'});
console.log('erros',errs);await b.close();})();
