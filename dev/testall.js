const puppeteer=require('puppeteer-core');const path=require('path');const fs=require('fs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:1});const errs=[];
p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
const only=process.argv[2]?process.argv[2].split(','):null;
const ids=(await p.evaluate(()=>__corpo.exercicios)).filter(i=>!only||only.includes(i));
fs.mkdirSync('shots/all',{recursive:true});
const rows=[];
for(const id of ids){
  const alt=await p.evaluate(id=>{__corpo.setExercise(id);return !!__corpo.alt},id);
  for(const [ph,l] of [[0,0],[0.5,0],[1,0],[1,1]]){
    await p.evaluate((ph,l)=>__corpo.setPhase(ph,l),ph,l);await sleep(120);
    const m=await p.evaluate(()=>__corpo.medir());
    rows.push({id,ph,l,ik:+m.ikErro.toFixed(4),minFeet:+m.minFeet.toFixed(3),pesE:m.pesY[0].join('/'),pesD:m.pesY[1].join('/')});
    if(ph!==0.5&&!process.env.NOSHOT){await sleep(250);await (await p.$('#view')).screenshot({path:`shots/all/${id}_${ph}_${l}.png`});}
  }
}
console.table(rows);console.log('erros',errs);await b.close();})();
