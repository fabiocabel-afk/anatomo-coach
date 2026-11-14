// Exercícios feitos: barras empilhadas (exercício + pausas programadas), filtro pelo dia tocado,
// sem X na lista; card do dia com detalhes e exclusão com confirmação; pausas reais registradas no treino
const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.evaluateOnNewDocument(()=>{
  if(sessionStorage.getItem('semeado'))return;sessionStorage.setItem('semeado','1');
  const z=n=>String(n).padStart(2,'0'),dia=d=>{const x=new Date();x.setDate(x.getDate()-d);return x.getFullYear()+'-'+z(x.getMonth()+1)+'-'+z(x.getDate());};
  const ts=(d,h,m)=>{const x=new Date();x.setDate(x.getDate()-d);x.setHours(h,m,0,0);return x.getTime();};
  const R=(id,d,h,m,ex,nome,ativo,desc,antes,tr,ses)=>({id,ex,nome,dia:dia(d),inicio:ts(d,h,m),fim:ts(d,h,m)+(ativo+desc)*1000,ativoSeg:ativo,descansoSeg:desc,pausaAntesSeg:antes,ciclos:3,reps:10,iso:false,ritmo:1,ritmoNome:'Normal',descanso:30,caneleira:0,lados:1,treino:tr,sessao:ses});
  const T={id:'t1',nome:'Pernas'};
  const l=[R('a1',0,8,0,'agachamento','Agachamento livre',300,60,0,T,'s1'),R('a2',0,8,7,'afundo','Afundo (parado)',240,60,45,T,'s1'),R('a3',0,8,14,'ponte','Ponte de glúteo',180,30,45,T,'s1'),
    R('b1',2,19,0,'abdominal','Abdominal (crunch)',200,40,0,null,null),
    {id:'c1',ex:'prancha',nome:'Prancha',dia:dia(4),inicio:ts(4,7,0),fim:ts(4,7,5),ativoSeg:290,ciclos:3,reps:30,iso:true,ritmo:1,ritmoNome:'Normal',descanso:20,caneleira:0,treino:null}];
  localStorage.setItem('anatomotion.historico.v1@p1',JSON.stringify({v:1,lista:l}));
});
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const cl=async s=>{await p.evaluate(s=>document.querySelector(s).click(),s);await sleep(300);};
await cl('#bPerfil');await p.evaluate(()=>document.querySelector('#pfList .pfr.clic').click());await sleep(300);
await p.evaluate(()=>[...document.querySelectorAll('#pfList button')].find(b=>/Exercícios feitos/.test(b.textContent)).click());await sleep(400);
let x=await p.evaluate(()=>({a:document.querySelectorAll('#grafHist .gBarra').length,b:document.querySelectorAll('#grafHist .gBarra2').length,leg:document.querySelector('.gLeg').innerText,
  dados:[...document.querySelectorAll('#pfList .pfDados > div')].map(d=>d.innerText.replace(/\n/g,' ')).join(' | '),x:document.querySelectorAll('#pfList table .ic').length,linhas:document.querySelectorAll('#pfList table tbody tr').length}));
