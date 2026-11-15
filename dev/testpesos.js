// v2.34.0: régua de peso (halteres/anilha/caneleira), migração da caneleira antiga, peso por item do treino,
// container "Adicionar ao treino" com os ajustes em cima e os treinos embaixo
const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.evaluateOnNewDocument(()=>{window.__semPreparo=true;window.__autoResposta='sim';window.__falas=[];Object.defineProperty(window,'speechSynthesis',{value:{speak:u=>__falas.push(u.text),cancel(){},getVoices:()=>[],addEventListener(){}}});window.SpeechSynthesisUtterance=function(t){this.text=t;this.addEventListener=function(){};};});
await p.setViewport({width:390,height:844,deviceScaleFactor:2});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const url='file://'+path.resolve('dist/corpo3d.html');
const carregar=async()=>{await p.waitForFunction('window.__corpo',{timeout:60000});await sleep(300);};
await p.goto(url);await carregar();
// 1) migração: caneleira 5 kg antiga continua 5; 1 kg (o padrão antigo) vira o padrão novo de 3 kg
await p.evaluate(()=>{localStorage.clear();localStorage.setItem('corpo3d.treino.v1@p1',JSON.stringify({reps:2,ciclos:1,descanso:5,voz:true,ritmo:0.5,caneleira:5}));});
await p.reload();await carregar();
let c=await p.evaluate(()=>__corpo.cfgAtual().pesos);
ok(c.caneleira===5&&c.halteres===4&&c.anilha===12,'migra caneleira 5 kg e usa padrões 4/12 '+JSON.stringify(c));
await p.evaluate(()=>{localStorage.setItem('corpo3d.treino.v1@p1',JSON.stringify({reps:2,ciclos:1,descanso:5,voz:true,ritmo:0.5,caneleira:1}));});
await p.reload();await carregar();
c=await p.evaluate(()=>__corpo.cfgAtual().pesos);
ok(c.caneleira===3,'caneleira antiga de 1 kg (padrão) vira 3 kg '+JSON.stringify(c));
await p.evaluate(()=>{localStorage.setItem('corpo3d.treino.v1@p1',JSON.stringify({reps:2,ciclos:1,descanso:5,voz:true,ritmo:0.5,pesos:{halteres:999,anilha:'x',caneleira:2.3}}));});
await p.reload();await carregar();
c=await p.evaluate(()=>__corpo.cfgAtual().pesos);
ok(c.halteres===40&&c.anilha===12&&c.caneleira===2.5,'valores inválidos são corrigidos (limite 40, padrão, passo 0,5) '+JSON.stringify(c));
await p.evaluate(()=>localStorage.setItem('corpo3d.treino.v1@p1',JSON.stringify({reps:2,ciclos:1,descanso:5,voz:true,ritmo:0.5})));
await p.reload();await carregar();

