// v2.47.0: halteres e anilhas não entram no corpo (folga automática das mãos/peças)
const puppeteer=require('puppeteer-core');const path=require('path');
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],protocolTimeout:600000});const p=await b.newPage();await p.evaluateOnNewDocument('window.__semPreparo=true');await p.setViewport({width:390,height:844});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
const cat=await p.evaluate(()=>__corpo.catalogo().filter(c=>['halteres','anilha','barra'].includes(c.equip)));
const W={halteres:[4,40],anilha:[12,25],barra:[10,25]};
// tolerâncias (cm): corpo = coxas, tronco, cabeça; braço = antebraço/punho de quem segura
const TOL_CORPO={'stiff|4':1.5,'agachamento_sumo|4':2.1}, TOL_BRACO={'remada_alta|40':4.5,'triceps_frances|40':4.5};
let piorC=0,piorB=0,tempo=0,nt=0;
for(const c of cat)for(const kg of W[c.equip]){
 const r=await p.evaluate((id,tp,kg,alt)=>{__corpo.setExercise(id);let corpo=0,braco=0,ms=0,n=0;for(const l of alt?[0,1]:[0])for(let i=0;i<=8;i++){__corpo.posar(i/8,l);__corpo.pesoTeste(tp,kg);const t=performance.now();__corpo.posar(i/8,l);ms+=performance.now()-t;n++;const x=__corpo.invasao();if(!x)continue;for(const k in x)for(const o in x[k].ossos){const v=x[k].ossos[o]*100;if(/Arm/.test(o))braco=Math.max(braco,v);else corpo=Math.max(corpo,v);}}return {corpo,braco,ms:ms/n};},c.id,c.equip,kg,c.alt);
 const k=c.id+'|'+kg, tc=TOL_CORPO[k]||1.2, tb=TOL_BRACO[k]||2.6;
 if(r.corpo>tc||r.braco>tb)ok(false,`${c.id} ${kg} kg: corpo ${r.corpo.toFixed(1)} cm, braço ${r.braco.toFixed(1)} cm`);
 piorC=Math.max(piorC,r.corpo>tc?99:r.corpo);piorB=Math.max(piorB,r.braco);tempo=Math.max(tempo,r.ms);
}
ok(piorC<=2.1,'nenhuma peça entra no corpo além da tolerância ('+cat.length+' exercícios, peso padrão e máximo); pior '+piorC.toFixed(1)+' cm');
ok(piorB<=4.5,'encosto no punho/antebraço de quem segura: pior '+piorB.toFixed(1)+' cm');
ok(tempo<12,'custo por pose (pior exercício) '+tempo.toFixed(1)+' ms');
// halteres grandes na rosca: braços abrem (mãos mais longe do corpo que com halter leve)
const larg=await p.evaluate(()=>{__corpo.setExercise('rosca');const m=kg=>{__corpo.posar(0);__corpo.pesoTeste('halteres',kg);__corpo.posar(0);const h=__corpo.maos();return Math.abs(h[0][0]-h[2][0]);};return [m(4),m(40)];});
ok(larg[1]>larg[0]+0.03,'rosca: com 40 kg os braços abrem ('+larg.map(x=>x.toFixed(2)).join(' → ')+' m entre as mãos)');
console.log('erros',errs);if(errs.length)process.exitCode=1;await b.close();})().catch(e=>{console.error('EXC',e);process.exit(1);});
