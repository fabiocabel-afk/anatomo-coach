const puppeteer=require('puppeteer-core');const path=require('path');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.evaluateOnNewDocument('window.__semPreparo=true');await p.setViewport({width:390,height:844,deviceScaleFactor:2});const errs=[];
p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));
await p.evaluateOnNewDocument(()=>{window.__falas=[];const fake={speak:u=>window.__falas.push(u.text),cancel:()=>window.__falas.push('<cancel>'),getVoices:()=>[{lang:'pt-BR',name:'Teste'}],addEventListener(){}};
 Object.defineProperty(window,'speechSynthesis',{value:fake});window.SpeechSynthesisUtterance=function(t){this.text=t};});
const url='file://'+path.resolve('dist/corpo3d.html');
await p.goto(url);await p.waitForFunction('window.__corpo',{timeout:60000});await p.evaluate(()=>localStorage.clear());
await p.reload();await p.waitForFunction('window.__corpo',{timeout:60000});
const painel=()=>p.evaluate(()=>({cont:document.getElementById('cont').innerText.replace(/\n/g,' | '),bot:document.getElementById('bPlay').innerText,rest:!document.getElementById('rest').hidden}));
await p.evaluate(()=>__corpo.setExercise('agachamento'));console.log('inicial',JSON.stringify(await painel()));
// configurar: 3 reps, 2 ciclos, 5 s, ritmo normal, voz ligada
await p.click('#bCfg');await sleep(200);
for(let i=0;i<7;i++)await p.click('.stp[data-k="reps"] button[data-d="-1"]');
await p.click('.stp[data-k="ciclos"] button[data-d="-1"]');
for(let i=0;i<5;i++)await p.click('.stp[data-k="descanso"] button[data-d="-1"]');
console.log('rascunho',await p.$$eval('.stp output',e=>e.map(x=>x.textContent)));
await p.screenshot({path:'shots/cfg.png'});
await p.click('#bCfgSave');await sleep(200);
console.log('salvo',await p.evaluate(()=>localStorage.getItem('corpo3d.treino.v1')),'folha fechada',await p.evaluate(()=>document.getElementById('cfgSheet').hidden));
console.log('painel',JSON.stringify(await painel()));
// recarregar: precisa manter a configuração
await p.reload();await p.waitForFunction('window.__corpo',{timeout:60000});
console.log('após recarregar',JSON.stringify(await p.evaluate(()=>__corpo.treino().cfg)),JSON.stringify(await painel()));
// treino
await p.evaluate(()=>__corpo.setExercise('agachamento'));await p.click('#bPlay');
const st=()=>p.evaluate(()=>__corpo.treino());
console.log('iniciou',JSON.stringify(await st()));
await p.evaluate(()=>__corpo.avancar(3.2*3+0.05));
console.log('após 3 reps',JSON.stringify(await st()),JSON.stringify(await painel()));
await p.screenshot({path:'shots/rest.png'});
// pausa no descanso não deve andar o tempo
await p.click('#bPlay');const r1=(await st()).resto;await p.evaluate(()=>__corpo.avancar(3));const r2=(await st()).resto;console.log('pausado',(await st()).estado,'resto',r1,'→',r2);
await p.click('#bPlay');
await p.evaluate(()=>__corpo.avancar(5.1));
console.log('após descanso',JSON.stringify(await st()));
await p.evaluate(()=>__corpo.avancar(3.2*3+0.05));
console.log('fim',JSON.stringify(await st()),JSON.stringify(await painel()));
console.log('falas',JSON.stringify(await p.evaluate(()=>__falas.filter(x=>x!=='<cancel>'))));
// repetir e recomeçar
await p.click('#bPlay');console.log('repetir',(await st()).estado);
await p.click('#bReset');console.log('recomeçar',JSON.stringify(await st()));
// troca de exercício volta para prévia
await p.click('#bPlay');await p.click('#bGrupo');await p.type('#exQ','rosca direta');await p.click('#exList .li');await new Promise(r=>setTimeout(r,400));await p.click('#bPvFazer');console.log('troca exercício',(await st()).estado);
await sleep(500);await p.screenshot({path:'shots/painel.png'});
console.log('erros',errs);await b.close();})();
