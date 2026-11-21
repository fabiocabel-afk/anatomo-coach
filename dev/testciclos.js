// v2.49.0: histórico ciclo a ciclo (quando muda no meio do exercício), card só do exercício, pausa em roxo apagado
const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844});const errs=[];p.on('pageerror',e=>errs.push(e.message));
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
await p.evaluateOnNewDocument(`window.__semPreparo=true;window.__autoResposta="sim";if(!sessionStorage.getItem('x')){sessionStorage.setItem('x','1');localStorage.clear();
 localStorage.setItem('corpo3d.treino.v1@p1',JSON.stringify({reps:2,ciclos:2,descanso:2,voz:false,ritmo:0.5,caneleira:1}));}`);
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
const ate=async(fn,arg)=>{for(let k=0;k<1500;k++){const r=await p.evaluate(fn,arg);if(r)return true;await sleep(30);}return false;};
// 1) com mudança: depois do 1º ciclo, passa para 3 repetições, 4 s de descanso e 3 ciclos
await p.evaluate(()=>{__corpo.setExercise('agachamento');document.getElementById('bPlay').click();});
await ate(()=>__corpo.treino().estado==='descanso');
await p.evaluate(()=>__corpo.mudarTc({reps:3,descanso:4,ciclos:3}));
await ate(()=>{if(!document.getElementById('concBox').hidden){document.getElementById('bConcSim').click();return true;}return false;});
await sleep(300);
let h=await p.evaluate(()=>__corpo.historico());
const r1=h[0];console.log(JSON.stringify(r1.partes),JSON.stringify(r1.plano));
ok(r1&&r1.partes.length===3&&r1.partes.map(x=>x.reps).join()==='2,3,3','3 ciclos guardados com as repetições de cada um (2, 3, 3)');
ok(r1.partes[0].descProg===2&&r1.partes[1].descProg===4&&Math.abs(r1.partes[0].desc-2)<=1&&Math.abs(r1.partes[1].desc-4)<=1,'descanso de cada ciclo: 2 s e depois 4 s');
ok(r1.plano&&r1.plano.reps===2&&r1.plano.ciclos===2&&r1.plano.descanso===2,'guarda o que estava previsto no início');
const soma=r1.partes.reduce((a,x)=>a+x.ativo+x.desc,0);ok(r1.partes.every(x=>x.ativo>0)&&Math.abs(soma-(r1.ativoSeg+r1.descansoSeg))<=2,'soma dos ciclos bate com o total ('+soma+' × '+(r1.ativoSeg+r1.descansoSeg)+')');
// 2) sem mudança
await p.evaluate(()=>__corpo.mudarTc({reps:2,ciclos:2,descanso:2}));
await p.evaluate(()=>{__corpo.setExercise('rosca');document.getElementById('bPlay').click();});
await ate(()=>{if(!document.getElementById('concBox').hidden){document.getElementById('bConcSim').click();return true;}return false;});
await sleep(300);h=await p.evaluate(()=>__corpo.historico());const r2=h.find(r=>r.ex==='rosca');
ok(r2&&r2.partes.length===2&&r2.partes.every(x=>x.reps===2),'sem mudança: 2 ciclos iguais');
// tela
await p.evaluate(()=>document.getElementById('bPerfil').click());await sleep(300);await p.evaluate(()=>document.querySelector('#pfList .pfr.clic').click());await sleep(300);
await p.evaluate(()=>document.getElementById('bPfExercicios').click());await sleep(400);
const cor=await p.evaluate(()=>{const e=document.querySelector('#grafHist .gBarra2');if(!e)return null;const c=getComputedStyle(e);return c.fill+' '+c.fillOpacity;});
ok(cor&&/157, 95, 224/.test(cor)&&/0\.34/.test(cor),'pausa no gráfico: o mesmo roxo, apagado ('+cor+')');
await p.evaluate(id=>document.querySelector('#pfList tr[data-id="'+id+'"]').click(),r1.id);await sleep(400);
let x=await p.evaluate(()=>({tit:document.getElementById('hdTitulo').textContent,linhas:[...document.querySelectorAll('#hdCiclos tbody tr')].map(t=>[...t.cells].map(c=>c.textContent)),barras:document.querySelectorAll('#hdGraf .gBarra').length,pausas:document.querySelectorAll('#hdGraf .gBarra2').length,txt:document.getElementById('hdCorpo').innerText,itens:document.querySelectorAll('#hdCorpo .hdItem').length}));
console.log(JSON.stringify(x.linhas));
ok(x.tit==='Agachamento livre'&&x.itens===0,'card só do exercício');
ok(x.linhas.length===3&&x.linhas.map(l=>l[2]).join()==='2,3,3'&&/^\d\d:\d\d:\d\d$/.test(x.linhas[0][1])&&x.linhas[2][4]==='—','mudou: uma linha por ciclo com horário, repetições, tempo e pausa');
ok(/Previsto no início\s*2 ciclos de 2 repetições · descanso 2 s/.test(x.txt)&&/Total de exercício/.test(x.txt)&&/Total de pausa/.test(x.txt),'mostra o previsto e os totais');
ok(x.barras===3&&x.pausas===2,'gráfico do exercício: uma barra por ciclo, pausa nos dois primeiros');
await p.screenshot({path:'shots/ciclos_mudou.png',fullPage:false});
await p.evaluate(()=>{const b=document.querySelector('#hdSheet .box');b.scrollTop=b.scrollHeight;});await sleep(200);await p.screenshot({path:'shots/ciclos_mudou2.png'});
await p.evaluate(()=>document.getElementById('bHdClose').click());await sleep(200);
await p.evaluate(id=>document.querySelector('#pfList tr[data-id="'+id+'"]').click(),r2.id);await sleep(400);
x=await p.evaluate(()=>({tab:!!document.getElementById('hdCiclos'),txt:document.getElementById('hdCorpo').innerText,barras:document.querySelectorAll('#hdGraf .gBarra').length}));
ok(!x.tab&&/Séries\s*2 ciclos de 2 repetições/.test(x.txt)&&x.barras===2,'sem mudança: forma resumida (sem tabela), gráfico com os 2 ciclos');
await p.screenshot({path:'shots/ciclos_igual.png'});
console.log('erros',errs);if(errs.length)process.exitCode=1;await b.close();})();
