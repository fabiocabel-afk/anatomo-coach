const puppeteer=require('puppeteer-core');const path=require('path');const fs=require('fs');
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
fs.mkdirSync('shots/g',{recursive:true});
for(const id of ['ziguezague_garrafas','abre_fecha_garrafas','passagem_garrafa','chutes_garrafa']){
  await p.evaluate(id=>__corpo.setExercise(id),id);
  for(const [ph,l] of [[0,0],[0.5,0],[1,0],[1,1]]){
    await p.evaluate((ph,l)=>__corpo.setPhase(ph,l),ph,l);await new Promise(r=>setTimeout(r,350));
    const m=await p.evaluate(()=>{const o=__corpo.ossos(['leftFoot','rightFoot','hips']);return {pe:[o.leftFoot,o.rightFoot].map(v=>v.map(x=>+x.toFixed(2)).join(',')),pesY:__corpo.medir().pesY,hips:o.hips[1]}});
    console.log(id,ph,l,'tornozelos',m.pe.join(' | '),'quadril y',m.hips.toFixed(2),'pés min',Math.min(...m.pesY.flat()).toFixed(3));
    await (await p.$('#view')).screenshot({path:`shots/g/${id}_${ph}_${l}.png`});
  }}
console.log('erros',errs);await b.close();})();
