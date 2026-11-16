// v2.38.0: gráfico de linha ligado à tabela (peso e medidas): ponto → linha destacada; linha → ponto marcado com a dica
const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const cl=async s=>{await p.evaluate(s=>document.querySelector(s).click(),s);await sleep(300);};
const carregar=async()=>{await p.waitForFunction('window.__corpo',{timeout:60000});await sleep(300);};
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await carregar();
await p.evaluate(()=>{localStorage.clear();localStorage.setItem('anatomotion.corpo.v1@p1',JSON.stringify({v:1,lado:'A',medidas:{peso:[{d:'2026-10-01',v:80,t:1},{d:'2026-10-15',v:79.2,t:2},{d:'2026-11-01',v:78.6,t:3}],
  braco_d:[{d:'2026-10-01',v:35,t:1},{d:'2026-10-15',v:35.6,t:1},{d:'2026-11-01',v:36.2,t:1}],braco_e:[{d:'2026-10-01',v:34.6,t:1},{d:'2026-11-01',v:35.5,t:1}]}}));});
await p.reload();await carregar();
await cl('#bPerfil');await p.evaluate(()=>document.querySelectorAll('#pfList .pfr.clic')[0].click());await sleep(250);
await p.evaluate(()=>[...document.querySelectorAll('#pfList button')].find(b=>/Ver medidas/.test(b.textContent)).click());await sleep(300);
const estado=g=>p.evaluate(g=>({linha:[...document.querySelectorAll('table.tab tbody tr.marcada')].map(t=>t.dataset.d).join(),realce:document.querySelector(g+' .gRealce:not(.gFixo)').getAttribute('visibility'),
  dica:document.querySelector(g+' .gDica').hidden?'':document.querySelector(g+' .gDica').textContent,ativos:document.querySelectorAll(g+' .gAtivo').length}),g);
// peso: toca no 2º ponto
await p.evaluate(()=>document.querySelectorAll('#grafPeso rect.gToque')[1].dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})));await sleep(200);
let s=await estado('#grafPeso');
ok(s.linha==='2026-10-15'&&s.realce==='visible'&&/15\/10\/2026/.test(s.dica)&&s.ativos===1,'peso: tocar no ponto destaca a linha 15/10 da tabela '+JSON.stringify(s));
// toca na linha da tabela de 01/10
await p.evaluate(()=>document.querySelector('table.tab tbody tr[data-d="2026-10-01"] td').click());await sleep(200);
s=await estado('#grafPeso');
ok(s.linha==='2026-10-01'&&s.realce==='visible'&&/01\/10\/2026: 80 kg/.test(s.dica)&&s.ativos===1,'peso: tocar na linha da tabela marca o ponto e mostra a dica '+JSON.stringify(s));
await p.screenshot({path:'shots/ligar_peso.png'});
// o X de apagar não marca nada nem apaga sem confirmar
await p.evaluate(()=>document.querySelector('table.tab tbody tr[data-d="2026-11-01"] button').click());await sleep(200);
s=await estado('#grafPeso');ok(s.linha==='2026-10-01','botão de apagar não muda a linha destacada');
// medida (braço, dois lados)
await cl('#pfMedAba button[data-v=fita]');await p.evaluate(()=>document.querySelector('#fitaLista [data-k=braco]').click());await sleep(300);
await p.evaluate(()=>document.querySelectorAll('#grafFita rect.gToque')[2].dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})));await sleep(200);
s=await estado('#grafFita');
ok(s.linha==='2026-11-01'&&s.ativos===2&&/Direito 36,2.*Esquerdo 35,5/.test(s.dica),'braço: ponto → linha da tabela, os dois marcadores cheios '+JSON.stringify(s));
await p.evaluate(()=>document.querySelector('#fitaTab tbody tr[data-d="2026-10-15"] td').click());await sleep(200);
s=await estado('#grafFita');
ok(s.linha==='2026-10-15'&&s.ativos===1&&/15\/10\/2026: Direito 35,6/.test(s.dica),'braço: linha → ponto (só o direito tem medida nesse dia) '+JSON.stringify(s));
await p.screenshot({path:'shots/ligar_braco.png'});
console.log('erros',errs);if(errs.length)process.exitCode=1;await b.close();})().catch(e=>{console.error('EXC',e);process.exit(1);});
