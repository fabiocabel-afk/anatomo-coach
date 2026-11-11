const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.evaluateOnNewDocument('window.__semPreparo=true;window.__autoResposta="nao"');await p.setViewport({width:390,height:844});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
await p.evaluate(()=>{localStorage.setItem('corpo3d.treino.v1@p1',JSON.stringify({reps:10,ciclos:3,descanso:30,voz:true,ritmo:1,caneleira:1}));localStorage.setItem('corpo3d.treinos.v1@p1',JSON.stringify({v:1,lista:[{id:'x',nome:'Pernas',trilha:'off',itens:[{ex:'agachamento',reps:8,ciclos:2,descanso:20,pausaRep:1,ritmo:1,depois:15},{ex:'prancha',reps:30,ciclos:1,descanso:10,pausaRep:0,ritmo:1,depois:60}]}]}));});
await p.reload();await p.waitForFunction('window.__corpo',{timeout:60000});
const cl=async s=>{await p.evaluate(s=>document.querySelector(s).click(),s);await sleep(200);};
const ler=()=>p.evaluate(()=>({tit:document.getElementById('cfgTitulo').textContent,sub:document.getElementById('cfgSub').hidden?'':document.getElementById('cfgSub').textContent,reps:document.getElementById('v_reps').textContent,ciclos:document.getElementById('v_ciclos').textContent,desc:document.getElementById('v_descanso').textContent,pausa:document.getElementById('rowPausaRep').hidden?null:document.getElementById('v_pausaRep').textContent,depois:document.getElementById('rowDepois').hidden?null:document.getElementById('v_depois').textContent,ritmo:[...document.querySelectorAll('#cRitmo button')].map(b=>b.textContent+(b.classList.contains('on')?'*':'')).join(' ')}));
// avulso: ajustes gerais com Turbo
await p.evaluate(()=>__corpo.setExercise('agachamento'));await cl('#bCfg');let r=await ler();
ok(r.tit==='Configurar treino'&&r.reps==='10'&&r.pausa===null&&r.depois===null&&/Turbo/.test(r.ritmo),'avulso: ajustes gerais, com opção Turbo '+JSON.stringify(r));
await p.evaluate(()=>[...document.querySelectorAll('#cRitmo button')].find(b=>b.textContent==='Turbo').click());await cl('#bCfgSave');
ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('corpo3d.treino.v1@p1')).ritmo===0.5),'Turbo salvo nos ajustes gerais');
await p.evaluate(()=>{localStorage.setItem('corpo3d.treino.v1@p1',JSON.stringify({reps:10,ciclos:3,descanso:30,voz:true,ritmo:1,caneleira:1}));});
await p.reload();await p.waitForFunction('window.__corpo',{timeout:60000});
// treino montado
await p.evaluate(()=>__corpo.executarTreino('x'));await sleep(300);
await cl('#bCfg');r=await ler();
ok(r.tit==='Ajustar este exercício'&&/Agachamento livre/.test(r.sub)&&r.reps==='8'&&r.ciclos==='2'&&r.desc==='20 s'&&r.pausa==='1 s'&&r.depois==='15 s'&&/Normal\*/.test(r.ritmo),'treino: carrega o exercício da tela '+JSON.stringify(r));
// muda reps 8->6, ritmo turbo, descanso 20->25 durante o treino
const antes=await p.evaluate(()=>({ph:__corpo.phase?__corpo.phase():null}));
await p.evaluate(()=>{const s=document.querySelector('.stp[data-k=reps]');s.querySelector('[data-d="-1"]').click();s.querySelector('[data-d="-1"]').click();document.querySelector('.stp[data-k=descanso] [data-d="1"]').click();[...document.querySelectorAll('#cRitmo button')].find(b=>b.textContent==='Turbo').click();});
await cl('#bCfgSave');
let s=await p.evaluate(()=>({tc:__corpo.treino().cfg,salvo:JSON.parse(localStorage.getItem('corpo3d.treinos.v1@p1')).lista[0].itens,geral:JSON.parse(localStorage.getItem('corpo3d.treino.v1@p1')),fechou:document.getElementById('cfgSheet').hidden,tot:document.getElementById('nRepTot').textContent,estado:__corpo.treino().estado}));
ok(s.fechou&&s.tc.reps===6&&s.tc.ritmo===0.5&&s.tc.descanso===25&&s.tot==='6'&&s.estado==='treino','vale na hora, sem parar o treino '+JSON.stringify(s.tc));
ok(s.salvo[0].reps===6&&s.salvo[0].ritmo===0.5&&s.salvo[0].descanso===25&&s.salvo[0].pausaRep===1&&s.salvo[1].reps===30,'treino guardado foi alterado (só esse exercício) '+JSON.stringify(s.salvo));
ok(s.geral.reps===10&&s.geral.ritmo===1,'ajustes gerais não mudaram');
// velocidade turbo: período efetivo é metade
const per=await p.evaluate(()=>__corpo.exAtual().periodo);
const r1=await p.evaluate(()=>__corpo.treino().rep);await p.evaluate(s=>__corpo.avancar(s),per*0.5*2+1*2+0.05);
const r2=await p.evaluate(()=>__corpo.treino().rep);ok(r2-r1===2,'turbo conta na velocidade nova ('+(r2-r1)+' reps em 2 períodos turbo + pausas)');
// recarregar e iniciar de novo: mantém
await p.reload();await p.waitForFunction('window.__corpo',{timeout:60000});
await p.evaluate(()=>__corpo.executarTreino('x'));await sleep(300);s=await p.evaluate(()=>__corpo.treino().cfg);
ok(s.reps===6&&s.ritmo===0.5,'ao executar de novo o treino já vem ajustado');
// segundo exercício (último): sem "descanso até o próximo", em segundos
await p.evaluate(()=>{for(let i=0;i<6;i++)document.getElementById('bNext').click();});await sleep(200);
await p.evaluate(()=>{document.getElementById('bPrev').click();document.getElementById('bNext').click();});await sleep(200);
await cl('#bCfg');r=await ler();ok(/Prancha/.test(r.sub)&&r.reps==='30 s'&&r.pausa===null&&r.depois===null,'prancha (último): segundos, sem pausa e sem próximo '+JSON.stringify(r));
await cl('#bCfgClose');
// editor mostra Turbo
await cl('#bEscolher');await p.evaluate(()=>document.querySelector('#trList [aria-label^="Editar"]').click());await sleep(200);
await p.evaluate(()=>document.querySelector('#edItens .edt').click());await sleep(200);
const ed=await p.evaluate(()=>[...document.querySelectorAll('.edi.aberto .seg button')].map(b=>b.textContent+(b.classList.contains('on')?'*':'')).join(' '));
ok(/Turbo\*/.test(ed),'editor do treino mostra Turbo marcado: '+ed);
console.log('erros',errs);if(errs.length)process.exitCode=1;await b.close();})();
