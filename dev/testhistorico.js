const puppeteer=require('puppeteer-core');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage();await p.setViewport({width:390,height:844});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.evaluateOnNewDocument(()=>{window.__falas=[];const ss={speaking:false,pending:false,_q:[],_tm:null,getVoices(){return []},addEventListener(){},removeEventListener(){},
 cancel(){clearTimeout(this._tm);const q=this._q;this._q=[];this._cur=null;for(const u of q)u.dispatchEvent(new Event('error'));this.speaking=false;},
 speak(u){this._q.push(u);if(!this.speaking)this._prox();},
 _prox(){const u=this._q[0];if(!u){this.speaking=false;return;}this.speaking=true;window.__falas.push(u.text);u.dispatchEvent(new Event('start'));this._cur=u;this._tm=setTimeout(()=>{this._q.shift();this._cur=null;this.speaking=false;u.dispatchEvent(new Event('end'));if(!this.speaking)this._prox();},u.text.length*12);}};
 Object.defineProperty(window,'speechSynthesis',{value:ss,configurable:true});});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const cl=async s=>{await p.evaluate(s=>document.querySelector(s).click(),s);await sleep(250);};
const est=()=>p.evaluate(()=>({e:__corpo.treino().estado,m:Musica.estado(),conc:!document.getElementById('concBox').hidden,tit:document.getElementById('concTit').textContent}));
await p.goto('http://localhost:8766/index.html');await p.waitForFunction('window.__corpo',{timeout:60000});
await p.evaluate(()=>{localStorage.setItem('corpo3d.treino.v1@p1',JSON.stringify({reps:2,ciclos:2,descanso:3,voz:true,ritmo:0.5,caneleira:1}));localStorage.setItem('corpo3d.musica.v1@p1',JSON.stringify({modo:'app',vol:0.5,abaixar:true}));});
await p.reload();await p.waitForFunction('window.__corpo',{timeout:60000});
await p.evaluate(()=>__corpo.setExercise('agachamento'));await sleep(500);
await p.evaluate(()=>document.getElementById('bPlay').click());
// música só depois do "Começa!"
const amostras=[];for(let i=0;i<80;i++){const x=await est();amostras.push(x);if(x.e==='treino'&&x.m.tocando&&!x.m.pausado)break;await sleep(100);}
const prep=amostras.filter(a=>a.e==='preparo');
ok(prep.length>2&&prep.every(a=>!a.m.tocando||a.m.pausado),'anunciando: música em silêncio ('+prep.length+' amostras)');
const t1=amostras[amostras.length-1];ok(t1.e==='treino'&&t1.m.tocando&&t1.m.tipo==='treino','depois do "Começa!" a música de treino toca');
// descanso: música de pausa; volta: silêncio até começar
await p.waitForFunction(()=>__corpo.treino().estado==='descanso',{timeout:30000});await sleep(400);
let x=await est();ok(x.m.tipo==='pausa'&&x.m.tocando,'descanso toca a música de pausa');
const a2=[];for(let i=0;i<120;i++){const y=await est();a2.push(y);if(y.e==='treino'&&y.m.tocando&&!y.m.pausado)break;await sleep(100);}
const prep2=a2.filter(a=>a.e==='preparo');ok(prep2.length>1&&prep2.every(a=>!a.m.tocando||a.m.pausado),'ciclo 2: espera o "Começa!" em silêncio');
ok(a2[a2.length-1].m.tipo==='treino','ciclo 2: música de treino volta depois do "Começa!"');
// pausa de ~2 s no meio (não conta no tempo)
await cl('#bParar');await sleep(2000);await cl('#bContinuar');
await p.waitForFunction(()=>__corpo.treino().estado==='fim',{timeout:30000});await sleep(300);
x=await est();ok(x.conc&&x.tit==='Você concluiu o exercício?','no fim pergunta se concluiu');
const falas=await p.evaluate(()=>window.__falas.join(' | '));ok(/Você concluiu o exercício\?/.test(falas)&&!/Treino concluído/.test(falas),'a voz pergunta em vez de afirmar');
await p.screenshot({path:'shots/hist_pergunta.png'});
await cl('#bConcNao');ok((await p.evaluate(()=>__corpo.historico().length))===0&&!(await est()).conc,'Não: não entra no histórico');
// de novo, agora Sim
await p.evaluate(()=>document.getElementById('bPlay').click());
await p.waitForFunction(()=>__corpo.treino().estado==='fim',{timeout:60000});await sleep(300);
await cl('#bConcSim');await sleep(300);
let h=await p.evaluate(()=>__corpo.historico());
ok(h.length===1&&h[0].ex==='agachamento'&&h[0].ciclos===2&&h[0].reps===2&&h[0].ritmo===0.5&&h[0].ritmoNome==='Turbo'&&h[0].fim>h[0].inicio&&h[0].ativoSeg>0&&/^\d{4}-\d\d-\d\d$/.test(h[0].dia),'Sim: registrado com data, ciclos, repetições, ritmo, início e fim '+JSON.stringify(h[0]));
// treino montado com 2 exercícios: lista para marcar
await p.evaluate(()=>{localStorage.setItem('corpo3d.treinos.v1@p1',JSON.stringify({v:1,lista:[{id:'x',nome:'Rápido',trilha:'off',itens:[{ex:'agachamento',reps:2,ciclos:1,descanso:5,pausaRep:0,ritmo:0.5,depois:2},{ex:'rosca',reps:2,ciclos:1,descanso:5,pausaRep:0,ritmo:0.5,depois:5}]}]}));});
await p.reload();await p.waitForFunction('window.__corpo',{timeout:60000});
await p.evaluate(()=>__corpo.executarTreino('x'));
await p.waitForFunction(()=>!document.getElementById('concBox').hidden,{timeout:90000});
x=await p.evaluate(()=>({e:__corpo.treino().estado,seq:__corpo.seq().idx,tit:document.getElementById('concTit').textContent,itens:[...document.querySelectorAll('#concLista .concIt b')].map(b=>b.textContent),sentado:__corpo.repouso(),resto:document.getElementById('rest').hidden}));
ok(x.e==='pergunta'&&x.seq===0&&x.tit==='Você concluiu o exercício?'&&x.itens.join()==='Agachamento livre'&&!x.sentado&&x.resto,'treino montado: pergunta no fim do 1º exercício, de pé, descanso ainda não começou '+JSON.stringify(x));
await p.screenshot({path:'shots/hist_lista.png'});
await sleep(1500);ok((await p.evaluate(()=>__corpo.treino().estado))==='pergunta','espera a resposta (não segue sozinho)');
await cl('#bConcSim');await sleep(400);
x=await p.evaluate(()=>({e:__corpo.treino().estado,h:__corpo.historico().length,sentado:__corpo.repouso(),f:window.__falas.slice(-1)[0]}));
ok(x.e==='descanso'&&x.h===2&&x.sentado&&/Registrado\. Descanse 2 segundos/.test(x.f),'Sim: registra na hora e só então começa o descanso '+JSON.stringify(x));
h=await p.evaluate(()=>__corpo.historico());ok(h[1].treino&&h[1].treino.nome==='Rápido'&&h[1].ex==='agachamento','registro com o nome do treino');
await p.waitForFunction(()=>!document.getElementById('concBox').hidden&&__corpo.treino().estado==='fim',{timeout:90000});
x=await p.evaluate(()=>({tit:document.getElementById('concTit').textContent,itens:[...document.querySelectorAll('#concLista .concIt b')].map(b=>b.textContent)}));
ok(x.itens.join()==='Rosca direta','último exercício: pergunta dele '+JSON.stringify(x));
await cl('#bConcNao');ok((await p.evaluate(()=>__corpo.historico().length))===2,'Não no último: não registra');
// interrompido no meio: o que já respondeu fica; encerrar com a pergunta aberta mantém a pergunta
await p.evaluate(()=>__corpo.executarTreino('x'));
await p.waitForFunction(()=>__corpo.treino().estado==='pergunta',{timeout:90000});await sleep(200);
await cl('#bParar');x=await p.evaluate(()=>({e:__corpo.treino().estado,conc:!document.getElementById('concBox').hidden,pausa:!document.getElementById('pausaBox').hidden}));
ok(x.e==='pausado'&&!x.conc&&x.pausa,'parar durante a pergunta mostra a janela de pausa');
await cl('#bEncerrar');await sleep(200);
x=await p.evaluate(()=>({seq:!!__corpo.seq(),conc:!document.getElementById('concBox').hidden,itens:[...document.querySelectorAll('#concLista .concIt b')].map(b=>b.textContent)}));
ok(!x.seq&&x.conc&&x.itens.join()==='Agachamento livre','encerrar com pergunta aberta: sai do treino mas ainda deixa registrar');
await cl('#bConcSim');await sleep(300);h=await p.evaluate(()=>__corpo.historico());ok(h.length===3&&!(await p.evaluate(()=>!!__corpo.seq())),'registrado sem voltar ao treino');
// tela de exercícios feitos
await cl('#bPerfil');await p.evaluate(()=>document.querySelector('#pfList .pfr.clic').click());await sleep(300);
x=await p.evaluate(()=>document.getElementById('pfList').textContent);ok(/Exercícios feitos\s*3/.test(x),'ver perfil: resumo de exercícios '+x.slice(0,120));
await p.evaluate(()=>[...document.querySelectorAll('#pfList button')].find(b=>/Exercícios feitos/.test(b.textContent)).click());await sleep(400);
x=await p.evaluate(()=>({barras:document.querySelectorAll('#grafHist .gBarra').length,linhas:document.querySelectorAll('#pfList table.tab tbody tr').length,dia:document.querySelector('.histDia').textContent}));
ok(x.barras===1&&x.linhas===3&&/^Hoje · 3 exercícios/.test(x.dia),'exercícios feitos: gráfico de barras e tabela '+JSON.stringify(x));
await p.evaluate(()=>{const r=document.querySelectorAll('#grafHist .gToque');r[r.length-1].dispatchEvent(new PointerEvent('pointerdown'));});await sleep(200);
x=await p.evaluate(()=>document.querySelector('#grafHist .gDica').textContent);ok(/3 exercícios/.test(x),'toque na barra mostra a dica: '+x);
await p.screenshot({path:'shots/hist_tela.png'});
await p.evaluate(()=>document.querySelector('#histDias [data-v="7"]').click());await sleep(200);
ok((await p.evaluate(()=>document.querySelectorAll('#grafHist .gToque').length))===7,'filtro de 7 dias');
console.log('erros',errs);if(errs.length)process.exitCode=1;await b.close();})().catch(e=>{console.error('EXC',e);process.exit(1);});
