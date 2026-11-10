const puppeteer=require('puppeteer-core');const path=require('path');
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2});const errs=[];
p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve(process.argv[2]||'dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
await p.evaluate(()=>{__corpo.setExercise('rosca');__corpo.setPhase(0);__corpo.setView(0,4,2.6,1.1)});
await new Promise(r=>setTimeout(r,300));
// pontos na tela: peito, abdômen, coxa
const pts=await p.evaluate(()=>({peito:__corpo.project(0.08,1.36,0.12),abd:__corpo.project(0.03,1.12,0.11),coxa:__corpo.project(0.10,0.72,0.1)}));
const res={};for(const k in pts){res[k]=await p.evaluate((x,y)=>__corpo.pickAt(x,y),pts[k][0],pts[k][1]);}
console.log('pick',JSON.stringify(res));
// toque real (mouse) no peito → card do músculo
await p.mouse.click(pts.peito[0],pts.peito[1]);await new Promise(r=>setTimeout(r,1500));
const card=await p.evaluate(()=>({vis:!document.getElementById('cardMus').hidden,tec:document.getElementById('mTec').textContent,pop:document.getElementById('mPop').textContent,role:document.getElementById('mRole').textContent}));
console.log('card',JSON.stringify(card));
await p.screenshot({path:'shots/ui_focus.png'});
// voltar
await p.click('#bBack');await new Promise(r=>setTimeout(r,300));
console.log('voltou',await p.evaluate(()=>!document.getElementById('cardEx').hidden));
// lista + busca
await p.click('#bList');await p.type('#q','gluteo med');await new Promise(r=>setTimeout(r,200));
const items=await p.$$eval('.li b',e=>e.map(x=>x.textContent));console.log('busca',items);
await p.screenshot({path:'shots/ui_list.png'});
await p.click('.li');await new Promise(r=>setTimeout(r,1800));
console.log('foco',await p.evaluate(()=>document.getElementById('mTec').textContent));
await p.screenshot({path:'shots/ui_focus2.png'});
// troca de exercício sai do foco
await p.click('#bGrupo');await p.type('#exQ','agachamento livre');await p.click('#exList .li');await new Promise(r=>setTimeout(r,300));
console.log('ex',await p.evaluate(()=>document.getElementById('nome').textContent),'chips',await p.$$eval('#mus .m',e=>e.map(x=>x.textContent)));
const t0=Date.now();await p.evaluate((x,y)=>__corpo.pickAt(x,y),200,400);console.log('pick ms',Date.now()-t0);
console.log('erros',errs);await b.close();})();
