const puppeteer=require('puppeteer-core');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.evaluateOnNewDocument('window.__semPreparo=true;window.__autoResposta="nao"');await p.setViewport({width:390,height:844,deviceScaleFactor:2});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const cl=async s=>{await p.evaluate(s=>document.querySelector(s).click(),s);await sleep(250);};
await p.goto('http://localhost:8766/index.html');await p.waitForFunction('window.__corpo',{timeout:60000});await sleep(300);
await cl('#bTreinos');ok(await p.evaluate(()=>!!document.getElementById('bTrCamera')),'botão Câmera junto de Novo treino e Trilha sonora');
await p.screenshot({path:'shots/cam_botoes.png'});
await cl('#bTrCamera');
let s=await p.evaluate(()=>({aberto:!document.getElementById('camSheet').hidden,modo:[...document.querySelectorAll('#camModo button')].map(b=>b.textContent+(b.classList.contains('on')?'*':'')).join(' '),giroDes:document.getElementById('camGiro').disabled,velDes:document.getElementById('camVel').disabled,step:document.getElementById('camGiro').step,max:document.getElementById('camGiro').max,vmax:document.getElementById('camVel').max}));
ok(s.aberto&&s.modo==='Fixa* Girando'&&s.giroDes&&s.velDes,'abre em Fixa com giro e velocidade desabilitados');
ok(s.step==='30'&&s.max==='360'&&s.vmax==='10','giro de 30 em 30 até 360; velocidade de 1 a 10');
await p.screenshot({path:'shots/cam_fixa.png'});
await p.evaluate(()=>[...document.querySelectorAll('#camModo button')].find(b=>b.dataset.v==='girar').click());await sleep(200);
s=await p.evaluate(()=>({giroDes:document.getElementById('camGiro').disabled,txt:document.getElementById('camGiroTxt').textContent}));
ok(!s.giroDes&&/180° · 90° para cada lado/.test(s.txt),'Girando: habilita; 180° = 90° para cada lado');
await p.evaluate(()=>{const g=document.getElementById('camGiro');g.value='60';g.dispatchEvent(new Event('input'));g.dispatchEvent(new Event('change'));const v=document.getElementById('camVel');v.value='10';v.dispatchEvent(new Event('input'));v.dispatchEvent(new Event('change'));});
await p.screenshot({path:'shots/cam_girar.png'});
await cl('#bCamClose');await cl('#bTrClose');
// 60°: vai e volta entre -30 e +30 em torno do centro
await p.evaluate(()=>{localStorage.setItem('corpo3d.treino.v1@p1',JSON.stringify({reps:50,ciclos:2,descanso:20,voz:false,ritmo:1,caneleira:1}));});
await p.reload();await p.waitForFunction('window.__corpo',{timeout:60000});
await p.evaluate(()=>__corpo.setExercise('agachamento'));await sleep(2500);
ok(Math.abs((await p.evaluate(()=>__corpo.camera2())).grau)<0.5,'exercício só selecionado (sem treinar): câmera parada');
await cl('#bPlay');await sleep(1800);
const th0=(await p.evaluate(()=>__corpo.camera2())).th;
let mn=99,mx=-99;for(let i=0;i<50;i++){const c=await p.evaluate(()=>__corpo.camera2());mn=Math.min(mn,c.grau);mx=Math.max(mx,c.grau);await sleep(120);}
ok(mx>15&&mn<-15&&mx<=30.5&&mn>=-30.5,'60°: oscila entre −30° e +30° do centro ('+mn.toFixed(1)+' a '+mx.toFixed(1)+')');
ok(Math.abs((await p.evaluate(()=>__corpo.camera2())).th-th0)<0.01,'o ângulo escolhido (centro) não muda');
// 360: volta completa contínua
await p.evaluate(()=>{const g=document.getElementById('camGiro');g.value='360';g.dispatchEvent(new Event('input'));g.dispatchEvent(new Event('change'));});
const a1=(await p.evaluate(()=>__corpo.camera2())).grau;await sleep(2500);const a2=(await p.evaluate(()=>__corpo.camera2())).grau;
ok(((a2-a1+360)%360)>8,'360°: gira sempre para o mesmo lado ('+a1+' → '+a2+')');
// descanso: parada
await p.evaluate(()=>{for(let i=0;i<4000&&__corpo.treino().estado!=='descanso';i++)__corpo.avancar(0.05);});await sleep(2500);
ok((await p.evaluate(()=>__corpo.treino().estado))==='descanso'&&Math.abs((await p.evaluate(()=>__corpo.camera2())).grau)<1,'no descanso a câmera fica parada');
await p.evaluate(()=>document.getElementById('bSkip').click());await p.waitForFunction(()=>Math.abs(__corpo.camera2().grau)>1,{timeout:45000}).catch(()=>{});
{const c=await p.evaluate(()=>__corpo.camera2());ok(Math.abs(c.grau)>1,'volta a girar no próximo ciclo '+JSON.stringify(c));}
// pausar: volta ao centro e para
await cl('#bParar');await sleep(2500);
ok(Math.abs((await p.evaluate(()=>__corpo.camera2())).grau)<1,'treino pausado: o giro para e volta ao centro');
await cl('#bEncerrar');
// Fixa: não gira
await p.evaluate(()=>[...document.querySelectorAll('#camModo button')].find(b=>b.dataset.v==='fixa').click());await sleep(2500);
ok(Math.abs((await p.evaluate(()=>__corpo.camera2())).grau)<1,'Fixa: câmera parada');
// gravado por perfil
await p.reload();await p.waitForFunction('window.__corpo',{timeout:60000});
s=await p.evaluate(()=>__corpo.camera2().cfg);ok(s.modo==='fixa'&&s.giro===360&&s.vel===10,'preferências guardadas '+JSON.stringify(s));
console.log('erros',errs);if(errs.length)process.exitCode=1;await b.close();})().catch(e=>{console.error('EXC',e);process.exit(1);});
