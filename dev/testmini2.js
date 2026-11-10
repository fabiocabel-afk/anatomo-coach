// o corpo principal não é alterado pelas miniaturas
const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
for(const id of ['flexao','ponte','ziguezague_garrafas']){
 await p.evaluate(id=>__corpo.setExercise(id),id);await sleep(400);
 const antes=await p.evaluate(()=>{__corpo.posar(0.3,0);return JSON.stringify(__corpo.pontos())+JSON.stringify(__corpo.garrafasPos());});
 await p.evaluate(()=>{localStorage.setItem('corpo3d.catalogo.v1',JSON.stringify({grupo:'todos',modo:'mini'}));});
 await p.evaluate(()=>{document.getElementById('bEscolher').click();});await sleep(200);await p.evaluate(()=>document.getElementById('bTrAvulso').click());
 await p.evaluate(()=>{document.querySelector('#exModo [data-v=mini]').click();});
 for(let k=0;k<6;k++){await p.evaluate(k=>{document.getElementById('exList').scrollTop=k*700;},k);await sleep(700);}
 await p.evaluate(()=>document.getElementById('bExClose').click());await sleep(300);
 const depois=await p.evaluate(()=>{__corpo.posar(0.3,0);return JSON.stringify(__corpo.pontos())+JSON.stringify(__corpo.garrafasPos());});
 ok(antes===depois,id+': corpo principal igual depois de ver as miniaturas');
 await p.evaluate(()=>{__corpo.setExercise('repouso');});
}
console.log('erros',errs);await b.close();})();
