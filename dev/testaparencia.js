// Aparência e acessibilidade: tema claro/escuro, legenda das falas, cápsula da data no histórico
const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.evaluateOnNewDocument(()=>{window.__semPreparo=true;window.__falas=[];const sp=window.speechSynthesis;if(sp){sp.speak=function(u){window.__falas.push(u.text);setTimeout(()=>{try{u.dispatchEvent(new Event('end'))}catch(e){}},300);};}
  if(!sessionStorage.getItem('s')){sessionStorage.setItem('s','1');localStorage.clear();
   localStorage.setItem('anatomotion.historico.v1@p1',JSON.stringify({v:1,lista:[{id:'a',ex:'agachamento',nome:'Agachamento livre',dia:(d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'))(new Date()),inicio:Date.now()-500000,fim:Date.now()-100000,ativoSeg:300,descansoSeg:60,pausaAntesSeg:0,ciclos:3,reps:10,ritmoNome:'Normal'}]}));}});
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
let x=await p.evaluate(()=>{document.getElementById('bCfg').click();return {claro:document.body.classList.contains('claro'),tema:[...document.querySelectorAll('#cTema button')].map(b=>b.textContent+(b.classList.contains('on')?'*':'')).join(','),leg:[...document.querySelectorAll('#cLeg button')].map(b=>b.textContent+(b.classList.contains('on')?'*':'')).join(','),meta:document.getElementById('metaTema').content};});
ok(!x.claro&&x.tema==='Escuro*,Claro'&&x.leg==='Desligada*,Ligada'&&x.meta==='#131016','padrão: tema escuro e legenda desligada');
// tema claro
await p.evaluate(()=>document.querySelector('#cTema [data-v="claro"]').click());await sleep(200);
x=await p.evaluate(()=>({claro:document.body.classList.contains('claro'),bg:getComputedStyle(document.body).backgroundColor,meta:document.getElementById('metaTema').content,salvo:JSON.parse(localStorage.getItem('anatomotion.camera.v1@p1')).tema}));
ok(x.claro&&x.bg==='rgb(244, 241, 247)'&&x.meta==='#F4F1F7'&&x.salvo==='claro','tema claro aplicado na hora e salvo no perfil');
// legenda desligada: nada aparece
await p.evaluate(()=>document.getElementById('bCfgClose').click());
await p.evaluate(()=>{__corpo.setExercise('agachamento');document.getElementById('bPlay').click();});await sleep(200);
ok(await p.evaluate(()=>document.getElementById('legenda').hidden),'legenda desligada: não aparece');
await p.evaluate(()=>document.getElementById('bReset')&&document.getElementById('bReset').click());await p.evaluate(()=>__corpo.setExercise('repouso'));
// liga a legenda
await p.evaluate(()=>{document.getElementById('bCfg').click();document.querySelector('#cLeg [data-v="sim"]').click();document.getElementById('bCfgClose').click();});
await p.reload();await p.waitForFunction('window.__corpo',{timeout:60000});await sleep(300);
ok(await p.evaluate(()=>document.body.classList.contains('claro')&&__corpo.legenda()===true),'depois de reabrir: continua claro e com legenda');
// com voz (falsa): mostra o texto falado e some pouco depois do fim da fala
await p.evaluate(()=>{__corpo.setExercise('agachamento');document.getElementById('bPlay').click();});await sleep(100);
x=await p.evaluate(()=>({vis:!document.getElementById('legenda').hidden,t:document.getElementById('legenda').textContent,f:window.__falas[window.__falas.length-1]}));
ok(x.vis&&x.t===x.f&&/Agachamento livre/.test(x.t),'mostra exatamente o que a voz fala: "'+x.t+'"');
const r=await p.evaluate(()=>{const el=document.getElementById('legenda').getBoundingClientRect(),c=document.getElementById('cont').getBoundingClientRect();return {acima:el.bottom<=c.top+1,dentro:el.left>=0&&el.right<=innerWidth};});
ok(r.acima&&r.dentro,'legenda fica logo acima do contador, dentro da tela');
await sleep(1600);ok(await p.evaluate(()=>document.getElementById('legenda').hidden),'some pouco depois de a fala terminar');
// contagem também vira legenda
await p.evaluate(()=>{for(let i=0;i<400&&__corpo.treino().rep<1;i++)__corpo.avancar(0.05);});await sleep(50);
x=await p.evaluate(()=>({vis:!document.getElementById('legenda').hidden,t:document.getElementById('legenda').textContent}));
ok(x.vis&&/^1\b/.test(x.t),'a contagem também aparece: "'+x.t+'"');
// voz desligada: a legenda continua aparecendo (para quem não ouve)
await p.evaluate(()=>{const c=JSON.parse(localStorage.getItem('corpo3d.treino.v1@p1')||'{}');c.voz=false;localStorage.setItem('corpo3d.treino.v1@p1',JSON.stringify(c));});
await p.reload();await p.waitForFunction('window.__corpo',{timeout:60000});await sleep(300);
await p.evaluate(()=>{window.__falas.length=0;__corpo.setExercise('rosca_alternada');document.getElementById('bPlay').click();});await sleep(100);
x=await p.evaluate(()=>({vis:!document.getElementById('legenda').hidden,t:document.getElementById('legenda').textContent,n:window.__falas.length}));
ok(x.vis&&/Rosca alternada/.test(x.t)&&x.n===0,'voz desligada: sem som, mas a legenda aparece');
await p.evaluate(()=>__corpo.setPhase(0));await sleep(6500);ok(await p.evaluate(()=>document.getElementById('legenda').hidden),'sem voz: some depois do tempo de leitura');
await p.screenshot({path:'shots/legenda_claro.png'});
// cápsula da data no histórico
await p.evaluate(()=>{document.getElementById('bPerfil').click();});await sleep(300);await p.evaluate(()=>document.querySelector('#pfList .pfr.clic').click());await sleep(300);
await p.evaluate(()=>[...document.querySelectorAll('#pfList button')].find(b=>/Exercícios feitos/.test(b.textContent)).click());await sleep(400);
x=await p.evaluate(()=>{const c=document.querySelector('.histDia .histData');const st=c&&getComputedStyle(c);return c&&{t:c.textContent,bg:st.backgroundColor,cor:st.color,info:document.querySelector('.histDia .histInfo').textContent};});
ok(x&&/^Hoje, \d\d\/\d\d$/.test(x.t)&&x.bg==='rgb(100, 42, 144)'&&x.cor==='rgb(255, 255, 255)','data em cápsula roxa com texto branco ('+(x&&x.t)+')');
ok(x&&/1 exercício · 5 min \+ 1 min de pausas/.test(x.info),'resumo do dia ao lado da cápsula');
// outro perfil começa no padrão
await p.evaluate(()=>{localStorage.setItem('anatomotion.perfis.v1',JSON.stringify({v:1,lista:[{id:'p1',nome:'Perfil 1',cor:'#642A90'},{id:'p2',nome:'Ana',cor:'#EC357D'}],atual:'p2'}));});
await p.reload();await p.waitForFunction('window.__corpo',{timeout:60000});
ok(await p.evaluate(()=>!document.body.classList.contains('claro')&&__corpo.legenda()===false),'outro perfil começa escuro e sem legenda');
ok(errs.length===0,'sem erros '+errs.join('|'));await b.close();})();
