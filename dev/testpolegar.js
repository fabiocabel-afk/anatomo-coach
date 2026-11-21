// v2.48.0: polegar fecha em volta da barra/cabo (oposição), ponta sobre o indicador, sem entrar na peça
const puppeteer=require('puppeteer-core');const path=require('path');
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage();await p.evaluateOnNewDocument('window.__semPreparo=true');
const errs=[];p.on('pageerror',e=>errs.push(e.message));const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
for(const id of ['rosca','rosca_martelo','desenvolvimento','rosca_barra','remada_barra','rosca_barra_w','agachamento_barra']){
 const r=await p.evaluate(id=>{__corpo.setExercise(id);const o=[];for(const f of [0,0.5,1]){__corpo.posar(f);o.push(__corpo.polegar());}return o;},id);
 const ind=Math.max(...r.map(x=>x.ateIndicador)), ex=Math.min(...r.map(x=>x.ateEixo==null?1:x.ateEixo));
 ok(ind<0.04&&ex>0.016,id+': ponta do polegar a '+(ind*100).toFixed(1)+' cm do indicador; mais perto do eixo da peça: '+(ex*100).toFixed(1)+' cm');
}
console.log('erros',errs);if(errs.length)process.exitCode=1;await b.close();})();
