const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.evaluateOnNewDocument('window.__semPreparo=true');await p.setViewport({width:390,height:844});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const cl=async s=>{await p.evaluate(s=>document.querySelector(s).click(),s);await sleep(300);};
const st=()=>p.evaluate(()=>({e:__corpo.treino().estado,at:__corpo.atual(),seq:!!__corpo.seq(),parar:!document.getElementById('bParar').hidden,reset:!document.getElementById('bReset').hidden,caixa:!document.getElementById('pausaBox').hidden,info:document.getElementById('pausaInfo').textContent}));
await p.evaluate(()=>__corpo.setExercise('agachamento'));await sleep(300);
let s=await st();ok(!s.parar&&s.reset,'antes de iniciar: sem Parar');
await cl('#bPlay');s=await st();ok(s.e==='treino'&&s.parar&&!s.reset,'treinando: botão Parar visível');
await cl('#bParar');s=await st();ok(s.e==='pausado'&&s.caixa,'Parar pausa e mostra opções: '+s.info);
await p.screenshot({path:'shots/parar.png'});
await cl('#bContinuar');s=await st();ok(s.e==='treino'&&!s.caixa,'Continuar retoma');
await cl('#bParar');await p.click('#bPlay');await sleep(300);s=await st();ok(s.e==='treino','com a janela aberta, o play de baixo continua clicável (toque real)');
await cl('#bParar');await cl('#bEncerrar');s=await st();ok(s.e==='previa'&&s.at==='agachamento'&&!s.caixa&&!s.parar,'Encerrar (avulso) volta para a prévia');
await cl('#bPlay');await cl('#bParar');await cl('#bRecomecarEx');s=await st();ok(s.e==='treino'&&!s.caixa,'Recomeçar este exercício');
// descanso também
await p.evaluate(()=>{for(let i=0;i<800&&__corpo.treino().estado!=='descanso';i++)__corpo.avancar(0.05);});s=await st();ok(s.e==='descanso'&&s.parar,'no descanso também dá para parar');
await cl('#bParar');s=await st();ok(s.e==='pausado'&&s.caixa&&await p.evaluate(()=>document.getElementById('rest').hidden),'pausado no descanso: só a janela de pausa');
await cl('#bEncerrar');
// treino montado
await p.evaluate(()=>{localStorage.setItem('corpo3d.treinos.v1@p1',JSON.stringify({v:1,lista:[{id:'x',nome:'Pernas',trilha:'off',itens:[{ex:'agachamento',reps:5,ciclos:2,descanso:20,pausaRep:0,ritmo:1,depois:15},{ex:'prancha',reps:30,ciclos:1,descanso:10,pausaRep:0,ritmo:1,depois:60}]}]}));});
await p.reload();await p.waitForFunction('window.__corpo',{timeout:60000});
await p.evaluate(()=>__corpo.executarTreino('x'));await sleep(300);
await cl('#bParar');s=await st();ok(s.caixa&&/Pernas/.test(s.info),'treino montado: janela mostra o treino: '+s.info.replace(/\n/g,' / '));
await cl('#bEncerrar');s=await st();ok(!s.seq&&s.at==='repouso'&&!s.parar,'Encerrar treino montado volta ao descanso e sai do treino');
console.log('erros',errs);if(errs.length)process.exitCode=1;await b.close();})();
