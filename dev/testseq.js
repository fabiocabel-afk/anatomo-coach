const puppeteer=require('puppeteer-core');const fs=require('fs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const URL='http://localhost:8766/index.html';
(async()=>{
const dir='/tmp/prof_seq';fs.rmSync(dir,{recursive:true,force:true});
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',userDataDir:dir,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage();await p.evaluateOnNewDocument('window.__semPreparo=true');await p.setViewport({width:390,height:844,deviceScaleFactor:1});const errs=[];
p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));
await p.goto(URL);await p.waitForFunction('window.__corpo',{timeout:60000});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const esperar=async(fn,ms)=>{await p.waitForFunction(fn,{timeout:ms||8000,polling:100}).catch(()=>{});};
fs.mkdirSync('shots/seq',{recursive:true});
const shot=async n=>{await sleep(250);await p.screenshot({path:'shots/seq/'+n+'.png'});};
const click=async sel=>{await p.evaluate(sel=>document.querySelector(sel).click(),sel);await sleep(150);};
const clickTxt=async(sel,txt,exato)=>{const ok2=await p.evaluate((sel,txt,exato)=>{const e=[...document.querySelectorAll(sel)].find(x=>(exato?(x.querySelector('b')||x).firstChild.textContent.trim()===txt:x.textContent.trim().startsWith(txt))&&x.offsetParent);if(e){e.click();return true}return false},sel,txt,exato);if(!ok2)throw new Error('não achei '+sel+' '+txt);await sleep(150);if(sel.startsWith('#exList')){await p.evaluate(()=>document.getElementById('bPvFazer').click());await sleep(150);}};
// 1) lista vazia
await click('#bTreinos');ok(await p.$eval('#trList',e=>e.textContent.includes('Nenhum treino')),'lista vazia mostra orientação');await shot('1_vazio');
// 2) novo treino pela interface
await click('#bTrNovo');
await p.type('#edNome','Pernas e core');
await click('#bEdAdd');ok(await p.$eval('#exTit',e=>!e.hidden),'catálogo em modo escolha');
await p.type('#exQ','agachamento');await sleep(200);await clickTxt('#exList .li','Agachamento livre',true);
ok(await p.$eval('#exSheet',e=>e.hidden),'catálogo fechou após escolher');
// abre item 1 e ajusta: reps -> 3 (clicando menos), ciclos -> 2, descanso 5s, pausa 1s
const ajustar=async(k,alvo)=>{await p.evaluate((k,alvo)=>{for(let i=0;i<80;i++){const st=document.querySelector(`.edi.aberto .stp[data-k=${k}]`);const v=parseInt(st.querySelector('output').textContent);if(v===alvo)return;st.querySelector(v>alvo?'button:first-child':'button:last-child').click();}},k,alvo);};
await ajustar('reps',3);await ajustar('ciclos',2);await ajustar('descanso',5);await ajustar('pausaRep',1);
await shot('2_editor');
await click('#bEdAdd');await p.type('#exQ','prancha');await sleep(200);await clickTxt('#exList .li','Prancha',true);
await ajustar('reps',4);await ajustar('ciclos',1);
ok(!(await p.$('.edi.aberto .stp[data-k=pausaRep]')),'prancha (isometria) sem pausa entre repetições');
// terceiro: rosca
await click('#bEdAdd');await p.type('#exQ','rosca direta');await sleep(200);await clickTxt('#exList .li','Rosca direta',true);
await ajustar('reps',2);await ajustar('ciclos',1);
// volta ao item 2 para definir descanso até o próximo
await p.evaluate(()=>document.querySelectorAll('#edItens .edt')[1].click());await sleep(150);await ajustar('depois',5);
await p.evaluate(()=>document.querySelectorAll('#edItens .edt')[0].click());await sleep(150);await ajustar('depois',0);
await shot('3_editor3');
await click('#bEdSave');
let tr=await p.evaluate(()=>__corpo.treinos());
ok(tr.length===1&&tr[0].itens.length===3,'treino salvo com 3 exercícios');
ok(JSON.stringify(tr[0].itens.map(i=>[i.ex,i.reps,i.ciclos,i.descanso,i.pausaRep,i.depois]))==='[["agachamento",3,2,5,1,0],["prancha",4,1,30,0,5],["rosca",2,1,30,0,60]]',
  'valores gravados '+JSON.stringify(tr[0].itens.map(i=>[i.ex,i.reps,i.ciclos,i.descanso,i.pausaRep,i.depois])));
const ls=await p.evaluate(()=>JSON.parse(localStorage.getItem('corpo3d.treinos.v1')).lista.length);ok(ls===1,'gravado no armazenamento');
await shot('4_lista');
// 3) editar: troca nome e reordena, depois cancela outra edição
await clickTxt('#trList .ic','');
await p.evaluate(()=>document.querySelector('#trList [aria-label^="Editar"]').click());await sleep(150);
await p.$eval('#edNome',e=>{e.value='';});await p.type('#edNome','Pernas, core e braço');
await p.evaluate(()=>document.querySelectorAll('#edItens [aria-label="Descer"]')[1].click());await sleep(100); // prancha desce
await click('#bEdSave');
tr=await p.evaluate(()=>__corpo.treinos());
ok(tr[0].nome==='Pernas, core e braço'&&tr[0].itens.map(i=>i.ex).join()==='agachamento,rosca,prancha','edição salva (nome e ordem): '+tr[0].nome+' '+tr[0].itens.map(i=>i.ex));
await p.evaluate(()=>document.querySelector('#trList [aria-label^="Editar"]').click());await sleep(150);
await p.type('#edNome',' XX');await click('#bEdClose');ok(!(await p.$eval('#edSheet',e=>e.hidden)),'fechar com alteração pede confirmação');
await click('#bEdClose');ok(await p.$eval('#edSheet',e=>e.hidden),'segundo toque descarta');
tr=await p.evaluate(()=>__corpo.treinos());ok(tr[0].nome==='Pernas, core e braço','descartado não altera o salvo');
// volta a ordem original para o teste de execução
await p.evaluate(()=>document.querySelector('#trList [aria-label^="Editar"]').click());await sleep(150);
await p.evaluate(()=>document.querySelectorAll('#edItens [aria-label="Descer"]')[1].click());await sleep(100);await click('#bEdSave');
// duplicar e apagar
await p.evaluate(()=>document.querySelector('#trList [aria-label^="Duplicar"]').click());await sleep(150);
ok((await p.evaluate(()=>__corpo.treinos())).length===2,'duplicar');
await p.evaluate(()=>document.querySelectorAll('#trList [aria-label^="Apagar"]')[1].click());await sleep(100);
ok((await p.evaluate(()=>__corpo.treinos())).length===2,'apagar pede confirmação');
await p.evaluate(()=>document.querySelectorAll('#trList .trc')[1].querySelector('.perigo').click());await sleep(150);
ok((await p.evaluate(()=>__corpo.treinos())).length===1,'apagar no segundo toque');
// 4) persistência após recarregar
await p.reload();await p.waitForFunction('window.__corpo',{timeout:60000});
tr=await p.evaluate(()=>__corpo.treinos());ok(tr.length===1&&tr[0].itens.length===3,'treino continua após recarregar');
// 5) executar
await click('#bTreinos');await p.evaluate(()=>document.querySelector('#trList .trPlay').click());await sleep(400);
let s=await p.evaluate(()=>({seq:__corpo.seq(),tr:__corpo.treino(),at:__corpo.atual(),bar:!document.getElementById('seqBar').hidden,sub:document.getElementById('nSub').textContent}));
ok(s.seq&&s.seq.idx===0&&s.at==='agachamento'&&s.tr.estado==='treino'&&s.tr.cfg.reps===3&&s.bar,'iniciou exercício 1 com config do item '+JSON.stringify(s));
await sleep(600);let m=await p.evaluate(()=>__corpo.musica());ok(m.tocando&&m.fonte==='app'&&m.tipo==='treino','música do app tocando no treino '+JSON.stringify(m));
await shot('5_rodando');
// 1ª repetição -> pausa de 1 s
const per=await p.evaluate(()=>__corpo.exAtual().periodo);
s=await p.evaluate(()=>{for(let i=0;i<400&&__corpo.treino().rep<1;i++)__corpo.avancar(0.05);return {seq:__corpo.seq(),tr:__corpo.treino()};});ok(s.tr.rep===1&&s.seq.espera>0.5,'pausa entre repetições ativa '+JSON.stringify(s));
await p.evaluate(()=>__corpo.avancar(0.5));s=await p.evaluate(()=>__corpo.treino());ok(s.rep===1,'durante a pausa não conta');
s=await p.evaluate(()=>{for(let i=0;i<600&&__corpo.treino().estado==='treino';i++)__corpo.avancar(0.05);return {seq:__corpo.seq(),tr:__corpo.treino(),rest:!document.getElementById('rest').hidden};});
ok(s.tr.estado==='descanso'&&s.tr.ciclo===1&&!s.seq.troca&&s.rest,'descanso entre ciclos '+JSON.stringify(s.tr));
await sleep(500);m=await p.evaluate(()=>__corpo.musica());ok(m.tipo==='pausa'&&m.tocando,'música de pausa no descanso');
await p.evaluate(()=>__corpo.avancar(5.2));s=await p.evaluate(()=>__corpo.treino());ok(s.estado==='treino'&&s.ciclo===2,'ciclo 2');
s=await p.evaluate(()=>{for(let i=0;i<600&&__corpo.seq().idx===0;i++)__corpo.avancar(0.05);return {seq:__corpo.seq(),tr:__corpo.treino(),at:__corpo.atual()};});
ok(s.seq.idx===1&&s.at==='prancha'&&s.tr.estado==='treino'&&s.tr.cfg.reps===4,'depois=0: foi direto para o exercício 2 '+JSON.stringify(s));
s=await p.evaluate(()=>{for(let i=0;i<600&&__corpo.treino().estado==='treino';i++)__corpo.avancar(0.05);return {seq:__corpo.seq(),tr:__corpo.treino(),nx:document.getElementById('restNext').textContent};});
ok(s.tr.estado==='descanso'&&s.seq.troca&&/Rosca/.test(s.nx),'descanso até o próximo exercício: '+s.nx);
await shot('6_troca');
await p.evaluate(()=>__corpo.avancar(5.2));
s=await p.evaluate(()=>({seq:__corpo.seq(),tr:__corpo.treino(),at:__corpo.atual()}));
ok(s.seq.idx===2&&s.at==='rosca'&&s.tr.estado==='treino','exercício 3 (rosca)');
await p.evaluate(()=>{for(let i=0;i<600&&__corpo.treino().estado!=='fim';i++)__corpo.avancar(0.05);});
s=await p.evaluate(()=>({tr:__corpo.treino(),bot:document.querySelector('#bPlay').getAttribute('aria-label')}));
ok(s.tr.estado==='fim'&&s.bot==='Repetir','sequência concluída');
await sleep(700);m=await p.evaluate(()=>__corpo.musica());ok(!m.tocando,'música para no fim');
await shot('7_fim');
// sair da sequência
await click('#bSeqSair');await click('#bSeqSair');
s=await p.evaluate(()=>({seq:__corpo.seq(),rep:__corpo.repouso(),bar:document.getElementById('seqBar').hidden}));ok(!s.seq&&s.rep&&s.bar,'sair do treino');
// 6) músicas
await click('#bTreinos');await click('#bTrMusica');
const inp=await p.$('#muFile_treino');await inp.uploadFile('/tmp/aud/Minha_Musica_Treino_1.wav','/tmp/aud/Treino 2.wav','/tmp/aud/texto.txt');
await p.waitForFunction(()=>/guardad/.test(document.getElementById('muMsg').textContent),{timeout:10000});
console.log('   msg:',await p.$eval('#muMsg',e=>e.textContent));
const inp2=await p.$('#muFile_pausa');await inp2.uploadFile('/tmp/aud/Relax pausa.wav');
await p.waitForFunction(()=>document.querySelectorAll('#muL_pausa .mur').length===1,{timeout:10000});
let n=await p.evaluate(()=>[document.querySelectorAll('#muL_treino .mur').length,document.querySelectorAll('#muL_pausa .mur').length,document.getElementById('muN_treino').textContent]);
ok(n[0]===2&&n[1]===1,'2 músicas de treino e 1 de pausa guardadas (texto recusado) '+n);
await clickTxt('#muModo button','Minhas');
ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('corpo3d.musica.v1')).modo==='minhas'),'modo minhas gravado');
// renomear
await sleep(800);await p.evaluate(()=>document.querySelector('#muL_treino [aria-label^="Renomear"]').click());await sleep(100);
await p.$eval('.muRen',e=>{e.value='Aquecimento';});await p.focus('.muRen');await p.keyboard.press('Enter');await p.waitForFunction(()=>document.getElementById('muL_treino').textContent.includes('Aquecimento'),{timeout:8000}).catch(()=>{});
ok(await p.$eval('#muL_treino',e=>e.textContent.includes('Aquecimento')),'renomear música');
// prévia
await p.evaluate(()=>document.querySelector('#muL_treino .muPrev').click());await p.waitForFunction(()=>__corpo.musica().elTocando,{timeout:8000}).catch(()=>{});
m=await p.evaluate(()=>__corpo.musica());ok(m.fonte==='minhas'&&m.elTocando,'prévia da música do aparelho '+JSON.stringify(m));
await shot('8_musicas');
await click('#bMuClose');await esperar(()=>!__corpo.musica().tocando&&!__corpo.musica().elTocando);m=await p.evaluate(()=>__corpo.musica());ok(!m.tocando&&!m.elTocando,'fechar a tela para a prévia');
// recarrega e confere que as músicas continuam e tocam no treino
await p.reload();await p.waitForFunction('window.__corpo',{timeout:60000});
await click('#bTreinos');await p.evaluate(()=>document.querySelector('#trList .trPlay').click());await sleep(1200);
m=await p.evaluate(()=>__corpo.musica());ok(m.fonte==='minhas'&&m.tipo==='treino'&&m.elTocando,'após recarregar, treino toca minhas músicas: '+m.nome);
const nome1=m.nome;
// pausar e continuar
await click('#bPlay');await esperar(()=>__corpo.musica().pausado&&!__corpo.musica().elTocando);m=await p.evaluate(()=>__corpo.musica());ok(m.pausado&&!m.elTocando,'pausar treino pausa a música '+JSON.stringify(m));
await click('#bPlay');await esperar(()=>!__corpo.musica().pausado&&__corpo.musica().elTocando);m=await p.evaluate(()=>__corpo.musica());ok(!m.pausado&&m.elTocando,'continuar retoma');
// descanso -> pausa toca a lista de pausa
await p.evaluate(()=>{for(let i=0;i<600&&__corpo.treino().estado!=='descanso';i++)__corpo.avancar(0.05);});await esperar(()=>__corpo.musica().tipo==='pausa'&&__corpo.musica().elTocando);
m=await p.evaluate(()=>__corpo.musica());ok(m.tipo==='pausa'&&m.nome==='Relax pausa','descanso toca música de pausa: '+m.nome);
await p.evaluate(()=>__corpo.avancar(5.2));await esperar(()=>__corpo.musica().tipo==='treino'&&__corpo.musica().elTocando&&__corpo.musica().nome!=='Relax pausa',15000);
m=await p.evaluate(()=>__corpo.musica());ok(m.tipo==='treino'&&m.nome===nome1,'ciclo 2 continua a mesma música de treino: '+m.nome);
if(!(m.tipo==='treino'&&m.nome===nome1)){console.log(JSON.stringify(m),JSON.stringify(await p.evaluate(()=>__corpo.treino())));await sleep(5000);console.log(JSON.stringify(await p.evaluate(()=>__corpo.musica())));}
await p.evaluate(()=>{for(let i=0;i<600&&__corpo.seq().idx===0;i++)__corpo.avancar(0.05);});await p.waitForFunction(n=>__corpo.musica().tipo==='treino'&&__corpo.musica().elTocando&&__corpo.musica().nome!==n,{timeout:8000,polling:100},nome1).catch(()=>{});
m=await p.evaluate(()=>__corpo.musica());ok(m.tipo==='treino'&&m.nome!==nome1,'próximo exercício troca de música: '+m.nome);
// voz abaixa (só confere que a cadeia existe)
ok(typeof m.duck==='number','controle de volume da voz ativo');
// trilha "sem música" no treino
await click('#bSeqSair');await click('#bSeqSair');
await click('#bTreinos');await p.evaluate(()=>document.querySelector('#trList [aria-label^="Editar"]').click());await sleep(150);
await clickTxt('#edTrilha button','Sem');await click('#bEdSave');
await p.evaluate(()=>document.querySelector('#trList .trPlay').click());await sleep(800);
m=await p.evaluate(()=>__corpo.musica());ok(!m.tocando,'treino com "sem música" fica em silêncio');
// apagar música
await click('#bSeqSair');await click('#bSeqSair');
await click('#bTreinos');await click('#bTrMusica');await esperar(()=>document.querySelector('#muL_pausa [aria-label^="Apagar"]'));
await p.evaluate(()=>document.querySelector('#muL_pausa [aria-label^="Apagar"]').click());await sleep(100);
await p.evaluate(()=>document.querySelector('#muL_pausa .perigo').click());await esperar(()=>document.querySelectorAll('#muL_pausa .mur').length===0);
ok(await p.evaluate(()=>document.querySelectorAll('#muL_pausa .mur').length===0),'apagar música');
// escolha manual de exercício encerra a sequência
await click('#bMuClose');await click('#bTrClose');
await p.evaluate(()=>__corpo.executarTreino(__corpo.treinos()[0].id));await sleep(200);
await p.evaluate(()=>{const c=[...document.querySelectorAll('#chips .chip')].find(x=>!x.classList.contains('grp')&&!x.classList.contains('on'));c.click();});await sleep(300);
ok(!(await p.evaluate(()=>__corpo.seq())),'escolher outro exercício manualmente sai do treino');
// treino avulso continua usando a config geral
s=await p.evaluate(()=>__corpo.treino());ok(s.cfg.reps===10,'treino avulso usa a configuração geral');
console.log('erros',errs);if(errs.length)process.exitCode=1;
await b.close();})().catch(e=>{console.error('EXC',e);process.exit(1);});
