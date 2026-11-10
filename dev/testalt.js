const puppeteer=require('puppeteer-core');const path=require('path');
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
await p.evaluate(()=>{localStorage.clear();__corpo.setExercise('afundo_frente');document.getElementById('bPlay').click();});
const out=[];for(let i=0;i<4;i++){await p.evaluate(()=>__corpo.avancar(1.5));const a=await p.evaluate(()=>({rep:__corpo.treino().rep,pes:__corpo.medir().pesY}));out.push(a.rep+':'+a.pes.map(x=>x[1]).join(','));await p.evaluate(()=>__corpo.avancar(1.5));}
console.log('meio de cada rep (bola do pé E,D):',out.join(' | '));console.log('erros',errs);await b.close();})();
