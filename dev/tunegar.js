// procura a dobra do joelho (LowerLeg x) que deixa o pé a ~1,5 cm do chão sem levantar o quadril
const puppeteer=require('puppeteer-core');const path=require('path');
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
const casos=JSON.parse(process.argv[2]);
for(const [id,fase,lado] of casos){
  const r=await p.evaluate((id,fase,lado)=>{
    __corpo.setExercise(id);const ex=__corpo.exAtual();
    const P=fase==='A'?ex.A:fase==='M'?ex.M:ex.B;
    const pernas=lado==='E'?['leftLowerLeg']:lado==='D'?['rightLowerLeg']:['leftLowerLeg','rightLowerLeg'];
    const ph=fase==='A'?0:fase==='M'?0.5:1;
    const medir=ll=>{for(const k of pernas)P[k]=[ll,0,0];ex._Bs[0]=ex.B;if(ex._Mmeio)ex._Mmeio[0]=ex.M;ex._As[0]=ex.A;__corpo.posar(ph,0);
      const m=__corpo.medir();const pes=pernas.map(k=>k.startsWith('left')?m.pesY[0]:m.pesY[1]).flat();
      return {pe:Math.min(...pes),quadril:__corpo.ossos(['hips']).hips[1],ank:__corpo.ossos(['leftFoot','rightFoot'])};};
    // busca: maior dobra que ainda não levanta o quadril e deixa o pé >= 1,2 cm
    const q0=medir(30).quadril;let best=null;for(let ll=30;ll<=100;ll+=0.5){const m=medir(ll);if(m.quadril>q0+0.0005)break;if(m.pe>=0.008)best={ll,pe:+m.pe.toFixed(3),ank:m.ank};}
    return best;},id,fase,lado);
  console.log(id,fase,lado||'',JSON.stringify(r));
}
await b.close();})();
