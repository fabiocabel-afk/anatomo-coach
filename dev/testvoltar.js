const puppeteer=require('puppeteer-core');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.evaluateOnNewDocument('window.__semPreparo=true;window.__autoResposta="nao"');await p.setViewport({width:390,height:844,deviceScaleFactor:2});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const cl=async s=>{await p.evaluate(s=>document.querySelector(s).click(),s);await sleep(250);};
const voltar=async()=>{await p.evaluate(()=>history.back());await sleep(400);};
const vis=id=>p.evaluate(id=>!document.getElementById(id).hidden,id);
await p.goto('http://localhost:8766/index.html');await p.waitForFunction('window.__corpo',{timeout:60000});await sleep(300);
// miniatura: prancheta no canto inferior esquerdo
await cl('#bEscolher');await cl('#bTrAvulso');await p.evaluate(()=>document.querySelector('#exModo [data-v=mini]').click());await sleep(500);
const pos=await p.evaluate(()=>{const c=document.querySelector('.gi canvas').getBoundingClientRect(),a=document.querySelector('.gi .addTr').getBoundingClientRect(),f=document.querySelector('.gi .fav').getBoundingClientRect();return {aBaixo:Math.round(c.bottom-a.bottom),aEsq:Math.round(a.left-c.left),fTopo:Math.round(f.top-c.top),fDir:Math.round(c.right-f.right)};});
ok(pos.aBaixo>=4&&pos.aBaixo<=12&&pos.aEsq>=4&&pos.aEsq<=12&&pos.fTopo<=12&&pos.fDir<=12,'prancheta no canto inferior esquerdo, estrela no superior direito '+JSON.stringify(pos));
await p.screenshot({path:'shots/voltar_mini.png'});
// voltar: prévia → catálogo → tela principal
await p.evaluate(()=>document.querySelector('#exList .gi').click());await sleep(500);
await voltar();ok(!(await vis('pvSheet'))&&(await vis('exSheet')),'voltar fecha a prévia e fica no catálogo');
await cl('#exGrupoBtn');await voltar();ok(!(await vis('exGrupoMenu'))&&(await vis('exSheet')),'voltar fecha a lista suspensa');
await voltar();ok(!(await vis('exSheet'))&&!(await vis('sairBox')),'voltar fecha o catálogo');
// perfil com subtelas
await cl('#bPerfil');await p.evaluate(()=>document.querySelector('#pfList .pfr.clic').click());await sleep(300);
await p.evaluate(()=>[...document.querySelectorAll('#pfList button')].find(b=>/Ver medidas/.test(b.textContent)).click());await sleep(300);
await voltar();let t=await p.evaluate(()=>document.getElementById('pfTitulo').textContent);ok(t==='Perfil','voltar: medidas → perfil');
await voltar();t=await p.evaluate(()=>document.getElementById('pfTitulo').textContent);ok(t==='Perfis','voltar: perfil → lista');
await voltar();ok(!(await vis('pfSheet')),'voltar fecha os perfis');
// treinando: voltar pausa
await p.evaluate(()=>__corpo.setExercise('agachamento'));await sleep(300);await cl('#bPlay');
await voltar();ok((await p.evaluate(()=>__corpo.treino().estado))==='pausado','treinando: voltar pausa o treino');
await cl('#bEncerrar');
// tela principal: pergunta se quer sair
await p.evaluate(()=>__corpo.setExercise('repouso'));await sleep(200);
await voltar();ok(await vis('sairBox'),'na tela principal: pergunta "Sair do AnatoMotion?"');
await p.screenshot({path:'shots/voltar_sair.png'});
await cl('#bFicar');ok(!(await vis('sairBox')),'Ficar fecha a pergunta');
await voltar();ok(await vis('sairBox'),'voltar de novo pergunta de novo (o passo foi guardado)');
await cl('#bFicar');
console.log('erros',errs);if(errs.length)process.exitCode=1;await b.close();})().catch(e=>{console.error('EXC',e);process.exit(1);});
