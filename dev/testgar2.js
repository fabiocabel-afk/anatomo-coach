const puppeteer=require('puppeteer-core');const path=require('path');
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--window-size=420,800']});
const p=await b.newPage();await p.setViewport({width:420,height:800});await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
for(const id of ['ziguezague_garrafas','abre_fecha_garrafas','passagem_garrafa','chutes_garrafa']){
 await p.evaluate(id=>__corpo.setExercise(id),id);await new Promise(r=>setTimeout(r,1500));
 for(const ph of [0,0.25,0.5,0.75,1]){await p.evaluate(ph=>__corpo.posar(ph,0),ph);await new Promise(r=>setTimeout(r,300));
  await (await p.$('#view')).screenshot({path:`shots/g2/${id}_${ph}.png`});}}
await b.close();})();
