// Depois de responder "Você concluiu?": chão → senta (repouso); em pé → fica em pé, braços para baixo, sem pesos; play repete
const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.evaluateOnNewDocument(`window.__semPreparo=true;try{localStorage.setItem('corpo3d.treino.v1@p1',JSON.stringify({reps:2,ciclos:1,descanso:5,voz:false,ritmo:0.5,caneleira:1}));}catch(e){}`);
await p.setViewport({width:390,height:844});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const terminar=id=>p.evaluate(id=>{__corpo.setExercise(id);document.getElementById('bPlay').click();for(let i=0;i<3000&&__corpo.treino().estado!=='fim';i++)__corpo.avancar(0.05);return __corpo.treino().estado;},id);
const est=()=>p.evaluate(()=>({e:__corpo.treino().estado,pos:__corpo.posFim(),rep:__corpo.repouso(),at:__corpo.atual(),nome:document.getElementById('nome').textContent,conc:!document.getElementById('concBox').hidden,
  pes:__corpo.pesPos().map(v=>+v[1].toFixed(3)),halt:__corpo.props?__corpo.props():null}));
// em pé com halteres
let e=await terminar('rosca_alternada');let s=await est();ok(e==='fim'&&s.conc&&!s.pos,'fim: pergunta aberta, ainda na posição do exercício');
await p.evaluate(()=>document.getElementById('bConcSim').click());await sleep(1600);
s=await est();ok(s.pos==='pe'&&!s.rep&&s.at==='rosca_alternada','exercício em pé: fica em pé parado, exercício continua selecionado');
ok(Math.min(...s.pes)>-0.01&&Math.min(...s.pes)<0.03,'pés no chão '+s.pes);
const vis=await p.evaluate(()=>__corpo.visiveis?__corpo.visiveis():null);
await p.screenshot({path:'shots/fim_pe.png'});
// play repete
await p.evaluate(()=>document.getElementById('bPlay').click());await sleep(300);
s=await est();ok(s.e==='treino'&&!s.pos,'play: executa de novo');
// chão
e=await terminar('prancha_lateral');await p.evaluate(()=>document.getElementById('bConcNao').click());await sleep(1600);
s=await est();ok(s.pos==='sentado'&&s.rep&&s.at==='prancha_lateral'&&/Prancha lateral/.test(s.nome),'exercício de chão: vai para o repouso sentado, exercício continua selecionado ('+s.nome+')');
await p.screenshot({path:'shots/fim_chao.png'});
// mãos no chão (pitch auto)
e=await terminar('flexao');await p.evaluate(()=>document.getElementById('bConcSim').click());await sleep(800);
s=await est();ok(s.pos==='sentado','flexão: repouso sentado');
await p.evaluate(()=>document.getElementById('bPlay').click());await sleep(300);s=await est();ok(s.e==='treino'&&!s.rep,'play depois do repouso: volta ao exercício');
ok(errs.length===0,'sem erros '+errs.join('|'));
await b.close();})();