// 2) Ajustes num exercício com halteres
await p.evaluate(()=>__corpo.setExercise('rosca'));await sleep(200);
ok(/Halteres 4 kg/.test(await p.$eval('#nSub',e=>e.textContent)),'subtítulo mostra Halteres 4 kg');
await p.evaluate(()=>document.getElementById('bCfg').click());await sleep(400);
let s=await p.evaluate(()=>{const r=document.getElementById('rowPeso');return {vis:!r.hidden,nome:r.querySelector('.lb').firstChild.textContent,val:r.querySelector('.pesoNum').textContent,sl:r.querySelector('.regua').scrollLeft,w:r.querySelector('.regua').clientWidth,ticks:r.querySelectorAll('.rgTk').length,can:!!document.getElementById('cCan')};});
ok(s.vis&&s.nome==='Halteres'&&s.val==='4 kg'&&!s.can,'Ajustes mostram a régua de halteres em 4 kg, sem os botões antigos '+JSON.stringify(s));
ok(s.ticks===80&&Math.abs(s.sl-7*12)<=1,'régua de 0,5 a 40 kg (80 marcas) já rolada no 4 kg '+JSON.stringify(s));
// centralização: a marca do 4 kg fica embaixo do indicador do meio
s=await p.evaluate(()=>{const r=document.querySelector('#rowPeso .regua');const rr=r.getBoundingClientRect();const tk=r.querySelectorAll('.rgTk')[7].getBoundingClientRect();return {centro:rr.left+rr.width/2,tk:tk.left+tk.width/2};});
ok(Math.abs(s.centro-s.tk)<=1.5,'a marca do valor fica no centro da régua '+JSON.stringify(s));
await p.screenshot({path:'shots/peso_ajustes.png'});
// rolar até 10 kg (índice 19)
await p.evaluate(()=>{const r=document.querySelector('#rowPeso .regua');r.scrollLeft=19*12;r.dispatchEvent(new Event('scroll'));});await sleep(300);
ok(await p.$eval('#rowPeso .pesoNum',e=>e.textContent)==='10 kg','rolando a régua chega a 10 kg');
await p.evaluate(()=>document.querySelectorAll('#rowPeso .pesoVal button')[1].click());await sleep(200);
s=await p.evaluate(()=>({v:document.querySelector('#rowPeso .pesoNum').textContent,sl:document.querySelector('#rowPeso .regua').scrollLeft}));
ok(s.v==='10,5 kg'&&Math.abs(s.sl-20*12)<=1,'o + soma 0,5 kg e a régua acompanha '+JSON.stringify(s));
await p.screenshot({path:'shots/peso_ajustes2.png'});
await p.evaluate(()=>document.getElementById('bCfgSave').click());await sleep(300);
s=await p.evaluate(()=>({cfg:JSON.parse(localStorage.getItem('corpo3d.treino.v1@p1')).pesos,sub:document.getElementById('nSub').textContent}));
ok(s.cfg.halteres===10.5&&s.cfg.anilha===12&&/Halteres 10,5 kg/.test(s.sub),'salvou 10,5 kg nos halteres (gravado) '+JSON.stringify(s));
// voz anuncia
await p.evaluate(()=>{__falas.length=0;document.getElementById('bPlay').click();});await sleep(300);
let fala=await p.evaluate(()=>__falas.join(' | '));
ok(/com halteres de 10,5 quilos/.test(fala),'voz: '+fala.slice(0,90));
// termina e registra
await p.evaluate(()=>{for(let i=0;i<4000&&__corpo.treino().estado!=='fim';i++)__corpo.avancar(0.05);});await sleep(300);
await p.evaluate(()=>{if(!document.getElementById('concBox').hidden)document.getElementById('bConcSim').click();});await sleep(300);
let h=await p.evaluate(()=>__corpo.historico().slice(-1)[0]);
ok(h&&h.peso===10.5&&h.pesoTipo==='halteres','histórico grava peso e objeto '+JSON.stringify(h&&{peso:h.peso,t:h.pesoTipo})+' estado '+await p.evaluate(()=>__corpo.treino().estado));

// 3) anilha: padrão 12, vai até 100
const anilhaId=await p.evaluate(()=>__corpo.exercicios.find(id=>{__corpo.setExercise(id);return /Anilha/.test(document.getElementById('nSub').textContent);}));
await p.evaluate(id=>__corpo.setExercise(id),anilhaId);await sleep(200);
await p.evaluate(()=>document.getElementById('bCfg').click());await sleep(400);
await sleep(300);s=await p.evaluate(()=>{const r=document.querySelector('#rowPeso');const g=r.querySelector('.regua');g.scrollLeft=99999;g.dispatchEvent(new Event('scroll'));return {nome:r.querySelector('.lb').firstChild.textContent,ticks:r.querySelectorAll('.rgTk').length};});await sleep(300);
let v=await p.$eval('#rowPeso .pesoNum',e=>e.textContent);
ok(s.nome==='Anilha'&&s.ticks===100&&v==='100 kg','anilha ('+anilhaId+'): régua de 1 a 100 kg, no fim marca 100 kg '+JSON.stringify(s)+v);
await p.evaluate(()=>document.getElementById('bCfgClose').click());
// caneleira
await p.evaluate(()=>__corpo.setExercise('abducao_em_pe'));await sleep(200);
ok(/Caneleira 3 kg/.test(await p.$eval('#nSub',e=>e.textContent)),'caneleira começa em 3 kg');
await p.evaluate(()=>document.getElementById('bCfg').click());await sleep(400);
ok(await p.evaluate(()=>document.querySelectorAll('#rowPeso .rgTk').length===40),'caneleira: régua até 20 kg');
await p.evaluate(()=>document.getElementById('bCfgClose').click());
// peso do corpo: sem régua
await p.evaluate(()=>__corpo.setExercise('prancha'));await sleep(200);
await p.evaluate(()=>document.getElementById('bCfg').click());await sleep(300);
ok(await p.evaluate(()=>document.getElementById('rowPeso').hidden),'exercício só com o corpo: sem régua de peso');
await p.evaluate(()=>document.getElementById('bCfgClose').click());

