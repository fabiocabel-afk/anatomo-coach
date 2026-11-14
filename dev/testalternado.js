// Exercícios alternados: uma repetição = um lado + o outro
const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.evaluateOnNewDocument(`window.__semPreparo=true;window.__autoResposta="nao";window.__falas=[];
  try{localStorage.setItem('corpo3d.treino.v1@p1',JSON.stringify({reps:3,ciclos:1,descanso:5,voz:true,ritmo:1,caneleira:1}));}catch(e){}
  const sp=window.speechSynthesis;if(sp){sp.speak=function(u){window.__falas.push(u.text);setTimeout(()=>{try{u.dispatchEvent(new Event('end'))}catch(e){}},5);};}`);
await p.setViewport({width:390,height:844});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const rodar=id=>p.evaluate(id=>{window.__falas.length=0;__corpo.setExercise(id);document.getElementById('bPlay').click();
  const per=__corpo.exAtual().periodo;const lados=[];let ult=-1;
  for(let i=0;i<4000&&__corpo.treino().estado==='treino';i++){__corpo.avancar(0.05);const l=__corpo.treino().lado;const k=__corpo.treino().rep+':'+l;if(k!==ult){lados.push(k);ult=k;}}
  return {per,falas:window.__falas.slice(),lados,ini:window.__falas[0]};},id);
let r=await rodar('perdigueiro');
const nums=r.falas.filter(f=>/^\d+\.?/.test(f)).map(f=>f.match(/^\d+/)[0]);
ok(/3 repetições de cada lado/.test(r.ini),'anúncio: "3 repetições de cada lado"');
ok(nums.join(',')==='1,2,3','perdigueiro conta 1, 2, 3 (cada número depois dos dois lados): '+nums.join(','));
// cada repetição teve lado 0 e lado 1
const porRep={};for(const k of r.lados){const [rp,l]=k.split(':');(porRep[rp]=porRep[rp]||new Set()).add(l);}
ok([0,1,2].every(i=>porRep[i]&&porRep[i].has('0')&&porRep[i].has('1')),'cada repetição passa pelos dois lados '+JSON.stringify(r.lados));
r=await rodar('rosca_alternada');const n2=r.falas.filter(f=>/^\d+/.test(f)).map(f=>f.match(/^\d+/)[0]);ok(n2.join(',')==='1,2,3','rosca alternada também: '+n2.join(','));
r=await rodar('agachamento');const n3=r.falas.filter(f=>/^\d+/.test(f)).map(f=>f.match(/^\d+/)[0]);ok(n3.join(',')==='1,2,3'&&!/de cada lado/.test(r.ini),'exercício comum continua 1 por movimento');
ok(errs.length===0,'sem erros '+errs.join('|'));
await b.close();})();
