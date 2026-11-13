// Reto do abdome em 3 porções: brilho conforme o foco do exercício, nomes e ficha
const puppeteer=require('puppeteer-core');const path=require('path');
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const nivel=async(ex,ph)=>p.evaluate((e,f)=>{__corpo.setExercise(e);__corpo.setPhase(f);const o={};for(const x of __corpo.porcoes('reto_abdome'))if(x.side==='left')o[x.reg]=+(x.pri+x.sec).toFixed(3);return o;},ex,ph);
let n=await nivel('abdominal',1);ok(n.sup>n.med&&n.med>n.inf&&n.inf>0,'crunch: superior > média > inferior (inferior ainda brilha) '+JSON.stringify(n));
ok(Math.abs(n.med/n.sup-0.65)<0.02&&Math.abs(n.inf/n.sup-0.4)<0.02,'níveis 100% / 65% / 40%');
n=await nivel('elevacao_pernas',1);ok(n.inf>n.med&&n.med>n.sup,'elevação de pernas: inferior > média > superior '+JSON.stringify(n));
n=await nivel('prancha',1);ok(n.med>n.sup&&Math.abs(n.sup-n.inf)<0.01,'prancha: média em foco '+JSON.stringify(n));
n=await nivel('abdominal_completo',1);ok(n.sup>=n.med&&n.med>n.inf,'abdominal completo: superior e média '+JSON.stringify(n));
n=await nivel('agachamento_goblet',1);ok(n.sup===n.med&&n.med===n.inf&&n.sup>0,'agachamento (só estabiliza): por igual '+JSON.stringify(n));
n=await nivel('rosca',1);ok(n.sup===0&&n.inf===0,'exercício sem abdome: apagado');
const tx=await p.evaluate(()=>{__corpo.setExercise('elevacao_pernas');return [...document.querySelectorAll('#mus .m')].map(x=>x.textContent).join('|');});
ok(/Abdômen \(inferior\)/.test(tx),'chip do exercício: '+tx);
// ficha ao tocar numa porção
const card=await p.evaluate(()=>{__corpo.setExercise('elevacao_pernas');const ids=__corpo.porcoes('reto_abdome');return null;});
const c2=await p.evaluate(()=>{document.querySelector('#mus .m').click();return {t:document.getElementById('mTec').textContent,r:document.getElementById('mRole').textContent,f:document.getElementById('mFun').textContent};});
ok(/Reto do abdome \(foco na porção inferior\)/.test(c2.t)&&/músculo só/.test(c2.f),'ficha pela lista: '+c2.t);
const c3=await p.evaluate(()=>__corpo.focarPorcao?__corpo.focarPorcao('sup'):null);
if(c3)ok(/porção superior/.test(c3.t)&&/exigência menor/.test(c3.r),'ficha ao tocar na porção superior: '+c3.t+' · '+c3.r);
ok(errs.length===0,'sem erros '+errs.join('|'));
await b.close();})();
