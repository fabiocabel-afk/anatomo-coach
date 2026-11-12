const puppeteer=require('puppeteer-core');const path=require('path');
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
const ids=process.argv.slice(2).length?process.argv.slice(2):await p.evaluate(()=>__corpo.catalogo().filter(c=>c.equip==='barra').map(c=>c.id));
let ruins=0;
for(const id of ids){
  const r=await p.evaluate(id=>{__corpo.setExercise(id);const out=[];for(const l of [0,1])for(let i=0;i<=10;i++){__corpo.posar(i/10,l);const x=__corpo.barraNoCorpo();if(x&&Object.keys(x.dentro).length)out.push((l?'L':'')+(i/10)+':'+JSON.stringify(x.dentro)+' '+x.pior);if(!__corpo.exAtual().alt)break;}
    // repetir sem alt
    if(!__corpo.exAtual().alt){out.length=0;for(let i=0;i<=10;i++){__corpo.posar(i/10,0);const x=__corpo.barraNoCorpo();if(x&&Object.keys(x.dentro).length)out.push((i/10)+':'+JSON.stringify(x.dentro)+' '+x.pior);}}
    return out;},id);
  if(r.length)ruins++;
  console.log((r.length?'ATRAVESSA ':'ok        ')+id+(r.length?'\n   '+r.join('\n   '):''));
}
console.log('exercícios com barra atravessando:',ruins);await b.close();})();
