// Garrafas continuam no lugar depois do descanso (pulando ou esperando) e depois do repouso do fim
const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.evaluateOnNewDocument(`window.__semPreparo=true;localStorage.setItem('corpo3d.treino.v1@p1',JSON.stringify({reps:1,ciclos:3,descanso:20,voz:false,ritmo:0.5,caneleira:1}));`);
await p.setViewport({width:390,height:844});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const g=()=>p.evaluate(()=>JSON.stringify(__corpo.garrafasPos().map(v=>v.map(x=>+x.toFixed(3)))));
for(const id of ['ziguezague_garrafas','passagem_garrafa']){
 await p.evaluate(id=>__corpo.setExercise(id),id);await sleep(200);const g0=await g();
 await p.evaluate(()=>{document.getElementById('bPlay').click();for(let i=0;i<3000&&__corpo.treino().estado!=='descanso';i++)__corpo.avancar(0.05);});await sleep(300);
 ok(await p.evaluate(()=>__corpo.treino().estado==='descanso'&&__corpo.garrafasPos().length===0),id+': no descanso (sentado) as garrafas saem');
 // pular o descanso
 await p.evaluate(()=>{document.getElementById('bSkip').click();});await sleep(500);
 let st=await p.evaluate(()=>__corpo.treino().estado);
 ok(st==='treino'&&(await g())===g0,id+': pulando o descanso as garrafas voltam no mesmo lugar ('+st+')');
 // descanso esperando até o fim
 await p.evaluate(()=>{for(let i=0;i<3000&&__corpo.treino().estado!=='descanso';i++)__corpo.avancar(0.05);for(let i=0;i<3000&&__corpo.treino().estado==='descanso';i++)__corpo.avancar(0.05);});await sleep(400);
 ok((await g())===g0,id+': esperando o descanso acabar as garrafas também voltam');
 await p.evaluate(()=>__corpo.setExercise('repouso'));
}
ok(errs.length===0,'sem erros '+errs.join('|'));await b.close();})();