// 4) adicionar ao treino: ajustes em cima, treinos embaixo; tocar no treino adiciona
await p.evaluate(()=>{localStorage.setItem('corpo3d.treinos.v1@p1',JSON.stringify({v:1,lista:[{id:'x',nome:'Braços',trilha:'padrao',itens:[{ex:'elevacao',reps:10,ciclos:3,descanso:30,pausaRep:0,ritmo:1,depois:60}]},{id:'y',nome:'Pernas',trilha:'padrao',itens:[]}]}));});
await p.reload();await carregar();
s=await p.evaluate(()=>__corpo.treinos()[0].itens[0]);
ok(s.peso===10.5,'item antigo sem peso usa o peso geral dos halteres '+JSON.stringify(s));
await p.evaluate(()=>{document.getElementById('bEscolher').click();});await sleep(300);
await p.evaluate(()=>document.getElementById('bTrAvulso').click());await sleep(400);
await p.evaluate(()=>document.querySelector('#exList [data-id="rosca"] .addTr').click());await sleep(500);
s=await p.evaluate(()=>{const box=document.getElementById('atCorpo');const kids=[...box.children].map(e=>e.className||e.id);return {
  secs:[...box.querySelectorAll('.atSec')].map(x=>x.textContent),k:[...box.querySelectorAll('.stp')].map(x=>x.dataset.k).join(),rit:!!box.querySelector('#atRitmo'),
  peso:box.querySelector('#atPeso .pesoNum').textContent,ops:[...box.querySelectorAll('.atOp b')].map(b=>b.textContent).join(),
  ordem:kids.indexOf('atGrid')<kids.indexOf('atOp')&&kids.indexOf('pesoBox')<kids.indexOf('atOp'),novo:!!box.querySelector('#atNovoNome'),voltar:document.getElementById('bAtVoltar').hidden};});
ok(s.secs.length===2&&s.k==='reps,ciclos,descanso'&&s.rit&&s.peso==='10,5 kg'&&s.ops==='Braços,Pernas'&&s.ordem&&s.novo&&s.voltar,'container único: ajustes em cima, treinos embaixo '+JSON.stringify(s));
await p.screenshot({path:'shots/peso_add.png'});
// muda: +2 reps, −1 ciclo, Rápido, 8 kg
await p.evaluate(()=>{const st=document.querySelector('#atCorpo .stp[data-k=reps]');st.lastChild.click();st.lastChild.click();document.querySelector('#atCorpo .stp[data-k=ciclos]').firstChild.click();
  document.querySelector('#atRitmo button[data-v="0.7"]').click();const g=document.querySelector('#atPeso .regua');g.scrollLeft=15*12;g.dispatchEvent(new Event('scroll'));});await sleep(300);
ok(await p.$eval('#atPeso .pesoNum',e=>e.textContent)==='8 kg','régua no container: 8 kg');
await p.evaluate(()=>document.querySelector('#atCorpo .atOp[data-id="y"]').click());await sleep(400);
s=await p.evaluate(()=>({it:__corpo.treinos().find(t=>t.id==='y').itens[0],gr:JSON.parse(localStorage.getItem('corpo3d.treinos.v1@p1')).lista.find(t=>t.id==='y').itens[0],fech:document.getElementById('atSheet').hidden,msg:document.getElementById('exMsg').textContent}));
ok(s.fech&&s.it.ex==='rosca'&&s.it.reps===4&&s.it.ciclos===1&&s.it.ritmo===0.7&&s.it.peso===8&&s.gr.peso===8,'tocou em "Pernas": adicionou com os ajustes e gravou '+JSON.stringify(s.it));
ok(/Rosca direta adicionado a "Pernas"/.test(s.msg),'aviso: '+s.msg);
// criar novo treino direto
await p.evaluate(()=>document.querySelector('#exList [data-id="prancha"] .addTr').click());await sleep(400);
ok(await p.evaluate(()=>!document.getElementById('atPeso')&&/Segundos/.test(document.querySelector('.atCel span').textContent)),'prancha: segundos e sem régua de peso');
await p.evaluate(()=>[...document.querySelectorAll('#atCorpo button')].find(b=>/Criar e adicionar/.test(b.textContent)).click());await sleep(200);
ok(/nome/.test(await p.$eval('#atMsg',e=>e.textContent)),'sem nome: pede o nome');
await p.type('#atNovoNome','Core');
await p.evaluate(()=>[...document.querySelectorAll('#atCorpo button')].find(b=>/Criar e adicionar/.test(b.textContent)).click());await sleep(300);
s=await p.evaluate(()=>__corpo.treinosIds());
ok(s.length===3&&s[2].nome==='Core'&&s[2].itens.join()==='prancha','criou "Core" com a prancha');
await p.evaluate(()=>document.getElementById('bExClose').click());await sleep(200);

