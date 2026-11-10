const puppeteer=require('puppeteer-core');const path=require('path');
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
for(const id of process.argv.slice(2)){
  const r=await p.evaluate(id=>{__corpo.setExercise(id);const gs=__corpo.garrafasPos();const out=[];
    for(const l of [0,1])for(let i=0;i<=20;i++){const ph=i/20;__corpo.posar(ph,l);const P=__corpo.pesPos();
      out.push(l+' '+ph.toFixed(2)+' '+P.map(q=>q.map(v=>v.toFixed(2)).join(',')).join(' | '));}
    return out.join('\n');},id);
  console.log(id+'\n'+r);}
await b.close();})();
