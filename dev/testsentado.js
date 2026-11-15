// Sentado com mãos apoiadas atrás: tronco reage às pernas, mãos não escorregam, pés no ar nos exercícios sem garrafa
const puppeteer=require('puppeteer-core');const path=require('path');
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const r=await p.evaluate(()=>{const o={};for(const id of ['ziguezague_garrafas','abre_fecha_garrafas','passagem_garrafa','chutes_garrafa','abre_fecha_ar','para_brisa_sentado','tesoura_sentado','twist_joelhos']){__corpo.setExercise(id);let mx=0,base=null,minY=9,tronco=0,o0=null;for(let i=0;i<=20;i++){__corpo.posar(i/20,i%2);const m=__corpo.maos();if(!base)base=m;for(let k=0;k<m.length;k++)mx=Math.max(mx,Math.hypot(m[k][0]-base[k][0],m[k][1]-base[k][1],m[k][2]-base[k][2]));minY=Math.min(minY,...__corpo.pesPos().map(v=>v[1]));const os=__corpo.rotOssos();if(!o0)o0=os;tronco=Math.max(tronco,...['spine','chest'].flatMap(k=>[0,1,2].map(j=>Math.abs(os[k][j]-o0[k][j]))));}o[id]={maos:mx*1000,pes:minY,tronco};}return o;});
for(const [id,v] of Object.entries(r)){ok(v.maos<1,id+': mãos fixas no chão ('+v.maos.toFixed(1)+' mm)');ok(v.tronco>1,id+': tronco acompanha as pernas ('+v.tronco.toFixed(1)+'°)');}
for(const id of ['abre_fecha_ar','para_brisa_sentado','tesoura_sentado','twist_joelhos'])ok(r[id].pes>0.05,id+': pés sempre no ar ('+(r[id].pes*100).toFixed(0)+' cm)');
ok(errs.length===0,'sem erros '+errs.join('|'));await b.close();})();