ok(x.a===3&&x.b===2,'barras empilhadas: exercício (3 dias) + pausas (2 dias com pausa registrada) '+x.a+'/'+x.b);
ok(/Exercício/.test(x.leg)&&/Pausas programadas/.test(x.leg),'legenda das duas cores');
ok(/Pausas programadas 5 min/.test(x.dados)&&/Duração média/.test(x.dados),'resumo com pausas e duração média: '+x.dados);
ok(x.x===0&&x.linhas===5,'lista sem botão X ('+x.linhas+' linhas)');
// dica da barra de hoje
await p.evaluate(()=>{const r=document.querySelectorAll('#grafHist .gToque');r[r.length-1].dispatchEvent(new PointerEvent('pointerdown'));});await sleep(200);
x=await p.evaluate(()=>document.querySelector('#grafHist .gDica').innerText);ok(/3 exercícios/.test(x)&&/exercício 12 min · pausas 4 min/.test(x),'dica: '+x.replace(/\n/g,' / '));
await p.screenshot({path:'shots/hist2_tela.png'});
// tocar na barra filtra a tabela
await p.evaluate(()=>{const r=document.querySelectorAll('#grafHist .gToque');r[r.length-1].dispatchEvent(new MouseEvent('click',{bubbles:true}));});await sleep(300);
x=await p.evaluate(()=>({linhas:document.querySelectorAll('#pfList table tbody tr').length,dias:document.querySelectorAll('.histDia').length,f:(document.getElementById('histFiltro')||{}).innerText,dim:document.querySelectorAll('#grafHist .gDim').length}));
ok(x.linhas===3&&x.dias===1&&/Mostrando só/.test(x.f||'')&&x.dim===2,'tocar na barra: só aquele dia na tabela, outras barras apagadas '+JSON.stringify(x));
await p.screenshot({path:'shots/hist2_filtro.png'});
await p.evaluate(()=>[...document.querySelectorAll('#histFiltro button')][0].click());await sleep(300);
ok(await p.evaluate(()=>document.querySelectorAll('#pfList table tbody tr').length===5&&!document.getElementById('histFiltro')),'"Mostrar todos" volta a lista completa');
// tocar de novo na mesma barra também tira o filtro
await p.evaluate(()=>{const r=document.querySelectorAll('#grafHist .gToque');r[r.length-1].dispatchEvent(new MouseEvent('click',{bubbles:true}));});await sleep(250);
await p.evaluate(()=>{const r=document.querySelectorAll('#grafHist .gToque');r[r.length-1].dispatchEvent(new MouseEvent('click',{bubbles:true}));});await sleep(250);
ok(await p.evaluate(()=>!document.getElementById('histFiltro')),'tocar de novo na mesma barra mostra todos');
// barra de dia sem treino não filtra
await p.evaluate(()=>{const r=document.querySelectorAll('#grafHist .gToque');r[r.length-2].dispatchEvent(new MouseEvent('click',{bubbles:true}));});await sleep(250);
ok(await p.evaluate(()=>!document.getElementById('histFiltro')),'dia sem treino: não filtra');
// tocar numa linha abre o card do dia
await p.evaluate(()=>document.querySelector('#pfList table tbody tr[data-id="a2"]').click());await sleep(300);
x=await p.evaluate(()=>({vis:!document.getElementById('hdSheet').hidden,tit:document.getElementById('hdTitulo').textContent,n:document.querySelectorAll('#hdCorpo .hdItem').length,on:(document.querySelector('#hdCorpo .hdItem.on')||{dataset:{}}).dataset.id,txt:document.getElementById('hdCorpo').innerText}));
ok(x.vis&&/^Hoje/.test(x.tit)&&x.n===3&&x.on==='a2','tocar na linha abre o card do dia com o exercício aberto');
ok(/Descanso entre ciclos\s*1 min/.test(x.txt)&&/Descanso antes \(entre exercícios\)\s*45 s/.test(x.txt)&&/Total\s*16 min/.test(x.txt),'card mostra tempos e pausas');
await p.screenshot({path:'shots/hist2_card.png'});
// excluir pede confirmação; cancelar não apaga
await p.evaluate(()=>[...document.querySelectorAll('#hdCorpo button')].find(b=>b.textContent==='Excluir este exercício').click());await sleep(200);
x=await p.evaluate(()=>(document.querySelector('#hdCorpo .hdConf')||{}).innerText||'');ok(/Excluir "Afundo \(parado\)" das 08:07/.test(x)&&/não pode ser desfeito/.test(x),'pede confirmação: '+x.split('\n')[0]);
await p.screenshot({path:'shots/hist2_confirma.png'});
await p.evaluate(()=>[...document.querySelectorAll('#hdCorpo .hdConf button')].find(b=>b.textContent==='Cancelar').click());await sleep(200);
ok(await p.evaluate(()=>__corpo.historico().length===5&&!document.querySelector('#hdCorpo .hdConf')),'cancelar: nada é apagado');
// voltar do Android fecha a confirmação primeiro
await p.evaluate(()=>[...document.querySelectorAll('#hdCorpo button')].find(b=>b.textContent==='Excluir este exercício').click());await sleep(200);
await p.evaluate(()=>history.back());await sleep(400);
ok(await p.evaluate(()=>!document.getElementById('hdSheet').hidden&&!document.querySelector('#hdCorpo .hdConf')),'voltar do celular: fecha a confirmação, card continua');
// confirmar apaga só aquele
await p.evaluate(()=>[...document.querySelectorAll('#hdCorpo button')].find(b=>b.textContent==='Excluir este exercício').click());await sleep(200);
await p.evaluate(()=>[...document.querySelectorAll('#hdCorpo .hdConf button')].find(b=>b.textContent==='Sim, excluir').click());await sleep(300);
x=await p.evaluate(()=>({h:__corpo.historico().map(r=>r.id).join(','),n:document.querySelectorAll('#hdCorpo .hdItem').length,msg:document.getElementById('hdMsg').textContent,linhas:document.querySelectorAll('#pfList table tbody tr').length}));
ok(x.h==='a1,a3,b1,c1'&&x.n===2&&/excluído/.test(x.msg)&&x.linhas===4,'confirmado: apaga só aquele exercício, card e tabela atualizam '+JSON.stringify(x));
// excluir o treino inteiro
await p.evaluate(()=>document.querySelector('#hdCorpo .hdItem .hdTopo').click());await sleep(200);
x=await p.evaluate(()=>[...document.querySelectorAll('#hdCorpo .hdItem.on button')].map(b=>b.textContent).join('|'));ok(/Excluir o treino inteiro \(2\)/.test(x),'opção de excluir o treino inteiro: '+x);
await p.evaluate(()=>[...document.querySelectorAll('#hdCorpo button')].find(b=>/treino inteiro/.test(b.textContent)).click());await sleep(200);
x=await p.evaluate(()=>document.querySelector('#hdCorpo .hdConf').innerText);ok(/Excluir o treino "Pernas" deste dia, com os 2 exercícios/.test(x),'confirmação do treino inteiro');
await p.evaluate(()=>[...document.querySelectorAll('#hdCorpo .hdConf button')].find(b=>b.textContent==='Sim, excluir').click());await sleep(300);
x=await p.evaluate(()=>({h:__corpo.historico().map(r=>r.id).join(','),vis:!document.getElementById('hdSheet').hidden}));
ok(x.h==='b1,c1'&&!x.vis,'treino inteiro apagado; dia vazio fecha o card');
// registro antigo (sem pausas separadas) avisa no card
await p.evaluate(()=>document.querySelector('#pfList table tbody tr[data-id="c1"]').click());await sleep(300);
ok(/antes desta versão/.test(await p.evaluate(()=>document.getElementById('hdCorpo').innerText)),'registro antigo: aviso de que as pausas não estavam separadas');
await cl('#bHdClose');
// treino de verdade: mede o descanso entre ciclos e o descanso entre exercícios
const p2=await b.newPage();await p2.setViewport({width:390,height:844});p2.on('pageerror',e=>errs.push(e.message));
await p2.evaluateOnNewDocument(`window.__semPreparo=true;window.__autoResposta="sim";localStorage.clear();
  localStorage.setItem('corpo3d.treinos.v1@p1',JSON.stringify({v:1,lista:[{id:'tq',nome:'Rápido',trilha:'off',itens:[{ex:'agachamento',reps:2,ciclos:2,descanso:5,pausaRep:0,ritmo:0.5,depois:8},{ex:'abdominal',reps:2,ciclos:1,descanso:5,pausaRep:0,ritmo:0.5,depois:0}]}]}));`);
