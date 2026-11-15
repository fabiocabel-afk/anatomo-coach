// Busca (lupa de músculos e busca de exercícios): com poucos resultados o painel não encolhe para baixo,
// e com o teclado aberto o painel cabe na área visível, com os resultados à vista
const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844});const errs=[];p.on('pageerror',e=>errs.push(e.message));
// teclado simulado: um visualViewport falso que a gente encolhe
await p.evaluateOnNewDocument(()=>{const vv=new EventTarget();vv.height=844;vv.offsetTop=0;vv.width=390;Object.defineProperty(window,'visualViewport',{value:vv,configurable:true});window.__teclado=h=>{vv.height=h;vv.dispatchEvent(new Event('resize'));};});
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
ok(await p.evaluate(()=>/interactive-widget=resizes-content/.test(document.querySelector('meta[name=viewport]').content)),'página pede para encolher quando o teclado abre');
for(const [abrir,inp,box,item] of [['bList','q','#sheet .box','#list > *'],['bTrAvulso','exQ','#exSheet .box','#exList .li']]){
  if(abrir==='bTrAvulso'){await p.evaluate(()=>{document.getElementById('sheet').hidden=true;document.getElementById('bEscolher').click();});await sleep(300);}
  await p.evaluate(a=>document.getElementById(a).click(),abrir);await sleep(400);
  const antes=await p.evaluate(s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,h:r.height};},box);
  await p.focus('#'+inp);await p.keyboard.type('gluteo medio',{delay:10});await sleep(400);
  const depois=await p.evaluate((s,it)=>{const r=document.querySelector(s).getBoundingClientRect();const n=document.querySelectorAll(it).length;return {top:r.top,h:r.height,n};},box,item);
  ok(depois.n>0&&Math.abs(depois.top-antes.top)<2&&Math.abs(depois.h-antes.h)<2,inp+': com poucos resultados ('+depois.n+') o painel não desce ('+Math.round(antes.top)+' → '+Math.round(depois.top)+')');
  await p.evaluate(()=>window.__teclado(440));await sleep(200);
  const tec=await p.evaluate((s,it)=>{const r=document.querySelector(s).getBoundingClientRect();const f=document.querySelector(it).getBoundingClientRect();const c=document.getElementById(document.activeElement.id).getBoundingClientRect();return {boxBottom:r.bottom,first:f.bottom,campo:c.bottom};},box,item);
  ok(tec.boxBottom<=441&&tec.first<=440&&tec.campo<=440,inp+': teclado aberto (sobram 440 px): campo e resultados acima do teclado '+JSON.stringify(tec));
  await p.screenshot({path:`shots/busca_teclado_${inp}.png`,clip:{x:0,y:0,width:390,height:440}});
  await p.evaluate(()=>window.__teclado(844));await sleep(200);
  ok(await p.evaluate(s=>Math.abs(document.querySelector(s).getBoundingClientRect().bottom-844)<2,box),inp+': teclado fechado, o painel volta ao normal');
  await p.evaluate(i=>{const e=document.getElementById(i);e.value='';e.dispatchEvent(new Event('input'));e.blur();},inp);
}
ok(errs.length===0,'sem erros '+errs.join('|'));await b.close();})();
