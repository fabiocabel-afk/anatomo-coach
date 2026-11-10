const puppeteer=require('puppeteer-core');const path=require('path');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2,});const errs=[];
p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
await p.evaluate(()=>{__corpo.setExercise('rosca');__corpo.setPhase(0);__corpo.setView(30,6,3.2,1.0)});await sleep(500);
const view=await p.$eval('#view',e=>{const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]});
// 1) toque no bíceps esquerdo do boneco
const P=[0.205,1.26,0.06];
const s0=await p.evaluate(P=>__corpo.project(...P),P);
const cam0=await p.evaluate(()=>__corpo.cam());
let t0=Date.now();const k=await p.evaluate((x,y)=>__corpo.pickAt(x,y),s0[0],s0[1]);console.log('pick',k,(Date.now()-t0)+'ms');
await p.mouse.click(s0[0],s0[1]);await sleep(800);await p.evaluate(()=>__corpo.fimAnimacao());await sleep(2500);
const cam1=await p.evaluate(()=>__corpo.cam());const s1=await p.evaluate(P=>__corpo.project(...P),P);
console.log('cam antes',JSON.stringify(cam0));console.log('cam depois',JSON.stringify(cam1));
console.log('ponto tocado na tela antes',s0.map(Math.round),'depois',s1.map(Math.round));
console.log('foco',JSON.stringify(await p.evaluate(()=>__corpo.foco())),await p.$eval('#mTec',e=>e.textContent));
await p.screenshot({path:'shots/f1.png'});
// 2) mira com músculo selecionado: centraliza sem mudar ângulo
await p.click('#bBest');await sleep(500);await p.evaluate(()=>__corpo.fimAnimacao());await sleep(2500);
const cam2=await p.evaluate(()=>__corpo.cam());console.log('mira (foco)',JSON.stringify(cam2));
const c=await p.evaluate(()=>{const a=__corpo.cam().alvo;return __corpo.project(...a)});console.log('centro do músculo na tela',c.map(Math.round),'centro da vista',view.map(Math.round));
await p.screenshot({path:'shots/f2.png'});
// 3) toque na mão (madeira) na frente do antebraço: não deve escolher músculo
await p.evaluate(()=>{__corpo.clearFocus();__corpo.setView(20,5,1.6,0.95)});await sleep(300);
const hnd=await p.evaluate(()=>__corpo.project(0.21,0.83,0.03));
console.log('toque na mão',await p.evaluate((x,y)=>__corpo.pickAt(x,y),hnd[0],hnd[1]));
// 4) várias regiões
await p.evaluate(()=>__corpo.setView(0,4,3.2,1.0));await sleep(300);
for(const [nm,pt] of [['peito dir',[-0.09,1.35,0.12]],['abdomen',[0.03,1.15,0.11]],['coxa esq',[0.10,0.72,0.1]],['canela dir',[-0.12,0.32,0.06]],['ombro esq',[0.235,1.40,0.03]]]){
 const sc=await p.evaluate(P=>__corpo.project(...P),pt);console.log(nm,await p.evaluate((x,y)=>__corpo.pickAt(x,y),sc[0],sc[1]));}
await p.evaluate(()=>__corpo.setView(180,4,3.2,1.0));await sleep(300);
for(const [nm,pt] of [['gluteo esq',[0.09,0.93,-0.14]],['dorsal dir',[-0.12,1.22,-0.11]],['panturrilha esq',[0.1,0.38,-0.08]]]){
 const sc=await p.evaluate(P=>__corpo.project(...P),pt);console.log(nm,await p.evaluate((x,y)=>__corpo.pickAt(x,y),sc[0],sc[1]));}
// 5) mira sem foco = melhor ângulo do exercício
await p.click('#bBest');await sleep(500);await p.evaluate(()=>__corpo.fimAnimacao());await sleep(2500);console.log('mira (sem foco)',JSON.stringify(await p.evaluate(()=>__corpo.cam())));
console.log('erros',errs);await b.close();})();
