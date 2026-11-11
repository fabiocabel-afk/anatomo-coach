const puppeteer=require('puppeteer-core');const path=require('path');const fs=require('fs');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const dir='/tmp/prof_perfis';fs.rmSync(dir,{recursive:true,force:true});
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',userDataDir:dir,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage();await p.setViewport({width:390,height:844});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const cl=async s=>{await p.evaluate(s=>document.querySelector(s).click(),s);await sleep(250);};
const carregar=async()=>{await p.waitForFunction('window.__corpo',{timeout:60000});await sleep(300);};
// dados antigos (antes dos perfis) precisam ir para o Perfil 1
await p.goto('http://localhost:8766/index.html');await carregar();
await p.evaluate(()=>{localStorage.clear();localStorage.setItem('corpo3d.treino.v1',JSON.stringify({reps:15,ciclos:4,descanso:45,voz:true,ritmo:0.7,caneleira:1}));localStorage.setItem('corpo3d.treinos.v1',JSON.stringify({v:1,lista:[{id:'a',nome:'Antigo',trilha:'padrao',itens:[{ex:'agachamento',reps:5,ciclos:1,descanso:10,pausaRep:0,ritmo:1,depois:10}]}]}));});
await p.reload();await carregar();
let s=await p.evaluate(()=>({pf:__corpo.perfis(),cfg:__corpo.cfgAtual(),tr:__corpo.treinos().map(t=>t.nome),h1:document.querySelector('header h1').innerHTML,title:document.title,av:document.getElementById('bPerfil').textContent}));
ok(s.pf.lista.length===1&&s.pf.atual==='p1'&&s.cfg.reps===15&&s.cfg.ritmo===0.7&&s.tr[0]==='Antigo','dados de antes viram do Perfil 1 '+JSON.stringify(s.cfg));
ok(/Anato<b>Motion<\/b>/.test(s.h1)&&s.title==='AnatoMotion'&&s.av==='P','nome AnatoMotion e avatar');
const cores=await p.evaluate(()=>[getComputedStyle(document.querySelector('header h1')).color,getComputedStyle(document.querySelector('header h1 b')).color]);
ok(cores[0]==='rgb(255, 255, 255)'&&/157, 95, 224/.test(cores[1]),'Anato branco, Motion roxo '+cores.join(' / '));
await p.screenshot({path:'shots/perfil_header.png',clip:{x:0,y:0,width:390,height:110}});
// renomear perfil 1
await cl('#bPerfil');await p.evaluate(()=>document.querySelector('#pfList [aria-label^="Editar"]').click());await sleep(200);
await p.$eval('#pfNome',e=>{e.value='';});await p.type('#pfNome','Fabio');await p.evaluate(()=>[...document.querySelectorAll('#pfList button')].find(b=>b.textContent==='Salvar').click());await sleep(300);
s=await p.evaluate(()=>({nome:__corpo.perfis().lista[0].nome,av:document.getElementById('bPerfil').textContent}));ok(s.nome==='Fabio'&&s.av==='F','renomear perfil');
// novo perfil Ana (entra nele)
await cl('#bPfNovo');await p.type('#pfNome','Ana');await p.evaluate(()=>document.querySelectorAll('.pfCor')[1].click());
await p.screenshot({path:'shots/perfil_novo.png'});
await Promise.all([p.waitForNavigation({timeout:60000}),p.evaluate(()=>[...document.querySelectorAll('#pfList button')].find(b=>b.textContent==='Criar e entrar').click())]);await carregar();
s=await p.evaluate(()=>({pf:__corpo.perfis(),cfg:__corpo.cfgAtual(),tr:__corpo.treinos(),av:document.getElementById('bPerfil').textContent,bg:document.getElementById('bPerfil').style.background}));
ok(s.pf.lista.length===2&&s.pf.lista.find(x=>x.id===s.pf.atual).nome==='Ana'&&s.av==='A','entrou no perfil Ana');
ok(s.cfg.reps===10&&s.cfg.ritmo===1&&s.tr.length===0,'Ana começa do zero (ajustes padrão, sem treinos)');
// Ana muda ajustes, cria treino e escolhe Turbo + modo de música
await p.evaluate(()=>{document.getElementById('bCfg').click();});await sleep(200);
await p.evaluate(()=>{[...document.querySelectorAll('#cRitmo button')].find(b=>b.textContent==='Turbo').click();document.getElementById('bCfgSave').click();});await sleep(200);
await cl('#bEscolher');await cl('#bTrNovo');await p.type('#edNome','Treino da Ana');await cl('#bEdAdd');await p.type('#exQ','prancha');await sleep(300);
await p.evaluate(()=>document.querySelector('#exList [data-id]').click());await sleep(300);await cl('#bPvFazer');await cl('#bEdSave');
await cl('#bTrMusica');await p.evaluate(()=>[...document.querySelectorAll('#muModo button')].find(b=>b.dataset.v==='off').click());await sleep(200);
await p.$('#muFile_treino').then(i=>i.uploadFile('/tmp/aud/Treino 2.wav'));await p.waitForFunction(()=>document.querySelectorAll('#muL_treino .mur').length===1,{timeout:15000});
await cl('#bMuClose');await cl('#bTrClose');
s=await p.evaluate(()=>({cfg:__corpo.cfgAtual(),tr:__corpo.treinos().map(t=>t.nome)}));ok(s.cfg.ritmo===0.5&&s.tr[0]==='Treino da Ana','Ana: Turbo e treino próprio');
// volta para Fabio: tudo dele, sem nada da Ana
await cl('#bPerfil');
await Promise.all([p.waitForNavigation({timeout:60000}),p.evaluate(()=>[...document.querySelectorAll('#pfList button')].find(b=>b.textContent==='Entrar').click())]);await carregar();
s=await p.evaluate(async()=>({nome:__corpo.perfis().lista.find(x=>x.id===__corpo.perfis().atual).nome,cfg:__corpo.cfgAtual(),tr:__corpo.treinos().map(t=>t.nome),mus:(await Musica.listar()).length,mcfg:JSON.parse(localStorage.getItem('corpo3d.musica.v1@p1')||'{}')}));
ok(s.nome==='Fabio'&&s.cfg.reps===15&&s.cfg.ritmo===0.7&&s.tr.join()==='Antigo','Fabio mantém os dados dele '+JSON.stringify(s.cfg));
ok(s.mus===0&&s.mcfg.modo!=='off','músicas e trilha da Ana não aparecem para o Fabio');
// de volta à Ana: músicas dela continuam
await cl('#bPerfil');
await Promise.all([p.waitForNavigation({timeout:60000}),p.evaluate(()=>[...document.querySelectorAll('#pfList button')].find(b=>b.textContent==='Entrar').click())]);await carregar();
s=await p.evaluate(async()=>({mus:(await Musica.listar()).map(f=>f.nome),cfg:__corpo.cfgAtual()}));ok(s.mus.join()==='Treino 2'&&s.cfg.ritmo===0.5,'Ana: músicas e Turbo continuam');
const idAna=await p.evaluate(()=>__corpo.perfis().atual);
// Fabio apaga a Ana
await cl('#bPerfil');
await Promise.all([p.waitForNavigation({timeout:60000}),p.evaluate(()=>[...document.querySelectorAll('#pfList button')].find(b=>b.textContent==='Entrar').click())]);await carregar();
await cl('#bPerfil');
// apagar fica dentro do editar
await p.evaluate(()=>document.querySelectorAll('#pfList [aria-label^="Editar"]')[1].click());await sleep(200);
ok(await p.evaluate(()=>!!document.querySelector('.pfApagar')),'editar mostra "Apagar este perfil"');
await p.evaluate(()=>document.querySelector('.pfApagar').click());await sleep(150);
ok((await p.evaluate(()=>__corpo.perfis().lista.length))===2,'apagar pede um segundo toque');
await p.evaluate(()=>document.querySelector('.pfApagar').click());await sleep(1500);
s=await p.evaluate(async id=>{const d=await new Promise(r=>{const q=indexedDB.open('corpo3d',1);q.onsuccess=()=>r(q.result);});const todas=await new Promise(r=>{const q=d.transaction('faixas').objectStore('faixas').getAll();q.onsuccess=()=>r(q.result);});return {pf:__corpo.perfis().lista.length,chaves:Object.keys(localStorage).filter(k=>k.endsWith('@'+id)),faixas:todas.length,msg:document.getElementById('pfMsg').textContent};},idAna);
ok(s.pf===1&&s.chaves.length===0&&s.faixas===0,'apagar perfil remove os dados e músicas dele '+JSON.stringify(s));
// dados do corpo e histórico do peso
await cl('#bPerfil');await p.evaluate(()=>document.querySelector('#pfList [aria-label^="Editar"]').click());await sleep(200);
let r0=await p.evaluate(()=>({sexo:[...document.querySelectorAll('#pfSexo button')].map(b=>b.textContent+(b.classList.contains('on')?'*':'')).join(' '),idade:document.getElementById('pfIdade').value,hist:!!document.getElementById('pfHist')}));
ok(/Não informar\*/.test(r0.sexo)&&r0.idade===''&&!r0.hist,'sem dados: campos vazios e sem histórico');
await p.evaluate(()=>[...document.querySelectorAll('#pfSexo button')].find(b=>b.textContent==='Masculino').click());
await p.type('#pfIdade','41');await p.type('#pfAltura','1,78');await p.type('#pfPeso','84,6');
await p.evaluate(()=>[...document.querySelectorAll('#pfList button')].find(b=>b.textContent==='Salvar').click());await sleep(300);
let c=await p.evaluate(()=>__corpo.corpo());
ok(c.sexo==='M'&&c.idade===41&&c.altura===178&&c.medidas.peso.length===1&&c.medidas.peso[0].v===84.6,'salvou sexo, idade, altura (1,78 → 178 cm) e peso '+JSON.stringify(c));
const res=await p.evaluate(()=>document.querySelector('.pfr.atual small').textContent);ok(/Masculino · 41 anos · 1,78 m · 84,6 kg/.test(res),'resumo no perfil: '+res);
// mesmo dia: vale o último
await p.evaluate(()=>document.querySelector('#pfList [aria-label^="Editar"]').click());await sleep(200);
await p.$eval('#pfPeso',e=>{e.value='';});await p.type('#pfPeso','84,1');
await p.evaluate(()=>[...document.querySelectorAll('#pfList button')].find(b=>b.textContent==='Salvar').click());await sleep(300);
c=await p.evaluate(()=>__corpo.corpo());ok(c.medidas.peso.length===1&&c.medidas.peso[0].v===84.1,'mesmo dia: só um registro, vale o último (84,1)');
// dias anteriores (simulados) aparecem no histórico com a diferença
await p.evaluate(()=>{const k='anatomotion.corpo.v1@'+__corpo.perfis().atual;const o=JSON.parse(localStorage.getItem(k));o.medidas.peso.unshift({d:'2026-11-01',v:86,t:1},{d:'2026-11-05',v:85.2,t:2});localStorage.setItem(k,JSON.stringify(o));});
await p.evaluate(()=>document.querySelector('#pfList [aria-label^="Editar"]').click());await sleep(200);
const h=await p.evaluate(()=>[...document.querySelectorAll('#pfHist .pfHl')].map(l=>[...l.children].slice(0,3).map(x=>x.textContent).join(' ')));
ok(h.length===3&&/^Hoje 84,1 kg −1,1/.test(h[0])&&/05\/11\/2026 85,2 kg −0,8/.test(h[1])&&/01\/11\/2026 86 kg/.test(h[2]),'histórico do peso: '+JSON.stringify(h));
await p.screenshot({path:'shots/perfil_corpo.png'});
// apagar um registro
await p.evaluate(()=>document.querySelectorAll('#pfHist [aria-label^="Apagar registro"]')[1].click());await sleep(100);await p.evaluate(()=>document.querySelector('#pfHist .perigo').click());await sleep(200);
await p.evaluate(()=>[...document.querySelectorAll('#pfList button')].find(b=>b.textContent==='Salvar').click());await sleep(300);
c=await p.evaluate(()=>__corpo.corpo());ok(c.medidas.peso.map(r=>r.d).join()==='2026-11-01,'+c.medidas.peso[1].d&&c.medidas.peso.length===2,'apagar um registro do histórico');
// valor inválido não grava
await p.evaluate(()=>document.querySelector('#pfList [aria-label^="Editar"]').click());await sleep(200);
await p.$eval('#pfAltura',e=>{e.value='';});await p.type('#pfAltura','17');
await p.evaluate(()=>[...document.querySelectorAll('#pfList button')].find(b=>b.textContent==='Salvar').click());await sleep(200);
const m=await p.evaluate(()=>document.getElementById('pfMsg').textContent);ok(/Altura/.test(m)&&(await p.evaluate(()=>__corpo.corpo().altura))===178,'valor inválido avisa e não grava: '+m);
await p.evaluate(()=>[...document.querySelectorAll('#pfList button')].find(b=>b.textContent==='Cancelar').click());await sleep(200);
// apagar o único perfil: começa do zero
await p.evaluate(()=>document.querySelector('#pfList [aria-label^="Editar"]').click());await sleep(200);
await p.evaluate(()=>document.querySelector('.pfApagar').click());await sleep(150);
await Promise.all([p.waitForNavigation({timeout:60000}),p.evaluate(()=>document.querySelector('.pfApagar').click())]);await carregar();
s=await p.evaluate(()=>({pf:__corpo.perfis(),cfg:__corpo.cfgAtual(),tr:__corpo.treinos().length,corpo:__corpo.corpo()}));
ok(s.pf.lista.length===1&&s.pf.lista[0].nome==='Perfil 1'&&s.cfg.reps===10&&s.tr===0&&s.corpo.medidas.peso.length===0,'apagar o único perfil começa do zero');
console.log('erros',errs);if(errs.length)process.exitCode=1;await b.close();})().catch(e=>{console.error('EXC',e);process.exit(1);});
