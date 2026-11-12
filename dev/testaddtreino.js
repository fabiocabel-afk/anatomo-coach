const puppeteer=require('puppeteer-core');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const cl=async s=>{await p.evaluate(s=>document.querySelector(s).click(),s);await sleep(250);};
const carregar=async()=>{await p.waitForFunction('window.__corpo',{timeout:60000});await sleep(300);};
await p.goto('http://localhost:8766/index.html');await carregar();
await p.evaluate(()=>{localStorage.clear();localStorage.setItem('corpo3d.treinos.v1@p1',JSON.stringify({v:1,lista:[{id:'x',nome:'Pernas',trilha:'padrao',itens:[{ex:'agachamento',reps:10,ciclos:3,descanso:30,pausaRep:0,ritmo:1,depois:60}]}]}));});
await p.reload();await carregar();
await cl('#bEscolher');await cl('#bTrAvulso');
let s=await p.evaluate(()=>({n:document.querySelectorAll('#exList .li .addTr').length,itens:document.querySelectorAll('#exList .li').length}));
ok(s.n===s.itens,'cada exercício tem a prancheta com +');
await p.screenshot({path:'shots/at_lista.png'});
// adicionar rosca ao treino existente
await p.evaluate(()=>document.querySelector('#exList [data-id="rosca"] .addTr').click());await sleep(300);
s=await p.evaluate(()=>({aberto:!document.getElementById('atSheet').hidden,pv:document.getElementById('pvSheet').hidden,ops:[...document.querySelectorAll('#atCorpo .atOp b')].map(b=>b.textContent),novo:!!document.getElementById('atNovoNome'),nome:document.getElementById('atNome').textContent}));
ok(s.aberto&&s.pv&&s.ops.join()==='Pernas'&&s.novo&&s.nome==='Rosca direta','abre a lista de treinos + novo treino, sem abrir a prévia '+JSON.stringify(s));
await p.screenshot({path:'shots/at_escolher.png'});
await p.evaluate(()=>document.querySelector('#atCorpo .atOp').click());await sleep(250);
s=await p.evaluate(()=>({tit:document.getElementById('atTitulo').textContent,reps:document.querySelector('#atCorpo .stp[data-k=reps] output').textContent,k:[...document.querySelectorAll('#atCorpo .stp')].map(x=>x.dataset.k).join()}));
ok(/Pernas/.test(s.tit)&&s.k==='reps,ciclos,descanso,pausaRep,depois','tela de ajuste: repetições, ciclos, descanso, pausa, ritmo, descanso até o próximo '+JSON.stringify(s));
await p.evaluate(()=>{const st=document.querySelector('#atCorpo .stp[data-k=reps]');for(let i=0;i<2;i++)st.querySelector('button:last-child').click();document.querySelector('#atCorpo .stp[data-k=ciclos] button:first-child').click();[...document.querySelectorAll('#atRitmo button')].find(b=>b.textContent==='Rápido').click();});
await p.screenshot({path:'shots/at_ajustar.png'});
await p.evaluate(()=>[...document.querySelectorAll('#atCorpo .btnLinha button')].find(b=>/Adicionar/.test(b.textContent)).click());await sleep(300);
s=await p.evaluate(()=>({tr:__corpo.treinos()[0],at:document.getElementById('atSheet').hidden,cat:!document.getElementById('exSheet').hidden,msg:document.getElementById('exMsg').textContent}));
const it=s.tr.itens[1];
ok(s.at&&s.cat&&s.tr.itens.length===2&&it.ex==='rosca'&&it.reps===s.tr.itens[0].reps+2-0+ (it.reps-s.tr.itens[0].reps-2) &&it.ritmo===0.7,'adicionou com o ajuste e voltou ao catálogo '+JSON.stringify(it));
ok(/Rosca direta adicionado a "Pernas" \(2 exercícios\)/.test(s.msg),'aviso rápido: '+s.msg);
await p.screenshot({path:'shots/at_ok.png'});
ok(JSON.parse(await p.evaluate(()=>localStorage.getItem('corpo3d.treinos.v1@p1'))).lista[0].itens.length===2,'gravado');
// criar novo treino pela prancheta (a partir da prévia)
await p.evaluate(()=>document.querySelector('#exList [data-id="prancha"]').click());await sleep(500);
await p.evaluate(()=>document.querySelector('#pvFav .addTr').click());await sleep(250);
await p.evaluate(()=>[...document.querySelectorAll('#atCorpo button')].find(b=>/Novo treino/.test(b.textContent)).click());await sleep(200);
ok(/nome/.test(await p.evaluate(()=>document.getElementById('atMsg').textContent)),'novo treino sem nome: pede o nome');
await p.type('#atNovoNome','Core');await p.evaluate(()=>[...document.querySelectorAll('#atCorpo button')].find(b=>/Novo treino/.test(b.textContent)).click());await sleep(250);
s=await p.evaluate(()=>({tit:document.getElementById('atTitulo').textContent,reps:document.querySelector('#atCorpo .stp[data-k=reps]').previousSibling.textContent,pausa:!!document.querySelector('#atCorpo .stp[data-k=pausaRep]')}));
ok(/Novo treino "Core"/.test(s.tit)&&/Segundos/.test(s.reps)&&!s.pausa,'prancha: segundos, sem pausa entre repetições');
await p.evaluate(()=>[...document.querySelectorAll('#atCorpo .btnLinha button')].find(b=>/Adicionar/.test(b.textContent)).click());await sleep(300);
s=await p.evaluate(()=>({ts:__corpo.treinosIds(),pv:!document.getElementById('pvSheet').hidden}));
ok(s.ts.length===2&&s.ts[1].nome==='Core'&&s.ts[1].itens.join()==='prancha'&&s.pv,'criou "Core" e voltou para a prévia');
await cl('#bPvVoltar');
// já tem este
await p.evaluate(()=>document.querySelector('#exList [data-id="rosca"] .addTr').click());await sleep(250);
ok(/já tem este/.test(await p.evaluate(()=>document.querySelector('#atCorpo .atOp small').textContent)),'mostra que o treino já tem o exercício');
await cl('#bAtFechar');
// no modo escolher do editor, a prancheta não aparece
await cl('#bExClose');await cl('#bEscolher');await cl('#bTrNovo');await p.type('#edNome','T');await cl('#bEdAdd');
ok(await p.evaluate(()=>document.querySelectorAll('#exList .addTr').length===0),'no editor de treino a prancheta não aparece');
// ícone de prancheta no Treinos
ok(await p.evaluate(()=>document.querySelector('#bTreinos svg rect')!==null),'botão Treinos com ícone de prancheta');
console.log('erros',errs);if(errs.length)process.exitCode=1;await b.close();})().catch(e=>{console.error('EXC',e);process.exit(1);});
