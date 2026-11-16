// v2.37.0: figura nova do corpo nas medidas e modo "todos os gráficos juntos"
const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const cl=async s=>{await p.evaluate(s=>document.querySelector(s).click(),s);await sleep(300);};
const carregar=async()=>{await p.waitForFunction('window.__corpo',{timeout:60000});await sleep(300);};
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await carregar();
await p.evaluate(()=>{localStorage.clear();localStorage.setItem('anatomotion.corpo.v1@p1',JSON.stringify({v:1,lado:'A',medidas:{peso:[],
  cintura:[{d:'2026-10-01',v:88,t:1},{d:'2026-10-15',v:86.5,t:1},{d:'2026-11-01',v:85,t:1}],
  ombros:[{d:'2026-10-01',v:118,t:1},{d:'2026-11-01',v:119.5,t:1}],
  braco_d:[{d:'2026-10-01',v:35,t:1},{d:'2026-10-15',v:35.6,t:1},{d:'2026-11-01',v:36.2,t:1}],braco_e:[{d:'2026-10-01',v:34.6,t:1},{d:'2026-11-01',v:35.5,t:1}]}}));});
await p.reload();await carregar();
await cl('#bPerfil');await p.evaluate(()=>document.querySelectorAll('#pfList .pfr.clic')[0].click());await sleep(250);
await p.evaluate(()=>[...document.querySelectorAll('#pfList button')].find(b=>/Ver medidas/.test(b.textContent)).click());await sleep(300);
await cl('#pfMedAba button[data-v=fita]');
let s=await p.evaluate(()=>{const im=document.querySelector('.figMed image');const r=document.querySelector('.figMed').getBoundingClientRect();return {img:!!im&&/^data:image\/webp;base64,/.test(im.getAttribute('href')),w:r.width,h:r.height,marcas:document.querySelectorAll('.figMed .fmMarca').length,bt:!!document.getElementById('bFitaGraf')};});
ok(s.img&&s.marcas===18&&s.bt&&s.w>200&&s.h>s.w*2,'figura nova (imagem embutida), 18 pontos, botão de gráficos '+JSON.stringify(s));
// a imagem carregou de verdade
ok(await p.evaluate(()=>new Promise(r=>{const i=new Image();i.onload=()=>r(i.width===480);i.onerror=()=>r(false);i.src=document.querySelector('.figMed image').getAttribute('href');})),'imagem decodifica (480 px)');
// botão não cobre os seletores
s=await p.evaluate(()=>{const a=document.getElementById('bFitaGraf').getBoundingClientRect(),b=document.getElementById('pfLado').getBoundingClientRect();return a.top>=b.bottom-1;});
ok(s,'botão de gráficos abaixo do seletor de lado');
await p.screenshot({path:'shots/fita_fig.png'});
await cl('#bFitaGraf');
s=await p.evaluate(()=>({cards:[...document.querySelectorAll('.fitaGraf')].map(c=>c.dataset.k).join(),lista:!!document.getElementById('fitaLista'),fig:!!document.querySelector('.figMed'),
  data:document.getElementById('fitaDataSel').textContent,vals:[...document.querySelectorAll('.fitaGrafVal')].map(v=>v.textContent),eixos:[...document.querySelectorAll('.fitaGraf svg.graf')].map(g=>g.querySelectorAll('rect.gToque').length),fixos:document.querySelectorAll('.fitaGraf .gFixo').length,volta:!!document.getElementById('bFitaCorpo')}));
ok(s.cards==='ombros,braco,cintura'&&!s.lista&&!s.fig&&s.volta,'modo gráficos: só as medidas com dados, na ordem do corpo, sem lista nem figura '+s.cards);
ok(s.eixos.every(n=>n===3)&&s.fixos===3,'todos no mesmo eixo de 3 datas, com a data marcada em todos');
ok(/01\/11\/2026 · última/.test(s.data)&&s.vals.join('|')==='119,5 cm|D 36,2 cm · E 35,5 cm|85 cm','valores da última data no topo de cada gráfico '+s.vals.join('|'));
await p.screenshot({path:'shots/fita_graf.png'});
// toca na data do meio (15/10) no gráfico da cintura
await p.evaluate(()=>document.querySelector('.fitaGraf[data-k=cintura] rect.gToque:nth-of-type(2)')||0);
await p.evaluate(()=>{const r=[...document.querySelectorAll('.fitaGraf[data-k=cintura] rect.gToque')][1];r.dispatchEvent(new MouseEvent('click',{bubbles:true}));});await sleep(300);
s=await p.evaluate(()=>({data:document.getElementById('fitaDataSel').textContent,vals:[...document.querySelectorAll('.fitaGrafVal')].map(v=>v.textContent),sel:[...document.querySelectorAll('.fitaGraf')].map(c=>[...c.querySelectorAll('rect.gToque')].length)}));
ok(s.data==='15/10/2026'&&s.vals.join('|')==='—|D 35,6 cm · E —|86,5 cm','tocar em 15/10: todos mostram o valor daquela data (— onde não mediu) '+s.vals.join('|'));
// voltar (botão de corpo) e voltar do cabeçalho
await cl('#bFitaCorpo');ok(await p.evaluate(()=>!!document.querySelector('.figMed')&&!!document.getElementById('fitaLista')),'botão do corpo volta para a figura e a lista');
await cl('#bFitaGraf');await cl('#bPfVoltar');ok(await p.evaluate(()=>!!document.querySelector('.figMed')),'seta voltar sai do modo gráficos para a figura');
// tema claro
await p.evaluate(()=>document.body.classList.add('claro'));await cl('#pfLado button[data-v=A]');
await p.screenshot({path:'shots/fita_fig_claro.png'});
// sem dados
await p.evaluate(()=>{localStorage.setItem('anatomotion.corpo.v1@p1',JSON.stringify({v:1,medidas:{peso:[]}}));});await cl('#pfLado button[data-v=D]');await cl('#bFitaGraf');
ok(await p.evaluate(()=>!!document.getElementById('fitaGrafVazio')),'sem medidas: aviso no modo gráficos');
console.log('erros',errs);if(errs.length)process.exitCode=1;await b.close();})().catch(e=>{console.error('EXC',e);process.exit(1);});
