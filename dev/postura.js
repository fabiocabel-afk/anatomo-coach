const puppeteer=require('puppeteer-core');const path=require('path');
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
for(const id of process.argv[2].split(',')){const r=await p.evaluate(id=>{__corpo.setExercise(id,true);__corpo.posar(1,0);return __corpo.postura();},id);
 const z=k=>r[k][2];const calc=r.leftFoot[2], ponta=r.leftToes[2];
 console.log(id.padEnd(30),'cabeça z',z('head').toFixed(2),'joelho z',z('leftLowerLeg').toFixed(2),'quadril z',z('hips').toFixed(2),'tornozelo',calc.toFixed(2),'ponta',ponta.toFixed(2),'quadril y',r.hips[1].toFixed(2),'joelho y',r.leftLowerLeg[1].toFixed(2));}
await b.close();})();
