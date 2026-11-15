// Exercícios com garrafas (sentado, mãos apoiadas atrás): mãos fixas, tronco reage, pernas não atravessam garrafas,
// zigue-zague contorna (não passa por cima); ids juntados são trocados em treinos, favoritos e histórico
const puppeteer=require('puppeteer-core');const path=require('path');
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.evaluateOnNewDocument(()=>{if(sessionStorage.getItem('s'))return;sessionStorage.setItem('s','1');
  localStorage.setItem('corpo3d.treinos.v1@p1',JSON.stringify({v:1,lista:[{id:'t1',nome:'Core',trilha:'off',itens:[{ex:'twist_joelhos',reps:5,ciclos:1,descanso:10,pausaRep:0,ritmo:1,depois:10},{ex:'para_brisa_sentado',reps:5,ciclos:1,descanso:10,pausaRep:0,ritmo:1,depois:0}]}]}));
  localStorage.setItem('corpo3d.catalogo.v1@p1',JSON.stringify({grupo:'todos',modo:'lista',favs:['tesoura_sentado','chutes_garrafa','abre_fecha_ar'],soFav:false}));
  localStorage.setItem('anatomotion.historico.v1@p1',JSON.stringify({v:1,lista:[{id:'h1',ex:'twist_joelhos',nome:'Twist com joelhos flexionados',dia:'2026-11-14',inicio:1,fim:2,ativoSeg:60,ciclos:1,reps:5}]}));});
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const IDS=['ziguezague_garrafas','abre_fecha_garrafas','passagem_garrafa','chutes_garrafa'];
const r=await p.evaluate(IDS=>{const o={};for(const id of IDS){__corpo.setExercise(id);const alt=__corpo.exAtual().alt;let mx=0,base=null,tronco=0,o0=null,inv=0,porCima=false;
  for(const lado of alt?[0,1]:[0])for(let i=0;i<=40;i++){__corpo.posar(i/40,lado);const m=__corpo.maos();if(!base)base=m;for(let k=0;k<m.length;k++)mx=Math.max(mx,Math.hypot(m[k][0]-base[k][0],m[k][1]-base[k][1],m[k][2]-base[k][2]));
    const os=__corpo.rotOssos();if(!o0)o0=os;tronco=Math.max(tronco,...['spine','chest'].flatMap(k=>[0,1,2].map(j=>Math.abs(os[k][j]-o0[k][j]))));const g=__corpo.pernasGarrafas();inv=Math.max(inv,g.inv);porCima=porCima||g.porCima;}
  o[id]={maos:mx*1000,tronco,inv:inv*1000,porCima,ng:__corpo.garrafasPos().length};}return o;},IDS);
for(const id of IDS){const v=r[id];ok(v.maos<1,id+': mãos fixas no chão ('+v.maos.toFixed(1)+' mm)');ok(v.tronco>1,id+': tronco acompanha ('+v.tronco.toFixed(1)+'°)');ok(v.inv<1,id+': pernas não atravessam a garrafa ('+v.inv.toFixed(0)+' mm)');}
ok(!r.ziguezague_garrafas.porCima&&r.ziguezague_garrafas.ng===2,'zigue-zague contorna as 2 garrafas pela frente (não passa por cima)');
ok(r.abre_fecha_garrafas.porCima&&r.passagem_garrafa.porCima&&r.chutes_garrafa.porCima,'abre e fecha, twist e chutes passam por cima da garrafa');
const cat=await p.evaluate(()=>__corpo.catalogo().map(c=>c.id));
ok(!['abre_fecha_ar','para_brisa_sentado','tesoura_sentado','twist_joelhos'].some(i=>cat.includes(i)),'exercícios parecidos saíram do catálogo');
const mig=await p.evaluate(()=>({tr:JSON.parse(localStorage.getItem('corpo3d.treinos.v1@p1')).lista[0].itens.map(i=>i.ex).join(','),fav:__corpo.catalogo2().favs.join(','),h:JSON.stringify(__corpo.historico().map(r=>[r.ex,r.nome]))}));
ok(mig.tr==='passagem_garrafa,ziguezague_garrafas','treino montado: ids trocados ('+mig.tr+')');
ok(mig.fav==='chutes_garrafa,abre_fecha_garrafas','favoritos: trocados e sem repetição ('+mig.fav+')');
ok(mig.h==='[["passagem_garrafa","Twist com 1 garrafa"]]','histórico: id e nome trocados');
ok(errs.length===0,'sem erros '+errs.join('|'));await b.close();})();
