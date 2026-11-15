// Trilha sonora: 3 botões com a mesma largura; cada opção mostra só o que é dela
const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
await p.evaluate(()=>document.getElementById('bEscolher').click());await sleep(300);await p.evaluate(()=>document.getElementById('bTrMusica').click());await sleep(500);
const w=await p.evaluate(()=>{const bs=[...document.querySelectorAll('#muModo button')].map(b=>b.getBoundingClientRect());const seg=document.getElementById('muModo').getBoundingClientRect(),box=document.querySelector('#muSheet .box');const pad=parseFloat(getComputedStyle(box).paddingLeft)+parseFloat(getComputedStyle(box).paddingRight);return {ws:bs.map(r=>Math.round(r.width)),linha:new Set(bs.map(r=>Math.round(r.top))).size,seg:Math.round(seg.width),util:Math.round(box.clientWidth-pad)};});
ok(Math.max(...w.ws)-Math.min(...w.ws)<=1&&w.linha===1&&Math.abs(w.seg-w.util)<=1,'três botões da mesma largura ocupando a linha toda '+JSON.stringify(w));
const vis=()=>p.evaluate(()=>{const v=id=>{const e=document.getElementById(id);return !!e&&!e.hidden&&e.offsetParent!==null;};return {app:v('muApp_treino')&&v('muApp_pausa'),minhas:v('muL_treino')&&v('bMuAdd_treino')&&v('bMuAdd_pausa'),som:v('muVol'),nada:v('muSemNada')};});
for(const [m,esp] of [['app',{app:true,minhas:false,som:true,nada:false}],['minhas',{app:false,minhas:true,som:true,nada:false}],['off',{app:false,minhas:false,som:false,nada:true}]]){
  await p.evaluate(m=>document.querySelector('#muModo [data-v="'+m+'"]').click(),m);await sleep(400);
  const v=await vis();ok(JSON.stringify(v)===JSON.stringify(esp),m+': mostra só o que é dele '+JSON.stringify(v));
  await p.screenshot({path:`shots/trilha_${m}.png`});
}
await p.reload();await p.waitForFunction('window.__corpo',{timeout:60000});
await p.evaluate(()=>{document.getElementById('bEscolher').click();document.getElementById('bTrMusica').click();});await sleep(500);
ok(JSON.stringify(await vis())==='{"app":false,"minhas":false,"som":false,"nada":true}','escolha guardada: reabre em "Sem música" sem mostrar listas');
ok(errs.length===0,'sem erros '+errs.join('|'));await b.close();})();
