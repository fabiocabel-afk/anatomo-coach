const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
// voz falsa: registra o que foi dito e termina depois de 25 ms por letra
await p.evaluateOnNewDocument(()=>{window.__falas=[];const ss={speaking:false,pending:false,paused:false,_q:[],_tm:null,getVoices(){return []},addEventListener(){},removeEventListener(){},
 cancel(){clearTimeout(this._tm);const q=this._q;this._q=[];for(const u of q){u.dispatchEvent(new Event('error'))}this.speaking=false;},
 speak(u){this._q.push(u);if(!this.speaking)this._prox();},
 _prox(){const u=this._q[0];if(!u){this.speaking=false;return;}this.speaking=true;window.__falas.push({t:performance.now(),txt:u.text});u.dispatchEvent(new Event('start'));this._cur=u;this._tm=setTimeout(()=>{this._q.shift();this._cur=null;this.speaking=false;u.dispatchEvent(new Event('end'));if(!this.speaking)this._prox();},u.text.length*(window.__msPorLetra===undefined?25:window.__msPorLetra));}};
 Object.defineProperty(window,'speechSynthesis',{value:ss,configurable:true});});
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
await p.evaluate(()=>{localStorage.setItem('corpo3d.treino.v1',JSON.stringify({reps:2,ciclos:2,descanso:5,voz:true,ritmo:1,caneleira:1}));});
await p.reload();await p.waitForFunction('window.__corpo',{timeout:60000});
await p.evaluate(()=>__corpo.setExercise('agachamento'));await sleep(800);
await p.evaluate(()=>{window.__falas=[];document.getElementById('bPlay').click();});
// amostra o estado enquanto anuncia
const am=[];for(let i=0;i<40;i++){am.push(await p.evaluate(()=>({e:__corpo.treino().estado,rep:__corpo.treino().rep,ph:__corpo.phase?__corpo.phase():null,sub:document.getElementById('nSub').textContent,f:window.__falas.map(f=>f.txt)})));if(am[am.length-1].e==='treino')break;await sleep(150);}
const prep=am.filter(a=>a.e==='preparo');
ok(prep.length>3,'fica em preparo enquanto anuncia ('+prep.length+' amostras) · '+prep[0].sub);
ok(prep.every(a=>a.rep===0),'nenhuma repetição contada durante o anúncio');
const falas=am[am.length-1].f;console.log('   falas:',JSON.stringify(falas));
ok(falas.length===2&&!/Vai/.test(falas.join())&&falas[falas.length-1]==='Começa!','anúncio sem "Vai" e termina com "Começa!"');
ok(am[am.length-1].e==='treino','depois do "Começa!" entra no treino');
const viraTreino=prep.filter(a=>a.f.includes('Começa!')).length;ok(viraTreino>=1,'"Começa!" é falado ainda parado e só depois conta');
await p.screenshot({path:'shots/preparo.png'});
// conta certo: 2 reps
const per=await p.evaluate(()=>__corpo.exAtual().periodo);
await p.waitForFunction(()=>__corpo.treino().rep>=1,{timeout:15000});
let f=await p.evaluate(()=>window.__falas.map(x=>x.txt));ok(f.includes('1'),'contou 1 depois de começar');
// descanso e ciclo 2
await p.waitForFunction(()=>__corpo.treino().estado==='descanso',{timeout:20000});
await p.evaluate(()=>{window.__falas=[];document.getElementById('bSkip').click();});await sleep(200);
let s=await p.evaluate(()=>({e:__corpo.treino().estado,c:__corpo.treino().ciclo,f:window.__falas.map(x=>x.txt)}));
ok(s.e==='preparo'&&s.c===2&&/Ciclo 2 de 2/.test(s.f.join()),'ciclo 2 também espera o anúncio '+JSON.stringify(s));
// pausar durante o preparo e continuar
await p.evaluate(()=>document.getElementById('bPlay').click());await sleep(300);
s=await p.evaluate(()=>({e:__corpo.treino().estado,lbl:document.getElementById('bPlay').getAttribute('aria-label')}));ok(s.e==='pausado','pausar no preparo');
await sleep(1500);s=await p.evaluate(()=>__corpo.treino().estado);ok(s==='pausado','pausado não começa sozinho');
await p.evaluate(()=>{window.__falas=[];document.getElementById('bPlay').click();});
await p.waitForFunction(()=>__corpo.treino().estado==='treino',{timeout:8000});
f=await p.evaluate(()=>window.__falas.map(x=>x.txt));ok(f[0]==='Começa!','continuar fala "Começa!" e inicia');
// fim do ciclo: continua de pé até terminar de avisar, só depois senta
await p.evaluate(()=>{document.getElementById('bReset').click();});await sleep(300);
await p.evaluate(()=>{window.__msPorLetra=40;});
await p.evaluate(()=>{const c=JSON.parse(localStorage.getItem('corpo3d.treino.v1'));});
await p.evaluate(()=>document.getElementById('bPlay').click());
await p.waitForFunction(()=>__corpo.treino().estado==='treino',{timeout:15000});
await p.waitForFunction(()=>__corpo.treino().estado!=='treino',{timeout:20000});
const fimCiclo=[];for(let i=0;i<40;i++){const x=await p.evaluate(()=>({e:__corpo.treino().estado,rep:__corpo.repouso(),f:window.__falas.slice(-1)[0].txt,falando:speechSynthesis.speaking}));fimCiclo.push(x);if(x.e==='descanso')break;await sleep(100);}
const conc=fimCiclo.filter(x=>x.e==='concluindo');
ok(conc.length>2&&conc.every(x=>!x.rep),'fim do ciclo: fica de pé ('+conc.length+' amostras) enquanto fala "'+conc[0].f+'"');
const sentou=fimCiclo.find(x=>x.e==='descanso');ok(sentou&&sentou.rep&&!sentou.falando,'só senta para descansar depois que a fala terminou');
// celular que avisa 'terminou' na hora (sem falar de verdade): mesmo assim espera o tempo do texto
await p.evaluate(()=>{document.getElementById('bReset').click();});await sleep(300);
await p.evaluate(()=>{window.__msPorLetra=0;window.__falas=[];});
const t1=Date.now();await p.evaluate(()=>document.getElementById('bPlay').click());
await p.waitForFunction(()=>__corpo.treino().estado==='treino',{timeout:15000});const d1=(Date.now()-t1)/1000;
const txt1=await p.evaluate(()=>window.__falas[0].txt);const minimo=txt1.length*0.07*0.75;
ok(d1>=minimo,'aviso de fim adiantado não faz começar antes ('+d1.toFixed(1)+' s ≥ '+minimo.toFixed(1)+' s)');
await p.evaluate(()=>{window.__msPorLetra=25;});
// sem voz: espera por tempo
await p.evaluate(()=>{document.getElementById('bReset').click();});
await p.evaluate(()=>{localStorage.setItem('corpo3d.treino.v1',JSON.stringify({reps:2,ciclos:1,descanso:5,voz:false,ritmo:1,caneleira:1}));});
await p.reload();await p.waitForFunction('window.__corpo',{timeout:60000});
await p.evaluate(()=>__corpo.setExercise('agachamento'));await sleep(500);
const t0=Date.now();await p.evaluate(()=>document.getElementById('bPlay').click());await sleep(300);
ok(await p.evaluate(()=>__corpo.treino().estado==='preparo'),'sem voz também prepara');
await p.waitForFunction(()=>__corpo.treino().estado==='treino',{timeout:10000});const dt=(Date.now()-t0)/1000;
ok(dt>2&&dt<15,'sem voz começa sozinho após ~3 s de animação ('+dt.toFixed(1)+' s reais no navegador de teste, que é lento)');
console.log('erros',errs);if(errs.length)process.exitCode=1;await b.close();})();
