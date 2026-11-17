// v2.41.0: avisos sempre abaixam bem a música (0,12); a contagem só abaixa (0,3) se a opção estiver ligada;
// na troca de lado a música continua (bem baixa), não para
const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage();
await p.evaluateOnNewDocument(`window.__autoResposta="sim";window.__falas=[];window.__durFala=1500;
  try{localStorage.setItem('corpo3d.treino.v1@p1',JSON.stringify({reps:3,ciclos:2,descanso:5,voz:true,ritmo:0.5}));localStorage.setItem('corpo3d.musica.v1@p1',JSON.stringify({modo:'app',vol:0.7,abaixar:false}));}catch(e){}
  const sp=window.speechSynthesis;if(sp){sp.speak=function(u){window.__falas.push(u.text);window.__falando=u.text;setTimeout(()=>{try{u.onstart&&u.onstart();window.__iniciou=u.text;}catch(e){}},1);setTimeout(()=>{window.__falando=null;try{u.onend&&u.onend();u.dispatchEvent(new Event('end'))}catch(e){}},window.__durFala);};sp.cancel=function(){};}`);
await p.setViewport({width:390,height:844});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});await sleep(300);
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
// 1) níveis direto no módulo
let s=await p.evaluate(async()=>{Musica.desbloquear();Musica.configurar({abaixar:false});const r={};
  Musica.abaixar(true,false);r.contSem=Musica.estado().nivel;Musica.abaixar(false,false);
  Musica.configurar({abaixar:true});Musica.abaixar(true,false);r.contCom=Musica.estado().nivel;Musica.abaixar(false,false);
  Musica.configurar({abaixar:false});Musica.abaixar(true,true);r.aviso=Musica.estado().nivel;Musica.abaixar(true,false);r.ambos=Musica.estado().nivel;Musica.abaixar(false,true);r.sobra=Musica.estado().nivel;Musica.abaixar(false,false);r.fim=Musica.estado().nivel;return r;});
ok(s.contSem===1&&s.contCom===0.3&&s.aviso===0.12&&s.ambos===0.12&&s.sobra===1&&s.fim===1,'níveis: contagem sem opção=1, com opção=0,3, aviso=0,12 sempre '+JSON.stringify(s));
// 2) no treino: contagem não abaixa (opção desligada), aviso abaixa
await p.evaluate(()=>__corpo.setExercise('ostra'));await sleep(300);
await p.evaluate(()=>document.getElementById('bPlay').click());
// espera chegar ao treino (anúncio + "Começa!")
await p.waitForFunction(()=>__corpo.treino().estado==='treino',{timeout:20000});
s=await p.evaluate(()=>({m:Musica.estado()}));ok(s.m.tocando&&!s.m.pausado,'música tocando no treino ('+s.m.fonte+')');
// avança até a 1ª contagem e mede o nível enquanto fala o número
await p.evaluate(()=>{for(let i=0;i<400;i++){__corpo.avancar(0.05);if(window.__falando&&/^\d+$/.test(window.__falando))break;}});await p.waitForFunction(()=>window.__iniciou===window.__falando,{timeout:5000});
s=await p.evaluate(()=>({f:window.__falando,n:Musica.estado().nivel}));
ok(/^\d+$/.test(s.f||'')&&s.n===1,'contando "'+s.f+'" com a opção desligada: música no volume normal ('+s.n+')');
await sleep(700);
// troca de lado: estado preparo, música continua (não pausa) e bem baixa durante o aviso
await p.evaluate(()=>{for(let i=0;i<1200;i++){__corpo.avancar(0.05);if(__corpo.lado2())break;}});await p.waitForFunction(()=>window.__iniciou===window.__falando,{timeout:5000});await sleep(200);
s=await p.evaluate(()=>({e:__corpo.treino().estado,l2:__corpo.lado2(),f:window.__falando,m:Musica.estado()}));
ok(s.l2&&s.e==='preparo'&&/outro lado/.test(s.f||'')&&s.m.nivel===0.12&&s.m.tocando&&!s.m.pausado,'troca de lado: música continua e fica em 0,12 durante "'+s.f+'" '+JSON.stringify({e:s.e,toc:s.m.tocando,pau:s.m.pausado,n:s.m.nivel}));
await sleep(1800);
s=await p.evaluate(()=>({m:Musica.estado(),e:__corpo.treino().estado}));
ok(s.m.tocando&&!s.m.pausado,'depois do aviso a música segue tocando ('+s.e+', nível '+s.m.nivel+')');
// fim do ciclo: aviso da pausa abaixa bem
await p.waitForFunction(()=>__corpo.treino().estado==='treino',{timeout:20000});
await p.evaluate(()=>{for(let i=0;i<1200;i++){__corpo.avancar(0.05);if(window.__falando&&/Descanse/.test(window.__falando))break;}});await p.waitForFunction(()=>window.__iniciou===window.__falando,{timeout:5000});await sleep(200);
s=await p.evaluate(()=>({f:window.__falando,n:Musica.estado().nivel}));
ok(/Descanse/.test(s.f||'')&&s.n===0.12,'fim do ciclo: "'+(s.f||'').slice(0,40)+'" com a música em 0,12');
// opção ligada: contagem abaixa para 0,3
await p.evaluate(()=>Musica.configurar({abaixar:true}));
await p.waitForFunction(()=>{__corpo.avancar(0.05);return window.__falando&&/^\d+$/.test(window.__falando);},{polling:40,timeout:30000});await p.waitForFunction(()=>window.__iniciou===window.__falando,{timeout:5000});await sleep(200);
s=await p.evaluate(()=>({f:window.__falando,n:Musica.estado().nivel,e:__corpo.treino().estado}));
ok(/^\d+$/.test(s.f||'')&&s.n===0.3,'com a opção ligada, contagem "'+s.f+'" abaixa para 0,3 ('+s.e+')');
const rot=await p.evaluate(()=>document.querySelector('label[for=muAbaixar]').textContent);ok(/Abaixar também na contagem/.test(rot),'texto da opção: '+rot);
console.log('erros',errs);if(errs.length)process.exitCode=1;await b.close();})().catch(e=>{console.error('EXC',e);process.exit(1);});
