// v2.39.0: tela do perfil (sexo/idade em texto, altura/peso/IMC em cartões, botões roxos lado a lado),
// título com avatar nas telas de medidas/exercícios e botão do corpo no detalhe da medida
const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const cl=async s=>{await p.evaluate(s=>document.querySelector(s).click(),s);await sleep(300);};
const carregar=async()=>{await p.waitForFunction('window.__corpo',{timeout:60000});await sleep(300);};
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await carregar();
const hoje=new Date().toISOString().slice(0,10);
await p.evaluate(()=>{localStorage.clear();localStorage.setItem('anatomotion.perfis.v1',JSON.stringify({v:1,lista:[{id:'p1',nome:'Fabio dos Santos Silva',cor:'#0164C9',criado:1}],atual:'p1'}));
  localStorage.setItem('anatomotion.corpo.v1@p1',JSON.stringify({v:1,sexo:'M',altura:178,idade:41,idadeEm:'2026-11-01',medidas:{peso:[{d:'2026-11-01',v:84.6,t:1}],ombros:[{d:'2026-11-01',v:120,t:1}]}}));});
await p.reload();await carregar();
await cl('#bPerfil');await p.evaluate(()=>document.querySelectorAll('#pfList .pfr.clic')[0].click());await sleep(300);
let s=await p.evaluate(()=>({topo:document.querySelector('.pfTopo small').textContent,cards:[...document.querySelectorAll('#pfCorpoCards>div')].map(d=>d.innerText.replace(/\n/g,' ')),
  bts:[...document.querySelectorAll('.pfAcoes.duas button')].map(b=>b.textContent+'|'+b.className),mesmaLinha:(()=>{const a=document.getElementById('bPfMedidas').getBoundingClientRect(),e=document.getElementById('bPfExercicios').getBoundingClientRect();return Math.abs(a.top-e.top)<1&&a.right<=e.left;})(),
  cor:getComputedStyle(document.getElementById('bPfMedidas')).backgroundColor}));
ok(s.topo==='Masculino · 41 anos · em uso agora','sexo e idade em texto junto do nome: '+s.topo);
ok(s.cards.join('|')==='Altura 1,78 m|Peso 84,6 kg em 01/11/2026|IMC 26,7 sobrepeso','cartões: altura, peso e IMC (84,6 ÷ 1,78² = 26,7) '+s.cards.join('|'));
ok(s.bts.join(',')==='Medidas|pri,Exercícios|pri'&&s.mesmaLinha&&s.cor==='rgb(100, 42, 144)','botões Medidas e Exercícios lado a lado, roxos '+s.cor);
await p.screenshot({path:'shots/pf_ver.png'});
await cl('#bPfMedidas');
s=await p.evaluate(()=>{const t=document.getElementById('pfTitulo');const r=t.querySelector('.trt b').getBoundingClientRect();return {av:t.querySelector('.avatar').textContent,bg:t.querySelector('.avatar').style.background,nome:t.querySelector('.trt b').textContent,sub:t.querySelector('.trt small').textContent,h:r.height};});
ok(s.av==='F'&&/1, 100, 201/.test(s.bg)&&s.nome==='Fabio dos Santos Silva'&&s.sub==='Medidas'&&s.h<26,'título: avatar com a cor do perfil, nome numa linha e "Medidas" embaixo '+JSON.stringify(s));
await cl('#pfMedAba button[data-v=fita]');await p.evaluate(()=>document.querySelector('#fitaLista [data-k=ombros]').click());await sleep(300);
s=await p.evaluate(()=>{const n=document.querySelector('.fitaCab .fitaN').getBoundingClientRect(),t=document.querySelector('.fitaCabNome').getBoundingClientRect();return {nome:document.querySelector('.fitaCabNome').textContent,fs:getComputedStyle(document.querySelector('.fitaCabNome')).fontSize,alin:Math.abs((n.top+n.bottom)/2-(t.top+t.bottom)/2),dica:document.querySelector('.fitaCabDica').textContent,bt:!!document.getElementById('bFitaVoltaCorpo')};});
ok(s.nome==='Ombros'&&s.fs==='20px'&&s.alin<4&&/^Onde medir/.test(s.dica)&&s.bt,'detalhe: nome grande alinhado ao número, dica embaixo, botão do corpo '+JSON.stringify(s));
await p.screenshot({path:'shots/pf_medida.png'});
await cl('#bFitaVoltaCorpo');ok(await p.evaluate(()=>!!document.querySelector('.figMed')),'botão do corpo volta para a figura');
await cl('#bPfVoltar');await cl('#bPfExercicios');
s=await p.evaluate(()=>document.querySelector('#pfTitulo .trt small')?.textContent);ok(s==='Exercícios feitos','título dos exercícios no mesmo padrão');
await cl('#bPfVoltar');await cl('#bPfVoltar');
ok(await p.evaluate(()=>document.getElementById('pfTitulo').textContent==='Perfis'&&!document.getElementById('pfTitulo').querySelector('.avatar')),'lista volta com o título simples');
console.log('erros',errs);if(errs.length)process.exitCode=1;await b.close();})().catch(e=>{console.error('EXC',e);process.exit(1);});
