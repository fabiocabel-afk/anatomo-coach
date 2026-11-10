const puppeteer=require('puppeteer-core');const path=require('path');
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
for(const id of ['ziguezague_garrafas','abre_fecha_garrafas','passagem_garrafa','chutes_garrafa']){
  const r=await p.evaluate(id=>{__corpo.setExercise(id);const gs=__corpo.garrafasPos();let pior=1e9,colisoes=0,minPe=1e9,maxPeExtremo=0;
    for(const l of [0,1])for(let i=0;i<=40;i++){const ph=i/40;__corpo.posar(ph,l);const P=__corpo.pesPos();
      const ys=P.map(q=>q[1]);if(i===0||i===40){maxPeExtremo=Math.max(maxPeExtremo,Math.min(...ys));}
      minPe=Math.min(minPe,...ys);
      for(const q of P)for(const g of gs){const d=Math.hypot(q[0]-g[0],q[2]-g[2]);if(d<0.1){const folga=q[1]-0.222;pior=Math.min(pior,folga);if(folga<0)colisoes++;}}}
    return {garrafas:gs.map(g=>g.map(v=>+v.toFixed(2))),colisoes,folgaMinSobreGarrafa:+pior.toFixed(3),peMaisBaixo:+minPe.toFixed(3),alturaPeNasPontas:+maxPeExtremo.toFixed(3)};},id);
  console.log(id,JSON.stringify(r));}
await b.close();})();
