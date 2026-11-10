const puppeteer=require('puppeteer-core');const path=require('path');
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});const errs=[];
p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
await p.evaluate(()=>{__corpo.setExercise('rosca');__corpo.setPhase(0);});await new Promise(r=>setTimeout(r,1500));
const cdp=await p.target().createCDPSession();
const tp=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map((q,i)=>({x:q[0],y:q[1],id:i}))});
const proj=()=>p.evaluate(()=>__corpo.project(0,1.69,0));// cabeça
const before=await proj();
await p.screenshot({path:'shots/pan_0.png'});
// dois dedos arrastando 120px para baixo e 60 px para a direita, sem mudar a distância entre eles
let a=[150,350],c=[250,350];await tp('touchStart',[a,c]);
for(let i=1;i<=12;i++){await tp('touchMove',[[a[0]+5*i,a[1]+10*i],[c[0]+5*i,c[1]+10*i]]);await new Promise(r=>setTimeout(r,16));}
await tp('touchEnd',[]);await new Promise(r=>setTimeout(r,300));
const after=await proj();
console.log('cabeça na tela antes',before.map(Math.round),'depois',after.map(Math.round),'deslocamento',[after[0]-before[0],after[1]-before[1]].map(Math.round));
await p.screenshot({path:'shots/pan_1.png'});
// pinça: afastar dedos → zoom
const d0=await p.evaluate(()=>0);a=[170,450];c=[220,450];await tp('touchStart',[a,c]);
for(let i=1;i<=10;i++){await tp('touchMove',[[a[0]-6*i,a[1]],[c[0]+6*i,c[1]]]);await new Promise(r=>setTimeout(r,16));}
await tp('touchEnd',[]);await new Promise(r=>setTimeout(r,300));
const h2=await proj();console.log('cabeça após zoom',h2.map(Math.round));
// um dedo ainda gira; toque ainda identifica músculo
await p.click('#bBest');await new Promise(r=>setTimeout(r,1500));
const pt=await p.evaluate(()=>__corpo.project(0.08,1.36,0.12));
await tp('touchStart',[pt]);await tp('touchEnd',[]);await new Promise(r=>setTimeout(r,1500));
console.log('toque',await p.evaluate(()=>document.getElementById('mTec').textContent));
await p.screenshot({path:'shots/pan_2.png'});
console.log('erros',errs);await b.close();})();
