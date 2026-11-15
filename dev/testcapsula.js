// Cápsula do treino montado: (ciclos feitos/total) no nome; no descanso antes do próximo já mostra o próximo com 0
// Engrenagem no topo cabe no cabeçalho; voltar do celular fecha as Configurações
const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:360,height:780});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.evaluateOnNewDocument(`window.__semPreparo=true;if(!sessionStorage.getItem('s')){sessionStorage.setItem('s','1');localStorage.clear();
  localStorage.setItem('corpo3d.treinos.v1@p1',JSON.stringify({v:1,lista:[{id:'tq',nome:'Pernas',trilha:'off',itens:[{ex:'agachamento',reps:2,ciclos:3,descanso:4,pausaRep:0,ritmo:0.5,depois:6},{ex:'abdominal',reps:2,ciclos:2,descanso:4,pausaRep:0,ritmo:0.5,depois:0}]}]}));}`);
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
// cabeçalho
const hd=await p.evaluate(()=>{const r=e=>document.getElementById(e).getBoundingClientRect();const g=r('bConfig'),a=r('bPerfil'),t=r('bTreinos');return {cabe:a.right<=innerWidth&&g.right<=a.left+1&&t.right<=g.left+1,mesmaLinha:Math.abs(g.top-a.top)<8};});
ok(hd.cabe&&hd.mesmaLinha,'engrenagem no topo, ao lado do perfil, cabendo na tela de 360 px '+JSON.stringify(hd));await p.screenshot({path:'/tmp/hdr.png',clip:{x:0,y:0,width:360,height:60}});
await p.evaluate(()=>document.getElementById('bConfig').click());await sleep(200);
ok(await p.evaluate(()=>!document.getElementById('cnfSheet').hidden&&document.getElementById('cnfTit').textContent==='Configurações'),'engrenagem abre Configurações');
await p.evaluate(()=>history.back());await sleep(400);ok(await p.evaluate(()=>document.getElementById('cnfSheet').hidden),'voltar do celular fecha Configurações');
await p.evaluate(()=>document.getElementById('bCfg').click());await sleep(200);
ok(await p.evaluate(()=>!document.querySelector('#cfgSheet #cTema')&&!!document.querySelector('#cfgSheet #cReps, #cfgSheet [id^="c"]')),'Ajustes ficou só com o exercício');
await p.evaluate(()=>document.getElementById('bCfgClose').click());
// treino
const cap=()=>p.evaluate(()=>Object.assign(__corpo.capsula(),{e:__corpo.treino().estado,troca:__corpo.seq()&&__corpo.seq().troca,idx:__corpo.seq()&&__corpo.seq().idx}));
const ate=f=>p.evaluate(f=>{const fn=new Function('return '+f);for(let i=0;i<3000&&!fn();i++)__corpo.avancar(0.05);},f);
await p.evaluate(()=>__corpo.executarTreino('tq'));await sleep(100);
let c=await cap();ok(c.nome==='Pernas (0/3)'&&/Exercício 1 de 2 · depois: Abdominal/.test(c.sub),'começo: Pernas (0/3) — '+c.sub);
await ate("__corpo.treino().estado==='descanso'");c=await cap();ok(c.nome==='Pernas (1/3)','depois do 1º ciclo: (1/3)');
await ate("__corpo.treino().estado==='treino'");await ate("__corpo.treino().estado==='descanso'");c=await cap();ok(c.nome==='Pernas (2/3)','depois do 2º ciclo: (2/3)');
await ate("__corpo.treino().estado==='treino'");await ate("__corpo.treino().estado==='pergunta'");c=await cap();ok(c.nome==='Pernas (3/3)','terminou o exercício: (3/3) '+JSON.stringify(c));
await p.evaluate(()=>document.getElementById('bConcSim').click());await sleep(100);
c=await cap();ok(c.troca&&c.e==='descanso'&&c.nome==='Pernas (0/2)'&&/Exercício 2 de 2 · último/.test(c.sub),'descanso antes do próximo: já mostra o próximo, Pernas (0/2) — '+c.sub);
await p.screenshot({path:'shots/capsula_proximo.png'});
await ate("__corpo.treino().estado==='treino'");c=await cap();ok(c.idx===1&&c.nome==='Pernas (0/2)','próximo exercício começou: (0/2)');
await ate("__corpo.treino().estado==='descanso'");c=await cap();ok(c.nome==='Pernas (1/2)','(1/2)');
// cabeçalho também cabe em 412 px com o texto "Treinos"
await p.setViewport({width:412,height:860});await sleep(300);
const h2=await p.evaluate(()=>({t:getComputedStyle(document.querySelector('#bTreinos i.rot')).display,dir:document.getElementById('bPerfil').getBoundingClientRect().right<=innerWidth}));
ok(h2.t!=='none'&&h2.dir,'em 412 px aparece "Treinos" escrito e tudo cabe');
ok(errs.length===0,'sem erros '+errs.join('|'));await b.close();})();
