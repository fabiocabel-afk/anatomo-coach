// v2.43.0: no descanso entre exercícios de um treino, cartão com o movimento animado do próximo + nome + ajustes
const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.evaluateOnNewDocument(()=>{window.__semPreparo=true;window.__autoResposta='sim';window.__falas=[];Object.defineProperty(window,'speechSynthesis',{value:{speak:u=>__falas.push(u.text),cancel(){},getVoices:()=>[],addEventListener(){}}});window.SpeechSynthesisUtterance=function(t){this.text=t;this.addEventListener=function(){};};});
await p.setViewport({width:390,height:844,deviceScaleFactor:2});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
await p.evaluate(()=>{localStorage.clear();localStorage.setItem('corpo3d.treinos.v1@p1',JSON.stringify({v:1,lista:[{id:'t1',nome:'Teste',trilha:'nenhuma',itens:[
  {ex:'prancha',reps:3,ciclos:2,descanso:5,pausaRep:0,ritmo:1,depois:20},{ex:'rosca',reps:12,ciclos:3,descanso:30,pausaRep:0,ritmo:0.7,depois:60}]}]}));});
await p.reload();await p.waitForFunction('window.__corpo',{timeout:60000});await sleep(400);
await p.evaluate(()=>__corpo.executarTreino('t1'));await sleep(300);
// descanso entre ciclos do mesmo exercício: sem cartão
await p.evaluate(()=>{for(let i=0;i<2000&&__corpo.treino().estado!=='descanso';i++)__corpo.avancar(0.05);});await sleep(300);
let s=await p.evaluate(()=>({seq:__corpo.seq(),card:__corpo.proximoCard(),next:document.getElementById('restNext').textContent}));
ok(!s.seq.troca&&!s.card.vis&&/ciclo 2 de 2/.test(s.next),'descanso entre ciclos: sem cartão, mostra "Próximo: ciclo 2 de 2"');
// termina o 1º exercício → descanso até o próximo
await p.evaluate(()=>{for(let i=0;i<4000&&!(__corpo.seq()&&__corpo.seq().troca&&__corpo.treino().estado==='descanso');i++)__corpo.avancar(0.05);});await sleep(800);
s=await p.evaluate(()=>({seq:__corpo.seq(),card:__corpo.proximoCard(),nome:document.getElementById('restProxNome').textContent,sub:document.getElementById('restProxSub').textContent,next:document.getElementById('restNext').hidden,
  cv:(()=>{const c=document.getElementById('restCv');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let v=0;for(let i=0;i<d.length;i+=4*97)v=Math.max(v,d[i]+d[i+1]+d[i+2]);return {w:c.width,max:v,cssW:c.getBoundingClientRect().width};})(),atual:__corpo.atual()}));
ok(s.seq.troca&&s.card.vis&&s.card.ex==='rosca','descanso até o próximo: cartão com o próximo exercício (rosca) '+JSON.stringify(s.card));
ok(s.nome==='Rosca direta'&&/12 reps · 3 ciclos/.test(s.sub)&&s.next,'nome e ajustes do próximo; a linha antiga "Próximo:" some: '+s.sub);
ok(s.card.quadros>=1&&s.cv.max>200&&s.cv.cssW>=150,'movimento animado sendo desenhado ('+s.card.quadros+' quadros, canvas '+s.cv.w+'px)');
ok(s.atual==='prancha','o corpo principal continua o exercício atual (prancha) por trás');
await p.screenshot({path:'shots/proxcard.png'});
const q1=s.card.quadros;await sleep(600);const q2=await p.evaluate(()=>__corpo.proximoCard().quadros);
ok(q2>q1,'continua animando ('+q1+' → '+q2+')');
// pular o descanso: cartão some e começa o próximo
await p.evaluate(()=>document.getElementById('bSkip').click());await sleep(400);
s=await p.evaluate(()=>({card:__corpo.proximoCard(),atual:__corpo.atual()}));
ok(!s.card.vis&&s.card.ex===null&&s.atual==='rosca','pulou: cartão some e o próximo exercício começa');
// tema claro
await p.evaluate(()=>{document.body.classList.add('claro');});
console.log('erros',errs);if(errs.length)process.exitCode=1;await b.close();})().catch(e=>{console.error('EXC',e);process.exit(1);});