await p2.goto('file://'+path.resolve('dist/corpo3d.html'));await p2.waitForFunction('window.__corpo',{timeout:60000});
await p2.evaluate(()=>__corpo.executarTreino('tq'));
for(let k=0;k<40;k++){const e=await p2.evaluate(()=>{for(let i=0;i<400&&!['fim','pergunta'].includes(__corpo.treino().estado);i++)__corpo.avancar(0.05);if(!document.getElementById('concBox').hidden)document.getElementById('bConcSim').click();return __corpo.treino().estado;});if(e==='fim'&&await p2.evaluate(()=>document.getElementById('concBox').hidden))break;await sleep(150);}
const hh=await p2.evaluate(()=>__corpo.historico().map(r=>({ex:r.ex,at:r.ativoSeg,d:r.descansoSeg,a:r.pausaAntesSeg,s:!!r.sessao})));
console.log(JSON.stringify(hh));
const ag=hh.find(r=>r.ex==='agachamento'),ab=hh.find(r=>r.ex==='abdominal');
ok(ag&&Math.abs(ag.d-5)<=1&&ag.a===0&&ag.s,'descanso entre ciclos medido ('+(ag&&ag.d)+' s de 5)');
ok(ab&&Math.abs(ab.a-8)<=1&&ab.d===0,'descanso entre exercícios fica no exercício seguinte ('+(ab&&ab.a)+' s de 8)');
ok(errs.length===0,'sem erros '+errs.join('|'));
await b.close();})().catch(e=>{console.error('EXC',e);process.exit(1);});
