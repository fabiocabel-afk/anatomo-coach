const puppeteer=require('puppeteer-core');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const cl=async s=>{await p.evaluate(s=>document.querySelector(s).click(),s);await sleep(250);};
const carregar=async()=>{await p.waitForFunction('window.__corpo',{timeout:60000});await sleep(300);};
await p.goto('http://localhost:8766/index.html');await carregar();await p.evaluate(()=>localStorage.clear());await p.reload();await carregar();
const abrir=async()=>{await cl('#bEscolher');await cl('#bTrAvulso');};
await abrir();
let s=await p.evaluate(()=>({estrelas:document.querySelectorAll('#exList .li .fav').length,itens:document.querySelectorAll('#exList .li').length,topo:!!document.getElementById('bSoFav'),cor:getComputedStyle(document.querySelector('#exList .li .fav')).color}));
ok(s.estrelas===s.itens&&s.topo&&s.cor!=='rgb(225, 173, 1)','cada exercício tem estrela vazia e há o botão de favoritos no topo');
// favoritar 2 (sem abrir a prévia)
await p.evaluate(()=>{document.querySelector('#exList [data-id="agachamento"] .fav').click();document.querySelector('#exList [data-id="rosca"] .fav').click();});await sleep(300);
s=await p.evaluate(()=>({favs:__corpo.catalogo2().favs,pv:document.getElementById('pvSheet').hidden,cor:getComputedStyle(document.querySelector('#exList [data-id="rosca"] .fav')).color,fill:document.querySelector('#exList [data-id="rosca"] .fav path').getAttribute('fill')}));
ok(s.favs.join()==='agachamento,rosca'&&s.pv&&s.cor==='rgb(225, 173, 1)'&&s.fill==='currentColor','tocar na estrela favorita (mostarda, preenchida) sem abrir a prévia');
await p.screenshot({path:'shots/fav_lista.png'});
// só favoritos
await cl('#bSoFav');
s=await p.evaluate(()=>({ids:[...document.querySelectorAll('#exList [data-id]')].map(x=>x.dataset.id),on:document.getElementById('bSoFav').classList.contains('on'),txt:document.getElementById('exGrupoTxt').textContent}));
ok(s.on&&s.ids.sort().join()==='agachamento,rosca'&&/Favoritos \(2\)/.test(s.txt),'botão do topo mostarda mostra só os favoritos '+JSON.stringify(s));
await p.screenshot({path:'shots/fav_filtro.png'});
// desfavoritar dentro do filtro some da lista
await p.evaluate(()=>document.querySelector('#exList [data-id="rosca"] .fav').click());await sleep(300);
s=await p.evaluate(()=>[...document.querySelectorAll('#exList [data-id]')].map(x=>x.dataset.id));ok(s.join()==='agachamento','desfavoritar some da lista de favoritos');
// miniaturas também
await p.evaluate(()=>document.querySelector('#exModo [data-v=mini]').click());await sleep(500);
ok(await p.evaluate(()=>document.querySelectorAll('#exList .gi .fav.on').length===1),'miniaturas: estrela no canto, marcada');
await p.evaluate(()=>document.querySelector('#exModo [data-v=lista]').click());await sleep(200);
// desligar o filtro
await cl('#bSoFav');s=await p.evaluate(()=>({n:document.querySelectorAll('#exList [data-id]').length,on:document.getElementById('bSoFav').classList.contains('on')}));
ok(!s.on&&s.n>2,'tocar de novo desliga o filtro');
// prévia: estrela também
await p.evaluate(()=>document.querySelector('#exList [data-id="rosca"]').click());await sleep(500);
await p.evaluate(()=>document.querySelector('#pvFav .fav').click());await sleep(200);
ok((await p.evaluate(()=>__corpo.catalogo2().favs)).includes('rosca'),'favoritar pela prévia');
await cl('#bPvVoltar');
// vazio
await p.evaluate(()=>{document.querySelector('#exList [data-id="rosca"] .fav').click();document.querySelector('#exList [data-id="agachamento"] .fav').click();});await sleep(200);
await cl('#bSoFav');ok(/Nenhum favorito ainda/.test(await p.evaluate(()=>document.getElementById('exList').textContent)),'sem favoritos: orientação');
await cl('#bSoFav');await p.evaluate(()=>document.querySelector('#exList [data-id="prancha"] .fav').click());await sleep(200);await cl('#bExClose');
// por perfil
await p.reload();await carregar();ok((await p.evaluate(()=>__corpo.catalogo2().favs)).join()==='prancha','favorito continua após recarregar');
await cl('#bPerfil');await cl('#bPfNovo');await p.type('#pfNome','Ana');
await Promise.all([p.waitForNavigation({timeout:60000}),p.evaluate(()=>[...document.querySelectorAll('#pfList button')].find(b=>b.textContent==='Criar e entrar').click())]);await carregar();
ok((await p.evaluate(()=>__corpo.catalogo2().favs)).length===0,'outro perfil: favoritos próprios (vazio)');
console.log('erros',errs);if(errs.length)process.exitCode=1;await b.close();})().catch(e=>{console.error('EXC',e);process.exit(1);});
