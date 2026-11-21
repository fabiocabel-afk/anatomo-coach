// v2.44.0: peso das anilhas da barra (1–150 kg); halteres, anilha e anilhas da barra do tamanho do peso, com o número impresso
const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.evaluateOnNewDocument(()=>{window.__semPreparo=true;window.__falas=[];Object.defineProperty(window,'speechSynthesis',{value:{speak:u=>__falas.push(u.text),cancel(){},getVoices:()=>[],addEventListener(){}}});window.SpeechSynthesisUtterance=function(t){this.text=t;this.addEventListener=function(){};};});
await p.setViewport({width:390,height:844,deviceScaleFactor:2});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const shot=async(n,cam)=>{await sleep(500);await p.screenshot({path:'shots/'+n+'.png'});};
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
await p.evaluate(()=>{localStorage.clear();});await p.reload();await p.waitForFunction('window.__corpo',{timeout:60000});await sleep(300);
// halteres
const halter=async kg=>{await p.evaluate(kg=>{const c=JSON.parse(localStorage.getItem('corpo3d.treino.v1@p1')||'{}');},kg);};
await p.evaluate(()=>__corpo.setExercise('rosca'));await sleep(300);
let s=await p.evaluate(()=>__corpo.pecas().halter);
ok(s.kg===4&&s.rot===2,'halteres 4 kg (padrão), número nas duas cabeças '+JSON.stringify(s));
const mudarPeso=async v=>{await p.evaluate(()=>document.getElementById('bCfg').click());await sleep(300);await p.evaluate(v=>{const r=document.querySelector('#rowPeso .pesoBox');r.definir?r.definir(v):0;},v);await p.evaluate(()=>document.getElementById('bCfgSave').click());await sleep(400);};
await mudarPeso(1);const h1=await p.evaluate(()=>__corpo.pecas().halter);
await mudarPeso(30);const h30=await p.evaluate(()=>__corpo.pecas().halter);
ok(h1.kg===1&&h30.kg===30&&h30.r>h1.r*2&&h30.L>h1.L*2.5,'halter de 30 kg bem maior que o de 1 kg (raio '+h1.r.toFixed(3)+'→'+h30.r.toFixed(3)+', largura '+h1.L.toFixed(3)+'→'+h30.L.toFixed(3)+')');
await p.evaluate(()=>{__corpo.cam&&0;});await shot('peca_halter30');
// anilha
const anId=await p.evaluate(()=>__corpo.exercicios.find(id=>{__corpo.setExercise(id);return __corpo.exAtual().equip==='anilha';}));
await p.evaluate(id=>__corpo.setExercise(id),anId);await sleep(300);
let a12=await p.evaluate(()=>__corpo.pecas().anilha);
await mudarPeso(1);let a1=await p.evaluate(()=>__corpo.pecas().anilha);
await mudarPeso(25);let a25=await p.evaluate(()=>__corpo.pecas().anilha);
ok(a12.kg===12&&a1.raio<a12.raio&&a25.raio>a12.raio&&a25.raio<=0.225&&a1.rot===2,'anilha: 1 kg < 12 kg < 25 kg (raio '+a1.raio.toFixed(3)+' / '+a12.raio.toFixed(3)+' / '+a25.raio.toFixed(3)+'), número nas duas faces');
await shot('peca_anilha25');
// barra: o campo é o peso de CADA anilha (1–150), padrão 10; são duas na barra
await p.evaluate(()=>__corpo.setExercise('rosca_barra'));await sleep(300);
await p.evaluate(()=>document.getElementById('bCfg').click());await sleep(300);
s=await p.evaluate(()=>({vis:!document.getElementById('rowPeso').hidden,nome:document.querySelector('#rowPeso .lb').firstChild.textContent,sub:document.querySelector('#rowPeso .lb small').textContent,val:document.querySelector('#rowPeso .pesoNum').textContent,marcas:document.querySelectorAll('#rowPeso .rgTk').length}));
ok(s.vis&&s.nome==='Anilha da barra'&&s.val==='10 kg'&&s.marcas===150&&/= 20 kg/.test(s.sub),'barra: régua "Anilha da barra" de 1 a 150 kg, começa em 10 (total 20) '+JSON.stringify(s));
await p.evaluate(()=>document.getElementById('bCfgClose').click());await sleep(200);
let br=await p.evaluate(()=>__corpo.pecas().barra);
ok(br.kg===10&&br.placas.join()==='0.15,0.15'&&br.rot===2,'10 kg = uma anilha de 10 kg de cada lado, com o número '+JSON.stringify(br));
await mudarPeso(100);br=await p.evaluate(()=>__corpo.pecas().barra);
ok(br.kg===100&&br.placas.length===2&&br.placas.every(r=>r===0.2),'100 kg: anilha de 100 em cada lado (não divide), tamanho travado no real (raio 0,20) '+JSON.stringify(br));
await mudarPeso(150);br=await p.evaluate(()=>__corpo.pecas().barra);
ok(br.kg===150&&br.placas.every(r=>r===0.2),'150 kg também fica no tamanho real máximo');
await shot('peca_barra150');
s=await p.evaluate(()=>{__falas.length=0;document.getElementById('bPlay').click();return __falas.join(' | ');});
ok(/duas anilhas de 150 quilos na barra/.test(s),'voz: '+s.slice(0,90));
s=await p.evaluate(()=>document.getElementById('nSub')?document.getElementById('nSub').textContent:'');
console.log('    sub:',s);
await p.evaluate(()=>{document.getElementById('bParar')&&!document.getElementById('bParar').hidden&&document.getElementById('bParar').click();});await sleep(300);
// tamanhos reais máximos
await p.evaluate(()=>__corpo.setExercise('rosca'));await sleep(200);await mudarPeso(40);
const h40=await p.evaluate(()=>__corpo.pecas().halter);ok(h40.r<=0.075&&h40.L<=0.075,'halter de 40 kg não passa do tamanho real '+JSON.stringify(h40));
await p.evaluate(id=>__corpo.setExercise(id),anId);await sleep(200);await mudarPeso(100);
const a100=await p.evaluate(()=>__corpo.pecas().anilha);ok(a100.raio<=0.2,'anilha de 100 kg não passa do tamanho real (raio '+a100.raio+')');
await shot('peca_anilha100');
// miniaturas: peças no tamanho padrão, mesmo com o principal pesado; e o principal continua pesado
await p.evaluate(()=>__corpo.setExercise('rosca_barra'));await sleep(200);
await p.evaluate(()=>document.getElementById('bEscolher').click());await sleep(300);await p.evaluate(()=>document.getElementById('bTrAvulso').click());await sleep(300);
await p.evaluate(()=>document.getElementById('exGrupoBtn').click());await sleep(200);
await p.evaluate(()=>[...document.querySelectorAll('#exGrupoMenu .ddOp')].find(o=>o.dataset.k==='barra|inferior').click());await sleep(300);
await p.evaluate(()=>document.querySelector('#exModo [data-v=mini]').click());await sleep(3500);
await p.screenshot({path:'shots/peca_mini_barra.png'});
br=await p.evaluate(()=>__corpo.pecas().barra);ok(br.kg===150,'depois das miniaturas a barra principal continua com 150 kg');
await p.evaluate(()=>document.getElementById('exGrupoBtn').click());await sleep(200);
await p.evaluate(()=>[...document.querySelectorAll('#exGrupoMenu .ddOp')].find(o=>o.dataset.k==='anilha|superior').click());await sleep(3500);
await p.screenshot({path:'shots/peca_mini_anilha.png'});
const an2=await p.evaluate(()=>__corpo.pecas().anilha);ok(an2.kg===100||an2.kg===12,'anilha volta ao peso do principal: '+an2.kg);
// barra W também
await p.evaluate(()=>{document.getElementById('bParar')&&!document.getElementById('bParar').hidden&&document.getElementById('bParar').click();});await sleep(300);
console.log('erros',errs);if(errs.length)process.exitCode=1;await b.close();})().catch(e=>{console.error('EXC',e);process.exit(1);});
