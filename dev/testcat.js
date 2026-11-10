const puppeteer=require('puppeteer-core');const path=require('path');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2});const errs=[];
p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
const cat=await p.evaluate(()=>__corpo.catalogo());
const cnt={};for(const c of cat){const k=c.equip+'/'+c.regiao;cnt[k]=(cnt[k]||0)+1;}
console.log('total',cat.length,JSON.stringify(cnt),'sem ficha',cat.filter(c=>!c.info).map(c=>c.id));
console.log('chips',await p.$$eval('#chips .chip',e=>e.map(x=>x.textContent)));
await p.click('#bGrupo');await sleep(300);
console.log('seções',await p.$$eval('#exList .lh',e=>e.map(x=>x.textContent)));
await p.screenshot({path:'shots/cat.png'});
await p.type('#exQ','gluteo');await sleep(200);
console.log('busca gluteo',(await p.$$eval('#exList .li b',e=>e.map(x=>x.firstChild.textContent))).length);
await p.$eval('#exQ',e=>{e.value='';e.dispatchEvent(new Event('input'))});
await p.type('#exQ','volante');await sleep(200);
await p.click('#exList .li');await sleep(600);
console.log('escolheu',await p.$eval('#nome',e=>e.textContent),'| chips',await p.$$eval('#chips .chip',e=>e.map(x=>x.textContent).join(' / ')));
await p.click('#bInfo');await sleep(300);
console.log('ficha',await p.$eval('#infoSheet',e=>!e.hidden),await p.$$eval('#infoBody .ih',e=>e.map(x=>x.textContent)));
await p.screenshot({path:'shots/info.png'});
await p.click('#infoMus .m');await sleep(800);
console.log('foco pela ficha',await p.evaluate(()=>__corpo.foco().k),'ficha fechada',await p.$eval('#infoSheet',e=>e.hidden));
// alternado: treino conta e alterna lados
await p.evaluate(()=>__corpo.setExercise('afundo_frente'));
console.log('erros',errs);await b.close();})();