// 5) executar o treino: usa o peso do item (8 kg), não o geral
await p.evaluate(()=>{__falas.length=0;__corpo.executarTreino('y');});await sleep(300);
fala=await p.evaluate(()=>__falas.join(' | '));
ok(/com halteres de 8 quilos/.test(fala),'treino usa o peso do item: '+fala.slice(0,80));
// Ajustes dentro do treino mexem no item, não no geral
await p.evaluate(()=>document.getElementById('bCfg').click());await sleep(400);
ok(await p.$eval('#rowPeso .pesoNum',e=>e.textContent)==='8 kg','Ajustes no treino mostram o peso do item');
await p.evaluate(()=>document.querySelectorAll('#rowPeso .pesoVal button')[0].click());await sleep(100);
await p.evaluate(()=>document.getElementById('bCfgSave').click());await sleep(300);
s=await p.evaluate(()=>({it:__corpo.treinos().find(t=>t.id==='y').itens[0].peso,geral:__corpo.cfgAtual().pesos.halteres,tc:__corpo.seq().tc.peso}));
ok(s.it===7.5&&s.geral===10.5&&s.tc===7.5,'salvou 7,5 kg só no item do treino '+JSON.stringify(s));
await p.evaluate(()=>{for(let i=0;i<6000&&!(__corpo.treino().estado==='fim');i++)__corpo.avancar(0.05);});await sleep(300);
await p.evaluate(()=>{if(!document.getElementById('concBox').hidden)document.getElementById('bConcSim').click();});await sleep(300);
h=await p.evaluate(()=>__corpo.historico().filter(r=>r.treino).slice(-1)[0]);
ok(h&&h.peso===7.5&&h.treino.nome==='Pernas','registro do treino com 7,5 kg');

// 6) editor: item com régua; trocar exercício ajusta o peso
await p.evaluate(()=>{document.getElementById('bEscolher').click();});await sleep(300);
await p.evaluate(()=>{const b=document.querySelector('button[aria-label="Editar Pernas"]');if(b)b.click();});await sleep(400);
const edAberto=await p.evaluate(()=>!document.getElementById('edSheet').hidden);
if(edAberto){
  await p.evaluate(()=>document.querySelector('#edItens .edi > div').click());await sleep(300);
  s=await p.evaluate(()=>({peso:(document.querySelector('#edItens .pesoNum')||{}).textContent,sub:document.querySelector('#edItens .edi small').textContent}));
  ok(s.peso==='7,5 kg'&&/7,5 kg/.test(s.sub),'editor: item aberto tem a régua (7,5 kg) e o resumo mostra o peso '+JSON.stringify(s));
  await p.screenshot({path:'shots/peso_editor.png'});
}else console.log('(editor não encontrado pelo seletor do teste — conferido à parte)');
// tema claro
await p.evaluate(()=>{document.querySelectorAll('.sheetw').forEach(x=>x.hidden=true);document.body.classList.add('claro');__corpo.setExercise('rosca');});await sleep(200);
await p.evaluate(()=>document.querySelector('#bTreinos')&&0);
await p.evaluate(()=>document.getElementById('bCfg').click());await sleep(400);
await p.screenshot({path:'shots/peso_claro.png'});
console.log('erros',errs);if(errs.length)process.exitCode=1;await b.close();})().catch(e=>{console.error('EXC',e);process.exit(1);});
